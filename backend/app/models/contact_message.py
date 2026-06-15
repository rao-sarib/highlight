"""
ContactMessage model — submissions from the public "Contact Us" form.

Every submission is persisted here (so nothing is lost even when SMTP is off)
and shown to admins in the admin panel "Messages" tab. An email notification is
also sent when SMTP is configured.
"""

import uuid as _uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class ContactMessage(SQLModel, table=True):
    """A message submitted through the public contact form."""

    __tablename__ = "contact_messages"

    id: _uuid.UUID = Field(default_factory=_uuid.uuid4, primary_key=True, nullable=False)
    name: str = Field(max_length=120, nullable=False)
    email: str = Field(max_length=320, nullable=False)
    message: str = Field(max_length=5000, nullable=False)
    is_read: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
