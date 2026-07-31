"""
FastAPI application entry-point.

• Registers all v1 routers
• Creates DB tables on first startup
• Configures CORS for the Next.js frontend
"""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import SQLModel, text

logger = logging.getLogger("app.main")

from app.core.config import settings
from app.db.session import engine

# ── Import models so SQLModel.metadata picks them up ─────
from app.models.user import User          # noqa: F401
from app.models.project import Project    # noqa: F401
from app.models.content import Content    # noqa: F401
from app.models.embedding import Embedding  # noqa: F401
from app.models.visibility_scan import VisibilityScan  # noqa: F401
from app.models.page_audit import PageAudit  # noqa: F401
from app.models.feature_cache import FeatureCache  # noqa: F401
from app.models.admin import Admin  # noqa: F401
from app.models.site_content import SiteContent  # noqa: F401
from app.models.smtp_settings import SmtpSettings  # noqa: F401
from app.models.role_permission import RolePermission  # noqa: F401
from app.models.app_setting import AppSetting  # noqa: F401
from app.models.score_snapshot import ScoreSnapshot  # noqa: F401
from app.models.contact_message import ContactMessage  # noqa: F401

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
from app.api.v1.keywords import router as keywords_router
from app.api.v1.projects import router as projects_router
from app.api.v1.prompts import router as prompts_router
from app.api.v1.refresh import router as refresh_router
from app.api.v1.users import router as users_router
from app.api.v1.visibility import router as visibility_router
from app.api.v1.admin import router as admin_router
from app.api.v1.site import router as site_router


# ── Lifespan (replaces deprecated on_event) ──────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run one-time setup on startup, then yield control to the app."""
    # Refuse to run without a signing key rather than fall back to a shared
    # default: a known SECRET_KEY lets anyone mint a valid token for any user.
    if not settings.SECRET_KEY.strip():
        raise RuntimeError(
            "SECRET_KEY is not set. It signs every session token, so the app "
            "will not start without one. Generate a value and put it in your "
            'environment (see .env.example):\n\n'
            '    python -c "import secrets; print(secrets.token_urlsafe(64))"\n'
        )

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
            # Users: email verification. DEFAULT true backfills existing accounts
            # as verified (never locked out); new signups insert false explicitly.
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT true",
            # Visibility scans: multi-engine breakdown (added in the multi-engine upgrade).
            "ALTER TABLE visibility_scans ADD COLUMN IF NOT EXISTS engines_used JSON NOT NULL DEFAULT '[]'",
            "ALTER TABLE visibility_scans ADD COLUMN IF NOT EXISTS per_engine JSON NOT NULL DEFAULT '[]'",
            # Projects: seed keywords detected during the site audit (auto-mode).
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS detected_keywords JSON NOT NULL DEFAULT '[]'",
        ):
            conn.execute(text(ddl))

    # Enum migration: GEO content type + the new RBAC roles were added after the
    # initial release. On a fresh database create_all already includes them; on
    # existing databases the native Postgres enums need the extra values.
    with engine.begin() as conn:
        conn.execute(text("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'GEO'"))
        # New RBAC roles (native enum stores the member NAMES, uppercase).
        for role_name in ("SEO_EXPERT", "CONTENT_WRITER", "ANALYTICS_MANAGER"):
            conn.execute(text(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{role_name}'"))

    # Seed admin account, role permissions, CMS content, and SMTP row.
    _seed_initial_data()
    yield


def _seed_initial_data() -> None:
    """Create the default admin, RBAC permissions, landing content, SMTP row."""
    from sqlmodel import Session, select

    from app.core.config import settings
    from app.core.default_content import DEFAULT_LANDING
    from app.core.security import hash_password
    from app.models.admin import Admin as AdminModel
    from app.models.site_content import SINGLETON_ID as CONTENT_ID, SiteContent as SiteContentModel
    from app.models.smtp_settings import SINGLETON_ID as SMTP_ID, SmtpSettings as SmtpModel
    from app.services.rbac_service import seed_role_permissions

    with Session(engine) as session:
        # Default admin (only if none exists yet). Deliberately checked here
        # rather than at import time: a deployment that already seeded its admin
        # keeps starting fine without ADMIN_PASSWORD in the environment.
        if session.exec(select(AdminModel)).first() is None:
            admin_password = settings.ADMIN_PASSWORD.strip()
            if not admin_password:
                raise RuntimeError(
                    "ADMIN_PASSWORD is not set. It is required to create the initial "
                    "admin account for /adminpanel. Set a strong ADMIN_PASSWORD in the "
                    "environment (see .env.example) and start the server again."
                )
            session.add(
                AdminModel(
                    username=settings.ADMIN_USERNAME.strip() or "admin",
                    hashed_password=hash_password(admin_password),
                )
            )
            session.commit()

        # Default landing content.
        if session.get(SiteContentModel, CONTENT_ID) is None:
            session.add(SiteContentModel(id=CONTENT_ID, content=dict(DEFAULT_LANDING)))
            session.commit()

        # Default SMTP row (disabled until configured).
        if session.get(SmtpModel, SMTP_ID) is None:
            session.add(SmtpModel(id=SMTP_ID))
            session.commit()

        # Default role -> features permissions.
        seed_role_permissions(session)

        # Apply any admin-set API key overrides (DB > env) at runtime.
        from app.services import runtime_config

        runtime_config.load_all(session)


# ── App ──────────────────────────────────────────────────
app = FastAPI(
    title="HIGHLIGHT AI SEO Tool",
    version="0.1.0",
    description="SaaS platform bridging traditional SEO with Generative Engine Optimization (GEO).",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
# Explicit origin allowlist (see Settings.cors_allow_origins). Deployed
# frontends are added via FRONTEND_ORIGINS; there is deliberately no wildcard
# pattern, which would have trusted every *.vercel.app / *.netlify.app site.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ─────────────────────────────────
# Any unhandled exception is turned into a clean JSON 500 that flows back
# through the CORS middleware. Without this, an unexpected error can reset the
# connection, which the browser reports as "Cannot reach the backend" instead
# of a readable message.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again in a moment."},
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
app.include_router(keywords_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(prompts_router, prefix="/api/v1")
app.include_router(refresh_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(visibility_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(site_router, prefix="/api/v1")


# ── Health check ─────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Simple liveness probe."""
    return {"status": "ok"}
