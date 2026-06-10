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
