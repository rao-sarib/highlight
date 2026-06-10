"""
AI visibility analysis endpoint for UC-006.

Calculates how visible a project is across AI answer engines:
- Perplexity API (when PERPLEXITY_API_KEY is set): citation-based score — checks
  whether the project URL appears in Perplexity's cited sources for the keyword.
- Fallback (OpenAI cosine similarity): compares a simulated AI answer against
  the project's pgvector embeddings to estimate semantic alignment.
"""

from __future__ import annotations

import logging
import math
import uuid
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visibility", tags=["AI Visibility"])

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
PERPLEXITY_MODEL = "sonar"
PERPLEXITY_TIMEOUT = 30


class VisibilityRequest(BaseModel):
    project_id: uuid.UUID
    keyword: str = Field(min_length=2, max_length=255)


class VisibilityResponse(BaseModel):
    project_id: uuid.UUID
    keyword: str
    simulated_ai_answer: str
    supporting_chunks: list[str]
    visibility_score: float
    rating: str
    # Perplexity-specific fields (populated when PERPLEXITY_API_KEY is set)
    perplexity_cited: bool = False
    perplexity_citations: list[str] = []
    perplexity_score: float | None = None
    scored_by: str = "openai_cosine"


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
    magnitude_a = math.sqrt(sum(a * a for a in vector_a))
    magnitude_b = math.sqrt(sum(b * b for b in vector_b))
    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0
    return dot_product / (magnitude_a * magnitude_b)


def _score_rating(score: float) -> str:
    if score >= 75:
        return "high"
    if score >= 45:
        return "medium"
    return "low"


def _url_in_citations(project_url: str, citations: list[str]) -> bool:
    """Check if the project's domain appears in any Perplexity citation URL."""
    if not project_url or not citations:
        return False
    try:
        project_host = urlparse(project_url).netloc.lower().removeprefix("www.")
    except Exception:
        return False
    for citation in citations:
        try:
            citation_host = urlparse(citation).netloc.lower().removeprefix("www.")
            if project_host and project_host in citation_host:
                return True
        except Exception:
            continue
    return False


async def _query_perplexity(keyword: str) -> tuple[str, list[str]]:
    """Query Perplexity API and return (answer_text, citation_urls).

    Raises httpx.HTTPError on failure — callers should catch and fall back.
    """
    async with httpx.AsyncClient(timeout=PERPLEXITY_TIMEOUT) as client:
        response = await client.post(
            PERPLEXITY_API_URL,
            headers={
                "Authorization": f"Bearer {settings.PERPLEXITY_API_KEY.strip()}",
                "Content-Type": "application/json",
            },
            json={
                "model": PERPLEXITY_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful AI assistant. Provide a concise, factual answer "
                            "and cite your sources."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"What are the best resources or tools for: {keyword.strip()}?",
                    },
                ],
            },
        )
        response.raise_for_status()
        data = response.json()

    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    citations: list[str] = data.get("citations", [])
    return answer, citations


@router.post("/score", response_model=VisibilityResponse, summary="Calculate AI visibility score")
async def calculate_visibility_score(
    body: VisibilityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisibilityResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    supporting_chunks = await rag_service.search_similar(
        body.project_id,
        body.keyword,
        db=db,
        top_k=5,
    )

    # ── Perplexity path (when API key is configured) ───────────────────────
    if settings.PERPLEXITY_API_KEY.strip():
        try:
            perplexity_answer, citations = await _query_perplexity(body.keyword)
            cited = _url_in_citations(project.url, citations)

            # Perplexity score: 100 if cited, otherwise scale by citation count proximity
            if cited:
                perplexity_score = 100.0
            elif citations:
                # Partial score based on semantic chunks alignment
                if supporting_chunks:
                    embeddings = await llm_service.generate_embeddings(
                        [perplexity_answer, *supporting_chunks]
                    )
                    answer_vec = embeddings[0]
                    chunk_vecs = embeddings[1:]
                    sims = [_cosine_similarity(answer_vec, v) for v in chunk_vecs]
                    perplexity_score = round(max(0.0, min(sum(sims) / len(sims), 1.0)) * 100, 2)
                else:
                    perplexity_score = 0.0
            else:
                perplexity_score = 0.0

            return VisibilityResponse(
                project_id=body.project_id,
                keyword=body.keyword.strip(),
                simulated_ai_answer=perplexity_answer,
                supporting_chunks=supporting_chunks,
                visibility_score=perplexity_score,
                rating=_score_rating(perplexity_score),
                perplexity_cited=cited,
                perplexity_citations=citations,
                perplexity_score=perplexity_score,
                scored_by="perplexity_citations",
            )

        except Exception as exc:
            logger.warning("Perplexity API failed, falling back to OpenAI cosine: %s", exc)
            # Fall through to OpenAI cosine similarity path below

    # ── OpenAI cosine similarity fallback ─────────────────────────────────
    if not supporting_chunks:
        return VisibilityResponse(
            project_id=body.project_id,
            keyword=body.keyword.strip(),
            simulated_ai_answer="",
            supporting_chunks=[],
            visibility_score=0.0,
            rating="low",
            scored_by="openai_cosine",
        )

    simulated_ai_answer = await llm_service.generate_custom_text(
        system_instruction=(
            "You simulate an AI search engine answering a user's question using broad web "
            "knowledge. Keep the answer concise, direct, and informative."
        ),
        user_prompt=f"Answer this search query in 120 words or less: {body.keyword.strip()}",
        temperature=0.3,
    )

    embeddings = await llm_service.generate_embeddings([simulated_ai_answer, *supporting_chunks])
    answer_vector = embeddings[0]
    chunk_vectors = embeddings[1:]
    similarities = [_cosine_similarity(answer_vector, chunk_vector) for chunk_vector in chunk_vectors]
    average_similarity = sum(similarities) / len(similarities)
    visibility_score = round(max(0.0, min(average_similarity, 1.0)) * 100, 2)

    return VisibilityResponse(
        project_id=body.project_id,
        keyword=body.keyword.strip(),
        simulated_ai_answer=simulated_ai_answer,
        supporting_chunks=supporting_chunks,
        visibility_score=visibility_score,
        rating=_score_rating(visibility_score),
        scored_by="openai_cosine",
    )
