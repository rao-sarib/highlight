"""
Analytics endpoint for UC-012.

Returns real metrics derived from the project's own database records:
  - Content items (blog / faq / meta) from the contents table
  - Indexed text chunks from the embeddings table
  - Weekly content-generation history from content created_at timestamps

No external APIs (GA4 / GSC) are required.  Traffic-level data (organic
clicks, bounce rate) is not available without a Google Analytics integration
— those fields are omitted intentionally so the dashboard shows only accurate
numbers.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_ANALYTICS
from app.db.session import get_db
from app.models.content import Content
from app.models.embedding import Embedding
from app.models.feature_cache import FeatureCache
from app.models.project import Project
from app.models.score_snapshot import ScoreSnapshot
from app.models.user import User
from app.models.visibility_scan import VisibilityScan
from app.services.ga4_service import (
    GA4NotFoundError,
    GA4PermissionError,
    GA4ServiceError,
    ga4_service,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class AnalyticsPoint(BaseModel):
    date: date
    content_count: int


class ScorePoint(BaseModel):
    date: str
    seo_health: float | None = None
    ai_visibility: float | None = None


class AnalyticsSummary(BaseModel):
    project_id: uuid.UUID
    niche: str | None = None
    # ── AI / GEO ──────────────────────────────────────────
    ai_share_of_voice: float | None = None
    ai_rating: str | None = None
    cited_count: int = 0
    in_sources_count: int = 0
    prompt_count: int = 0
    engines_checked: int = 0
    scans_run: int = 0
    # ── SEO ───────────────────────────────────────────────
    seo_health_score: float | None = None
    pages_crawled: int = 0
    last_audited_at: datetime | None = None
    # ── Content / keywords / competition ──────────────────
    total_content_pieces: int = 0
    content_by_type: dict[str, int] = {}
    indexed_chunks: int = 0
    keywords_tracked: int = 0
    competitors_found: int = 0
    backlink_opportunities: int = 0
    # ── Google Search (real, via Serper — no GA4 needed) ──
    google_keywords_ranking: int = 0
    google_best_rank: int | None = None
    google_avg_rank: float | None = None
    # ── History (progress over time) ──────────────────────
    content_history: list[AnalyticsPoint] = []
    score_history: list[ScorePoint] = []


class GA4SetupInfo(BaseModel):
    configured: bool
    service_account_email: str | None = None


class GA4DailyPoint(BaseModel):
    date: str
    sessions: int
    active_users: int
    page_views: int


class GA4TopPage(BaseModel):
    page_path: str
    views: int


class GA4ChannelPoint(BaseModel):
    channel: str
    sessions: int


class GA4Summary(BaseModel):
    property_id: str
    period_days: int
    total_sessions: int
    total_active_users: int
    total_new_users: int
    total_page_views: int
    average_bounce_rate: float
    average_session_duration: float
    history: list[GA4DailyPoint]
    top_pages: list[GA4TopPage]
    channels: list[GA4ChannelPoint]


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _rating(sov: float | None) -> str | None:
    if sov is None:
        return None
    if sov >= 50:
        return "high"
    if sov >= 20:
        return "medium"
    return "low"


@router.get("/{project_id}", response_model=AnalyticsSummary, summary="Get real project analytics")
def get_project_analytics(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_ANALYTICS)),
) -> AnalyticsSummary:
    project = _get_owned_project_or_404(db, project_id, current_user.id)

    content_items = db.exec(select(Content).where(Content.project_id == project_id)).all()
    embedding_ids = db.exec(select(Embedding.id).where(Embedding.project_id == project_id)).all()

    type_counter: Counter[str] = Counter()
    for item in content_items:
        type_counter[item.content_type.value] += 1

    # Weekly content-generation history.
    today = date.today()
    content_history: list[AnalyticsPoint] = []
    for weeks_ago in range(11, -1, -1):
        week_end = today - timedelta(weeks=weeks_ago)
        week_start = week_end - timedelta(weeks=1)
        week_count = sum(
            1 for c in content_items if week_start < c.created_at.date() <= week_end
        )
        content_history.append(AnalyticsPoint(date=week_end, content_count=week_count))

    # Latest AI-visibility scan + total scans run.
    scans = db.exec(
        select(VisibilityScan)
        .where(VisibilityScan.project_id == project_id)
        .order_by(VisibilityScan.created_at.desc())
    ).all()
    latest = scans[0] if scans else None
    ai_sov = latest.share_of_voice if latest else project.ai_visibility_score
    competitors_found = len(latest.top_competitors) if (latest and latest.top_competitors) else 0

    # Latest backlink opportunity count (from the feature cache).
    bl = db.exec(
        select(FeatureCache)
        .where(FeatureCache.project_id == project_id, FeatureCache.feature == "backlinks")
        .order_by(FeatureCache.updated_at.desc())
        .limit(1)
    ).first()
    backlink_count = 0
    if bl and bl.payload:
        backlink_count = bl.payload.get("total_found") or len(bl.payload.get("opportunities", []))

    # Real Google Search data (no GA4): the site's live rank for analyzed
    # keywords, from the most recent keyword analysis (Serper-checked).
    kwrow = db.exec(
        select(FeatureCache)
        .where(FeatureCache.project_id == project_id, FeatureCache.feature == "keywords")
        .order_by(FeatureCache.updated_at.desc())
        .limit(1)
    ).first()
    ranks: list[int] = []
    if kwrow and kwrow.payload:
        for k in kwrow.payload.get("keywords", []):
            r = k.get("your_rank")
            if isinstance(r, int):
                ranks.append(r)
    google_best = min(ranks) if ranks else None
    google_avg = round(sum(ranks) / len(ranks), 1) if ranks else None

    # Score progress history.
    snaps = db.exec(
        select(ScoreSnapshot)
        .where(ScoreSnapshot.project_id == project_id)
        .order_by(ScoreSnapshot.created_at)
    ).all()
    score_history = [
        ScorePoint(
            date=s.created_at.isoformat(),
            seo_health=s.seo_health,
            ai_visibility=s.ai_visibility,
        )
        for s in snaps[-30:]
    ]

    return AnalyticsSummary(
        project_id=project_id,
        niche=project.niche or project.detected_niche,
        ai_share_of_voice=ai_sov,
        ai_rating=_rating(ai_sov),
        cited_count=latest.cited_count if latest else 0,
        in_sources_count=latest.in_sources_count if latest else 0,
        prompt_count=latest.prompt_count if latest else 0,
        engines_checked=len(latest.engines_used) if (latest and latest.engines_used) else 0,
        scans_run=len(scans),
        seo_health_score=project.seo_health_score,
        pages_crawled=project.pages_crawled,
        last_audited_at=project.last_audited_at,
        total_content_pieces=len(content_items),
        content_by_type=dict(type_counter),
        indexed_chunks=len(embedding_ids),
        keywords_tracked=len(project.detected_keywords or []),
        competitors_found=competitors_found,
        backlink_opportunities=backlink_count,
        google_keywords_ranking=len(ranks),
        google_best_rank=google_best,
        google_avg_rank=google_avg,
        content_history=content_history,
        score_history=score_history,
    )


@router.get(
    "/ga4/setup",
    response_model=GA4SetupInfo,
    summary="Check GA4 service-account configuration status",
)
def get_ga4_setup_info(
    current_user: User = Depends(get_current_user),
) -> GA4SetupInfo:
    return GA4SetupInfo(
        configured=ga4_service.is_configured,
        service_account_email=ga4_service.service_account_email,
    )


@router.get(
    "/{project_id}/ga4",
    response_model=GA4Summary,
    summary="Get real Google Analytics 4 data for a project",
)
async def get_project_ga4_analytics(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_ANALYTICS)),
) -> GA4Summary:
    project = _get_owned_project_or_404(db, project_id, current_user.id)

    if not project.ga4_property_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GA4 Property ID is set for this project yet.",
        )

    if not ga4_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "GA4 integration is not configured on the server. "
                "Set GA4_SERVICE_ACCOUNT_FILE in the backend .env file."
            ),
        )

    try:
        summary = await ga4_service.get_summary(project.ga4_property_id)
    except GA4PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except GA4NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except GA4ServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return GA4Summary(**summary)
