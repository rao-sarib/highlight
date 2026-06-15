"""
Pydantic schemas for User-related requests and responses.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


# ── Auth request bodies ──────────────────────────────────
class UserCreate(BaseModel):
    """POST /auth/signup body."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    # RBAC role chosen at signup (seo_expert | content_writer | analytics_manager).
    role: UserRole = UserRole.SEO_EXPERT


class UserLogin(BaseModel):
    """POST /auth/login body."""

    email: EmailStr
    password: str


# ── Response bodies ──────────────────────────────────────
class UserRead(BaseModel):
    """Public representation returned to clients."""

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT response payload."""

    access_token: str
    token_type: str = "bearer"


# ── Self-service account settings ────────────────────────
class UserUpdate(BaseModel):
    """PATCH /users/me body — update own profile."""

    full_name: str = Field(min_length=1, max_length=255)


class PasswordChange(BaseModel):
    """POST /users/me/password body."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# ── Admin actions ────────────────────────────────────────
class UserRoleUpdate(BaseModel):
    """PATCH /users/{user_id}/role body."""

    role: UserRole
