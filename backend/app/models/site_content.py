"""
SiteContent model — the editable landing-page content (CMS).

A single row (id=1) holding the whole landing page as a JSON document. The
public landing page renders from it; the admin panel edits it. If the row is
missing/empty the frontend falls back to its built-in defaults, so the site
never breaks.
"""

from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlmodel import Column, Field, SQLModel

SINGLETON_ID = 1


class SiteContent(SQLModel, table=True):
    """Singleton row of CMS-managed landing-page content."""

    __tablename__ = "site_content"

    id: int = Field(default=SINGLETON_ID, primary_key=True)
    content: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
