"""
Competitor benchmarking endpoint for UC-007.

Uses Serper API (when SERPER_API_KEY is set) for real Google SERP rankings,
and falls back to web-scraping-based keyword density analysis when not configured.
"""

from __future__ import annotations

import re
import uuid
from collections import Counter
from datetime import datetime
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.dependencies import get_current_user, require_feature
from app.core.plans import FEATURE_COMPETITORS
from app.db.session import get_db
from app.models.embedding import Embedding
from app.models.project import Project
from app.models.user import User
from app.services.cache_service import get_cached, get_latest_for_feature, make_input_key, upsert_cached
from app.services.project_context import resolve_keyword
from app.services.scraper_service import scraper_service
from app.services.serper_service import serper_service

router = APIRouter(prefix="/competitors", tags=["Competitors"])

FEATURE = "competitors"

TOKEN_PATTERN = re.compile(r"[a-zA-Z][a-zA-Z0-9-]+")
STOP_WORDS = {
    "about", "after", "again", "also", "because", "been", "being", "from", "into",
    "just", "more", "most", "other", "over", "same", "some", "such", "than", "that",
    "their", "them", "then", "there", "these", "they", "this", "very", "what", "when",
    "where", "which", "while", "with", "your", "have", "will", "would", "could", "should",
}


class CompetitorBenchmarkRequest(BaseModel):
    project_id: uuid.UUID
    # Both optional: keyword falls back to the project niche; competitor is
    # auto-detected from Google SERP for the keyword when omitted.
    competitor_url: str | None = Field(default=None, max_length=2083)
    keyword: str | None = Field(default=None, max_length=255)
    force_refresh: bool = False


class SerpEntry(BaseModel):
    position: int
    title: str
    url: str
    snippet: str


class CompetitorBenchmarkResponse(BaseModel):
    project_id: uuid.UUID
    competitor_url: str
    keyword: str
    project_keyword_density: float
    competitor_keyword_density: float
    density_gap: float
    semantic_gap_terms: list[str]
    competitor_title: str | None
    # SERP data (populated when SERPER_API_KEY is configured)
    competitor_serp_rank: int | None = None
    serp_top_results: list[SerpEntry] = []
    serp_data_available: bool = False
    cached: bool = False
    generated_at: datetime | None = None


def _get_owned_project_or_404(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _auto_detect_competitor(keyword: str, project_url: str) -> str | None:
    """Pick the top-ranking page for the keyword that isn't the project's own site."""
    result = await serper_service.search(keyword, num=10)
    if result.error or not result.organic:
        return None
    project_host = urlparse(project_url).netloc.lower().removeprefix("www.")
    for entry in result.organic:
        host = urlparse(entry.url).netloc.lower().removeprefix("www.")
        if host and project_host and host != project_host and project_host not in host and host not in project_host:
            return entry.url
    return None


def _keyword_density(text: str, keyword: str) -> float:
    tokens = TOKEN_PATTERN.findall(text.lower())
    if not tokens:
        return 0.0
    keyword_tokens = TOKEN_PATTERN.findall(keyword.lower())
    if not keyword_tokens:
        return 0.0
    keyword_phrase = " ".join(keyword_tokens)
    joined_text = " ".join(tokens)
    occurrences = joined_text.count(keyword_phrase)
    return round((occurrences / len(tokens)) * 100, 3)


def _top_terms(text: str, limit: int = 10) -> list[str]:
    tokens = [
        token for token in TOKEN_PATTERN.findall(text.lower())
        if len(token) > 3 and token not in STOP_WORDS
    ]
    return [term for term, _count in Counter(tokens).most_common(limit)]


@router.get(
    "/{project_id}/latest",
    response_model=CompetitorBenchmarkResponse,
    summary="Restore the last competitor benchmark",
)
def latest_benchmark(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompetitorBenchmarkResponse:
    _get_owned_project_or_404(db, project_id, current_user.id)
    row = get_latest_for_feature(db, project_id, FEATURE)
    if row is None:
        return CompetitorBenchmarkResponse(
            project_id=project_id,
            competitor_url="",
            keyword="",
            project_keyword_density=0.0,
            competitor_keyword_density=0.0,
            density_gap=0.0,
            semantic_gap_terms=[],
            competitor_title=None,
        )
    return CompetitorBenchmarkResponse(**row.payload, cached=True, generated_at=row.updated_at)


@router.post("/benchmark", response_model=CompetitorBenchmarkResponse, summary="Benchmark competitor SEO")
async def benchmark_competitor(
    body: CompetitorBenchmarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature(FEATURE_COMPETITORS)),
) -> CompetitorBenchmarkResponse:
    project = _get_owned_project_or_404(db, body.project_id, current_user.id)

    # Auto-mode: keyword from niche when omitted (relevance-guarded if manual);
    # competitor auto-detected from the keyword's SERP when omitted.
    keyword = await resolve_keyword(project, body.keyword)
    competitor_url = (body.competitor_url or "").strip()
    if not competitor_url:
        competitor_url = await _auto_detect_competitor(keyword, project.url) or ""
        if not competitor_url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Couldn't auto-detect a competitor for this keyword. Provide a "
                    "competitor URL, or ensure SERPER_API_KEY is configured."
                ),
            )

    input_key = make_input_key(competitor_url, keyword)
    if not body.force_refresh:
        cached = get_cached(db, body.project_id, FEATURE, input_key)
        if cached is not None:
            return CompetitorBenchmarkResponse(
                **cached.payload, cached=True, generated_at=cached.updated_at
            )

    # Project content from indexed embeddings
    project_chunks = db.exec(
        select(Embedding.text_chunk).where(Embedding.project_id == body.project_id)
    ).all()
    project_text = "\n".join(project_chunks)

    # Scrape competitor page for content analysis
    competitor_page = await scraper_service.scrape_url(competitor_url)
    if competitor_page.error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to scrape competitor URL: {competitor_page.error}",
        )

    project_density = _keyword_density(project_text, keyword)
    competitor_density = _keyword_density(competitor_page.body_text, keyword)
    project_terms = set(_top_terms(project_text, limit=20))
    competitor_terms = _top_terms(competitor_page.body_text, limit=20)
    semantic_gap_terms = [term for term in competitor_terms if term not in project_terms][:10]

    # Serper API — fetch real Google SERP rankings for the keyword
    serp_result = await serper_service.search(keyword, num=10)
    serp_data_available = serp_result.error is None and bool(serp_result.organic)
    competitor_serp_rank = None
    serp_top_results: list[SerpEntry] = []

    if serp_data_available:
        competitor_serp_rank = serper_service.find_url_rank(serp_result, competitor_url)
        serp_top_results = [
            SerpEntry(
                position=r.position,
                title=r.title,
                url=r.url,
                snippet=r.snippet,
            )
            for r in serp_result.organic[:5]
        ]

    response = CompetitorBenchmarkResponse(
        project_id=body.project_id,
        competitor_url=competitor_url,
        keyword=keyword,
        project_keyword_density=project_density,
        competitor_keyword_density=competitor_density,
        density_gap=round(competitor_density - project_density, 3),
        semantic_gap_terms=semantic_gap_terms,
        competitor_title=competitor_page.title,
        competitor_serp_rank=competitor_serp_rank,
        serp_top_results=serp_top_results,
        serp_data_available=serp_data_available,
    )
    payload = response.model_dump(mode="json")
    payload.pop("cached", None)
    payload.pop("generated_at", None)
    row = upsert_cached(db, body.project_id, FEATURE, input_key, payload)
    response.generated_at = row.updated_at
    return response
