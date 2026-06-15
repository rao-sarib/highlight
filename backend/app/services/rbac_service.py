"""
RBAC service — resolves and enforces which features a user's ROLE may access.

This is layered on top of plan gating (app.core.plans / require_feature):
  • role gate  -> 403 "Your role cannot access this feature"
  • plan gate  -> 402 "Upgrade your plan"

The live role->features map lives in the role_permissions table (admin-editable).
Falls back to DEFAULT_ROLE_FEATURES, and finally to "allow all" for any unknown
role so nothing is accidentally locked out.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.roles import ALL_FEATURES, DEFAULT_ROLE_FEATURES
from app.models.role_permission import RolePermission
from app.models.user import User


def _role_value(role) -> str:
    """Normalise a UserRole enum or string to its lowercase value."""
    return getattr(role, "value", role)


def get_role_features(db: Session, role) -> list[str]:
    """Return the feature keys allowed for *role* (DB row > default > all)."""
    key = _role_value(role)
    row = db.get(RolePermission, key)
    if row is not None:
        return list(row.features or [])
    if key in DEFAULT_ROLE_FEATURES:
        return list(DEFAULT_ROLE_FEATURES[key])
    # Unknown/legacy role with no row: fail open (full access).
    return list(ALL_FEATURES)


def role_allows(db: Session, user: User, feature: str) -> bool:
    return feature in get_role_features(db, user.role)


def assert_role_allows(db: Session, user: User, feature: str) -> None:
    """Raise 403 if the user's role may not use *feature*."""
    if not role_allows(db, user, feature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot access this feature.",
        )


def seed_role_permissions(db: Session) -> None:
    """Insert default role->features rows for any role missing a row."""
    created = False
    for role, features in DEFAULT_ROLE_FEATURES.items():
        if db.get(RolePermission, role) is None:
            db.add(RolePermission(role=role, features=list(features)))
            created = True
    if created:
        db.commit()
