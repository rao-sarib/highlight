"""
HTTP scraper service for extracting page structure and visible content.
"""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass, field
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 30.0
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (compatible; HighlightSEO/1.0; +https://highlight.local)"
)
IGNORED_TEXT_TAGS = ("script", "style", "noscript", "svg", "canvas")
IGNORED_LAYOUT_TAGS = ("header", "footer", "nav", "aside")


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


@dataclass(slots=True)
class HeadingInfo:
    level: int
    text: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "HeadingInfo":
        return cls(level=int(payload["level"]), text=str(payload["text"]).strip())


@dataclass(slots=True)
class LinkInfo:
    href: str
    text: str
    is_internal: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "LinkInfo":
        return cls(
            href=str(payload["href"]).strip(),
            text=str(payload.get("text", "")).strip(),
            is_internal=bool(payload.get("is_internal", False)),
        )


@dataclass(slots=True)
class ScrapedPage:
    url: str
    status_code: int
    title: str | None = None
    meta_description: str | None = None
    headings: list[HeadingInfo] = field(default_factory=list)
    body_text: str = ""
    links: list[LinkInfo] = field(default_factory=list)
    raw_html: str = ""
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "status_code": self.status_code,
            "title": self.title,
            "meta_description": self.meta_description,
            "headings": [heading.to_dict() for heading in self.headings],
            "body_text": self.body_text,
            "links": [link.to_dict() for link in self.links],
            "raw_html": self.raw_html,
            "error": self.error,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ScrapedPage":
        return cls(
            url=str(payload["url"]).strip(),
            status_code=int(payload.get("status_code", 0)),
            title=str(payload["title"]).strip() if payload.get("title") else None,
            meta_description=(
                str(payload["meta_description"]).strip()
                if payload.get("meta_description")
                else None
            ),
            headings=[
                HeadingInfo.from_dict(item)
                for item in payload.get("headings", [])
                if isinstance(item, dict)
            ],
            body_text=str(payload.get("body_text", "")).strip(),
            links=[
                LinkInfo.from_dict(item)
                for item in payload.get("links", [])
                if isinstance(item, dict)
            ],
            raw_html=str(payload.get("raw_html", "")),
            error=str(payload["error"]).strip() if payload.get("error") else None,
        )


@dataclass(slots=True)
class ScraperService:
    """Scrapes HTML pages and extracts SEO-relevant structure."""

    user_agent: str = DEFAULT_USER_AGENT
    timeout: float = REQUEST_TIMEOUT_SECONDS

    async def scrape_url(self, url: str) -> ScrapedPage:
        normalized_url = self._normalize_url(url)
        page = ScrapedPage(url=normalized_url, status_code=0)

        try:
            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=self.timeout,
                headers={"User-Agent": self.user_agent},
            ) as client:
                response = await client.get(normalized_url)
            page.status_code = response.status_code
            page.url = str(response.url)
            page.raw_html = response.text
        except httpx.HTTPError as exc:
            logger.exception("Failed to scrape %s", normalized_url)
            page.error = str(exc)
            return page

        if page.status_code >= 400:
            page.error = f"Request failed with HTTP {page.status_code}."
            return page

        soup = self._parse_html(page.raw_html)
        page.title = self._extract_title(soup)
        page.meta_description = self._extract_meta_description(soup)
        page.headings = self._extract_headings(soup)
        page.links = self._extract_links(soup, page.url)
        page.body_text = self._extract_body_text(soup)
        return page

    @staticmethod
    def _normalize_url(url: str) -> str:
        cleaned = url.strip()
        if not cleaned:
            raise ValueError("URL is required for scraping.")
        parsed = urlparse(cleaned)
        if not parsed.scheme:
            cleaned = f"https://{cleaned}"
            parsed = urlparse(cleaned)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Only valid http(s) URLs can be scraped.")
        return cleaned

    @staticmethod
    def _parse_html(raw_html: str) -> BeautifulSoup:
        try:
            return BeautifulSoup(raw_html, "lxml")
        except Exception:
            return BeautifulSoup(raw_html, "html.parser")

    @staticmethod
    def _extract_title(soup: BeautifulSoup) -> str | None:
        title_tag = soup.find("title")
        if title_tag is None:
            return None
        title_text = _normalize_whitespace(title_tag.get_text(" ", strip=True))
        return title_text or None

    @staticmethod
    def _extract_meta_description(soup: BeautifulSoup) -> str | None:
        tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
        if tag is None:
            return None
        content = _normalize_whitespace(str(tag.get("content", "")))
        return content or None

    @staticmethod
    def _extract_headings(soup: BeautifulSoup) -> list[HeadingInfo]:
        headings: list[HeadingInfo] = []
        for level in range(1, 7):
            for tag in soup.find_all(f"h{level}"):
                text = _normalize_whitespace(tag.get_text(" ", strip=True))
                if text:
                    headings.append(HeadingInfo(level=level, text=text))
        return headings

    @staticmethod
    def _extract_links(soup: BeautifulSoup, page_url: str) -> list[LinkInfo]:
        base_host = urlparse(page_url).netloc.lower()
        links: list[LinkInfo] = []
        seen: set[str] = set()
        for tag in soup.find_all("a", href=True):
            href = urljoin(page_url, str(tag.get("href", "")).strip())
            if not href or href in seen:
                continue
            parsed = urlparse(href)
            if parsed.scheme not in {"http", "https"}:
                continue
            seen.add(href)
            links.append(
                LinkInfo(
                    href=href,
                    text=_normalize_whitespace(tag.get_text(" ", strip=True)),
                    is_internal=parsed.netloc.lower() == base_host,
                )
            )
        return links

    @staticmethod
    def _extract_body_text(soup: BeautifulSoup) -> str:
        working_soup = BeautifulSoup(str(soup), "lxml")
        for tag_name in IGNORED_TEXT_TAGS + IGNORED_LAYOUT_TAGS:
            for tag in working_soup.find_all(tag_name):
                tag.decompose()
        text = working_soup.get_text(" ", strip=True)
        return _normalize_whitespace(text)


scraper_service = ScraperService()


async def scrape_url(url: str) -> ScrapedPage:
    """Backward-compatible convenience wrapper."""

    return await scraper_service.scrape_url(url)
