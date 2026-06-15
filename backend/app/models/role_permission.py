"""
RolePermission model — which product features each RBAC role can access.

Admin-editable (from the admin panel's RBAC section). One row per role, keyed by
the role's string value (e.g. "content_writer"). The list of feature keys mirrors
the FEATURE_* constants in app.core.plans. This is layered ON TOP of plan gating:
a user must have both the role permission AND the plan feature to use a tool.
"""

from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlmodel import Column, Field, SQLModel


class RolePermission(SQLModel, table=True):
    """The feature keys a given role is allowed to use."""

    __tablename__ = "role_permissions"

    role: str = Field(primary_key=True, max_length=32)
    features: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
