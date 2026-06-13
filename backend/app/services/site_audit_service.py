"""
Site-wide audit service.

Crawls many pages, runs the on-page SEO analyzer on each, stores a PageAudit
row per page, computes a site health score, indexes the combined content for
RAG, and auto-detects the site's niche. Callable directly (no Temporal needed)
so the SEO Fixes feature works on the whole site, not just the homepage.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlmodel import Session, delete

from app.models.page_audit import PageAudit
from app.models.project import Project
from app.services.crawler_service import crawler_service
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.services.scraper_service import ScrapedPage
from app.services.seo_analyzer import seo_analyzer

logger = logging.getLogger(__name__)

_SEVERITY_WEIGHT = {"critical": 15.0, "warning": 6.0, "info": 2.0}
_MAX_INDEX_CHARS_PER_PAGE = 4000
_MAX_INDEX_CHARS_TOTAL = 60000


def _page_penalty(issues: list[dict]) -> float:
    penalty = sum(_SEVERITY_WEIGHT.get(str(i.get("severity", "")), 4.0) for i in issues)
    return min(penalty, 100.0)


async def run_site_audit(
    project_id: uuid.UUID | str,
    url: str,
    max_pages: int,
    db: Session,
    detect_niche: bool = True,
) -> dict:
    """Crawl + audit a whole site, persist results, return an aggregate summary."""
    pid = uuid.UUID(str(project_id))

    pages = await crawler_service.crawl(url, max_pages=max_pages)
    ok_pages: list[ScrapedPage] = [p for p in pages if p.status_code and p.status_code < 400]
    if not ok_pages:
        raise ValueError("The crawler could not fetch any pages from this site.")

    # Replace previous page-level audit rows for this project.
    db.exec(delete(PageAudit).where(PageAudit.project_id == pid))

    issue_type_counts: dict[str, int] = {}
    severity_counts: dict[str, int] = {"critical": 0, "warning": 0, "info": 0}
    total_penalty = 0.0
    total_issues = 0

    for page in ok_pages:
        issues = [issue.to_dict() for issue in seo_analyzer.analyze(page)]
        total_penalty += _page_penalty(issues)
        total_issues += len(issues)
        for issue in issues:
            issue_type_counts[issue["issue_type"]] = issue_type_counts.get(issue["issue_type"], 0) + 1
            sev = str(issue.get("severity", "info"))
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
        db.add(
            PageAudit(
                project_id=pid,
                url=page.url,
                status_code=page.status_code,
                title=(page.title or None),
                meta_description=(page.meta_description or None),
                word_count=len(page.body_text.split()),
                h1_count=sum(1 for h in page.headings if h.level == 1),
                internal_link_count=sum(1 for link in page.links if link.is_internal),
                issue_count=len(issues),
                issues=issues,
            )
        )

    health_score = round(max(0.0, 100.0 - (total_penalty / len(ok_pages))), 1)

    # Index combined content for RAG (bounded to keep embedding cost sane).
    combined: list[str] = []
    running = 0
    for page in ok_pages:
        snippet = page.body_text[:_MAX_INDEX_CHARS_PER_PAGE]
        if not snippet:
            continue
        combined.append(snippet)
        running += len(snippet)
        if running >= _MAX_INDEX_CHARS_TOTAL:
            break
    combined_text = "\n\n".join(combined)
    chunk_count = 0
    if combined_text:
        chunk_count = await rag_service.replace_project_embeddings(pid, combined_text, db=db)

    # Detect niche + seed keywords from titles + headings across the site.
    detected = None
    detected_keywords: list[str] = []
    if detect_niche:
        samples: list[str] = []
        for page in ok_pages[:12]:
            if page.title:
                samples.append(page.title)
            samples.extend(h.text for h in page.headings[:3])
        try:
            profile = await llm_service.analyze_site_profile(samples)
            detected = profile.get("niche") or None
            detected_keywords = profile.get("keywords", [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Site profile detection failed: %s", exc)

    # Update project headline fields.
    project = db.get(Project, pid)
    now = datetime.now(timezone.utc)
    if project is not None:
        project.pages_crawled = len(ok_pages)
        project.last_crawl_at = now
        project.last_audited_at = now
        project.seo_health_score = health_score
        if detected:
            project.detected_niche = detected
        if detected_keywords:
            project.detected_keywords = detected_keywords
        db.add(project)

    db.commit()

    top_issues = sorted(issue_type_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:8]
    return {
        "project_id": str(pid),
        "pages_crawled": len(ok_pages),
        "total_issues": total_issues,
        "seo_health_score": health_score,
        "severity_counts": severity_counts,
        "top_issues": [{"issue_type": k, "count": v} for k, v in top_issues],
        "detected_niche": detected,
        "detected_keywords": detected_keywords,
        "indexed_chunks": chunk_count,
        "audited_at": now.isoformat(),
    }
