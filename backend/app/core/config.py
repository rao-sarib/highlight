"""
Application configuration loaded from environment variables.
Uses Pydantic BaseSettings so values are read from .env automatically.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration where every field maps to an env var of the same name."""

    DATABASE_URL: str = "postgresql://admin:password@localhost:5432/highlight_seo"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "super-secret-change-me-in-production"
    ALGORITHM: str = "HS256"
    # 7 days — long-lived sessions so users don't get "could not validate
    # credentials" mid-session (the frontend also logs out + redirects on 401).
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    OPENAI_API_KEY: str = ""

    # Serper API — real Google SERP rankings for Competitor Benchmarking
    # Get key at https://serper.dev (free tier: 2500 queries/month)
    SERPER_API_KEY: str = ""

    # SerpApi (serpapi.com) — Google AI Overview data. Serper does NOT expose
    # AI Overviews, so the "Google AI Overview" engine uses SerpApi instead.
    # Get key at https://serpapi.com (free tier: 100 searches/month).
    SERPAPI_API_KEY: str = ""

    # Perplexity API — citation-based AI Visibility scoring
    # Get key at https://www.perplexity.ai/settings/api
    PERPLEXITY_API_KEY: str = ""

    # Google Gemini API (optional) — adds Gemini as a 3rd AI-visibility engine
    # with Google Search grounding. Get key at https://aistudio.google.com/apikey
    GEMINI_API_KEY: str = ""

    # Google Analytics 4 Data API — service account JSON key file path.
    # Create a service account in Google Cloud Console, enable the
    # "Google Analytics Data API", download its JSON key, and point this
    # at the file. Then in each user's GA4 property, add the service
    # account's client_email as a "Viewer" so its property ID can be queried.
    GA4_SERVICE_ACCOUNT_FILE: str = ""

    TEMPORAL_SERVER_URL: str = "localhost:7233"
    TEMPORAL_NAMESPACE: str = "default"
    TEMPORAL_TASK_QUEUE: str = "highlight-seo-task-queue"

    # ── Admin panel (separate /adminpanel login) ─────────────────────────
    # Seeded into the admins table on first startup if no admin exists.
    # Change the password after first login (or set these before first run).
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "highlight-admin"

    # ── Stripe (payments) ────────────────────────────────────────────────
    # Secret key (sk_test_… for the demo) — enables hosted Checkout.
    STRIPE_SECRET_KEY: str = ""
    # Webhook signing secret (whsec_…) — verifies checkout.session.completed.
    STRIPE_WEBHOOK_SECRET: str = ""
    # Publishable key (pk_test_…) — only needed if you build a custom card form.
    STRIPE_PUBLISHABLE_KEY: str = ""
    # Where Stripe redirects back after checkout. Points at the frontend.
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
