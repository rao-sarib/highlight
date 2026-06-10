"""
RAG service for chunking content, storing embeddings, and semantic retrieval.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlmodel import Session, delete, select

from app.db.session import engine
from app.models.embedding import Embedding
from app.services.llm_service import llm_service

DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 75
DEFAULT_TOP_K = 5


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    """Split text into overlapping character chunks close to the desired size."""

    normalized = " ".join(text.split())
    if not normalized:
        return []
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive.")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size.")

    chunks: list[str] = []
    start = 0
    text_length = len(normalized)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        if end < text_length:
            boundary = max(
                normalized.rfind(". ", start, end),
                normalized.rfind("! ", start, end),
                normalized.rfind("? ", start, end),
                normalized.rfind(" ", start, end),
            )
            if boundary > start + (chunk_size // 2):
                end = boundary + 1

        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break
        start = max(end - overlap, start + 1)

    return chunks


@dataclass(slots=True)
class RAGService:
    """Coordinates pgvector storage and retrieval for project context."""

    async def replace_project_embeddings(
        self,
        project_id: uuid.UUID | str,
        raw_text: str,
        db: Session | None = None,
    ) -> int:
        """Delete old embeddings for a project and replace them from raw text."""

        normalized_project_id = uuid.UUID(str(project_id))
        chunks = chunk_text(raw_text)
        if not chunks:
            return 0

        embeddings = await llm_service.generate_embeddings(chunks)
        owns_session = db is None
        session = db or Session(engine)
        try:
            session.exec(
                delete(Embedding).where(Embedding.project_id == normalized_project_id)
            )
            for text_chunk, vector in zip(chunks, embeddings, strict=True):
                session.add(
                    Embedding(
                        project_id=normalized_project_id,
                        text_chunk=text_chunk,
                        vector=vector,
                    )
                )
            session.commit()
            return len(chunks)
        except Exception:
            session.rollback()
            raise
        finally:
            if owns_session:
                session.close()

    async def store_embeddings(
        self,
        project_id: uuid.UUID | str,
        raw_text: str,
        db: Session | None = None,
    ) -> int:
        """Append embeddings without deleting existing project vectors."""

        normalized_project_id = uuid.UUID(str(project_id))
        chunks = chunk_text(raw_text)
        if not chunks:
            return 0

        embeddings = await llm_service.generate_embeddings(chunks)
        owns_session = db is None
        session = db or Session(engine)
        try:
            for text_chunk, vector in zip(chunks, embeddings, strict=True):
                session.add(
                    Embedding(
                        project_id=normalized_project_id,
                        text_chunk=text_chunk,
                        vector=vector,
                    )
                )
            session.commit()
            return len(chunks)
        except Exception:
            session.rollback()
            raise
        finally:
            if owns_session:
                session.close()

    async def search_similar(
        self,
        project_id: uuid.UUID | str,
        query: str,
        db: Session | None = None,
        top_k: int = DEFAULT_TOP_K,
    ) -> list[str]:
        """Retrieve the most similar chunks for a query using cosine distance."""

        normalized_project_id = uuid.UUID(str(project_id))
        normalized_query = query.strip()
        if not normalized_query:
            return []

        query_embeddings = await llm_service.generate_embeddings([normalized_query])
        if not query_embeddings:
            return []

        query_vector = query_embeddings[0]
        owns_session = db is None
        session = db or Session(engine)
        try:
            statement = (
                select(Embedding.text_chunk)
                .where(Embedding.project_id == normalized_project_id)
                .order_by(Embedding.vector.cosine_distance(query_vector))
                .limit(max(top_k, 1))
            )
            return list(session.exec(statement).all())
        finally:
            if owns_session:
                session.close()

    async def delete_project_embeddings(
        self,
        project_id: uuid.UUID | str,
        db: Session | None = None,
    ) -> int:
        """Delete all embeddings for a project."""

        normalized_project_id = uuid.UUID(str(project_id))
        owns_session = db is None
        session = db or Session(engine)
        try:
            existing_rows = list(
                session.exec(
                    select(Embedding.id).where(
                        Embedding.project_id == normalized_project_id
                    )
                ).all()
            )
            session.exec(
                delete(Embedding).where(Embedding.project_id == normalized_project_id)
            )
            session.commit()
            return len(existing_rows)
        except Exception:
            session.rollback()
            raise
        finally:
            if owns_session:
                session.close()


rag_service = RAGService()
