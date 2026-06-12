"""
Content model – AI-generated content pieces linked to a Project.

Relationships
─────────────
Content.project →  Project  (many-to-one, back_populates="contents")
"""

import enum
import uuid as _uuid
from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


# ── Enums ─────────────────────────────────────────────────
class ContentType(str, enum.Enum):
    """Kind of content that was generated."""

    BLOG = "blog"
    FAQ = "faq"
    META = "meta"
    # GEO mode: AI-citable section (direct answer + key facts + FAQ + schema)
    GEO = "geo"


class ContentStatus(str, enum.Enum):
    """Lifecycle status of a content piece."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# ── SQLModel table ────────────────────────────────────────
class Content(SQLModel, table=True):
    """A single piece of AI-generated SEO content."""

    __tablename__ = "contents"

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
    topic: str = Field(max_length=512, nullable=False)
    generated_text: str = Field(default="", nullable=False)
    content_type: ContentType = Field(default=ContentType.BLOG, nullable=False)
    status: ContentStatus = Field(default=ContentStatus.DRAFT, nullable=False)
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
    project: "Project" = Relationship(back_populates="contents")
