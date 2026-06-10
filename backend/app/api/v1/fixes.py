"""
SEO fixes workflow endpoint for UC-010.
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
from temporalio.client import Client

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.temporal.workflows.audit_workflow import AuditWorkflow, AuditWorkflowInput

router = APIRouter(prefix="/fixes", tags=["SEO Fixes"])

TEMPORAL_SERVER_URL = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "default")
TEMPORAL_TASK_QUEUE = os.getenv("TEMPORAL_TASK_QUEUE", "highlight-seo-task-queue")


class FixesWorkflowRequest(BaseModel):
    project_id: uuid.UUID


class FixesWorkflowResponse(BaseModel):
    workflow_id: str
    run_id: str
    project_id: uuid.UUID
    status: str


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _get_temporal_client() -> Client:
    return await Client.connect(TEMPORAL_SERVER_URL, namespace=TEMPORAL_NAMESPACE)


@router.post("/run", response_model=FixesWorkflowResponse, summary="Trigger the SEO audit workflow")
async def run_seo_fixes_workflow(
    body: FixesWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FixesWorkflowResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    try:
        client = await _get_temporal_client()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workflow engine is not available. Please ensure the Temporal worker is running.",
        ) from exc
    workflow_id = f"audit-project-{project.id}-{uuid.uuid4()}"
    handle = await client.start_workflow(
        AuditWorkflow.run,
        AuditWorkflowInput(
            project_id=str(project.id),
            url=project.url,
            content_topic=f"SEO fixes for {project.name}",
            content_type="meta",
            replace_embeddings=True,
        ),
        id=workflow_id,
        task_queue=TEMPORAL_TASK_QUEUE,
    )
    return FixesWorkflowResponse(
        workflow_id=handle.id,
        run_id=getattr(handle, "first_execution_run_id", "") or getattr(handle, "result_run_id", ""),
        project_id=project.id,
        status="started",
    )
