"""
Serper API service for fetching real Google SERP data.

Used by Competitor Benchmarking to get actual keyword rankings and
competitor positions rather than relying solely on web scraping.

Get an API key at https://serper.dev (free tier: 2,500 queries/month).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SERPER_API_URL = "https://google.serper.dev/search"
REQUEST_TIMEOUT_SECONDS = 15


@dataclass(slots=True)
class OrganicResult:
    position: int
    title: str
    url: str
    snippet: str


@dataclass(slots=True)
class SerperSearchResult:
    keyword: str
    organic: list[OrganicResult] = field(default_factory=list)
    error: str | None = None


class SerperServiceError(RuntimeError):
    """Raised when the Serper API cannot be reached or returns an error."""


@dataclass(slots=True)
class SerperService:
    """Thin async wrapper around the Serper.dev Google SERP API."""

    api_key: str = field(default_factory=lambda: settings.SERPER_API_KEY.strip())

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def search(self, keyword: str, num: int = 10) -> SerperSearchResult:
        """Fetch organic Google SERP results for a keyword.

        Returns a SerperSearchResult with error set if the API key is missing
        or the request fails, so callers can gracefully fall back.
        """
        if not self.is_configured:
            return SerperSearchResult(
                keyword=keyword,
                error="SERPER_API_KEY is not configured.",
            )

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    SERPER_API_URL,
                    headers={
                        "X-API-KEY": self.api_key,
                        "Content-Type": "application/json",
                    },
                    json={"q": keyword.strip(), "num": num},
                )
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            logger.error("Serper API HTTP error %s for keyword '%s'", exc.response.status_code, keyword)
            return SerperSearchResult(keyword=keyword, error=f"Serper API error: {exc.response.status_code}")
        except Exception as exc:
            logger.error("Serper API request failed for keyword '%s': %s", keyword, exc)
            return SerperSearchResult(keyword=keyword, error=str(exc))

        organic: list[OrganicResult] = []
        for item in data.get("organic", []):
            organic.append(
                OrganicResult(
                    position=int(item.get("position", 0)),
                    title=str(item.get("title", "")),
                    url=str(item.get("link", "")),
                    snippet=str(item.get("snippet", "")),
                )
            )

        return SerperSearchResult(keyword=keyword, organic=organic)

    def find_url_rank(self, results: SerperSearchResult, url: str) -> int | None:
        """Return the SERP rank (1-based) of a URL in the results, or None if not found."""
        if not url:
            return None
        from urllib.parse import urlparse
        target_host = urlparse(url).netloc.lower().removeprefix("www.")
        for result in results.organic:
            result_host = urlparse(result.url).netloc.lower().removeprefix("www.")
            if target_host and target_host in result_host:
                return result.position
        return None


serper_service = SerperService()
