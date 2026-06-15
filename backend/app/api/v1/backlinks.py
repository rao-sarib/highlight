"""
Backlink opportunity and outreach generation endpoint for UC-008.

Prospect discovery (in priority order):
  1. Serper SERP results — pages that actually rank on Google for the target
     keyword are realistic, relevant link/citation targets.
  2. User-supplied prospect URLs.
  3. Fallback: external links found on the project's own page (legacy mode,
     used only when Serper is not configured).

For GEO, links from pages that rank for the category also feed the sources AI
engines retrieve — so the same outreach supports both SEO and AI visibility.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_BACKLINKS
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.cache_service import get_cached, get_latest_for_feature, make_input_key, upsert_cached
from app.services.llm_service import llm_service
from app.services.project_context import resolve_keyword
from app.services.scraper_service import scraper_service
from app.services.serper_service import serper_service

router = APIRouter(prefix="/backlinks", tags=["Backlinks"])

FEATURE = "backlinks"
# Real link-building works at scale, so we surface up to a few hundred prospects.
MAX_PROSPECTS = 200
# AI writes personalised outreach for the strongest prospects; the rest get a
# clean ready-to-edit template (keeps it fast + cheap even at hundreds).
AI_EMAIL_COUNT = 12


def _variation_queries(keyword: str) -> list[str]:
    """Expand one keyword into related searches to widen prospect discovery."""
    k = keyword.strip()
    return [
        k,
        f"best {k}",
        f"{k} guide",
        f"top {k}",
        f"{k} tools",
        f"{k} blog",
        f"{k} resources",
        f"{k} tutorial",
        f"{k} alternatives",
        f"{k} examples",
        f"{k} for beginners",
        f"{k} tips",
        f"how to {k}",
        f"{k} comparison",
        f"{k} review",
        f"{k} services",
        f"{k} list",
        f"learn {k}",
    ]


def _template_email(project_name: str, project_url: str, keyword: str, host: str, title: str | None) -> str:
    page = title or host
    return (
        f"Subject: Collaboration idea around {keyword}\n\n"
        f"Hi {host} team,\n\n"
        f"I came across your page \"{page}\" while researching {keyword}, and really valued the "
        f"coverage. I run {project_name} ({project_url}), where we publish in-depth resources on "
        f"{keyword}.\n\n"
        f"I'd love to explore a relevant mention, resource link, or guest contribution that adds "
        f"genuine value for your readers. Open to a quick chat?\n\n"
        f"Best regards,\nThe {project_name} team"
    )


class BacklinkOpportunityRequest(BaseModel):
    project_id: uuid.UUID
    # Optional: when omitted, the project's detected niche/keyword is used.
    target_keyword: str | None = Field(default=None, max_length=255)
    prospect_urls: list[str] = Field(default_factory=list, max_length=10)
    force_refresh: bool = False


class BacklinkOpportunity(BaseModel):
    prospect_url: str
    prospect_title: str | None
    rationale: str
    outreach_email: str
    serp_position: int | None = None


class BacklinkOpportunityResponse(BaseModel):
    project_id: uuid.UUID
    target_keyword: str
    opportunities: list[BacklinkOpportunity] = []
    total_found: int = 0
    prospect_source: str = "serp"  # serp | page_links
    cached: bool = False
    generated_at: datetime | None = None


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _host_of(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


@router.get(
    "/{project_id}/latest",
    response_model=BacklinkOpportunityResponse,
    summary="Restore the last backlink result",
)
def latest_backlinks(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BacklinkOpportunityResponse:
    _get_owned_project_or_404(db, project_id, current_user.id)
    row = get_latest_for_feature(db, project_id, FEATURE)
    if row is None:
        return BacklinkOpportunityResponse(project_id=project_id, target_keyword="")
    return BacklinkOpportunityResponse(**row.payload, cached=True, generated_at=row.updated_at)


@router.post("/opportunities", response_model=BacklinkOpportunityResponse, summary="Find backlink opportunities")
async def find_backlink_opportunities(
    body: BacklinkOpportunityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_BACKLINKS)),
) -> BacklinkOpportunityResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    project_host = _host_of(project.url)
    keyword = await resolve_keyword(project, body.target_keyword)

    input_key = make_input_key(keyword, "|".join(sorted(body.prospect_urls)))
    if not body.force_refresh:
        cached = get_cached(db, body.project_id, FEATURE, input_key)
        if cached is not None:
            return BacklinkOpportunityResponse(
                **cached.payload, cached=True, generated_at=cached.updated_at
            )

    # ── Discover prospects at scale ─────────────────────────────────────────
    # Aggregate many real ranking pages across the keyword + related searches,
    # de-duplicated by host so the list reads like a real prospect database.
    candidates: list[dict] = []
    seen_urls: set[str] = set()
    host_counts: dict[str, int] = {}
    prospect_source = "page_links"
    MAX_PER_HOST = 6  # diversity cap so one big site doesn't flood the list

    def _add_candidate(url: str, title: str | None, snippet: str, position: int | None) -> None:
        normalized = (url or "").strip()
        host = _host_of(normalized)
        if not normalized or not host or host == project_host or normalized in seen_urls:
            return
        if host_counts.get(host, 0) >= MAX_PER_HOST:
            return
        seen_urls.add(normalized)
        host_counts[host] = host_counts.get(host, 0) + 1
        candidates.append(
            {"url": normalized, "host": host, "title": title, "snippet": snippet, "position": position}
        )

    # 1. User-supplied URLs first (highest intent).
    for url in body.prospect_urls:
        _add_candidate(url, None, "", None)

    # 2. Real Google SERP across the keyword + related queries (parallel).
    queries = _variation_queries(keyword)
    results = await asyncio.gather(
        *[serper_service.search(q, num=100 if i == 0 else 30) for i, q in enumerate(queries)],
        return_exceptions=True,
    )
    for i, res in enumerate(results):
        if isinstance(res, BaseException) or res.error or not res.organic:
            continue
        prospect_source = "serp"
        for item in res.organic:
            if len(candidates) >= MAX_PROSPECTS:
                break
            # Only trust the rank from the primary keyword query.
            _add_candidate(item.url, item.title, item.snippet, item.position if i == 0 else None)

    # 3. Fallback: external links on the project's own page (Serper unavailable).
    if not candidates and prospect_source == "page_links":
        project_page = await scraper_service.scrape_url(project.url)
        if project_page.error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to scrape project site: {project_page.error}",
            )
        for link in project_page.links:
            if len(candidates) >= MAX_PROSPECTS:
                break
            if not link.is_internal:
                _add_candidate(link.href, None, "", None)

    candidates = candidates[:MAX_PROSPECTS]

    # ── Outreach: AI-personalised for the top prospects, templated for the rest ─
    async def _ai_email(cand: dict) -> str:
        return await llm_service.generate_custom_text(
            system_instruction=(
                "You write concise, professional backlink outreach emails. Return only the "
                "final email with a subject line, greeting, body, and sign-off."
            ),
            user_prompt=(
                f"Write a personalized outreach email to {cand['host']}. "
                f"Project name: {project.name}. Project URL: {project.url}. "
                f"Project topic keyword: {keyword}. "
                f"Prospect page title: {cand.get('title') or 'N/A'}. "
                f"Prospect page summary: {(cand.get('snippet') or '')[:400]}."
            ),
            temperature=0.5,
        )

    top = candidates[:AI_EMAIL_COUNT]
    ai_emails = await asyncio.gather(*[_ai_email(c) for c in top], return_exceptions=True)

    opportunities: list[BacklinkOpportunity] = []
    for idx, cand in enumerate(candidates):
        host = cand["host"]
        position = cand["position"]
        if position is not None:
            rationale = (
                f"{host} ranks #{position} on Google for '{keyword}' — a link or mention from it "
                "strengthens both rankings and the sources AI engines cite."
            )
        else:
            rationale = (
                f"{host} ranks for '{keyword}'-related searches — a mention or link supports both "
                "SEO and AI citations."
            )

        if idx < len(top) and not isinstance(ai_emails[idx], BaseException):
            outreach_email = ai_emails[idx]
        else:
            outreach_email = _template_email(project.name, project.url, keyword, host, cand.get("title"))

        opportunities.append(
            BacklinkOpportunity(
                prospect_url=cand["url"],
                prospect_title=cand.get("title"),
                rationale=rationale,
                outreach_email=outreach_email,
                serp_position=position,
            )
        )

    response = BacklinkOpportunityResponse(
        project_id=project.id,
        target_keyword=keyword,
        opportunities=opportunities,
        total_found=len(opportunities),
        prospect_source=prospect_source,
    )
    payload = response.model_dump(mode="json")
    payload.pop("cached", None)
    payload.pop("generated_at", None)
    row = upsert_cached(db, body.project_id, FEATURE, input_key, payload)
    response.generated_at = row.updated_at
    return response
