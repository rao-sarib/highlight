"""
FastAPI application entry-point.

• Registers all v1 routers
• Creates DB tables on first startup
• Configures CORS for the Next.js frontend
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, text

from app.db.session import engine

# ── Import models so SQLModel.metadata picks them up ─────
from app.models.user import User          # noqa: F401
from app.models.project import Project    # noqa: F401
from app.models.content import Content    # noqa: F401
from app.models.embedding import Embedding  # noqa: F401
from app.models.visibility_scan import VisibilityScan  # noqa: F401
from app.models.page_audit import PageAudit  # noqa: F401
from app.models.feature_cache import FeatureCache  # noqa: F401

# ── Import routers ───────────────────────────────────────
from app.api.v1.auth import router as auth_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.backlinks import router as backlinks_router
from app.api.v1.billing import router as billing_router
from app.api.v1.competitors import router as competitors_router
from app.api.v1.content import router as content_router
from app.api.v1.fixes import router as fixes_router
from app.api.v1.lsi import router as lsi_router
from app.api.v1.projects import router as projects_router
from app.api.v1.prompts import router as prompts_router
from app.api.v1.refresh import router as refresh_router
from app.api.v1.users import router as users_router
from app.api.v1.visibility import router as visibility_router


# ── Lifespan (replaces deprecated on_event) ──────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run one-time setup on startup, then yield control to the app."""
    # Enable pgvector extension (no-op if it already exists). Must run before
    # create_all() since the embeddings table has a vector-typed column.
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    # Create all tables that don't exist yet (covers a fresh database — every
    # table is created with the current model definitions, including columns
    # added after the initial release).
    SQLModel.metadata.create_all(engine)

    # Lightweight column migration for fields added after the initial
    # create_all on databases that already had the projects table (create_all
    # only creates missing tables, not columns on existing tables). This is a
    # no-op on a fresh database since create_all already added the column.
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS ga4_property_id VARCHAR(32)")
        )
        # Project: niche capture + crawl/score fields (added after first release).
        for ddl in (
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS niche VARCHAR(255)",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_audience VARCHAR(255)",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS description VARCHAR(2000)",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS detected_niche VARCHAR(512)",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS pages_crawled INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_crawl_at TIMESTAMP",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS seo_health_score DOUBLE PRECISION",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_visibility_score DOUBLE PRECISION",
            # Users: subscription plan + monthly scan quota tracking.
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(32) NOT NULL DEFAULT 'agency'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS scans_used INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS scans_period VARCHAR(7) NOT NULL DEFAULT ''",
            # Visibility scans: multi-engine breakdown (added in the multi-engine upgrade).
            "ALTER TABLE visibility_scans ADD COLUMN IF NOT EXISTS engines_used JSON NOT NULL DEFAULT '[]'",
            "ALTER TABLE visibility_scans ADD COLUMN IF NOT EXISTS per_engine JSON NOT NULL DEFAULT '[]'",
        ):
            conn.execute(text(ddl))

    # Enum migration: the GEO content type was added after the initial release.
    # On a fresh database create_all already includes it; on existing databases
    # the native Postgres enum needs the extra value.
    with engine.begin() as conn:
        conn.execute(text("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'GEO'"))
    yield


# ── App ──────────────────────────────────────────────────
app = FastAPI(
    title="HIGHLIGHT AI SEO Tool",
    version="0.1.0",
    description="SaaS platform bridging traditional SEO with Generative Engine Optimization (GEO).",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(backlinks_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
app.include_router(competitors_router, prefix="/api/v1")
app.include_router(content_router, prefix="/api/v1")
app.include_router(fixes_router, prefix="/api/v1")
app.include_router(lsi_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(prompts_router, prefix="/api/v1")
app.include_router(refresh_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(visibility_router, prefix="/api/v1")


# ── Health check ─────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"}
