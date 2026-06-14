"""
Content refresh scheduling endpoint for UC-009.
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
from temporalio.client import Client

from app.api.dependencies import require_feature
from app.core.plans import FEATURE_REFRESH
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.temporal.workflows.audit_workflow import AuditWorkflow, AuditWorkflowInput

router = APIRouter(prefix="/refresh", tags=["Content Refresh"])

TEMPORAL_SERVER_URL = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "default")
TEMPORAL_TASK_QUEUE = os.getenv("TEMPORAL_TASK_QUEUE", "highlight-seo-task-queue")
DEFAULT_CRON_SCHEDULE = "0 0 */30 * *"


class RefreshWorkflowRequest(BaseModel):
    project_id: uuid.UUID


class RefreshWorkflowResponse(BaseModel):
    workflow_id: str
    run_id: str
    project_id: uuid.UUID
    cron_schedule: str
    status: str


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _get_temporal_client() -> Client:
    return await Client.connect(TEMPORAL_SERVER_URL, namespace=TEMPORAL_NAMESPACE)


@router.post("/schedule", response_model=RefreshWorkflowResponse, summary="Schedule monthly content refresh")
async def schedule_content_refresh(
    body: RefreshWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_REFRESH)),
) -> RefreshWorkflowResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    try:
        client = await _get_temporal_client()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workflow engine is not available. Please ensure the Temporal worker is running.",
        ) from exc
    workflow_id = f"refresh-project-{project.id}"
    handle = await client.start_workflow(
        AuditWorkflow.run,
        AuditWorkflowInput(
            project_id=str(project.id),
            url=project.url,
            content_topic=f"Refresh and re-audit content for {project.name}",
            content_type="blog",
            replace_embeddings=True,
        ),
        id=workflow_id,
        task_queue=TEMPORAL_TASK_QUEUE,
        cron_schedule=DEFAULT_CRON_SCHEDULE,
    )
    return RefreshWorkflowResponse(
        workflow_id=handle.id,
        run_id=getattr(handle, "first_execution_run_id", "") or getattr(handle, "result_run_id", ""),
        project_id=project.id,
        cron_schedule=DEFAULT_CRON_SCHEDULE,
        status="scheduled",
    )
