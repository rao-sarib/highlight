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
    # Subscription plan key ("free" | "pro" | "pro_plus" | "enterprise").
    # Drives project/crawl/scan limits, engines, and which features are unlocked.
    # New users start on the locked free tier and buy a package to unlock more.
    plan: str = Field(default="free", max_length=32, nullable=False)
    # Rolling monthly scan usage (reset by month key) for quota enforcement.
    scans_used: int = Field(default=0, nullable=False)
    scans_period: str = Field(default="", max_length=7, nullable=False)  # "YYYY-MM"
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
