"""
SmtpSettings model — outbound email (SMTP) configuration, set in the admin panel.

A single row (id=1). Used by the email service to send mail (e.g. test emails,
and future transactional/outreach sends).
"""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel

SINGLETON_ID = 1


class SmtpSettings(SQLModel, table=True):
    """Singleton row of SMTP server configuration."""

    __tablename__ = "smtp_settings"

    id: int = Field(default=SINGLETON_ID, primary_key=True)
    host: str = Field(default="", max_length=255, nullable=False)
    port: int = Field(default=587, nullable=False)
    username: str = Field(default="", max_length=255, nullable=False)
    password: str = Field(default="", max_length=512, nullable=False)
    from_email: str = Field(default="", max_length=320, nullable=False)
    from_name: str = Field(default="Highlight", max_length=255, nullable=False)
    use_tls: bool = Field(default=True, nullable=False)
    enabled: bool = Field(default=False, nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )
