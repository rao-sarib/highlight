"""
Authentication endpoints – signup and login.

UC-001: POST /auth/signup  → creates a user, returns JWT
         POST /auth/login   → validates credentials, returns JWT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user_schema import Token, UserCreate, UserLogin

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Signup ────────────────────────────────────────────────
@router.post(
    "/signup",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def signup(body: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Create a new user account and return a signed JWT."""

    # Check for duplicate email
    existing = db.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)


# ── Login ─────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=Token,
    summary="Authenticate and receive a JWT",
)
def login(body: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Validate credentials and return an access token."""

    user = db.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)
