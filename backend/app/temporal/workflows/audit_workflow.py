"""
Temporal workflow that orchestrates scraping, SEO analysis, RAG indexing, and saving.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import urlparse

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.temporal.activities.ai_activities import (
        generate_project_content_activity,
        generate_seo_fixes_activity,
        index_project_content_activity,
        mark_project_audited_activity,
    )
    from app.temporal.activities.scrape_activities import (
        analyze_seo_activity,
        scrape_website_activity,
    )


@dataclass
class AuditWorkflowInput:
    project_id: str
    url: str
    content_topic: str | None = None
    content_type: str = "meta"
    replace_embeddings: bool = True


@workflow.defn
class AuditWorkflow:
    """Main audit workflow for Phase 2."""

    @workflow.run
    async def run(self, payload: AuditWorkflowInput) -> dict:
        scrape_timeout = timedelta(minutes=2)
        ai_timeout = timedelta(minutes=5)

        scraped_page = await workflow.execute_activity(
            scrape_website_activity,
            payload.url,
            start_to_close_timeout=scrape_timeout,
        )

        issues = await workflow.execute_activity(
            analyze_seo_activity,
            scraped_page,
            start_to_close_timeout=scrape_timeout,
        )

        body_text = str(scraped_page.get("body_text", "")).strip()
        index_result: dict | None = None
        if body_text:
            index_result = await workflow.execute_activity(
                index_project_content_activity,
                args=[payload.project_id, body_text, payload.replace_embeddings],
                start_to_close_timeout=ai_timeout,
            )

        seo_fix_result: dict | None = None
        if issues:
            seo_fix_result = await workflow.execute_activity(
                generate_seo_fixes_activity,
                args=[payload.project_id, payload.url, issues],
                start_to_close_timeout=ai_timeout,
            )

        resolved_topic = (payload.content_topic or "").strip() or self._default_topic(
            scraped_page=scraped_page,
            url=payload.url,
        )

        generated_content_result = await workflow.execute_activity(
            generate_project_content_activity,
            args=[payload.project_id, resolved_topic, payload.content_type],
            start_to_close_timeout=ai_timeout,
        )

        audit_marker = await workflow.execute_activity(
            mark_project_audited_activity,
            payload.project_id,
            start_to_close_timeout=timedelta(seconds=30),
        )

        return {
            "project_id": payload.project_id,
            "url": payload.url,
            "scraped_page": scraped_page,
            "issues": issues,
            "index_result": index_result,
            "seo_fix_result": seo_fix_result,
            "generated_content_result": generated_content_result,
            "audit_marker": audit_marker,
        }

    @staticmethod
    def _default_topic(scraped_page: dict, url: str) -> str:
        title = str(scraped_page.get("title", "")).strip()
        if title:
            return title

        headings = scraped_page.get("headings", [])
        if headings:
            first_heading = headings[0]
            if isinstance(first_heading, dict):
                heading_text = str(first_heading.get("text", "")).strip()
                if heading_text:
                    return heading_text

        hostname = urlparse(url).netloc
        return f"SEO content for {hostname or url}"
