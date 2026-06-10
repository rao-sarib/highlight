"""
Backlink opportunity and outreach generation endpoint for UC-008.
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

router = APIRouter(prefix="/backlinks", tags=["Backlinks"])


class BacklinkOpportunityRequest(BaseModel):
    project_id: uuid.UUID
    target_keyword: str = Field(min_length=2, max_length=255)
    prospect_urls: list[str] = Field(default_factory=list, max_length=10)


class BacklinkOpportunity(BaseModel):
    prospect_url: str
    prospect_title: str | None
    rationale: str
    outreach_email: str


class BacklinkOpportunityResponse(BaseModel):
    project_id: uuid.UUID
    target_keyword: str
    opportunities: list[BacklinkOpportunity]


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post("/opportunities", response_model=BacklinkOpportunityResponse, summary="Find backlink opportunities")
async def find_backlink_opportunities(
    body: BacklinkOpportunityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BacklinkOpportunityResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)
    project_page = await scraper_service.scrape_url(project.url)
    if project_page.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to scrape project site: {project_page.error}",
        )

    discovered_prospects = [
        link.href
        for link in project_page.links
        if not link.is_internal
    ]
    candidate_urls = []
    seen: set[str] = set()
    for url in [*body.prospect_urls, *discovered_prospects]:
        normalized = url.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            candidate_urls.append(normalized)
        if len(candidate_urls) >= 5:
            break

    opportunities: list[BacklinkOpportunity] = []
    for candidate_url in candidate_urls:
        candidate_page = await scraper_service.scrape_url(candidate_url)
        if candidate_page.error:
            continue

        candidate_host = urlparse(candidate_url).netloc
        rationale = (
            f"{candidate_host} publishes related content and could be relevant for the "
            f"keyword '{body.target_keyword.strip()}'."
        )
        outreach_email = await llm_service.generate_custom_text(
            system_instruction=(
                "You write concise, professional backlink outreach emails. Return only the "
                "final email with a subject line, greeting, body, and sign-off."
            ),
            user_prompt=(
                f"Write a personalized outreach email to {candidate_host}. "
                f"Project name: {project.name}. Project URL: {project.url}. "
                f"Project topic keyword: {body.target_keyword.strip()}. "
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
            )
        )

    return BacklinkOpportunityResponse(
        project_id=project.id,
        target_keyword=body.target_keyword.strip(),
        opportunities=opportunities,
    )
