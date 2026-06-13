"""
AI Visibility (GEO) endpoints for UC-006.

Measures REAL visibility in AI answer engines:
  1. GPT-4o generates brand-neutral buyer questions for the keyword.
  2. Each question is asked to Perplexity (live web-grounded engine).
  3. The project's domain/brand is detected in answers + citations.
  4. Score = "AI Share of Voice": % of answers where the brand appears
     (full credit when cited in the answer, half when only in sources).

Budget safety: scans are cached for 24h per (project, keyword); prompt count
is clamped to 2-6; answers are token-capped in the geo service.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.dependencies import get_current_user
from app.models.project import Project
from app.models.user import User
from app.models.visibility_scan import VisibilityScan
from app.db.session import get_db
from app.services.geo_service import GeoServiceError, geo_service
from app.services.llm_service import llm_service
from app.services.project_context import resolve_keyword
from app.services.quota_service import consume_scan

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visibility", tags=["AI Visibility"])

CACHE_TTL_HOURS = 24


class VisibilityRequest(BaseModel):
    project_id: uuid.UUID
    # Optional: when omitted, the project's detected niche/keyword is used.
    keyword: str | None = Field(default=None, max_length=255)
    prompt_count: int = Field(default=4, ge=2, le=6)
    force_refresh: bool = False


class EngineAnswerModel(BaseModel):
    engine: str
    status: str
    answer: str = ""
    citations: list[str] = []
    matched_urls: list[str] = []
    brand_mentioned_in_text: bool = False
    competitor_domains: list[str] = []
    error: str | None = None


class PromptResult(BaseModel):
    prompt: str
    status: str  # cited | in_sources | absent | error
    engines: list[EngineAnswerModel] = []
    competitor_domains: list[str] = []


class CompetitorEntry(BaseModel):
    domain: str
    count: int


class EngineSummary(BaseModel):
    engine: str
    label: str
    share_of_voice: float
    cited: int
    in_sources: int
    prompts: int
    cited_rate: float = 0.0
    responses: int = 0
    attempted: int = 0
    total_prompts: int = 0


class VisibilityResponse(BaseModel):
    project_id: uuid.UUID
    keyword: str
    share_of_voice: float
    rating: str
    cited_count: int
    in_sources_count: int
    prompt_count: int
    engines_used: list[str] = []
    per_engine: list[EngineSummary] = []
    results: list[PromptResult]
    top_competitors: list[CompetitorEntry]
    scored_by: str = "multi_engine_live_scan"
    cached: bool = False
    scanned_at: datetime


class ScanHistoryEntry(BaseModel):
    id: uuid.UUID
    keyword: str
    share_of_voice: float
    cited_count: int
    prompt_count: int
    created_at: datetime


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _rating_for(share_of_voice: float) -> str:
    if share_of_voice >= 50:
        return "high"
    if share_of_voice >= 20:
        return "medium"
    return "low"


def _scan_to_response(
    scan: VisibilityScan,
    project_id: uuid.UUID,
    cached: bool,
) -> VisibilityResponse:
    return VisibilityResponse(
        project_id=project_id,
        keyword=scan.keyword,
        share_of_voice=scan.share_of_voice,
        rating=_rating_for(scan.share_of_voice),
        cited_count=scan.cited_count,
        in_sources_count=scan.in_sources_count,
        prompt_count=scan.prompt_count,
        engines_used=scan.engines_used or [],
        per_engine=[EngineSummary(**item) for item in (scan.per_engine or [])],
        results=[PromptResult(**item) for item in scan.results],
        top_competitors=[CompetitorEntry(**item) for item in scan.top_competitors],
        cached=cached,
        scanned_at=scan.created_at,
    )


@router.post("/score", response_model=VisibilityResponse, summary="Run a live AI Share-of-Voice scan")
async def calculate_visibility_score(
    body: VisibilityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisibilityResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)

    if not geo_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Real AI visibility scanning requires PERPLEXITY_API_KEY to be set "
                "on the backend. Add it to the .env file and restart."
            ),
        )

    # Auto-mode: resolve keyword from the project's niche/keywords when omitted,
    # and relevance-guard a manually provided one.
    keyword = await resolve_keyword(project, body.keyword)
    normalized_keyword = keyword.strip().lower()

    # ── 24h cache: protect the API budget from repeated identical scans ────
    if not body.force_refresh:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
        cached_scan = db.exec(
            select(VisibilityScan)
            .where(
                VisibilityScan.project_id == body.project_id,
                VisibilityScan.keyword == normalized_keyword,
            )
            .order_by(VisibilityScan.created_at.desc())
            .limit(1)
        ).first()
        if cached_scan is not None:
            created = cached_scan.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created >= cutoff:
                return _scan_to_response(cached_scan, body.project_id, cached=True)

    # Quota: a fresh live scan consumes one of the month's allowance.
    consume_scan(current_user, db)

    # ── 1. Brand-neutral buyer prompts ──────────────────────────────────────
    try:
        prompts = await llm_service.generate_geo_prompts(
            normalized_keyword, count=body.prompt_count, audience=project.target_audience
        )
    except Exception as exc:
        logger.exception("GEO prompt generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not generate scan prompts: {exc}",
        ) from exc

    # ── 2-3. Live engine scan + brand detection ─────────────────────────────
    try:
        scan_result = await geo_service.scan(prompts, project.url, project.name)
    except GeoServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    # ── 4. Persist for cache + history ──────────────────────────────────────
    scan = VisibilityScan(
        project_id=body.project_id,
        keyword=normalized_keyword,
        share_of_voice=scan_result.share_of_voice,
        cited_count=scan_result.cited_count,
        in_sources_count=scan_result.in_sources_count,
        prompt_count=scan_result.prompt_count,
        results=[item.to_dict() for item in scan_result.results],
        top_competitors=scan_result.top_competitors,
        engines_used=scan_result.engines_used,
        per_engine=scan_result.per_engine,
    )
    db.add(scan)

    # Surface the latest visibility score on the project for the dashboard.
    if project is not None:
        project.ai_visibility_score = scan_result.share_of_voice
        db.add(project)

    db.commit()
    db.refresh(scan)

    return _scan_to_response(scan, body.project_id, cached=False)


@router.get(
    "/latest/{project_id}",
    response_model=VisibilityResponse | None,
    summary="Restore the most recent visibility scan",
)
def latest_scan(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VisibilityResponse | None:
    _get_owned_project_or_404(db, project_id, current_user.id)
    scan = db.exec(
        select(VisibilityScan)
        .where(VisibilityScan.project_id == project_id)
        .order_by(VisibilityScan.created_at.desc())
        .limit(1)
    ).first()
    if scan is None:
        return None
    return _scan_to_response(scan, project_id, cached=True)


@router.get(
    "/history/{project_id}",
    response_model=list[ScanHistoryEntry],
    summary="List past AI visibility scans",
)
def list_scan_history(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScanHistoryEntry]:
    _get_owned_project_or_404(db, project_id, current_user.id)
    scans = db.exec(
        select(VisibilityScan)
        .where(VisibilityScan.project_id == project_id)
        .order_by(VisibilityScan.created_at.desc())
        .limit(20)
    ).all()
    return [
        ScanHistoryEntry(
            id=scan.id,
            keyword=scan.keyword,
            share_of_voice=scan.share_of_voice,
            cited_count=scan.cited_count,
            prompt_count=scan.prompt_count,
            created_at=scan.created_at,
        )
        for scan in scans
    ]
