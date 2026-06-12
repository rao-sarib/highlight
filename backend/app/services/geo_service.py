"""
GEO (Generative Engine Optimisation) service.

Measures real AI-engine visibility: queries Perplexity with several
brand-neutral prompts a buyer might ask, then detects whether the project's
domain/brand is cited in each answer. Produces an "AI Share of Voice" score
plus the competitor domains that got cited instead.

Cost controls (the Perplexity budget is small):
  • model "sonar" with search_context_size=low  (~$0.005/request)
  • max_tokens capped per answer
  • prompts per scan clamped by the API layer (default 4, max 6)
  • results are cached in the visibility_scans table by the API layer
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import asdict, dataclass, field
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
PERPLEXITY_MODEL = "sonar"
PERPLEXITY_TIMEOUT = 45
MAX_ANSWER_TOKENS = 300

# Markers like [1][4] that Perplexity inserts to reference its citations.
_REFERENCE_MARKER = re.compile(r"\[(\d{1,2})\]")

# Words too generic to count as a "brand mention" on their own.
_GENERIC_NAME_WORDS = {
    "the", "and", "for", "with", "app", "site", "web", "website", "online",
    "tool", "tools", "blog", "shop", "store", "official", "group", "tech",
    "digital", "media", "agency", "service", "services", "solutions", "labs",
    "team", "page", "home", "world", "global", "best", "free", "new", "pro",
    "seo", "ai", "platform", "software", "company", "inc", "llc", "ltd",
}


class GeoServiceError(RuntimeError):
    """Raised when the GEO scan cannot run at all (e.g. missing API key)."""


@dataclass(slots=True)
class PromptScanResult:
    """Outcome of testing one prompt against a live AI engine."""

    prompt: str
    status: str = "absent"  # cited | in_sources | absent | error
    answer: str = ""
    citations: list[str] = field(default_factory=list)
    matched_urls: list[str] = field(default_factory=list)
    brand_mentioned_in_text: bool = False
    competitor_domains: list[str] = field(default_factory=list)
    error: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class GeoScanResult:
    """Aggregate of a full multi-prompt visibility scan."""

    share_of_voice: float
    cited_count: int
    in_sources_count: int
    prompt_count: int
    results: list[PromptScanResult]
    top_competitors: list[dict]  # [{"domain": str, "count": int}]


def _host_of(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return ""
    return host.removeprefix("www.")


def _same_site(project_host: str, candidate_host: str) -> bool:
    """Exact host or subdomain match — avoids 'crm.com' matching 'freecrm.com'."""
    if not project_host or not candidate_host:
        return False
    return candidate_host == project_host or candidate_host.endswith(f".{project_host}")


def brand_terms_from(project_name: str, project_url: str) -> list[str]:
    """Derive distinctive brand terms to look for in answer text."""
    terms: list[str] = []

    cleaned_name = project_name.strip()
    if cleaned_name and cleaned_name.lower() not in _GENERIC_NAME_WORDS:
        terms.append(cleaned_name)

    for token in re.findall(r"[A-Za-z][A-Za-z0-9'-]+", cleaned_name):
        lowered = token.lower()
        if len(lowered) >= 4 and lowered not in _GENERIC_NAME_WORDS:
            terms.append(token)

    host = _host_of(project_url)
    root = host.split(".")[0] if host else ""
    if len(root) >= 4 and root not in _GENERIC_NAME_WORDS:
        terms.append(root)

    # Dedupe, preserve order, keep it small.
    seen: set[str] = set()
    unique_terms: list[str] = []
    for term in terms:
        key = term.lower()
        if key not in seen:
            seen.add(key)
            unique_terms.append(term)
    return unique_terms[:6]


def _brand_in_text(answer: str, brand_terms: list[str]) -> bool:
    for term in brand_terms:
        if re.search(rf"\b{re.escape(term)}\b", answer, flags=re.IGNORECASE):
            return True
    return False


@dataclass(slots=True)
class GeoService:
    """Runs live AI-engine visibility scans through Perplexity."""

    api_key: str = field(default_factory=lambda: settings.PERPLEXITY_API_KEY.strip())

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def _query_engine(self, client: httpx.AsyncClient, prompt: str) -> tuple[str, list[str]]:
        """One Perplexity query → (answer_text, citation_urls). Raises on failure."""
        response = await client.post(
            PERPLEXITY_API_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": PERPLEXITY_MODEL,
                "max_tokens": MAX_ANSWER_TOKENS,
                "web_search_options": {"search_context_size": "low"},
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful AI assistant. Answer concisely and factually, "
                            "naming the specific products, brands, or websites you recommend, "
                            "and cite your sources."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()

        answer = str(data.get("choices", [{}])[0].get("message", {}).get("content", ""))

        # The API exposes sources as both `citations` (URL list) and
        # `search_results` (objects). Merge them defensively since the
        # schema has shifted between versions.
        citations: list[str] = [str(url) for url in data.get("citations", []) if url]
        for item in data.get("search_results", []) or []:
            url = str(item.get("url", "")).strip()
            if url and url not in citations:
                citations.append(url)
        return answer, citations

    def _evaluate_prompt(
        self,
        prompt: str,
        answer: str,
        citations: list[str],
        project_host: str,
        brand_terms: list[str],
    ) -> PromptScanResult:
        """Decide cited / in_sources / absent for one answer."""
        referenced_indexes = {int(m) for m in _REFERENCE_MARKER.findall(answer)}

        matched_urls = [url for url in citations if _same_site(project_host, _host_of(url))]
        referenced_urls = [
            citations[i - 1]
            for i in sorted(referenced_indexes)
            if 1 <= i <= len(citations)
        ]
        matched_referenced = [
            url for url in referenced_urls if _same_site(project_host, _host_of(url))
        ]
        brand_mentioned = _brand_in_text(answer, brand_terms)

        if matched_referenced or brand_mentioned:
            status = "cited"
        elif matched_urls:
            status = "in_sources"
        else:
            status = "absent"

        # Competitors = domains the engine actually referenced (fall back to
        # all sources when the answer has no [n] markers), minus our own.
        competitor_pool = referenced_urls or citations
        competitor_domains: list[str] = []
        for url in competitor_pool:
            host = _host_of(url)
            if host and not _same_site(project_host, host) and host not in competitor_domains:
                competitor_domains.append(host)

        return PromptScanResult(
            prompt=prompt,
            status=status,
            answer=answer,
            citations=citations[:8],
            matched_urls=matched_urls[:4],
            brand_mentioned_in_text=brand_mentioned,
            competitor_domains=competitor_domains[:8],
        )

    async def scan(
        self,
        prompts: list[str],
        project_url: str,
        project_name: str,
    ) -> GeoScanResult:
        """Run every prompt against the live engine concurrently and aggregate."""
        if not self.is_configured:
            raise GeoServiceError(
                "PERPLEXITY_API_KEY is not configured — real AI visibility scans need it."
            )

        project_host = _host_of(project_url)
        brand_terms = brand_terms_from(project_name, project_url)

        async with httpx.AsyncClient(timeout=PERPLEXITY_TIMEOUT) as client:
            raw_results = await asyncio.gather(
                *(self._query_engine(client, prompt) for prompt in prompts),
                return_exceptions=True,
            )

        results: list[PromptScanResult] = []
        for prompt, outcome in zip(prompts, raw_results):
            if isinstance(outcome, BaseException):
                logger.warning("GEO scan prompt failed (%s): %s", prompt, outcome)
                results.append(
                    PromptScanResult(prompt=prompt, status="error", error=str(outcome))
                )
                continue
            answer, citations = outcome
            results.append(
                self._evaluate_prompt(prompt, answer, citations, project_host, brand_terms)
            )

        scored = [r for r in results if r.status != "error"]
        if not scored:
            raise GeoServiceError(
                "All AI-engine queries failed — check the Perplexity API key/credits."
            )

        cited = sum(1 for r in scored if r.status == "cited")
        in_sources = sum(1 for r in scored if r.status == "in_sources")
        # Full credit for being cited in the answer, half credit for appearing
        # in the engine's retrieved sources without being cited.
        share_of_voice = round((cited + 0.5 * in_sources) / len(scored) * 100, 1)

        competitor_counter: dict[str, int] = {}
        for result in scored:
            for domain in result.competitor_domains:
                competitor_counter[domain] = competitor_counter.get(domain, 0) + 1
        top_competitors = [
            {"domain": domain, "count": count}
            for domain, count in sorted(
                competitor_counter.items(), key=lambda item: (-item[1], item[0])
            )[:10]
        ]

        return GeoScanResult(
            share_of_voice=share_of_voice,
            cited_count=cited,
            in_sources_count=in_sources,
            prompt_count=len(scored),
            results=results,
            top_competitors=top_competitors,
        )


geo_service = GeoService()
