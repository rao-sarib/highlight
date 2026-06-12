"""
FeatureCache model — generic per-feature result store.

Implements the product rule: a feature page shows the last fetched data on open
(no new API call), and only re-calls when the user explicitly refreshes. Each
row is the latest result for a (project, feature, input_key) triple.
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlalchemy import JSON
from sqlmodel import Column, Field, SQLModel


class FeatureCache(SQLModel, table=True):
    """Cached output of a feature run, keyed by project + feature + input."""

    __tablename__ = "feature_cache"

    id: _uuid.UUID = Field(default_factory=_uuid.uuid4, primary_key=True, nullable=False)
    project_id: _uuid.UUID = Field(foreign_key="projects.id", nullable=False, index=True)
    # e.g. "prompts", "lsi", "competitors", "backlinks", "action_plan"
    feature: str = Field(max_length=64, nullable=False, index=True)
    # Normalised inputs (keyword etc.) so different inputs cache separately.
    input_key: str = Field(default="", max_length=512, nullable=False, index=True)
    payload: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
