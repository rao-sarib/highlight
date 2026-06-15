"""
Project CRUD endpoints for authenticated users.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlmodel import Session, delete, select

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.core.plans import get_plan
from app.models.content import Content
from app.models.embedding import Embedding
from app.models.feature_cache import FeatureCache
from app.models.page_audit import PageAudit
from app.models.project import Project
from app.models.user import User
from app.models.visibility_scan import VisibilityScan

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=3, max_length=2083)
    niche: str | None = Field(default=None, max_length=255)
    target_audience: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, min_length=3, max_length=2083)
    niche: str | None = Field(default=None, max_length=255)
    target_audience: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    ga4_property_id: str | None = Field(default=None, max_length=32)


class ProjectRead(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    url: str
    niche: str | None = None
    target_audience: str | None = None
    description: str | None = None
    detected_niche: str | None = None
    detected_keywords: list[str] = []
    pages_crawled: int = 0
    last_crawl_at: datetime | None = None
    seo_health_score: float | None = None
    ai_visibility_score: float | None = None
    ga4_property_id: str | None
    last_audited_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _get_owned_project_or_404(
    db: Session,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.get("", response_model=list[ProjectRead], summary="List current user's projects")
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectRead]:
    projects = db.exec(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc())
    ).all()
    return [ProjectRead.model_validate(project) for project in projects]


@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    # Plan limit: enforce the project cap for the user's tier.
    plan = get_plan(current_user.plan)
    existing_count = len(
        db.exec(select(Project.id).where(Project.owner_id == current_user.id)).all()
    )
    if existing_count >= plan.max_projects:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Your {plan.name} plan allows {plan.max_projects} project(s). "
                "Upgrade your plan to add more."
            ),
        )

    project = Project(
        owner_id=current_user.id,
        name=body.name.strip(),
        url=body.url.strip(),
        niche=(body.niche or "").strip() or None,
        target_audience=(body.target_audience or "").strip() or None,
        description=(body.description or "").strip() or None,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectRead.model_validate(project)


class ProjectContext(BaseModel):
    """Auto-mode context the frontend uses to prefill features."""

    project_id: uuid.UUID
    niche: str
    detected_niche: str | None
    target_audience: str | None
    keywords: list[str]
    primary_keyword: str | None
    has_audit: bool


@router.get(
    "/{project_id}/context",
    response_model=ProjectContext,
    summary="Auto-mode context (niche, keywords, audit status)",
)
def get_project_context(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectContext:
    from app.services.project_context import effective_niche, has_audit, primary_keyword

    project = _get_owned_project_or_404(db, project_id, current_user.id)
    return ProjectContext(
        project_id=project.id,
        niche=effective_niche(project),
        detected_niche=project.detected_niche,
        target_audience=project.target_audience,
        keywords=list(project.detected_keywords or []),
        primary_keyword=primary_keyword(project),
        has_audit=has_audit(project),
    )


@router.get("/{project_id}", response_model=ProjectRead, summary="Get a project")
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    project = _get_owned_project_or_404(db, project_id, current_user.id)
    return ProjectRead.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectRead, summary="Update a project")
def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    project = _get_owned_project_or_404(db, project_id, current_user.id)

    if body.name is not None:
        project.name = body.name.strip()
    if body.url is not None:
        project.url = body.url.strip()
    if body.niche is not None:
        project.niche = body.niche.strip() or None
    if body.target_audience is not None:
        project.target_audience = body.target_audience.strip() or None
    if body.description is not None:
        project.description = body.description.strip() or None
    if body.ga4_property_id is not None:
        cleaned = body.ga4_property_id.strip().removeprefix("properties/")
        if not cleaned:
            project.ga4_property_id = None
        elif cleaned.isdigit():
            project.ga4_property_id = cleaned
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="GA4 Property ID must be numeric, e.g. 123456789.",
            )

    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectRead.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
)
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    project = _get_owned_project_or_404(db, project_id, current_user.id)
    db.exec(delete(Embedding).where(Embedding.project_id == project_id))
    db.exec(delete(Content).where(Content.project_id == project_id))
    db.exec(delete(VisibilityScan).where(VisibilityScan.project_id == project_id))
    db.exec(delete(PageAudit).where(PageAudit.project_id == project_id))
    db.exec(delete(FeatureCache).where(FeatureCache.project_id == project_id))
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
