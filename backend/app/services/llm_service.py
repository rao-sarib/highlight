"""
OpenAI-backed LLM service for prompt optimization, embeddings, and content generation.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

CHAT_MODEL = "gpt-4o"
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536
MAX_EMBEDDING_BATCH_SIZE = 128


class LLMServiceError(RuntimeError):
    """Raised when the LLM service cannot complete a request."""


@dataclass(slots=True)
class LLMService:
    """Thin async wrapper around the OpenAI API."""

    api_key: str = field(default_factory=lambda: settings.OPENAI_API_KEY.strip())
    _client: AsyncOpenAI | None = field(default=None, init=False, repr=False)

    def _get_client(self) -> AsyncOpenAI:
        if not self.api_key:
            raise LLMServiceError(
                "OPENAI_API_KEY is not configured. Set it before calling AI features."
            )
        if self._client is None:
            self._client = AsyncOpenAI(api_key=self.api_key)
        return self._client

    async def optimize_prompts(
        self,
        keyword: str,
        niche: str | None = None,
        audience: str | None = None,
    ) -> list[str]:
        """Generate five GEO-friendly prompt variations for a base keyword.

        Niche/audience context (when known) keeps prompts aligned to the site.
        """

        normalized_keyword = keyword.strip()
        if not normalized_keyword:
            raise ValueError("Keyword is required for prompt optimization.")

        context_lines = [f"Keyword: {normalized_keyword}"]
        if niche and niche.strip():
            context_lines.append(f"Site niche: {niche.strip()}")
        if audience and audience.strip():
            context_lines.append(f"Target audience: {audience.strip()}")

        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.7,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a Generative Engine Optimization strategist. "
                        "Return exactly 5 distinct prompts that a user might ask an AI search "
                        "engine about the provided keyword, tailored to the site niche and "
                        "audience when given. Return only valid JSON in the form "
                        '{"prompts":["...","..."]}.'
                    ),
                },
                {
                    "role": "user",
                    "content": "\n".join(context_lines),
                },
            ],
        )
        raw_content = (response.choices[0].message.content or "").strip()
        payload = self._safe_json_object(raw_content)
        prompts = payload.get("prompts", [])
        cleaned_prompts = [
            str(prompt).strip()
            for prompt in prompts
            if isinstance(prompt, str) and prompt.strip()
        ]
        if len(cleaned_prompts) < 5:
            raise LLMServiceError("OpenAI did not return the expected 5 prompts.")
        return cleaned_prompts[:5]

    async def generate_geo_prompts(
        self,
        keyword: str,
        count: int = 4,
        audience: str | None = None,
    ) -> list[str]:
        """Generate brand-neutral buyer questions for live AI-visibility scans.

        The prompts must NOT name any brand — the whole point is testing
        whether the engine brings the brand up organically for category
        questions.
        """

        normalized_keyword = keyword.strip()
        if not normalized_keyword:
            raise ValueError("Keyword is required for GEO prompt generation.")
        count = max(2, min(count, 6))
        user_content = f"Topic: {normalized_keyword}"
        if audience and audience.strip():
            user_content += f"\nTarget audience: {audience.strip()}"

        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.6,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a Generative Engine Optimization strategist. Generate "
                        f"exactly {count} realistic questions that buyers type into AI "
                        "assistants (ChatGPT/Perplexity) when researching the topic. Mix "
                        "intents: 'best X for ...', comparisons, how-to-choose, and "
                        "problem-solving. CRITICAL: never mention any specific brand, "
                        "company, or product name. Return only valid JSON in the form "
                        '{"prompts":["...","..."]}.'
                    ),
                },
                {"role": "user", "content": user_content},
            ],
        )
        raw_content = (response.choices[0].message.content or "").strip()
        payload = self._safe_json_object(raw_content)
        prompts = [
            str(prompt).strip()
            for prompt in payload.get("prompts", [])
            if isinstance(prompt, str) and prompt.strip()
        ]
        if len(prompts) < 2:
            raise LLMServiceError("OpenAI did not return usable GEO prompts.")
        return prompts[:count]

    async def generate_action_plan(
        self,
        niche: str,
        seo_health: float | None,
        top_issues: list[dict[str, Any]],
        gap_prompts: list[str],
        cited_prompts: list[str],
        competitors: list[str],
    ) -> list[dict[str, Any]]:
        """Produce a prioritized SEO+GEO action plan from the analysis signals.

        Returns a list of {priority:int, category, title, detail, effort, impact,
        prompts_targeted:list[str]}.
        """
        context = {
            "niche": niche or "unknown",
            "seo_health_score": seo_health,
            "top_on_page_issues": top_issues[:8],
            "prompts_where_brand_is_absent": gap_prompts[:8],
            "prompts_where_brand_is_cited": cited_prompts[:8],
            "competitors_cited_in_ai_answers": competitors[:8],
        }
        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior SEO + GEO (Generative Engine Optimization) strategist. "
                        "Given an analysis of a website, produce a prioritized, concrete action "
                        "plan to (a) improve on-page SEO and (b) get the brand cited in AI answer "
                        "engines for the prompts where it is currently absent. Each item must be "
                        "specific and doable by a semi-technical user. Return ONLY valid JSON: "
                        '{"actions":[{"priority":1,"category":"geo|seo|content|backlinks",'
                        '"title":"...","detail":"...","effort":"low|medium|high",'
                        '"impact":"low|medium|high","prompts_targeted":["..."]}]}. '
                        "Order by priority (1 = do first). Return 5-8 actions."
                    ),
                },
                {"role": "user", "content": json.dumps(context, ensure_ascii=True, default=str)},
            ],
        )
        payload = self._safe_json_object((response.choices[0].message.content or "").strip())
        actions: list[dict[str, Any]] = []
        for item in payload.get("actions", []):
            if not isinstance(item, dict) or not str(item.get("title", "")).strip():
                continue
            actions.append(
                {
                    "priority": int(item.get("priority", len(actions) + 1)),
                    "category": str(item.get("category", "geo")).strip().lower(),
                    "title": str(item.get("title", "")).strip(),
                    "detail": str(item.get("detail", "")).strip(),
                    "effort": str(item.get("effort", "medium")).strip().lower(),
                    "impact": str(item.get("impact", "medium")).strip().lower(),
                    "prompts_targeted": [
                        str(p).strip() for p in item.get("prompts_targeted", []) if str(p).strip()
                    ][:5],
                }
            )
        actions.sort(key=lambda a: a["priority"])
        return actions[:8]

    async def analyze_site_profile(self, samples: list[str]) -> dict[str, Any]:
        """Infer a site's niche AND seed keywords from sampled titles/headings.

        One call powers the whole auto-mode: returns
        {"niche": str, "keywords": ["...", ...]} (8-12 search keywords real
        users would type when looking for what the site offers).
        """
        joined = " | ".join(s.strip() for s in samples if s and s.strip())[:3500]
        if not joined:
            return {"niche": "", "keywords": []}
        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You classify websites for SEO. From the page signals provided, return "
                        "only valid JSON in the form "
                        '{"niche":"5-12 word description of what the site offers and to whom",'
                        '"keywords":["..."]} '
                        "with 8-12 realistic search keywords (1-4 words each) that potential "
                        "visitors would type into Google or an AI assistant to find this site's "
                        "category. Keywords must be brand-neutral (no site name)."
                    ),
                },
                {"role": "user", "content": joined},
            ],
        )
        payload = self._safe_json_object((response.choices[0].message.content or "").strip())
        niche = str(payload.get("niche", "")).strip().strip('"')[:480]
        keywords: list[str] = []
        seen: set[str] = set()
        for item in payload.get("keywords", []):
            term = str(item).strip()
            if term and term.lower() not in seen:
                seen.add(term.lower())
                keywords.append(term[:80])
        return {"niche": niche, "keywords": keywords[:12]}

    async def check_keyword_relevance(
        self, term: str, niche: str, site_name: str = ""
    ) -> tuple[bool, str]:
        """Guard manual input: is `term` plausibly related to the site's niche?

        Lenient by design — only flags clearly unrelated topics (different
        industry), so legitimate adjacent keywords aren't blocked.
        """
        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You validate SEO keyword targeting. Decide whether the keyword/topic is "
                        "plausibly related to the website's niche. Be LENIENT: adjacent topics, "
                        "broader/narrower phrasings, and audience questions are all relevant. "
                        "Mark relevant=false ONLY when the keyword is clearly a different "
                        "industry or subject with no sensible connection. Return only valid "
                        'JSON: {"relevant":true|false,"reason":"one short sentence"}.'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Website: {site_name or 'n/a'}\nNiche: {niche}\nKeyword/topic: {term}"
                    ),
                },
            ],
        )
        payload = self._safe_json_object((response.choices[0].message.content or "").strip())
        return bool(payload.get("relevant", True)), str(payload.get("reason", "")).strip()

    async def generate_related_keywords(
        self,
        keyword: str,
        context_chunks: list[str],
        limit: int = 12,
    ) -> list[dict[str, Any]]:
        """Generate semantically related keywords, flagging site-content gaps.

        Returns a list of {"term": str, "covered": bool} where `covered` means
        the provided site content already addresses the term.
        """

        normalized_keyword = keyword.strip()
        if not normalized_keyword:
            raise ValueError("Keyword is required for related-keyword generation.")
        limit = max(1, min(limit, 25))

        context_block = " ".join(chunk.strip() for chunk in context_chunks if chunk.strip())
        context_block = context_block[:4000] or "No site content available."

        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a semantic SEO expert. Given a target keyword and excerpts "
                        f"of a site's content, return the {limit} most valuable related "
                        "search terms: LSI terms, entities, synonyms, subtopics, and "
                        "question phrasings real users search. For each term set "
                        '"covered" to true only if the site excerpts already address it. '
                        'Return only valid JSON: {"keywords":[{"term":"...","covered":true}]}.'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Target keyword: {normalized_keyword}\n\nSite content excerpts: "
                        f"{context_block}"
                    ),
                },
            ],
        )
        raw_content = (response.choices[0].message.content or "").strip()
        payload = self._safe_json_object(raw_content)
        keywords: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in payload.get("keywords", []):
            if not isinstance(item, dict):
                continue
            term = str(item.get("term", "")).strip()
            if not term or term.lower() in seen:
                continue
            seen.add(term.lower())
            keywords.append({"term": term, "covered": bool(item.get("covered", False))})
        return keywords[:limit]

    async def generate_content(
        self,
        topic: str,
        context_chunks: list[str],
        content_type: str = "blog",
        niche: str | None = None,
        audience: str | None = None,
    ) -> str:
        """Generate SEO-oriented content using retrieved RAG context.

        Niche/audience (when known) anchor the output to the actual site even
        for manually provided topics.
        """

        normalized_topic = topic.strip()
        if not normalized_topic:
            raise ValueError("Topic is required for content generation.")

        normalized_type = content_type.strip().lower() or "blog"
        context_block = (
            "\n\n".join(f"- {chunk.strip()}" for chunk in context_chunks if chunk.strip())
            or "No additional project context was available."
        )

        content_guidance = {
            "blog": (
                "Write a polished blog post between 900 and 1200 words with a strong intro, "
                "clear H2/H3 structure, and actionable guidance. Make it sound natural and "
                "avoid keyword stuffing."
            ),
            "faq": (
                "Write 8 to 10 FAQ entries. Each answer should be concise but useful, usually "
                "2 to 4 sentences. Format the output with clear question headings."
            ),
            "meta": (
                "Write an SEO title and meta description. Return exactly two lines in this "
                "format: 'Title: ...' and 'Description: ...'. Keep the title under 60 "
                "characters and the description under 155 characters."
            ),
            "geo": (
                "Write a GEO-optimized (Generative Engine Optimization) page section "
                "designed to be cited by AI answer engines like ChatGPT and Perplexity. "
                "Structure it exactly as: (1) '## Direct Answer' — a 40-60 word "
                "self-contained answer an AI can quote verbatim; (2) '## Key Facts' — "
                "4-6 bullet points with specific, citable claims (numbers, comparisons, "
                "concrete capabilities), grounded in the provided context; (3) "
                "'## Frequently Asked Questions' — 5 questions phrased the way users ask "
                "AI assistants, each with a direct 2-3 sentence answer that names the "
                "brand naturally; (4) '## FAQPage Schema' — a ```json code block "
                "containing valid schema.org FAQPage JSON-LD for those 5 questions. "
                "Write factually and avoid marketing fluff — AI engines cite specific, "
                "verifiable statements."
            ),
        }

        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.55,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert SEO content strategist. Use the provided project "
                        "context to create original, factual, high-quality content.\n\n"
                        f"Context: {context_block}\n\n"
                        f"Instruction: {content_guidance.get(normalized_type, content_guidance['blog'])}"
                    ),
                },
                {
                    "role": "user",
                    "content": "\n".join(
                        [
                            f"Topic: {normalized_topic}",
                            *([f"Site niche: {niche.strip()}"] if niche and niche.strip() else []),
                            *(
                                [f"Target audience: {audience.strip()}"]
                                if audience and audience.strip()
                                else []
                            ),
                        ]
                    ),
                },
            ],
        )
        return (response.choices[0].message.content or "").strip()

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a list of text chunks."""

        cleaned_texts = [text.strip() for text in texts if text and text.strip()]
        if not cleaned_texts:
            return []

        client = self._get_client()
        embeddings: list[list[float]] = []
        for index in range(0, len(cleaned_texts), MAX_EMBEDDING_BATCH_SIZE):
            batch = cleaned_texts[index : index + MAX_EMBEDDING_BATCH_SIZE]
            response = await client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
            )
            embeddings.extend(list(item.embedding) for item in response.data)
        return embeddings

    async def generate_seo_fixes(
        self,
        issues: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        """Turn SEO issues into ready-to-apply recommendations."""

        if not issues:
            return []

        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.35,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior technical SEO consultant. For each issue, provide a "
                        "specific fix. Return only valid JSON in the form "
                        '{"fixes":[{"issue_type":"...","ai_suggestion":"..."}]}.'
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps({"issues": issues}, ensure_ascii=True),
                },
            ],
        )
        raw_content = (response.choices[0].message.content or "").strip()
        payload = self._safe_json_object(raw_content)
        fixes = payload.get("fixes", [])
        indexed_fixes: dict[str, str] = {}
        for fix in fixes:
            if not isinstance(fix, dict):
                continue
            issue_type = str(fix.get("issue_type", "")).strip()
            suggestion = str(fix.get("ai_suggestion", "")).strip()
            if issue_type and suggestion:
                indexed_fixes[issue_type] = suggestion

        enriched_issues: list[dict[str, str]] = []
        for issue in issues:
            issue_type = str(issue.get("issue_type", "")).strip()
            enriched_issues.append(
                {
                    **issue,
                    "ai_suggestion": indexed_fixes.get(
                        issue_type,
                        "No AI suggestion was generated for this issue.",
                    ),
                }
            )
        return enriched_issues

    async def generate_custom_text(
        self,
        system_instruction: str,
        user_prompt: str,
        temperature: float = 0.4,
    ) -> str:
        """Generate free-form text for workflows that need custom prompting."""

        normalized_system_instruction = system_instruction.strip()
        normalized_user_prompt = user_prompt.strip()
        if not normalized_system_instruction or not normalized_user_prompt:
            raise ValueError("Both system_instruction and user_prompt are required.")

        client = self._get_client()
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=temperature,
            messages=[
                {"role": "system", "content": normalized_system_instruction},
                {"role": "user", "content": normalized_user_prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()

    @staticmethod
    def _safe_json_object(raw_content: str) -> dict[str, Any]:
        """Best-effort JSON parser for chat responses."""

        if not raw_content:
            raise LLMServiceError("OpenAI returned an empty response.")

        try:
            parsed = json.loads(raw_content)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        start = raw_content.find("{")
        end = raw_content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise LLMServiceError("OpenAI response was not valid JSON.")

        try:
            parsed = json.loads(raw_content[start : end + 1])
        except json.JSONDecodeError as exc:
            logger.error("Failed to decode OpenAI JSON payload: %s", raw_content)
            raise LLMServiceError("OpenAI response could not be parsed as JSON.") from exc

        if not isinstance(parsed, dict):
            raise LLMServiceError("OpenAI response JSON must be an object.")
        return parsed


llm_service = LLMService()
