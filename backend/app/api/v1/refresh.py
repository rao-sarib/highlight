"""
Content refresh scheduling endpoint for UC-009.
"""

from __future__ import annotations

import asyncio
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
from temporalio.client import Client
from temporalio.exceptions import WorkflowAlreadyStartedError

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
    workflow_id = f"refresh-project-{project.id}"
    unavailable = HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Workflow engine is not available right now. Please try again in a moment.",
    )

    # Bounded waits so a slow/cold Temporal never hangs the request past the
    # client timeout (which the UI reports as "cannot reach the backend").
    try:
        client = await asyncio.wait_for(_get_temporal_client(), timeout=15)
    except Exception as exc:  # noqa: BLE001 - any connect failure -> 503
        raise unavailable from exc

    try:
        handle = await asyncio.wait_for(
            client.start_workflow(
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
            ),
            timeout=20,
        )
        run_id = getattr(handle, "first_execution_run_id", "") or getattr(handle, "result_run_id", "")
        run_status = "scheduled"
    except WorkflowAlreadyStartedError:
        # A monthly refresh is already running for this project — from the
        # user's perspective that's success, not an error.
        run_id = ""
        run_status = "already_scheduled"
    except asyncio.TimeoutError as exc:
        raise unavailable from exc

    return RefreshWorkflowResponse(
        workflow_id=workflow_id,
        run_id=run_id,
        project_id=project.id,
        cron_schedule=DEFAULT_CRON_SCHEDULE,
        status=run_status,
    )


class RefreshStatusResponse(BaseModel):
    scheduled: bool
    status: str
    cron_schedule: str
    next_run: str | None = None


@router.get("/status", response_model=RefreshStatusResponse, summary="Current monthly-refresh status")
async def refresh_status(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_REFRESH)),
) -> RefreshStatusResponse:
    """Report whether a monthly refresh is already scheduled for this project, so
    the UI can show the confirmation card on load (not only after clicking)."""
    project = _get_owned_project_or_404(db, project_id, current_user.id)
    workflow_id = f"refresh-project-{project.id}"
    not_scheduled = RefreshStatusResponse(
        scheduled=False, status="none", cron_schedule=DEFAULT_CRON_SCHEDULE, next_run=None
    )
    try:
        client = await asyncio.wait_for(_get_temporal_client(), timeout=10)
        desc = await asyncio.wait_for(client.get_workflow_handle(workflow_id).describe(), timeout=10)
    except Exception:  # noqa: BLE001 - no workflow / engine down -> not scheduled
        return not_scheduled

    status_name = desc.status.name if getattr(desc, "status", None) else "UNKNOWN"
    next_run: str | None = None
    exec_time = getattr(desc, "execution_time", None)
    if exec_time is not None:
        try:
            next_run = exec_time.isoformat()
        except Exception:  # noqa: BLE001
            next_run = None
    return RefreshStatusResponse(
        scheduled=status_name == "RUNNING",
        status=status_name,
        cron_schedule=DEFAULT_CRON_SCHEDULE,
        next_run=next_run,
    )
