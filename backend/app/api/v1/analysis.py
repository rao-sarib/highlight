"""
"Run Full Analysis" orchestrator (UC — automated pipeline).

One call chains the whole product:
  1. Crawl + on-page audit the whole site (stores page_audits, detects niche, indexes).
  2. Generate brand-neutral buyer prompts from the niche.
  3. Multi-engine AI-visibility scan (Perplexity + ChatGPT + Gemini-if-keyed).
  4. Generate a prioritized SEO + GEO action plan from all signals.

The unified report is cached so the page restores it on open without re-running.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_ACTION_PLAN, get_plan
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.models.visibility_scan import VisibilityScan
from app.services.cache_service import get_latest_for_feature, upsert_cached
from app.services.geo_service import GeoServiceError, geo_service
from app.services.llm_service import llm_service
from app.services.quota_service import consume_scan
from app.services.site_audit_service import run_site_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Full Analysis"])

FEATURE = "analysis"
ORCHESTRATOR_MAX_PAGES = 12  # keep the synchronous run responsive
ORCHESTRATOR_PROMPTS = 3


class RunAnalysisRequest(BaseModel):
    project_id: uuid.UUID
    prompt_count: int = Field(default=ORCHESTRATOR_PROMPTS, ge=2, le=5)


class ActionItem(BaseModel):
    priority: int
    category: str
    title: str
    detail: str
    effort: str
    impact: str
    prompts_targeted: list[str] = []


class AnalysisReport(BaseModel):
    project_id: uuid.UUID
    niche: str | None = None
    # ── SEO (secondary) ──────────────────────────────────────────────
    seo_health_score: float | None = None
    pages_crawled: int = 0
    total_issues: int = 0
    top_issues: list[dict] = []
    severity_counts: dict = {}
    # ── GEO / AI visibility (primary) ────────────────────────────────
    share_of_voice: float | None = None
    engines_used: list[str] = []
    per_engine: list[dict] = []
    cited_count: int = 0
    in_sources_count: int = 0
    prompt_count: int = 0
    cited_prompts: list[str] = []
    gap_prompts: list[str] = []
    competitors: list[str] = []
    # ── Narrative ────────────────────────────────────────────────────
    strengths: list[str] = []
    action_plan: list[ActionItem] = []
    generated_at: datetime | None = None


def _build_strengths(
    *,
    seo_health: float | None,
    severity_counts: dict,
    pages_crawled: int,
    per_engine: list[dict],
    cited_prompts: list[str],
    in_sources_count: int,
) -> list[str]:
    """Surface what's already working — GEO wins first, then SEO foundations."""
    wins: list[str] = []

    # GEO wins lead the report.
    for eng in per_engine:
        cited = eng.get("cited", 0)
        responses = eng.get("responses", eng.get("prompts", 0))
        if cited and responses:
            rate = eng.get("cited_rate", round(cited / responses * 100, 1))
            wins.append(
                f"{eng.get('label', eng.get('engine'))}: your site is cited in "
                f"{cited} of {responses} AI answers ({rate}%)."
            )
    if cited_prompts:
        wins.append(
            f"Already the recommended answer for {len(cited_prompts)} buyer "
            f"question{'s' if len(cited_prompts) != 1 else ''} across AI engines."
        )
    elif in_sources_count:
        wins.append(
            f"Appears in the sources AI engines consulted for {in_sources_count} "
            "question(s) — close to being cited."
        )

    # SEO foundations (secondary).
    if seo_health is not None and seo_health >= 80:
        wins.append(f"Strong technical SEO foundation — health score {seo_health:.0f}/100.")
    elif seo_health is not None and seo_health >= 65:
        wins.append(f"Healthy technical SEO baseline — health score {seo_health:.0f}/100.")
    if not severity_counts.get("critical") and pages_crawled:
        wins.append(f"No critical on-page issues across {pages_crawled} crawled page(s).")

    return wins


