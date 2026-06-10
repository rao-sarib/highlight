"""
LSI keyword suggestion endpoint for UC-011.
"""

from __future__ import annotations

import re
import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.rag_service import rag_service

router = APIRouter(prefix="/lsi", tags=["LSI Keywords"])

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


class LSIKeywordResponse(BaseModel):
    project_id: uuid.UUID
    keyword: str
    supporting_chunks: list[str]
    suggestions: list[str]


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post("/suggest", response_model=LSIKeywordResponse, summary="Suggest LSI keywords")
async def suggest_lsi_keywords(
    body: LSIKeywordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LSIKeywordResponse:
    _get_owned_project_or_404(db, body.project_id, current_user.id)
    supporting_chunks = await rag_service.search_similar(
        body.project_id,
        body.keyword,
        db=db,
        top_k=max(body.limit, 8),
    )

    seed_words = set(TOKEN_PATTERN.findall(body.keyword.lower()))
    token_counter: Counter[str] = Counter()
    for chunk in supporting_chunks:
        for token in TOKEN_PATTERN.findall(chunk.lower()):
            if len(token) <= 3 or token in STOP_WORDS or token in seed_words:
                continue
            token_counter[token] += 1

    suggestions = [term for term, _count in token_counter.most_common(body.limit)]
    return LSIKeywordResponse(
        project_id=body.project_id,
        keyword=body.keyword.strip(),
        supporting_chunks=supporting_chunks,
        suggestions=suggestions,
    )
