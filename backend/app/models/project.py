"""
Project model – every project belongs to a single User (owner).

Relationships
─────────────
Project.owner      →  User          (many-to-one,  back_populates="projects")
Project.contents   →  list[Content] (one-to-many,  back_populates="project")
Project.embeddings →  list[Embedding] (one-to-many, back_populates="project")
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlmodel import Column, Field, Relationship, SQLModel


class Project(SQLModel, table=True):
    """A website / domain the user wants to optimise."""

    __tablename__ = "projects"

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    owner_id: _uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False,
        index=True,
    )
    name: str = Field(max_length=255, nullable=False)
    url: str = Field(max_length=2083, nullable=False)
    # User-declared positioning, captured at registration.
    niche: str | None = Field(default=None, max_length=255, nullable=True)
    target_audience: str | None = Field(default=None, max_length=255, nullable=True)
    description: str | None = Field(default=None, max_length=2000, nullable=True)
    # Auto-derived during the crawl/audit.
    detected_niche: str | None = Field(default=None, max_length=512, nullable=True)
    # Seed keywords extracted from the site content during the audit — used to
    # auto-fill every feature and to validate manual input relevance.
    detected_keywords: list = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False, server_default="[]")
    )
    pages_crawled: int = Field(default=0, nullable=False)
    last_crawl_at: datetime | None = Field(default=None, nullable=True)
    # Headline scores surfaced on the dashboard (0-100).
    seo_health_score: float | None = Field(default=None, nullable=True)
    ai_visibility_score: float | None = Field(default=None, nullable=True)
    ga4_property_id: str | None = Field(default=None, max_length=32, nullable=True)
    last_audited_at: datetime | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )

    # ── Relationships ─────────────────────────────────────
    owner: "User" = Relationship(back_populates="projects")
    contents: list["Content"] = Relationship(back_populates="project")
    embeddings: list["Embedding"] = Relationship(back_populates="project")
