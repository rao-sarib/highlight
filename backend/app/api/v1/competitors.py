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

# Sites that serve bot-walls / block scraping (or are user-generated social
# feeds), so they're useless as a content-benchmark target even when they rank.
# Skipped during competitor auto-detection.
UNSCRAPEABLE_HOSTS = (
    "reddit.com", "youtube.com", "youtu.be", "facebook.com", "twitter.com",
    "x.com", "instagram.com", "tiktok.com", "pinterest.com", "linkedin.com",
    "quora.com",
)

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


def _looks_like_url(text: str) -> str | None:
    """If text looks like a URL/domain, return a normalized https URL; else None."""
    t = text.strip()
    if not t or " " in t:
        return None
    if t.startswith("http://") or t.startswith("https://"):
        return t
    # bare domain like "deno.com" or "deno.com/runtime"
    host = t.split("/")[0]
    if "." in host and not host.endswith("."):
        return f"https://{t}"
    return None


async def _search_competitor_urls(query: str, project_url: str, limit: int = 6) -> list[str]:
    """Treat a competitor NAME as a search query and return candidate URLs."""
    result = await serper_service.search(query, num=10)
    if result.error or not result.organic:
        return []
    project_host = urlparse(project_url).netloc.lower().removeprefix("www.")
    out: list[str] = []
    for entry in result.organic:
        host = urlparse(entry.url).netloc.lower().removeprefix("www.")
        if not host or (project_host and host == project_host):
            continue
        if any(host == bad or host.endswith("." + bad) for bad in UNSCRAPEABLE_HOSTS):
            continue
        out.append(entry.url)
        if len(out) >= limit:
            break
    return out


async def _auto_detect_competitors(keyword: str, project_url: str, limit: int = 8) -> list[str]:
    """Return top-ranking pages for the keyword that aren't the project's own site.

    Returns several candidates (skipping bot-walled/social domains) so the caller
    can fall through to the next one if a page can't be fetched.
    """
    result = await serper_service.search(keyword, num=10)
    if result.error or not result.organic:
        return []
    project_host = urlparse(project_url).netloc.lower().removeprefix("www.")
    out: list[str] = []
    for entry in result.organic:
        host = urlparse(entry.url).netloc.lower().removeprefix("www.")
        if not host:
            continue
        if project_host and (host == project_host or project_host in host or host in project_host):
            continue
        # Skip bot-walled / social domains — they scrape to junk ("Please wait
        # for verification") and produce meaningless density + gap terms.
        if any(host == bad or host.endswith("." + bad) for bad in UNSCRAPEABLE_HOSTS):
            continue
        out.append(entry.url)
        if len(out) >= limit:
            break
    return out


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
    manual = (body.competitor_url or "").strip()
    if manual:
        as_url = _looks_like_url(manual)
        if as_url:
            candidates = [as_url]
        else:
            # Treat the input as a competitor NAME -> search for it.
            candidates = await _search_competitor_urls(manual, project.url)
    else:
        candidates = await _auto_detect_competitors(keyword, project.url)
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Couldn't find a competitor for that input. Try a competitor website URL, a "
                "clearer name, or a different keyword."
            ),
        )

    # Cache key is based on the keyword (the actual competitor may vary by which
    # candidate is fetchable), so repeat runs for the same keyword reuse results.
    input_key = make_input_key(manual or "auto", keyword)
    if not body.force_refresh:
        cached = get_cached(db, body.project_id, FEATURE, input_key)
        if cached is not None:
            return CompetitorBenchmarkResponse(
                **cached.payload, cached=True, generated_at=cached.updated_at
            )

    # Project content from indexed embeddings; if none yet (no audit run), fall
    # back to scraping the project's own page so density isn't always 0%.
    project_chunks = db.exec(
        select(Embedding.text_chunk).where(Embedding.project_id == body.project_id)
    ).all()
    project_text = "\n".join(project_chunks)
    if not project_text.strip():
        own_page = await scraper_service.scrape_url(project.url)
        if not own_page.error:
            project_text = own_page.body_text or ""

    # Scrape the first candidate that returns usable content (resilient to a
    # single competitor page that blocks scraping).
    competitor_url = ""
    competitor_page = None
    for cand in candidates:
        page = await scraper_service.scrape_url(cand)
        if not page.error and (page.body_text or "").strip():
            competitor_url = cand
            competitor_page = page
            break
    if competitor_page is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Couldn't fetch a competitor page to compare for this keyword. "
                "Try a different keyword or provide a competitor URL directly."
            ),
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
