"""
Multi-page website crawler.

Discovers and fetches many pages of a site (not just the homepage), so a
large site with dozens/hundreds of pages can be audited. Strategy:

  1. Seed from sitemap.xml (and sitemap-index files), same-host URLs only.
  2. Breadth-first crawl from the homepage following internal links to fill
     up to `max_pages` (the cap comes from the user's plan).
  3. Fetch concurrently with a small semaphore (fast but polite).

Reuses ScraperService for per-page parsing, so each result is a fully parsed
ScrapedPage (title, meta, headings, body, links).
"""

from __future__ import annotations

import asyncio
import logging
import re
from urllib.parse import urldefrag, urljoin, urlparse

import httpx

from app.core.url_guard import UnsafeUrlError, assert_public_url, safe_get
from app.services.scraper_service import ScrapedPage, scraper_service

logger = logging.getLogger(__name__)

DEFAULT_CONCURRENCY = 5
SITEMAP_TIMEOUT = 15.0
# Skip obvious non-HTML assets when following links.
_SKIP_EXT = re.compile(
    r"\.(?:png|jpe?g|gif|webp|svg|ico|css|js|pdf|zip|gz|mp4|mp3|woff2?|ttf|xml|json)(?:\?|$)",
    re.IGNORECASE,
)
_LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.IGNORECASE)


def _normalize(url: str) -> str:
    """Drop fragments and trailing slash so the same page isn't crawled twice."""
    clean, _frag = urldefrag(url.strip())
    if clean.endswith("/") and len(urlparse(clean).path) > 1:
        clean = clean[:-1]
    return clean


def _host(url: str) -> str:
    return urlparse(url).netloc.lower().removeprefix("www.")


class CrawlerService:
    """Crawls a website up to a page cap using sitemap + BFS."""

    def __init__(self, concurrency: int = DEFAULT_CONCURRENCY) -> None:
        self.concurrency = concurrency

    async def _fetch_sitemap_urls(self, base_url: str, limit: int) -> list[str]:
        """Best-effort sitemap discovery; returns same-host page URLs."""
        parsed = urlparse(base_url)
        root = f"{parsed.scheme}://{parsed.netloc}"
        base_host = _host(base_url)
        candidates = [f"{root}/sitemap.xml", f"{root}/sitemap_index.xml"]
        found: list[str] = []
        seen: set[str] = set()

        try:
            # follow_redirects=False: safe_get re-checks every redirect hop.
            async with httpx.AsyncClient(
                follow_redirects=False,
                timeout=SITEMAP_TIMEOUT,
                headers={"User-Agent": scraper_service.user_agent},
            ) as client:
                # One level of sitemap-index expansion.
                queue = list(candidates)
                checked: set[str] = set()
                while queue and len(found) < limit:
                    sm_url = queue.pop(0)
                    if sm_url in checked:
                        continue
                    checked.add(sm_url)
                    try:
                        resp = await safe_get(client, sm_url)
                        if resp.status_code >= 400 or "xml" not in resp.headers.get(
                            "content-type", "xml"
                        ):
                            continue
                    except UnsafeUrlError as exc:
                        logger.warning("Skipping unsafe sitemap URL %s: %s", sm_url, exc)
                        continue
                    except httpx.HTTPError:
                        continue

                    locs = _LOC_RE.findall(resp.text)
                    for loc in locs:
                        if loc.endswith(".xml") and len(checked) < 10:
                            queue.append(loc)  # nested sitemap
                            continue
                        norm = _normalize(loc)
                        if (
                            _host(norm) == base_host
                            and norm not in seen
                            and not _SKIP_EXT.search(norm)
                        ):
                            seen.add(norm)
                            found.append(norm)
                            if len(found) >= limit:
                                break
        except Exception as exc:  # noqa: BLE001
            logger.info("Sitemap discovery failed for %s: %s", base_url, exc)
        return found

    async def crawl(self, start_url: str, max_pages: int = 20) -> list[ScrapedPage]:
        """Crawl up to `max_pages` pages and return parsed ScrapedPage objects."""
        max_pages = max(1, max_pages)
        start = _normalize(scraper_service._normalize_url(start_url))
        base_host = _host(start)

        # Seed: homepage first, then sitemap URLs, then BFS discovers the rest.
        seeds = await self._fetch_sitemap_urls(start, limit=max_pages * 2)
        queue: list[str] = [start] + [u for u in seeds if u != start]
        seen: set[str] = set(queue)
        results: list[ScrapedPage] = []
        semaphore = asyncio.Semaphore(self.concurrency)

        async def _scrape(url: str) -> ScrapedPage:
            async with semaphore:
                return await scraper_service.scrape_url(url)

        while queue and len(results) < max_pages:
            batch = queue[: self.concurrency]
            queue = queue[self.concurrency :]
            pages = await asyncio.gather(*(_scrape(u) for u in batch), return_exceptions=True)

            for page in pages:
                if isinstance(page, BaseException):
                    continue
                results.append(page)
                if len(results) >= max_pages:
                    break
                # Enqueue newly-discovered internal links (BFS).
                for link in page.links:
                    if not link.is_internal:
                        continue
                    norm = _normalize(urljoin(page.url, link.href))
                    if (
                        _host(norm) == base_host
                        and norm not in seen
                        and not _SKIP_EXT.search(norm)
                    ):
                        seen.add(norm)
                        queue.append(norm)

        return results[:max_pages]


crawler_service = CrawlerService()
