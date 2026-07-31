"""
Shared pytest fixtures.

Tests run against an in-memory SQLite database rather than Postgres so the
suite needs no running services (important for CI). Only the tables the tests
touch are created — the embeddings table uses a pgvector column type that
SQLite cannot represent, and none of these tests exercise it.

The app under test is assembled here from the real routers instead of
importing `app.main`, which would run the startup lifespan (pgvector extension,
DDL migrations, admin seeding) against a real database.
"""

from __future__ import annotations

import os

# SECRET_KEY has no default in Settings (a shared one would be public), so the
# suite supplies its own before app.core.config is first imported. setdefault so
# a real environment value still wins.
os.environ.setdefault("SECRET_KEY", "test-only-key-not-used-outside-the-test-suite")

import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.dependencies import get_current_user
from app.api.v1.projects import router as projects_router
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User, UserRole


@pytest.fixture(name="engine")
def engine_fixture():
    """In-memory SQLite shared across connections for the life of one test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Only the tables under test — see module docstring re: pgvector.
    SQLModel.metadata.create_all(
        engine, tables=[User.__table__, Project.__table__]
    )
    return engine


@pytest.fixture(name="session")
def session_fixture(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture(name="app")
def app_fixture(session):
    """Minimal app exposing the project routes, backed by the test session."""
    test_app = FastAPI()
    test_app.include_router(projects_router, prefix="/api/v1")
    test_app.dependency_overrides[get_db] = lambda: session
    return test_app


@pytest.fixture(name="client")
def client_fixture(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(name="make_user")
def make_user_fixture(session):
    """Create a persisted user; returns (user, auth_headers)."""

    def _make(email: str | None = None, plan: str = "enterprise") -> tuple[User, dict[str, str]]:
        user = User(
            email=email or f"{uuid.uuid4().hex[:12]}@example.com",
            hashed_password=hash_password("correct-horse-battery-staple"),
            full_name="Test User",
            role=UserRole.SEO_EXPERT,
            is_verified=True,
            plan=plan,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        token = create_access_token(subject=str(user.id))
        return user, {"Authorization": f"Bearer {token}"}

    return _make


@pytest.fixture(name="make_project")
def make_project_fixture(session):
    """Create a project owned by `owner`."""

    def _make(owner: User, name: str = "Test Project") -> Project:
        project = Project(owner_id=owner.id, name=name, url="https://example.com")
        session.add(project)
        session.commit()
        session.refresh(project)
        return project

    return _make


@pytest.fixture(name="unauthenticated_app")
def unauthenticated_app_fixture(app):
    """App with the auth dependency left intact (no override)."""
    app.dependency_overrides.pop(get_current_user, None)
    return app
