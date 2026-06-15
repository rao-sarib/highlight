"""
Runtime config — API keys editable from the admin panel.

A value saved here (app_settings table) OVERRIDES the matching environment
variable immediately, with no restart: we update `settings`, `os.environ`, and
the already-constructed service singletons that cache the key. Keys not set in
the DB keep using the .env / environment value, so existing behavior is intact.
"""

from __future__ import annotations

import os

from sqlmodel import Session, select

from app.core.config import settings
from app.models.app_setting import AppSetting

# Keys the admin panel may manage. (GA4 uses a JSON file, not a string key,
# so it is intentionally excluded here.)
MANAGED_KEYS: list[str] = [
    "OPENAI_API_KEY",
    "SERPER_API_KEY",
    "SERPAPI_API_KEY",
    "PERPLEXITY_API_KEY",
    "GEMINI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PUBLISHABLE_KEY",
]

KEY_LABELS: dict[str, str] = {
    "OPENAI_API_KEY": "OpenAI API key",
    "SERPER_API_KEY": "Serper API key (Google SERP rankings)",
    "SERPAPI_API_KEY": "SerpApi key (Google AI Overview)",
    "PERPLEXITY_API_KEY": "Perplexity API key",
    "GEMINI_API_KEY": "Gemini API key",
    "STRIPE_SECRET_KEY": "Stripe secret key",
    "STRIPE_WEBHOOK_SECRET": "Stripe webhook secret",
    "STRIPE_PUBLISHABLE_KEY": "Stripe publishable key",
}


def _apply_to_runtime(key: str, value: str) -> None:
    """Push a key into settings, env, and the cached service singletons."""
    os.environ[key] = value
    setattr(settings, key, value)

    # Update singletons that captured the key at construction time. Imported
    # lazily to avoid import cycles.
    if key in (
        "OPENAI_API_KEY",
        "PERPLEXITY_API_KEY",
        "GEMINI_API_KEY",
        "SERPER_API_KEY",
        "SERPAPI_API_KEY",
    ):
        from app.services.geo_service import geo_service

        if key == "OPENAI_API_KEY":
            geo_service.openai_key = value
        elif key == "PERPLEXITY_API_KEY":
            geo_service.perplexity_key = value
        elif key == "GEMINI_API_KEY":
            geo_service.gemini_key = value
        elif key == "SERPER_API_KEY":
            geo_service.serper_key = value
        elif key == "SERPAPI_API_KEY":
            geo_service.serpapi_key = value

    if key == "OPENAI_API_KEY":
        from app.services.llm_service import llm_service

        llm_service.api_key = value
        llm_service._client = None  # force a fresh OpenAI client on next call
    elif key == "SERPER_API_KEY":
        from app.services.serper_service import serper_service

        serper_service.api_key = value
    # Stripe reads settings at call time, so updating settings above is enough.


def load_all(db: Session) -> None:
    """Apply all stored (non-empty) overrides at startup."""
    for row in db.exec(select(AppSetting)).all():
        if row.key in MANAGED_KEYS and row.value:
            _apply_to_runtime(row.key, row.value)


def set_key(db: Session, key: str, value: str) -> None:
    """Persist + apply a key override (empty value clears the override now)."""
    if key not in MANAGED_KEYS:
        raise ValueError(f"Unknown key: {key}")
    row = db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=value)
    else:
        row.value = value
    db.add(row)
    db.commit()
    _apply_to_runtime(key, value)


def _mask(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 4:
        return "••••"
    return f"••••{value[-4:]}"


def key_status(db: Session) -> list[dict]:
    """Masked status of every managed key (never returns full secrets)."""
    overrides = {r.key: r.value for r in db.exec(select(AppSetting)).all()}
    out: list[dict] = []
    for k in MANAGED_KEYS:
        effective = getattr(settings, k, "") or ""
        out.append(
            {
                "key": k,
                "label": KEY_LABELS.get(k, k),
                "is_set": bool(effective),
                "masked": _mask(effective),
                "source": "admin" if overrides.get(k) else ("env" if effective else "none"),
            }
        )
    return out
