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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    OPENAI_API_KEY: str = ""

    # Serper API — real Google SERP rankings for Competitor Benchmarking
    # Get key at https://serper.dev (free tier: 2500 queries/month)
    SERPER_API_KEY: str = ""

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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
