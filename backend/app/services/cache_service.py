"""
Feature-result cache helpers.

Encapsulates the "show last result on open, re-call only on refresh" rule used
by Prompt Optimization, LSI, Competitors, Backlinks, and the Action Plan.
"""

from __future__ import annotations

import hashlib
import uuid

from sqlmodel import Session, select

from app.models.feature_cache import FeatureCache


def make_input_key(*parts: object) -> str:
    """Stable, normalised key from the inputs that define a feature result."""
    raw = "|".join(str(p).strip().lower() for p in parts)
    if len(raw) <= 480:
        return raw
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def get_cached(
    db: Session,
    project_id: uuid.UUID,
    feature: str,
    input_key: str,
) -> FeatureCache | None:
    """Return the latest cached result for this feature + input, if any."""
    return db.exec(
        select(FeatureCache)
        .where(
            FeatureCache.project_id == project_id,
            FeatureCache.feature == feature,
            FeatureCache.input_key == input_key,
        )
        .order_by(FeatureCache.created_at.desc())
        .limit(1)
    ).first()


def get_latest_for_feature(
    db: Session,
    project_id: uuid.UUID,
    feature: str,
) -> FeatureCache | None:
    """Return the most recent result for a feature regardless of input.

    Used to auto-restore a feature page on open even before the user submits.
    """
    return db.exec(
        select(FeatureCache)
        .where(
            FeatureCache.project_id == project_id,
            FeatureCache.feature == feature,
        )
        .order_by(FeatureCache.created_at.desc())
        .limit(1)
    ).first()


def upsert_cached(
    db: Session,
    project_id: uuid.UUID,
    feature: str,
    input_key: str,
    payload: dict,
) -> FeatureCache:
    """Insert or replace the cached result for a feature + input."""
    existing = get_cached(db, project_id, feature, input_key)
    if existing is not None:
        existing.payload = payload
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    row = FeatureCache(
        project_id=project_id,
        feature=feature,
        input_key=input_key,
        payload=payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
