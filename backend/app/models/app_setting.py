"""
AppSetting model — runtime-overridable configuration (API keys), set from the
admin panel. A value stored here OVERRIDES the corresponding environment
variable at runtime (see app.services.runtime_config). Keys with no row here
fall back to the .env / environment value, so nothing breaks if unset.
"""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class AppSetting(SQLModel, table=True):
    """A single overridable config value, keyed by its env-var name."""

    __tablename__ = "app_settings"

    key: str = Field(primary_key=True, max_length=64)
    value: str = Field(default="", max_length=4096)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
