"""
Temporal activities for OpenAI generation, RAG indexing, and persistence.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlmodel import Session
from temporalio import activity

from app.db.session import engine
from app.models.content import Content, ContentStatus, ContentType
from app.models.project import Project
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service


def _normalize_content_type(value: str) -> ContentType:
    normalized = value.strip().lower()
    for item in ContentType:
        if item.value == normalized:
            return item
    return ContentType.BLOG


def _format_fix_content(url: str, issues: list[dict[str, str]]) -> str:
    lines = [f"SEO fixes generated for {url}", ""]
    for index, issue in enumerate(issues, start=1):
        lines.append(f"{index}. Issue: {issue.get('description', '').strip()}")
        lines.append(f"Severity: {issue.get('severity', '').strip()}")
        if issue.get("current_value"):
            lines.append(f"Current value: {issue['current_value'].strip()}")
        lines.append(f"Suggestion: {issue.get('ai_suggestion', '').strip()}")
        lines.append("")
    return "\n".join(lines).strip()


@activity.defn
async def optimize_prompts_activity(keyword: str) -> list[str]:
    activity.logger.info("Optimizing prompts for keyword '%s'", keyword)
    return await llm_service.optimize_prompts(keyword)


@activity.defn
async def index_project_content_activity(
    project_id: str,
    raw_text: str,
    replace_existing: bool = True,
) -> dict[str, str | int]:
    activity.logger.info("Indexing project content for %s", project_id)
    chunk_count = (
        await rag_service.replace_project_embeddings(project_id, raw_text)
        if replace_existing
        else await rag_service.store_embeddings(project_id, raw_text)
    )
    return {"project_id": project_id, "chunk_count": chunk_count}


@activity.defn
async def generate_project_content_activity(
    project_id: str,
    topic: str,
    content_type: str = "blog",
) -> dict[str, str]:
    """Retrieve context, generate content, and persist it to the Content table."""

    normalized_content_type = _normalize_content_type(content_type)
    context_chunks = await rag_service.search_similar(project_id, topic, top_k=5)
    generated_text = await llm_service.generate_content(
        topic=topic,
        context_chunks=context_chunks,
        content_type=normalized_content_type.value,
    )

    with Session(engine) as session:
        content = Content(
            project_id=uuid.UUID(project_id),
            topic=topic,
            generated_text=generated_text,
            content_type=normalized_content_type,
            status=ContentStatus.DRAFT,
        )
        session.add(content)
        session.commit()
        session.refresh(content)

    activity.logger.info("Saved generated content %s for project %s", content.id, project_id)
    return {
        "content_id": str(content.id),
        "project_id": project_id,
        "topic": topic,
        "content_type": normalized_content_type.value,
        "generated_text": generated_text,
    }


@activity.defn
async def generate_seo_fixes_activity(
    project_id: str,
    url: str,
    issues: list[dict[str, str]],
) -> dict:
    """Generate SEO fixes from issues and persist them as meta content."""

    enriched_issues = await llm_service.generate_seo_fixes(issues)
    saved_content_id = ""

    if enriched_issues:
        with Session(engine) as session:
            content = Content(
                project_id=uuid.UUID(project_id),
                topic=f"SEO fixes for {url}",
                generated_text=_format_fix_content(url, enriched_issues),
                content_type=ContentType.META,
                status=ContentStatus.DRAFT,
            )
            session.add(content)
            session.commit()
            session.refresh(content)
            saved_content_id = str(content.id)

    return {
        "project_id": project_id,
        "content_id": saved_content_id,
        "issues": enriched_issues,
    }


@activity.defn
async def mark_project_audited_activity(project_id: str) -> dict[str, str]:
    """Update the project's last audited timestamp."""

    audited_at = datetime.now(timezone.utc)
    with Session(engine) as session:
        project = session.get(Project, uuid.UUID(project_id))
        if project is None:
            raise ValueError(f"Project {project_id} was not found.")
        project.last_audited_at = audited_at
        session.add(project)
        session.commit()

    return {"project_id": project_id, "last_audited_at": audited_at.isoformat()}
