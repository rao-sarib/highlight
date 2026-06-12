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

import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.llm_service import llm_service
from app.services.scraper_service import scraper_service
from app.services.serper_service import serper_service

router = APIRouter(prefix="/backlinks", tags=["Backlinks"])

MAX_PROSPECTS = 5


class BacklinkOpportunityRequest(BaseModel):
    project_id: uuid.UUID
    target_keyword: str = Field(min_length=2, max_length=255)
    prospect_urls: list[str] = Field(default_factory=list, max_length=10)


class BacklinkOpportunity(BaseModel):
    prospect_url: str
    prospect_title: str | None
    rationale: str
    outreach_email: str
    serp_position: int | None = None


class BacklinkOpportunityResponse(BaseModel):
    project_id: uuid.UUID
    target_keyword: str
    opportunities: list[BacklinkOpportunity]
    prospect_source: str = "serp"  # serp | page_links


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


@router.post("/opportunities", response_model=BacklinkOpportunityResponse, summary="Find backlink opportunities")
async def find_backlink_opportunities(
    body: BacklinkOpportunityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BacklinkOpportunityResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    project_host = _host_of(project.url)
    keyword = body.target_keyword.strip()

    # ── Discover prospects ──────────────────────────────────────────────────
    serp_positions: dict[str, int] = {}
    candidate_urls: list[str] = []
    seen_hosts: set[str] = set()
    prospect_source = "page_links"

    def _add_candidate(url: str, position: int | None = None) -> None:
        normalized = url.strip()
        host = _host_of(normalized)
        if not normalized or not host or host == project_host or host in seen_hosts:
            return
        seen_hosts.add(host)
        candidate_urls.append(normalized)
        if position is not None:
            serp_positions[normalized] = position

    # 1. User-supplied URLs always get first priority.
    for url in body.prospect_urls:
        _add_candidate(url)

    # 2. Real Google SERP results for the keyword (when Serper is configured).
    serp_result = await serper_service.search(keyword, num=10)
    if serp_result.error is None and serp_result.organic:
        prospect_source = "serp"
        for item in serp_result.organic:
            if len(candidate_urls) >= MAX_PROSPECTS:
                break
            _add_candidate(item.url, position=item.position)

    # 3. Legacy fallback: external links on the project's own page.
    if len(candidate_urls) < MAX_PROSPECTS and prospect_source == "page_links":
        project_page = await scraper_service.scrape_url(project.url)
        if project_page.error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to scrape project site: {project_page.error}",
            )
        for link in project_page.links:
            if len(candidate_urls) >= MAX_PROSPECTS:
                break
            if not link.is_internal:
                _add_candidate(link.href)

    candidate_urls = candidate_urls[:MAX_PROSPECTS]

    # ── Build outreach for each prospect ────────────────────────────────────
    opportunities: list[BacklinkOpportunity] = []
    for candidate_url in candidate_urls:
        candidate_page = await scraper_service.scrape_url(candidate_url)
        if candidate_page.error:
            continue

        candidate_host = _host_of(candidate_url)
        position = serp_positions.get(candidate_url)
        if position is not None:
            rationale = (
                f"{candidate_host} ranks #{position} on Google for '{keyword}' — a link or "
                "mention from it strengthens both rankings and the sources AI engines cite."
            )
        else:
            rationale = (
                f"{candidate_host} publishes related content and could be relevant for the "
                f"keyword '{keyword}'."
            )

        outreach_email = await llm_service.generate_custom_text(
            system_instruction=(
                "You write concise, professional backlink outreach emails. Return only the "
                "final email with a subject line, greeting, body, and sign-off."
            ),
            user_prompt=(
                f"Write a personalized outreach email to {candidate_host}. "
                f"Project name: {project.name}. Project URL: {project.url}. "
                f"Project topic keyword: {keyword}. "
                f"Prospect page title: {candidate_page.title or 'N/A'}. "
                f"Prospect page summary: {candidate_page.body_text[:500]}."
            ),
            temperature=0.5,
        )
        opportunities.append(
            BacklinkOpportunity(
                prospect_url=candidate_url,
                prospect_title=candidate_page.title,
                rationale=rationale,
                outreach_email=outreach_email,
                serp_position=position,
            )
        )

    return BacklinkOpportunityResponse(
        project_id=project.id,
        target_keyword=keyword,
        opportunities=opportunities,
        prospect_source=prospect_source,
    )
