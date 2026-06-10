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
from app.models.content import Content
from app.models.embedding import Embedding
from app.models.project import Project
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects"])


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=3, max_length=2083)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, min_length=3, max_length=2083)
    ga4_property_id: str | None = Field(default=None, max_length=32)


class ProjectRead(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    url: str
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


@router.get("/", response_model=list[ProjectRead], summary="List current user's projects")
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
    "/",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRead:
    project = Project(
        owner_id=current_user.id,
        name=body.name.strip(),
        url=body.url.strip(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectRead.model_validate(project)


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
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
