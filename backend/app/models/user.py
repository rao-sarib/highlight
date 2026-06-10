"""
User model and UserRole enum.

Relationships
─────────────
User.projects  →  list[Project]   (one-to-many, back_populates="owner")
"""

import enum
import uuid as _uuid
from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


# ── Enum ──────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    """Roles governing RBAC across the platform."""

    ADMIN = "admin"
    SEO_MANAGER = "seo_manager"
    VIEWER = "viewer"


# ── SQLModel table ────────────────────────────────────────
class User(SQLModel, table=True):
    """A registered user of the HIGHLIGHT platform."""

    __tablename__ = "users"

    id: _uuid.UUID = Field(
        default_factory=_uuid.uuid4,
        primary_key=True,
        nullable=False,
    )
    email: str = Field(
        index=True,
        unique=True,
        nullable=False,
        max_length=320,
    )
    hashed_password: str = Field(nullable=False)
    full_name: str = Field(max_length=255, nullable=False)
    role: UserRole = Field(default=UserRole.VIEWER, nullable=False)
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
    projects: list["Project"] = Relationship(back_populates="owner")
