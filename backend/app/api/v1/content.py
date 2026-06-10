"""
Content generation endpoints for UC-005.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from temporalio.client import Client

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.content import Content, ContentStatus, ContentType
from app.models.project import Project
from app.models.user import User
from app.temporal.workflows.audit_workflow import AuditWorkflow, AuditWorkflowInput

router = APIRouter(prefix="/content", tags=["Content"])

TEMPORAL_SERVER_URL = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "default")
TEMPORAL_TASK_QUEUE = os.getenv("TEMPORAL_TASK_QUEUE", "highlight-seo-task-queue")


class ContentGenerateRequest(BaseModel):
    project_id: uuid.UUID
    topic: str = Field(min_length=2, max_length=512)
    content_type: ContentType = ContentType.BLOG


class ContentWorkflowResponse(BaseModel):
    workflow_id: str
    run_id: str
    project_id: uuid.UUID
    topic: str
    content_type: ContentType
    status: str


class ContentRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    topic: str
    generated_text: str
    content_type: ContentType
    status: ContentStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _get_temporal_client() -> Client:
    return await Client.connect(TEMPORAL_SERVER_URL, namespace=TEMPORAL_NAMESPACE)


@router.post("/generate", response_model=ContentWorkflowResponse, summary="Trigger AI content generation")
async def generate_content(
    body: ContentGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentWorkflowResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    try:
        client = await _get_temporal_client()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workflow engine is not available. Please ensure the Temporal worker is running.",
        ) from exc
    workflow_id = f"content-generation-{project.id}-{uuid.uuid4()}"
    handle = await client.start_workflow(
        AuditWorkflow.run,
        AuditWorkflowInput(
            project_id=str(project.id),
            url=project.url,
            content_topic=body.topic.strip(),
            content_type=body.content_type.value,
            replace_embeddings=True,
        ),
        id=workflow_id,
        task_queue=TEMPORAL_TASK_QUEUE,
    )
    return ContentWorkflowResponse(
        workflow_id=handle.id,
        run_id=getattr(handle, "first_execution_run_id", "") or getattr(handle, "result_run_id", ""),
        project_id=project.id,
        topic=body.topic.strip(),
        content_type=body.content_type,
        status="started",
    )


@router.get("/project/{project_id}", response_model=list[ContentRead], summary="List generated content")
def list_content_for_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ContentRead]:
    _get_owned_project_or_404(db, project_id, current_user.id)
    content_items = db.exec(
        select(Content)
        .where(Content.project_id == project_id)
        .order_by(Content.created_at.desc())
    ).all()
    return [ContentRead.model_validate(item) for item in content_items]


@router.get("/{content_id}", response_model=ContentRead, summary="Get generated content")
def get_content(
    content_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRead:
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    _get_owned_project_or_404(db, content.project_id, current_user.id)
    return ContentRead.model_validate(content)
