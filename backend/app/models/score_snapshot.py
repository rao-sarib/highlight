"""
ScoreSnapshot model — point-in-time record of a project's scores, so the
Analytics page can show progress over time (previous vs recent scores).

Written whenever a scoring action runs:
  • Full Analysis  -> both seo_health + ai_visibility
  • AI Visibility  -> ai_visibility
  • SEO audit      -> seo_health
Either score may be null for a given snapshot (only the one produced is stored).
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class ScoreSnapshot(SQLModel, table=True):
    """A timestamped score reading for a project."""

    __tablename__ = "score_snapshots"

    id: _uuid.UUID = Field(default_factory=_uuid.uuid4, primary_key=True, nullable=False)
    project_id: _uuid.UUID = Field(foreign_key="projects.id", nullable=False, index=True)
    seo_health: float | None = Field(default=None)
    ai_visibility: float | None = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
