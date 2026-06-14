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

# ── Feature ladder (each paid tier unlocks strictly more) ─────────────────
# Free unlocks NO premium features: it can create one project and run a single
# analysis that returns a teaser score only (see analysis.py). Everything else
# is gated and returns 402 until the user buys a package.
_FREE: tuple[str, ...] = ()

# Pro — the core SEO + GEO toolkit, including the full Analysis report.
_PRO = (
    FEATURE_AUDIT,
    FEATURE_FIXES,
    FEATURE_PROMPTS,
    FEATURE_LSI,
    FEATURE_ANALYTICS,
    FEATURE_VISIBILITY,
    FEATURE_ACTION_PLAN,
)
# Pro+ — adds AI content generation + competitor benchmarking.
_PRO_PLUS = _PRO + (FEATURE_CONTENT, FEATURE_COMPETITORS)
# Enterprise — everything: adds backlink outreach + scheduled refresh.
_ENTERPRISE = _PRO_PLUS + (FEATURE_BACKLINKS, FEATURE_REFRESH)


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
    # Whether this tier can be purchased (the free default tier cannot).
    purchasable: bool = True


PLANS: dict[str, Plan] = {
    "free": Plan(
        key="free",
        name="Free",
        price_monthly=0,
        max_projects=1,
        max_crawl_pages=10,
        monthly_scan_quota=3,
        engines=("perplexity",),
        features=_FREE,
        blurb="Register one site and run a quick AI-visibility test. Upgrade to unlock the full report and tools.",
        purchasable=False,
    ),
    # NOTE: paid prices are $0 for the demo. Set the real amounts (shown in
    # parentheses) before going live; Stripe checkout uses price_monthly.
    "pro": Plan(
        key="pro",
        name="Pro",
        price_monthly=0,  # later: 29
        max_projects=3,
        max_crawl_pages=30,
        monthly_scan_quota=50,
        engines=("perplexity", "openai"),
        features=_PRO,
        blurb="The core SEO + GEO toolkit with the full AI-visibility report.",
    ),
    "pro_plus": Plan(
        key="pro_plus",
        name="Pro+",
        price_monthly=0,  # later: 79
        max_projects=10,
        max_crawl_pages=60,
        monthly_scan_quota=200,
        engines=("perplexity", "openai", "gemini"),
        features=_PRO_PLUS,
        blurb="Adds AI content generation and competitor benchmarking.",
    ),
    "enterprise": Plan(
        key="enterprise",
        name="Enterprise",
        price_monthly=0,  # later: 199
        max_projects=50,
        max_crawl_pages=150,
        monthly_scan_quota=1000,
        engines=("perplexity", "openai", "gemini", "google_aio"),
        features=_ENTERPRISE,
        blurb="Everything — backlink outreach, scheduled refresh, and every AI engine.",
    ),
}

DEFAULT_PLAN = "free"


def get_plan(plan_key: str | None) -> Plan:
    """Resolve a plan key to its definition, defaulting safely."""
    return PLANS.get((plan_key or "").lower(), PLANS[DEFAULT_PLAN])


def purchasable_plans() -> list[Plan]:
    """The packages a user can actually buy (excludes the free default tier)."""
    return [p for p in PLANS.values() if p.purchasable]
