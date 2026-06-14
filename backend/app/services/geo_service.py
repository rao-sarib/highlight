"""
GEO (Generative Engine Optimisation) service — multi-engine AI visibility.

For a set of brand-neutral buyer prompts, asks each available AI answer engine
and detects whether the project's domain/brand is cited:

  • Perplexity  (sonar, returns citations)            — needs PERPLEXITY_API_KEY
  • OpenAI      (gpt-4o-search-preview, web-grounded)  — needs OPENAI_API_KEY
  • Gemini      (gemini + Google Search grounding)     — needs GEMINI_API_KEY
  • Google AI Overview (via Serper SERP API)           — needs SERPER_API_KEY

Produces an overall "AI Share of Voice", a per-engine breakdown, and the
competitor domains cited instead. Cost is bounded: low search context, capped
answer tokens, small prompt counts, and the API layer caches scans for 24h.
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

# Engines
ENGINE_PERPLEXITY = "perplexity"
ENGINE_OPENAI = "openai"
ENGINE_GEMINI = "gemini"
ENGINE_GOOGLE_AIO = "google_aio"

ENGINE_LABELS = {
    ENGINE_PERPLEXITY: "Perplexity",
    ENGINE_OPENAI: "ChatGPT (OpenAI)",
    ENGINE_GEMINI: "Gemini",
    ENGINE_GOOGLE_AIO: "Google AI Overview",
}

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
PERPLEXITY_MODEL = "sonar"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_SEARCH_MODEL = "gpt-4o-search-preview"
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)
SERPER_API_URL = "https://google.serper.dev/search"
ENGINE_TIMEOUT = 45
MAX_ANSWER_TOKENS = 300
MAX_CONCURRENCY = 5

_REFERENCE_MARKER = re.compile(r"\[(\d{1,2})\]")
_MD_LINK = re.compile(r"\]\((https?://[^)\s]+)\)")
_GENERIC_NAME_WORDS = {
    "the", "and", "for", "with", "app", "site", "web", "website", "online",
    "tool", "tools", "blog", "shop", "store", "official", "group", "tech",
    "digital", "media", "agency", "service", "services", "solutions", "labs",
    "team", "page", "home", "world", "global", "best", "free", "new", "pro",
    "seo", "ai", "platform", "software", "company", "inc", "llc", "ltd",
}


class GeoServiceError(RuntimeError):
    """Raised when a GEO scan cannot run at all."""


# Sentinel returned by the Google AI Overview query when Google shows no
# AI Overview for a given prompt (a real, meaningful outcome — not a failure).
NO_OVERVIEW = object()


@dataclass(slots=True)
class EngineAnswer:
    engine: str
    status: str = "absent"  # cited | in_sources | absent | no_overview | error
    answer: str = ""
    citations: list[str] = field(default_factory=list)
    matched_urls: list[str] = field(default_factory=list)
    brand_mentioned_in_text: bool = False
    competitor_domains: list[str] = field(default_factory=list)
    error: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(slots=True)
class PromptScanResult:
    prompt: str
    status: str = "absent"  # aggregated across engines
    engines: list[EngineAnswer] = field(default_factory=list)
    competitor_domains: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "prompt": self.prompt,
            "status": self.status,
            "engines": [e.to_dict() for e in self.engines],
            "competitor_domains": self.competitor_domains,
        }


@dataclass(slots=True)
class GeoScanResult:
    share_of_voice: float
    cited_count: int
    in_sources_count: int
    prompt_count: int
    engines_used: list[str]
    per_engine: list[dict]
    results: list[PromptScanResult]
    top_competitors: list[dict]


def _host_of(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


def _same_site(project_host: str, candidate_host: str) -> bool:
    if not project_host or not candidate_host:
        return False
    return candidate_host == project_host or candidate_host.endswith(f".{project_host}")


def brand_terms_from(project_name: str, project_url: str) -> list[str]:
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
    seen: set[str] = set()
    unique: list[str] = []
    for term in terms:
        key = term.lower()
        if key not in seen:
            seen.add(key)
            unique.append(term)
    return unique[:6]


def _brand_in_text(answer: str, brand_terms: list[str]) -> bool:
    return any(
        re.search(rf"\b{re.escape(term)}\b", answer, flags=re.IGNORECASE) for term in brand_terms
    )


@dataclass(slots=True)
class GeoService:
    """Runs multi-engine AI-visibility scans."""

    perplexity_key: str = field(default_factory=lambda: settings.PERPLEXITY_API_KEY.strip())
    openai_key: str = field(default_factory=lambda: settings.OPENAI_API_KEY.strip())
    gemini_key: str = field(default_factory=lambda: settings.GEMINI_API_KEY.strip())
    serper_key: str = field(default_factory=lambda: settings.SERPER_API_KEY.strip())

    @property
    def is_configured(self) -> bool:
        return bool(self.perplexity_key or self.openai_key or self.gemini_key or self.serper_key)

    def available_engines(self) -> list[str]:
        engines: list[str] = []
        if self.perplexity_key:
            engines.append(ENGINE_PERPLEXITY)
        if self.openai_key:
            engines.append(ENGINE_OPENAI)
        if self.gemini_key:
            engines.append(ENGINE_GEMINI)
        if self.serper_key:
            engines.append(ENGINE_GOOGLE_AIO)
        return engines

    # ── Per-engine queries → (answer_text, citation_urls) ────────────────────
    async def _q_perplexity(self, client: httpx.AsyncClient, prompt: str) -> tuple[str, list[str]]:
        resp = await client.post(
            PERPLEXITY_API_URL,
            headers={"Authorization": f"Bearer {self.perplexity_key}", "Content-Type": "application/json"},
            json={
                "model": PERPLEXITY_MODEL,
                "max_tokens": MAX_ANSWER_TOKENS,
                "web_search_options": {"search_context_size": "low"},
                "messages": [
                    {"role": "system", "content": "Answer concisely and factually, naming the specific products/brands/sites you recommend, and cite sources."},
                    {"role": "user", "content": prompt},
                ],
            },
        )
        resp.raise_for_status()
        data = resp.json()
        answer = str(data.get("choices", [{}])[0].get("message", {}).get("content", ""))
        citations = [str(u) for u in data.get("citations", []) if u]
        for item in data.get("search_results", []) or []:
            url = str(item.get("url", "")).strip()
            if url and url not in citations:
                citations.append(url)
        return answer, citations

    async def _q_openai(self, client: httpx.AsyncClient, prompt: str) -> tuple[str, list[str]]:
        resp = await client.post(
            OPENAI_API_URL,
            headers={"Authorization": f"Bearer {self.openai_key}", "Content-Type": "application/json"},
            json={
                "model": OPENAI_SEARCH_MODEL,
                "max_tokens": MAX_ANSWER_TOKENS,
                "messages": [
                    {"role": "user", "content": f"{prompt} Name the specific products or websites you recommend."},
                ],
            },
        )
        resp.raise_for_status()
        data = resp.json()
        message = data.get("choices", [{}])[0].get("message", {})
        answer = str(message.get("content", ""))
        # Citations come inline as markdown links and/or as annotations.
        citations = _MD_LINK.findall(answer)
        for ann in message.get("annotations", []) or []:
            url = str((ann.get("url_citation") or {}).get("url", "")).strip()
            if url and url not in citations:
                citations.append(url)
        return answer, citations

    async def _q_gemini(self, client: httpx.AsyncClient, prompt: str) -> tuple[str, list[str]]:
        resp = await client.post(
            f"{GEMINI_API_URL}?key={self.gemini_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": f"{prompt} Name the specific products or websites you recommend."}]}],
                "tools": [{"google_search": {}}],
                "generationConfig": {"maxOutputTokens": MAX_ANSWER_TOKENS},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        candidate = (data.get("candidates") or [{}])[0]
        parts = (candidate.get("content") or {}).get("parts") or []
        answer = " ".join(str(p.get("text", "")) for p in parts).strip()
        citations: list[str] = []
        grounding = candidate.get("groundingMetadata") or {}
        for chunk in grounding.get("groundingChunks") or []:
            url = str((chunk.get("web") or {}).get("uri", "")).strip()
            if url and url not in citations:
                citations.append(url)
        return answer, citations

    async def _q_google_aio(self, client: httpx.AsyncClient, prompt: str):
        """Check Google's AI Overview (via Serper) for a prompt.

        Returns (answer_text, citation_urls) when Google shows an AI Overview,
        or NO_OVERVIEW when none is shown for that query (a real outcome — you
        cannot be cited in an overview that does not exist).
        """
        resp = await client.post(
            SERPER_API_URL,
            headers={"X-API-KEY": self.serper_key, "Content-Type": "application/json"},
            json={"q": prompt.strip()},
        )
        resp.raise_for_status()
        data = resp.json()
        aio = data.get("aiOverview") or data.get("ai_overview")
        if not aio:
            return NO_OVERVIEW
        # Text can arrive as a flat snippet or as structured text blocks.
        text = str(aio.get("snippet") or aio.get("text") or "")
        if not text:
            blocks = aio.get("textBlocks") or aio.get("text_blocks") or []
            text = " ".join(str(b.get("snippet") or b.get("text") or "") for b in blocks).strip()
        citations: list[str] = []
        for ref in (aio.get("references") or aio.get("sources") or []):
            url = str(ref.get("link") or ref.get("url") or "").strip()
            if url and url not in citations:
                citations.append(url)
        return text, citations

    async def _query(self, engine: str, client: httpx.AsyncClient, prompt: str):
        if engine == ENGINE_PERPLEXITY:
            return await self._q_perplexity(client, prompt)
        if engine == ENGINE_OPENAI:
            return await self._q_openai(client, prompt)
        if engine == ENGINE_GEMINI:
            return await self._q_gemini(client, prompt)
        if engine == ENGINE_GOOGLE_AIO:
            return await self._q_google_aio(client, prompt)
        raise GeoServiceError(f"Unknown engine: {engine}")

    def _evaluate(
        self, engine: str, answer: str, citations: list[str], project_host: str, brand_terms: list[str]
    ) -> EngineAnswer:
        referenced_indexes = {int(m) for m in _REFERENCE_MARKER.findall(answer)}
        matched_urls = [u for u in citations if _same_site(project_host, _host_of(u))]
        referenced_urls = [citations[i - 1] for i in sorted(referenced_indexes) if 1 <= i <= len(citations)]
        matched_referenced = [u for u in referenced_urls if _same_site(project_host, _host_of(u))]
        brand_mentioned = _brand_in_text(answer, brand_terms)

        if matched_referenced or brand_mentioned:
            status = "cited"
        elif matched_urls:
            status = "in_sources"
        else:
            status = "absent"

        competitor_pool = referenced_urls or citations
        competitors: list[str] = []
        for u in competitor_pool:
            host = _host_of(u)
            if host and not _same_site(project_host, host) and host not in competitors:
                competitors.append(host)

        return EngineAnswer(
            engine=engine,
            status=status,
            answer=answer,
            citations=citations[:8],
            matched_urls=matched_urls[:4],
            brand_mentioned_in_text=brand_mentioned,
            competitor_domains=competitors[:8],
        )

    async def scan(
        self,
        prompts: list[str],
        project_url: str,
        project_name: str,
        allowed_engines: list[str] | None = None,
    ) -> GeoScanResult:
        engines = self.available_engines()
        if not engines:
            raise GeoServiceError(
                "No AI engines are configured (need at least one of PERPLEXITY_API_KEY, "
                "OPENAI_API_KEY, GEMINI_API_KEY, or SERPER_API_KEY)."
            )
        # Plan limit: restrict the scan to the engines the user's tier allows
        # (order preserved). Engines the plan permits but that aren't keyed are
        # simply skipped.
        if allowed_engines is not None:
            allowed = set(allowed_engines)
            engines = [e for e in engines if e in allowed]
            if not engines:
                raise GeoServiceError(
                    "None of your plan's AI engines are configured on the server."
                )

        project_host = _host_of(project_url)
        brand_terms = brand_terms_from(project_name, project_url)
        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        tasks: list[tuple[str, str]] = [(prompt, engine) for prompt in prompts for engine in engines]

        async with httpx.AsyncClient(timeout=ENGINE_TIMEOUT) as client:
            async def run(prompt: str, engine: str):
                async with semaphore:
                    return await self._query(engine, client, prompt)

            raw = await asyncio.gather(*(run(p, e) for p, e in tasks), return_exceptions=True)

        # Group answers by prompt.
        by_prompt: dict[str, list[EngineAnswer]] = {p: [] for p in prompts}
        for (prompt, engine), outcome in zip(tasks, raw):
            if isinstance(outcome, BaseException):
                logger.warning("GEO %s/%s failed: %s", engine, prompt[:40], outcome)
                by_prompt[prompt].append(EngineAnswer(engine=engine, status="error", error=str(outcome)))
            elif outcome is NO_OVERVIEW:
                by_prompt[prompt].append(EngineAnswer(engine=engine, status="no_overview"))
            else:
                answer, citations = outcome
                by_prompt[prompt].append(self._evaluate(engine, answer, citations, project_host, brand_terms))

        # Aggregate per prompt + overall + per engine.
        # "no_overview" (Google showed no AI Overview) and "error" are excluded
        # from share-of-voice math — you cannot be cited where there is nothing.
        results: list[PromptScanResult] = []
        engine_cells: dict[str, list[str]] = {e: [] for e in engines}
        engine_attempts: dict[str, int] = {e: 0 for e in engines}
        engine_errors: dict[str, int] = {e: 0 for e in engines}
        competitor_counter: dict[str, int] = {}
        cited_cells = in_sources_cells = total_cells = 0
        excluded = {"error", "no_overview"}

        for prompt in prompts:
            engine_answers = by_prompt[prompt]
            prompt_competitors: list[str] = []
            statuses = []
            for ea in engine_answers:
                if ea.status == "error":
                    engine_errors[ea.engine] = engine_errors.get(ea.engine, 0) + 1
                else:
                    engine_attempts[ea.engine] = engine_attempts.get(ea.engine, 0) + 1
                if ea.status not in excluded:
                    engine_cells[ea.engine].append(ea.status)
                    total_cells += 1
                    if ea.status == "cited":
                        cited_cells += 1
                    elif ea.status == "in_sources":
                        in_sources_cells += 1
                statuses.append(ea.status)
                for d in ea.competitor_domains:
                    if d not in prompt_competitors:
                        prompt_competitors.append(d)
                    competitor_counter[d] = competitor_counter.get(d, 0) + 1
            # Aggregated prompt status: best across engines.
            if "cited" in statuses:
                agg = "cited"
            elif "in_sources" in statuses:
                agg = "in_sources"
            elif all(s in excluded for s in statuses):
                agg = "absent"
            else:
                agg = "absent"
            results.append(
                PromptScanResult(prompt=prompt, status=agg, engines=engine_answers, competitor_domains=prompt_competitors[:8])
            )

        total_attempts = sum(engine_attempts.values())
        if total_attempts == 0:
            raise GeoServiceError("All AI-engine queries failed — check API keys/credits.")

        share_of_voice = (
            round((cited_cells + 0.5 * in_sources_cells) / total_cells * 100, 1) if total_cells else 0.0
        )

        per_engine: list[dict] = []
        for engine in engines:
            cells = engine_cells[engine]
            attempts = engine_attempts.get(engine, 0)
            errors = engine_errors.get(engine, 0)
            c = cells.count("cited")
            s = cells.count("in_sources")
            responses = len(cells)  # answers that could cite (overview shown, etc.)
            # An engine that errored on every prompt (bad key, no credits, or
            # rate-limited) produced no usable answer. Keep it in the breakdown
            # flagged as unavailable rather than silently dropping it — otherwise
            # the cards disagree with engines_used.
            unavailable = responses == 0 and attempts == 0 and errors > 0
            per_engine.append({
                "engine": engine,
                "label": ENGINE_LABELS.get(engine, engine),
                "share_of_voice": round((c + 0.5 * s) / responses * 100, 1) if responses else 0.0,
                # Direct citation rate: how many responses explicitly cited the brand.
                "cited_rate": round(c / responses * 100, 1) if responses else 0.0,
                "cited": c,
                "in_sources": s,
                "prompts": responses,
                "responses": responses,
                # For Google AI Overview: how many prompts actually triggered an
                # overview vs total prompts asked (overview not always shown).
                "attempted": attempts,
                # How many queries to this engine failed, and whether every one did.
                "errored": errors,
                "unavailable": unavailable,
                "total_prompts": len(prompts),
            })

        # Prompt-level cited count (cited in at least one engine) for headline.
        prompt_cited = sum(1 for r in results if r.status == "cited")
        prompt_in_sources = sum(1 for r in results if r.status == "in_sources")

        top_competitors = [
            {"domain": d, "count": n}
            for d, n in sorted(competitor_counter.items(), key=lambda kv: (-kv[1], kv[0]))[:10]
        ]

        return GeoScanResult(
            share_of_voice=share_of_voice,
            cited_count=prompt_cited,
            in_sources_count=prompt_in_sources,
            prompt_count=len(prompts),
            engines_used=engines,
            per_engine=per_engine,
            results=results,
            top_competitors=top_competitors,
        )


geo_service = GeoService()
