"""
Authentication endpoints – signup, login, email verification, password reset.

UC-001:
  POST /auth/signup               → creates an unverified user, emails a verify link
  POST /auth/login                → validates credentials (blocks unverified), returns JWT
  POST /auth/verify-email         → verifies the account from the emailed token, returns JWT
  POST /auth/resend-verification  → re-sends the verification email
  POST /auth/forgot-password      → emails a password-reset link
  POST /auth/reset-password       → sets a new password from the emailed token

All verify/reset links are signed JWTs with a ``purpose`` claim (no extra DB
table). When SMTP isn't configured the link is returned in the response as a
dev fallback so the flow stays usable before email is set up.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.core.config import settings
from app.core.roles import SIGNUP_ROLES
from app.core.security import (
    create_access_token,
    create_purpose_token,
    decode_purpose_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_schema import Token, UserCreate, UserLogin
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

VERIFY_TOKEN_TTL = timedelta(hours=24)
RESET_TOKEN_TTL = timedelta(hours=1)
PURPOSE_VERIFY = "email_verify"
PURPOSE_RESET = "password_reset"


# ── Request / response models ─────────────────────────────
class SignupResponse(BaseModel):
    verification_required: bool = True
    emailed: bool = False
    message: str
    dev_verify_url: str | None = None


class MessageResponse(BaseModel):
    message: str
    emailed: bool = False
    dev_url: str | None = None


class TokenRequest(BaseModel):
    token: str = Field(min_length=10)


class EmailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128)


# ── Email helpers ─────────────────────────────────────────
def _verify_link(token: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/verify-email?token={token}"


def _reset_link(token: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?token={token}"


def _deliver(
    db: Session, *, to_email: str, subject: str, body: str, link: str
) -> tuple[bool, str | None]:
    """Try to email *link*. Returns ``(emailed, dev_url)``.

    When SMTP is configured the link is emailed and ``dev_url`` is None. When
    SMTP is off (or a send fails) the link is returned as a dev fallback so the
    flow is still usable before email is set up.
    """
    cfg = email_service.get_settings(db)
    if cfg.enabled:
        try:
            email_service.send_email(db, to_email=to_email, subject=subject, body=body)
            return True, None
        except email_service.EmailError:
            return False, link
    return False, link


def _verify_email_body(name: str, link: str) -> str:
    return (
        f"Hi {name},\n\n"
        "Welcome to Highlight! Please confirm your email address to activate your account:\n\n"
        f"{link}\n\n"
        "This link expires in 24 hours. If you didn't create an account, you can ignore this email.\n\n"
        "— The Highlight team"
    )


def _reset_email_body(name: str, link: str) -> str:
    return (
        f"Hi {name},\n\n"
        "We received a request to reset your Highlight password. Use the link below to set a new one:\n\n"
        f"{link}\n\n"
        "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n"
        "— The Highlight team"
    )


# ── Signup ────────────────────────────────────────────────
@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (sends a verification email)",
)
def signup(body: UserCreate, db: Session = Depends(get_db)) -> SignupResponse:
    """Create an unverified account and email a verification link."""
    existing = db.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    if body.role.value not in SIGNUP_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please choose a valid role.",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_purpose_token(str(user.id), PURPOSE_VERIFY, VERIFY_TOKEN_TTL)
    link = _verify_link(token)
    emailed, dev_url = _deliver(
        db,
        to_email=user.email,
        subject="Verify your Highlight account",
        body=_verify_email_body(user.full_name, link),
        link=link,
    )
    message = (
        f"We've sent a verification link to {user.email}. Check your inbox to activate your account."
        if emailed
        else "Account created. Use the verification link below to activate your account."
    )
    return SignupResponse(
        verification_required=True, emailed=emailed, message=message, dev_verify_url=dev_url
    )


# ── Login ─────────────────────────────────────────────────
@router.post("/login", response_model=Token, summary="Authenticate and receive a JWT")
def login(body: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Validate credentials and return an access token (blocks unverified accounts)."""
    user = db.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check your inbox for the verification link.",
        )
    return Token(access_token=create_access_token(subject=str(user.id)))


# ── Verify email ──────────────────────────────────────────
@router.post("/verify-email", response_model=Token, summary="Verify email and sign in")
def verify_email(body: TokenRequest, db: Session = Depends(get_db)) -> Token:
    """Mark the account verified from the emailed token, then return a login JWT."""
    try:
        user_id = decode_purpose_token(body.token, PURPOSE_VERIFY)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification link is invalid or has expired.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    if not user.is_verified:
        user.is_verified = True
        db.add(user)
        db.commit()
        db.refresh(user)
    return Token(access_token=create_access_token(subject=str(user.id)))


# ── Resend verification ───────────────────────────────────
@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Re-send the verification email",
)
def resend_verification(body: EmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = db.exec(select(User).where(User.email == body.email)).first()
    generic = "If that account exists and isn't verified yet, a new verification link has been sent."
    if user is None or user.is_verified:
        return MessageResponse(message=generic)
    token = create_purpose_token(str(user.id), PURPOSE_VERIFY, VERIFY_TOKEN_TTL)
    link = _verify_link(token)
    emailed, dev_url = _deliver(
        db,
        to_email=user.email,
        subject="Verify your Highlight account",
        body=_verify_email_body(user.full_name, link),
        link=link,
    )
    return MessageResponse(message=generic, emailed=emailed, dev_url=dev_url)


# ── Forgot password ───────────────────────────────────────
@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Email a password-reset link",
)
def forgot_password(body: EmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = db.exec(select(User).where(User.email == body.email)).first()
    generic = "If an account exists for that email, a password-reset link has been sent."
    if user is None:
        return MessageResponse(message=generic)
    token = create_purpose_token(str(user.id), PURPOSE_RESET, RESET_TOKEN_TTL)
    link = _reset_link(token)
    emailed, dev_url = _deliver(
        db,
        to_email=user.email,
        subject="Reset your Highlight password",
        body=_reset_email_body(user.full_name, link),
        link=link,
    )
    return MessageResponse(message=generic, emailed=emailed, dev_url=dev_url)


# ── Reset password ────────────────────────────────────────
@router.post("/reset-password", response_model=Token, summary="Set a new password and sign in")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)) -> Token:
    try:
        user_id = decode_purpose_token(body.token, PURPOSE_RESET)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    user.hashed_password = hash_password(body.new_password)
    # A successful reset also proves inbox control → mark verified.
    user.is_verified = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(subject=str(user.id)))
