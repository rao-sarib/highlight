"""
RBAC role catalog — the signup roles, their labels, and the DEFAULT feature
access per role. The live mapping is stored in the role_permissions table and is
editable from the admin panel; these are the seeds + fallbacks.

Layered with plan gating: access requires BOTH the role permission (this file /
the role_permissions table) AND the plan feature (app.core.plans).
"""

from __future__ import annotations

from app.core.plans import (
    FEATURE_ACTION_PLAN,
    FEATURE_ANALYTICS,
    FEATURE_AUDIT,
    FEATURE_BACKLINKS,
    FEATURE_COMPETITORS,
    FEATURE_CONTENT,
    FEATURE_FIXES,
    FEATURE_LSI,
    FEATURE_PROMPTS,
    FEATURE_REFRESH,
    FEATURE_VISIBILITY,
)

# Every gateable feature key (mirrors plans._ALL / the require_feature keys).
ALL_FEATURES: list[str] = [
    FEATURE_AUDIT,
    FEATURE_FIXES,
    FEATURE_PROMPTS,
    FEATURE_LSI,
    FEATURE_ANALYTICS,
    FEATURE_VISIBILITY,
    FEATURE_CONTENT,
    FEATURE_COMPETITORS,
    FEATURE_BACKLINKS,
    FEATURE_REFRESH,
    FEATURE_ACTION_PLAN,
]

# Roles a new user may pick at signup.
SIGNUP_ROLES: list[str] = ["seo_expert", "content_writer", "analytics_manager"]

ROLE_LABELS: dict[str, str] = {
    "seo_expert": "SEO Expert",
    "content_writer": "Content Writer",
    "analytics_manager": "Analytics Manager",
    "admin": "Admin (legacy)",
    "seo_manager": "SEO Manager (legacy)",
    "viewer": "Viewer (legacy)",
}

ROLE_DESCRIPTIONS: dict[str, str] = {
    "seo_expert": "Full access to every tool — audits, GEO, content, competitors, backlinks.",
    "content_writer": "Content-focused: content generation, prompts, LSI keywords, and refresh.",
    "analytics_manager": "Insight-focused: analytics, AI visibility, competitors, and the full report.",
}

# Default feature access per role (seed for role_permissions; also the fallback).
DEFAULT_ROLE_FEATURES: dict[str, list[str]] = {
    "seo_expert": list(ALL_FEATURES),
    "content_writer": [FEATURE_CONTENT, FEATURE_PROMPTS, FEATURE_LSI, FEATURE_REFRESH],
    "analytics_manager": [
        FEATURE_ANALYTICS,
        FEATURE_VISIBILITY,
        FEATURE_COMPETITORS,
        FEATURE_ACTION_PLAN,
    ],
    # Legacy roles keep full access so pre-existing accounts never lose features.
    "admin": list(ALL_FEATURES),
    "seo_manager": list(ALL_FEATURES),
    "viewer": list(ALL_FEATURES),
}
