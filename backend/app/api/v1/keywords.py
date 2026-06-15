"""
Keyword Analysis endpoint.

Analyzes a project's topic into target keywords with SEO attributes (intent,
type, relevance) and the site's CURRENT Google rank for the top ones (via
Serper). The analyzed keywords are saved to the project's detected_keywords, so
every other feature's auto-mode picks them up automatically.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_LSI
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.cache_service import get_cached, get_latest_for_feature, make_input_key, upsert_cached
from app.services.llm_service import llm_service
from app.services.project_context import effective_niche
from app.services.serper_service import serper_service

router = APIRouter(prefix="/keywords", tags=["Keyword Analysis"])

FEATURE = "keywords"
RANK_CHECK_LIMIT = 8  # how many top keywords to check live Google rank for


class KeywordAnalysisRequest(BaseModel):
    project_id: uuid.UUID
    # Optional seed/topic; defaults to the project's detected niche.
    seed: str | None = Field(default=None, max_length=255)
    force_refresh: bool = False


class AnalyzedKeyword(BaseModel):
    keyword: str
    intent: str
    type: str
    relevance: str
    note: str = ""
    your_rank: int | None = None


class KeywordAnalysisResponse(BaseModel):
    project_id: uuid.UUID
    niche: str
    keywords: list[AnalyzedKeyword] = []
    cached: bool = False
    generated_at: datetime | None = None


def _owned(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get(
    "/{project_id}/latest",
    response_model=KeywordAnalysisResponse,
    summary="Restore the last keyword analysis",
)
def latest_keywords(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KeywordAnalysisResponse:
    _owned(db, project_id, current_user.id)
    row = get_latest_for_feature(db, project_id, FEATURE)
    if row is None:
        return KeywordAnalysisResponse(project_id=project_id, niche="")
    return KeywordAnalysisResponse(**row.payload, cached=True, generated_at=row.updated_at)


@router.post("/analyze", response_model=KeywordAnalysisResponse, summary="Analyze keywords for a site")
async def analyze_keywords(
    body: KeywordAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_LSI)),
) -> KeywordAnalysisResponse:
    project = _owned(db, body.project_id, current_user.id)
    niche = (body.seed or "").strip() or effective_niche(project) or project.name

    input_key = make_input_key(niche)
    if not body.force_refresh:
        cached = get_cached(db, body.project_id, FEATURE, input_key)
        if cached is not None:
            return KeywordAnalysisResponse(**cached.payload, cached=True, generated_at=cached.updated_at)

    analyzed = await llm_service.analyze_keywords(
        niche, audience=project.target_audience, count=15
    )

    # Live Google rank for the top keywords (best-effort, parallel).
    top = analyzed[:RANK_CHECK_LIMIT]
    rank_results = await asyncio.gather(
        *[serper_service.search(k["keyword"], num=10) for k in top],
        return_exceptions=True,
    )
    for k, res in zip(top, rank_results):
        if not isinstance(res, BaseException) and not res.error:
            k["your_rank"] = serper_service.find_url_rank(res, project.url)

    keywords = [AnalyzedKeyword(**k) for k in analyzed]

    # Persist for auto-mode reuse across every other feature.
    project.detected_keywords = [k.keyword for k in keywords][:20]
    db.add(project)
    db.commit()

    response = KeywordAnalysisResponse(project_id=project.id, niche=niche, keywords=keywords)
    payload = response.model_dump(mode="json")
    payload.pop("cached", None)
    payload.pop("generated_at", None)
    row = upsert_cached(db, body.project_id, FEATURE, input_key, payload)
    response.generated_at = row.updated_at
    return response
