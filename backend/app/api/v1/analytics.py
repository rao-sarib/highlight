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
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.content import Content
from app.models.embedding import Embedding
from app.models.project import Project
from app.models.user import User
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


class AnalyticsSummary(BaseModel):
    project_id: uuid.UUID
    total_content_pieces: int
    indexed_chunks: int
    content_by_type: dict[str, int]
    history: list[AnalyticsPoint]


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


@router.get("/{project_id}", response_model=AnalyticsSummary, summary="Get real project analytics")
def get_project_analytics(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummary:
    _get_owned_project_or_404(db, project_id, current_user.id)

    content_items = db.exec(
        select(Content).where(Content.project_id == project_id)
    ).all()

    embedding_ids = db.exec(
        select(Embedding.id).where(Embedding.project_id == project_id)
    ).all()

    type_counter: Counter[str] = Counter()
    for item in content_items:
        type_counter[item.content_type.value] += 1

    today = date.today()
    history: list[AnalyticsPoint] = []
    for weeks_ago in range(11, -1, -1):
        week_end = today - timedelta(weeks=weeks_ago)
        week_start = week_end - timedelta(weeks=1)
        week_count = sum(
            1 for c in content_items
            if week_start < c.created_at.date() <= week_end
        )
        history.append(AnalyticsPoint(date=week_end, content_count=week_count))

    return AnalyticsSummary(
        project_id=project_id,
        total_content_pieces=len(content_items),
        indexed_chunks=len(embedding_ids),
        content_by_type=dict(type_counter),
        history=history,
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
    current_user: User = Depends(get_current_user),
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
