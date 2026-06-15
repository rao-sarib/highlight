"""Helper to record point-in-time score snapshots (for Analytics progress)."""

from __future__ import annotations

import uuid

from sqlmodel import Session

from app.models.score_snapshot import ScoreSnapshot


def record_score(
    db: Session,
    project_id: uuid.UUID,
    *,
    seo_health: float | None = None,
    ai_visibility: float | None = None,
) -> None:
    """Append a score snapshot. No-op if both scores are None. Never raises."""
    if seo_health is None and ai_visibility is None:
        return
    try:
        db.add(
            ScoreSnapshot(
                project_id=project_id, seo_health=seo_health, ai_visibility=ai_visibility
            )
        )
        db.commit()
    except Exception:
        db.rollback()