def _owned(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/{project_id}/latest", response_model=AnalysisReport | None, summary="Restore last full analysis")
def latest_analysis(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisReport | None:
    _owned(db, project_id, current_user.id)
    row = get_latest_for_feature(db, project_id, FEATURE)
    if row is None:
        return None
    return AnalysisReport(**row.payload)


@router.post("/run", response_model=AnalysisReport, summary="Run the full SEO + GEO analysis")
async def run_full_analysis(
    body: RunAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_ACTION_PLAN)),
) -> AnalysisReport:
    project = _owned(db, body.project_id, current_user.id)
    plan = get_plan(current_user.plan)

    # 1. Whole-site audit (crawl + on-page + niche detect + index).
    max_pages = min(plan.max_crawl_pages, ORCHESTRATOR_MAX_PAGES)
    try:
        audit = await run_site_audit(project.id, project.url, max_pages=max_pages, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.refresh(project)

    niche = project.niche or audit.get("detected_niche") or project.detected_niche or project.name

    # 2-3. GEO prompts + multi-engine scan (only if engines configured).
    share_of_voice = None
    engines_used: list[str] = []
    per_engine: list[dict] = []
    gap_prompts: list[str] = []
    cited_prompts: list[str] = []
    competitors: list[str] = []
    cited_count = 0
    in_sources_count = 0
    prompt_count = 0

    if geo_service.is_configured:
        try:
            consume_scan(current_user, db)
            prompts = await llm_service.generate_geo_prompts(
                niche, count=body.prompt_count, audience=project.target_audience
            )
            scan = await geo_service.scan(prompts, project.url, project.name)

            db.add(
                VisibilityScan(
                    project_id=project.id,
                    keyword=niche.lower()[:255],
                    share_of_voice=scan.share_of_voice,
                    cited_count=scan.cited_count,
                    in_sources_count=scan.in_sources_count,
                    prompt_count=scan.prompt_count,
                    results=[r.to_dict() for r in scan.results],
                    top_competitors=scan.top_competitors,
                    engines_used=scan.engines_used,
                    per_engine=scan.per_engine,
                )
            )
            project.ai_visibility_score = scan.share_of_voice
            db.add(project)
            db.commit()

            share_of_voice = scan.share_of_voice
            engines_used = scan.engines_used
            per_engine = scan.per_engine
            cited_count = scan.cited_count
            in_sources_count = scan.in_sources_count
            prompt_count = scan.prompt_count
            gap_prompts = [r.prompt for r in scan.results if r.status not in ("cited", "in_sources")]
            cited_prompts = [r.prompt for r in scan.results if r.status == "cited"]
            competitors = [c["domain"] for c in scan.top_competitors]
        except GeoServiceError as exc:
            logger.warning("Visibility scan skipped in orchestrator: %s", exc)

    # 4. Action plan from all signals.
    try:
        action_plan = await llm_service.generate_action_plan(
            niche=niche,
            seo_health=audit.get("seo_health_score"),
            top_issues=audit.get("top_issues", []),
            gap_prompts=gap_prompts,
            cited_prompts=cited_prompts,
            competitors=competitors,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Action plan generation failed: %s", exc)
        action_plan = []

    severity_counts = audit.get("severity_counts", {}) or {}
    strengths = _build_strengths(
        seo_health=audit.get("seo_health_score"),
        severity_counts=severity_counts,
        pages_crawled=audit.get("pages_crawled", 0),
        per_engine=per_engine,
        cited_prompts=cited_prompts,
        in_sources_count=in_sources_count,
    )

    report = AnalysisReport(
        project_id=project.id,
        niche=niche,
        seo_health_score=audit.get("seo_health_score"),
        pages_crawled=audit.get("pages_crawled", 0),
        total_issues=audit.get("total_issues", 0),
        top_issues=audit.get("top_issues", []),
        severity_counts=severity_counts,
        share_of_voice=share_of_voice,
        engines_used=engines_used,
        per_engine=per_engine,
        cited_count=cited_count,
        in_sources_count=in_sources_count,
        prompt_count=prompt_count,
        cited_prompts=cited_prompts,
        gap_prompts=gap_prompts,
        competitors=competitors,
        strengths=strengths,
        action_plan=[ActionItem(**a) for a in action_plan],
        generated_at=datetime.now(timezone.utc),
    )

    upsert_cached(db, project.id, FEATURE, "", report.model_dump(mode="json"))
    return report
