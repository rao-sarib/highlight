"""
Prompt optimization endpoint for UC-004.

Results are cached per (project, keyword) and auto-restore on page open; a fresh
call happens only on a new keyword or an explicit refresh.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_PROMPTS
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.cache_service import get_cached, get_latest_for_feature, make_input_key, upsert_cached
from app.services.llm_service import llm_service
from app.services.project_context import effective_niche, resolve_keyword

router = APIRouter(prefix="/prompts", tags=["Prompt Optimization"])

FEATURE = "prompts"


class PromptOptimizationRequest(BaseModel):
    project_id: uuid.UUID
    # Optional: when omitted, the project's detected niche/keyword is used.
    keyword: str | None = Field(default=None, max_length=255)
    force_refresh: bool = False


class PromptOptimizationResponse(BaseModel):
    keyword: str
    prompts: list[str] = []
    cached: bool = False
    generated_at: datetime | None = None


def _owned(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post("/optimize", response_model=PromptOptimizationResponse, summary="Optimize prompts")
async def optimize_prompts(
    body: PromptOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_PROMPTS)),
) -> PromptOptimizationResponse:
    project = _owned(db, body.project_id, current_user.id)
    keyword = await resolve_keyword(project, body.keyword)
    input_key = make_input_key(keyword)

    if not body.force_refresh:
        cached = get_cached(db, body.project_id, FEATURE, input_key)
        if cached is not None:
            return PromptOptimizationResponse(
                **cached.payload, cached=True, generated_at=cached.updated_at
            )

    prompts = await llm_service.optimize_prompts(
        keyword, niche=effective_niche(project), audience=project.target_audience
    )
    payload = {"keyword": keyword, "prompts": prompts}
    row = upsert_cached(db, body.project_id, FEATURE, input_key, payload)
    return PromptOptimizationResponse(**payload, cached=False, generated_at=row.updated_at)


@router.get(
    "/{project_id}/latest",
    response_model=PromptOptimizationResponse,
    summary="Restore the last prompt result",
)
def latest_prompts(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptOptimizationResponse:
    _owned(db, project_id, current_user.id)
    row = get_latest_for_feature(db, project_id, FEATURE)
    if row is None:
        return PromptOptimizationResponse(keyword="", prompts=[])
    return PromptOptimizationResponse(**row.payload, cached=True, generated_at=row.updated_at)
