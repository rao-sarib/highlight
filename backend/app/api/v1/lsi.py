"""
LSI / semantic keyword suggestion endpoint for UC-011.

Uses GPT-4o grounded in the project's pgvector chunks to produce genuinely
related search terms (entities, synonyms, subtopics, question phrasings) and
flags which ones the site already covers vs. content gaps. Falls back to
simple term-frequency extraction if the LLM call fails.
"""

from __future__ import annotations

import logging
import re
import uuid
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.cache_service import get_cached, get_latest_for_feature, make_input_key, upsert_cached
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lsi", tags=["LSI Keywords"])

FEATURE = "lsi"

TOKEN_PATTERN = re.compile(r"[a-zA-Z][a-zA-Z0-9-]+")
STOP_WORDS = {
    "about", "after", "again", "also", "because", "being", "could", "first", "from",
    "have", "into", "just", "more", "most", "other", "over", "same", "should", "some",
    "such", "than", "that", "their", "them", "then", "there", "these", "they", "this",
    "very", "what", "when", "where", "which", "while", "with", "would", "your",
}


class LSIKeywordRequest(BaseModel):
    project_id: uuid.UUID
    keyword: str = Field(min_length=2, max_length=255)
    limit: int = Field(default=10, ge=1, le=25)
    force_refresh: bool = False


class LSIKeywordResponse(BaseModel):
    project_id: uuid.UUID
    keyword: str
    supporting_chunks: list[str] = []
    suggestions: list[str] = []
    # Semantic split: terms the site already covers vs. content gaps to write.
    covered: list[str] = []
    gaps: list[str] = []
    method: str = "semantic_llm"
    cached: bool = False
    generated_at: datetime | None = None


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _frequency_fallback(chunks: list[str], keyword: str, limit: int) -> list[str]:
    """Legacy term-frequency extraction, kept as a resilience fallback."""
    seed_words = set(TOKEN_PATTERN.findall(keyword.lower()))
    token_counter: Counter[str] = Counter()
    for chunk in chunks:
        for token in TOKEN_PATTERN.findall(chunk.lower()):
            if len(token) <= 3 or token in STOP_WORDS or token in seed_words:
                continue
            token_counter[token] += 1
    return [term for term, _count in token_counter.most_common(limit)]


@router.get(
    "/{project_id}/latest",
    response_model=LSIKeywordResponse,
    summary="Restore the last LSI result",
)
def latest_lsi(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LSIKeywordResponse:
    _get_owned_project_or_404(db, project_id, current_user.id)
    row = get_latest_for_feature(db, project_id, FEATURE)
    if row is None:
        return LSIKeywordResponse(project_id=project_id, keyword="")
    return LSIKeywordResponse(**row.payload, cached=True, generated_at=row.updated_at)


@router.post("/suggest", response_model=LSIKeywordResponse, summary="Suggest semantic keywords")
async def suggest_lsi_keywords(
    body: LSIKeywordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LSIKeywordResponse:
    _get_owned_project_or_404(db, body.project_id, current_user.id)
    input_key = make_input_key(body.keyword, body.limit)
    if not body.force_refresh:
        cached = get_cached(db, body.project_id, FEATURE, input_key)
        if cached is not None:
            return LSIKeywordResponse(**cached.payload, cached=True, generated_at=cached.updated_at)

    supporting_chunks = await rag_service.search_similar(
        body.project_id,
        body.keyword,
        db=db,
        top_k=max(body.limit, 8),
    )

    try:
        keywords = await llm_service.generate_related_keywords(
            body.keyword,
            supporting_chunks,
            limit=body.limit,
        )
        suggestions = [item["term"] for item in keywords]
        covered = [item["term"] for item in keywords if item.get("covered")]
        gaps = [item["term"] for item in keywords if not item.get("covered")]
        method = "semantic_llm"
    except Exception as exc:
        logger.warning("Semantic keyword generation failed, using frequency fallback: %s", exc)
        suggestions = _frequency_fallback(supporting_chunks, body.keyword, body.limit)
        covered = []
        gaps = []
        method = "frequency_fallback"

    payload = {
        "project_id": str(body.project_id),
        "keyword": body.keyword.strip(),
        "supporting_chunks": supporting_chunks,
        "suggestions": suggestions,
        "covered": covered,
        "gaps": gaps,
        "method": method,
    }
    row = upsert_cached(db, body.project_id, FEATURE, input_key, payload)
    return LSIKeywordResponse(**payload, cached=False, generated_at=row.updated_at)
