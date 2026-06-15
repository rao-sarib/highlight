"""
Admin model — credentials for the separate site admin panel (/adminpanel).

Completely independent of the `users` table: admins are not customers and have
no plan/role/project. Authentication is username + bcrypt-hashed password.
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Admin(SQLModel, table=True):
    """A site administrator who can log into the admin panel."""

    __tablename__ = "admins"

    id: _uuid.UUID = Field(default_factory=_uuid.uuid4, primary_key=True, nullable=False)
    username: str = Field(index=True, unique=True, nullable=False, max_length=64)
    hashed_password: str = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
