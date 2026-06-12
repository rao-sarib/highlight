"""
VisibilityScan model – stored results of AI Share-of-Voice scans.

Each row is one multi-prompt GEO scan for a project + keyword. Storing scans
gives (a) a 24h cache so repeated demo clicks don't burn Perplexity credits,
and (b) a history so visibility can be tracked over time.
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlmodel import Column, Field, SQLModel


class VisibilityScan(SQLModel, table=True):
    """One stored AI-visibility (GEO) scan result."""

    __tablename__ = "visibility_scans"

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    project_id: _uuid.UUID = Field(
        foreign_key="projects.id",
        nullable=False,
        index=True,
    )
    keyword: str = Field(max_length=255, nullable=False, index=True)
    share_of_voice: float = Field(default=0.0, nullable=False)
    cited_count: int = Field(default=0, nullable=False)
    in_sources_count: int = Field(default=0, nullable=False)
    prompt_count: int = Field(default=0, nullable=False)
    # Per-prompt details and aggregated competitor counts as JSON blobs.
    results: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    top_competitors: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
