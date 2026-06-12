"""
Subscription plans — tiers, limits, and feature gating.

Plans are config (no real payment provider needed for the FYP): a user has a
`plan` string, and these definitions drive project limits, crawl depth, monthly
scan quotas, which AI engines they can use, and which features are unlocked.
"""

from __future__ import annotations

from dataclasses import dataclass

# Feature keys used for gating (match the product's feature set).
FEATURE_AUDIT = "audit"
FEATURE_FIXES = "fixes"
FEATURE_PROMPTS = "prompts"
FEATURE_LSI = "lsi"
FEATURE_ANALYTICS = "analytics"
FEATURE_VISIBILITY = "visibility"
FEATURE_CONTENT = "content"
FEATURE_COMPETITORS = "competitors"
FEATURE_BACKLINKS = "backlinks"
FEATURE_REFRESH = "refresh"
FEATURE_ACTION_PLAN = "action_plan"

# Starter keeps the headline GEO feature (visibility) so every demo can show it.
_CORE = (
    FEATURE_AUDIT,
    FEATURE_FIXES,
    FEATURE_PROMPTS,
    FEATURE_LSI,
    FEATURE_ANALYTICS,
    FEATURE_VISIBILITY,
)
_ALL = _CORE + (
    FEATURE_CONTENT,
    FEATURE_COMPETITORS,
    FEATURE_BACKLINKS,
    FEATURE_REFRESH,
    FEATURE_ACTION_PLAN,
)


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    price_monthly: int
    max_projects: int
    max_crawl_pages: int
    monthly_scan_quota: int
    engines: tuple[str, ...]
    features: tuple[str, ...]
    blurb: str


PLANS: dict[str, Plan] = {
    "free": Plan(
        key="free",
        name="Starter",
        price_monthly=0,
        max_projects=1,
        max_crawl_pages=10,
        monthly_scan_quota=15,
        engines=("perplexity",),
        features=_CORE,
        blurb="Try real AI visibility on one site.",
    ),
    "pro": Plan(
        key="pro",
        name="Pro",
        price_monthly=29,
        max_projects=10,
        max_crawl_pages=40,
        monthly_scan_quota=200,
        engines=("perplexity", "openai"),
        features=_ALL,
        blurb="For in-house teams growing AI + search visibility.",
    ),
    "agency": Plan(
        key="agency",
        name="Agency",
        price_monthly=99,
        max_projects=30,
        max_crawl_pages=100,
        monthly_scan_quota=800,
        engines=("perplexity", "openai", "gemini"),
        features=_ALL,
        blurb="Manage up to 30 client sites across every AI engine.",
    ),
}

DEFAULT_PLAN = "free"


def get_plan(plan_key: str | None) -> Plan:
    """Resolve a plan key to its definition, defaulting safely."""
    return PLANS.get((plan_key or "").lower(), PLANS[DEFAULT_PLAN])
