"""
Password hashing (bcrypt via Passlib) and JWT token helpers.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── Password hashing ─────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return the bcrypt hash of *password*."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check *plain_password* against *hashed_password*."""
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT helpers ───────────────────────────────────────────
def create_access_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT with *subject* (typically user-id) in the ``sub`` claim."""
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": str(subject), "exp": expire, "iat": now}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_admin_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT for the admin panel (carries ``scope: "admin"``).

    Separate scope so a normal user JWT can never authenticate an admin route
    and vice-versa.
    """
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(hours=8))
    payload = {"sub": str(subject), "scope": "admin", "exp": expire, "iat": now}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_purpose_token(
    subject: str,
    purpose: str,
    expires_delta: timedelta,
) -> str:
    """Create a short-lived signed JWT for a one-off action (email verification
    or password reset). The ``purpose`` claim prevents one kind of token from
    being used for another (or as a login token)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "purpose": purpose,
        "exp": now + expires_delta,
        "iat": now,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_purpose_token(token: str, expected_purpose: str) -> str:
    """Decode a purpose token and return its subject (user id).

    Raises ``JWTError`` if the token is invalid/expired or its purpose does not
    match ``expected_purpose``.
    """
    payload = decode_access_token(token)
    if payload.get("purpose") != expected_purpose:
        raise JWTError("Token purpose mismatch")
    subject = payload.get("sub")
    if not subject:
        raise JWTError("Token missing subject")
    return str(subject)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT.

    Returns the full payload dict on success.
    Raises ``JWTError`` on invalid / expired tokens.
    """
    try:
        payload: dict = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except JWTError:
        raise
