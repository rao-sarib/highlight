"""
SEO fixes / site-audit endpoints for UC-010.

`POST /fixes/audit`   — crawl the WHOLE site (up to the plan's page cap), run the
                        on-page analyzer per page, store results, score the site,
                        index content, and detect the niche. Runs directly (no
                        Temporal dependency) so it always works.
`GET  /fixes/audit/{project_id}` — return the stored audit (auto-restore on open;
                        no re-crawl unless the user explicitly re-runs).
`POST /fixes/run`     — legacy Temporal trigger, kept for the content workflow.
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from temporalio.client import Client

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_FIXES, get_plan
from app.db.session import get_db
from app.models.page_audit import PageAudit
from app.models.project import Project
from app.models.user import User
from app.services.score_service import record_score
from app.services.site_audit_service import run_site_audit
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


class IssueCount(BaseModel):
    issue_type: str
    count: int


class PageAuditRead(BaseModel):
    url: str
    status_code: int
    title: str | None
    word_count: int
    h1_count: int
    issue_count: int
    issues: list[dict]


class SiteAuditSummary(BaseModel):
    project_id: uuid.UUID
    pages_crawled: int
    total_issues: int
    seo_health_score: float | None
    severity_counts: dict[str, int]
    top_issues: list[IssueCount]
    detected_niche: str | None
    audited_at: str | None
    pages: list[PageAuditRead] = []


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _read_stored_audit(db: Session, project: Project) -> SiteAuditSummary:
    rows = db.exec(
        select(PageAudit)
        .where(PageAudit.project_id == project.id)
        .order_by(PageAudit.issue_count.desc())
    ).all()

    severity_counts = {"critical": 0, "warning": 0, "info": 0}
    issue_type_counts: dict[str, int] = {}
    total_issues = 0
    for row in rows:
        total_issues += row.issue_count
        for issue in row.issues:
            sev = str(issue.get("severity", "info"))
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            it = str(issue.get("issue_type", ""))
            issue_type_counts[it] = issue_type_counts.get(it, 0) + 1

    top_issues = sorted(issue_type_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:8]
    return SiteAuditSummary(
        project_id=project.id,
        pages_crawled=project.pages_crawled,
        total_issues=total_issues,
        seo_health_score=project.seo_health_score,
        severity_counts=severity_counts,
        top_issues=[IssueCount(issue_type=k, count=v) for k, v in top_issues],
        detected_niche=project.detected_niche,
        audited_at=project.last_crawl_at.isoformat() if project.last_crawl_at else None,
        pages=[
            PageAuditRead(
                url=r.url,
                status_code=r.status_code,
                title=r.title,
                word_count=r.word_count,
                h1_count=r.h1_count,
                issue_count=r.issue_count,
                issues=r.issues,
            )
            for r in rows
        ],
    )


@router.post("/audit", response_model=SiteAuditSummary, summary="Crawl & audit the whole site")
async def audit_site(
    body: FixesWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_FIXES)),
) -> SiteAuditSummary:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    plan = get_plan(current_user.plan)
    # Cap synchronous crawls so the request stays responsive; the plan ceiling
    # still applies and is the real product limit.
    max_pages = min(plan.max_crawl_pages, 25)
    try:
        await run_site_audit(project.id, project.url, max_pages=max_pages, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.refresh(project)
    record_score(db, project.id, seo_health=project.seo_health_score)
    return _read_stored_audit(db, project)


@router.get("/audit/{project_id}", response_model=SiteAuditSummary, summary="Get the stored site audit")
def get_site_audit(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SiteAuditSummary:
    project = _get_owned_project_or_404(db, project_id, current_user.id)
    return _read_stored_audit(db, project)


async def _get_temporal_client() -> Client:
    return await Client.connect(TEMPORAL_SERVER_URL, namespace=TEMPORAL_NAMESPACE)


@router.post("/run", response_model=FixesWorkflowResponse, summary="Trigger the Temporal audit workflow")
async def run_seo_fixes_workflow(
    body: FixesWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_FIXES)),
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
