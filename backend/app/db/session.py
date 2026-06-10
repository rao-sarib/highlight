"""
Database engine and session dependency for FastAPI.

Uses SQLModel's Session (which wraps SQLAlchemy's Session) so that
SQLModel table models work seamlessly with FastAPI's Depends().
"""

from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────
# pool_pre_ping keeps connections healthy after DB restarts.
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


# ── Dependency ────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """Yield a SQLModel session and guarantee it is closed afterwards."""
    with Session(engine) as session:
        yield session
