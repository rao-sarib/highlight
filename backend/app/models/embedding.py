"""
Embedding model – pgvector-backed table for RAG chunks.

Each row stores a 1 536-dim vector produced by OpenAI text-embedding-3-small.

Relationships
─────────────
Embedding.project →  Project  (many-to-one, back_populates="embeddings")
"""

import uuid as _uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlmodel import Column, Field, Relationship, SQLModel

# Dimension used by OpenAI text-embedding-3-small
EMBEDDING_DIM = 1536


class Embedding(SQLModel, table=True):
    """A vector-embedded text chunk used for RAG retrieval."""

    __tablename__ = "embeddings"

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
    text_chunk: str = Field(nullable=False)
    # pgvector column – not natively supported by SQLModel's Field(),
    # so we use sa_column directly.
    vector: list[float] = Field(
        sa_column=Column(Vector(EMBEDDING_DIM), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────
    project: "Project" = Relationship(back_populates="embeddings")
