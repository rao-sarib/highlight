"""
Shared FastAPI dependencies for authentication and RBAC.
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlmodel import Session, select

from app.core.plans import get_plan
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.admin import Admin
from app.models.user import User, UserRole
from app.services.rbac_service import assert_role_allows

# Extracts the Bearer token from the Authorization header.
_bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode the JWT and return the corresponding User row.

    Raises 401 if the token is invalid, expired, or the user no longer exists.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.exec(select(User).where(User.id == user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def require_feature(feature: str):
    """Build a dependency that gates an endpoint behind a plan feature.

    Returns the current user when their plan includes `feature`, else 402 so the
    frontend can prompt an upgrade.
    """

    def _checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        # 1) Role gate (403) — the user's RBAC role must permit this feature.
        assert_role_allows(db, current_user, feature)
        # 2) Plan gate (402) — the paid package must include this feature.
        plan = get_plan(current_user.plan)
        if feature not in plan.features:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Your {plan.name} plan doesn't include this feature. "
                    "Upgrade your plan to unlock it."
                ),
            )
        return current_user

    return _checker


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> Admin:
    """Decode an admin-panel JWT (scope=admin) and return the Admin row."""
    token = credentials.credentials
    admin_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        if payload.get("scope") != "admin":
            raise admin_exception
        admin_id = payload.get("sub")
        if not admin_id:
            raise admin_exception
    except JWTError:
        raise admin_exception

    try:
        admin = db.get(Admin, uuid.UUID(str(admin_id)))
    except (ValueError, TypeError):
        raise admin_exception
    if admin is None:
        raise admin_exception
    return admin


def verify_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that enforces Admin-only access.

    Raises 403 if the authenticated user is not an Admin.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
