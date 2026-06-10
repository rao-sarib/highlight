"""
RBAC-protected user management endpoints.

UC-003:  Admin-only routes for managing users and roles.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.dependencies import get_current_user, verify_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_schema import UserRead, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["Users"])


# ── Current user profile ─────────────────────────────────
@router.get(
    "/me",
    response_model=UserRead,
    summary="Get the authenticated user's profile",
)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Return the profile of the currently authenticated user."""
    return UserRead.model_validate(current_user)


# ── List all users (Admin) ───────────────────────────────
@router.get(
    "/",
    response_model=list[UserRead],
    summary="List all users (Admin only)",
)
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(verify_admin),
) -> list[UserRead]:
    """Return every registered user. Requires Admin role."""
    users = db.exec(select(User)).all()
    return [UserRead.model_validate(u) for u in users]


# ── Update user role (Admin) ─────────────────────────────
@router.patch(
    "/{user_id}/role",
    response_model=UserRead,
    summary="Change a user's role (Admin only)",
)
def update_user_role(
    user_id: uuid.UUID,
    body: UserRoleUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(verify_admin),
) -> UserRead:
    """Assign a new role to the specified user."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user.role = body.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


# ── Delete user (Admin) ──────────────────────────────────
@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user (Admin only)",
)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin),
) -> None:
    """Permanently remove a user account. Admins cannot delete themselves."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    db.delete(user)
    db.commit()
