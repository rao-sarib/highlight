"""
PageAudit model — one row per crawled page of a project's website.

The multi-page crawler stores an audit row for every page it scans, so a
100-page site produces 100 rows and the UI can show a site-wide breakdown
without re-crawling on every visit.
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlmodel import Column, Field, SQLModel


class PageAudit(SQLModel, table=True):
    """On-page SEO audit result for a single crawled URL."""

    __tablename__ = "page_audits"

    id: _uuid.UUID = Field(default_factory=_uuid.uuid4, primary_key=True, nullable=False)
    project_id: _uuid.UUID = Field(foreign_key="projects.id", nullable=False, index=True)
    url: str = Field(max_length=2083, nullable=False)
    status_code: int = Field(default=0, nullable=False)
    title: str | None = Field(default=None, max_length=512)
    meta_description: str | None = Field(default=None, max_length=1024)
    word_count: int = Field(default=0, nullable=False)
    h1_count: int = Field(default=0, nullable=False)
    internal_link_count: int = Field(default=0, nullable=False)
    issue_count: int = Field(default=0, nullable=False)
    # Full list of detected SEOIssue dicts for this page.
    issues: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
