"""
Public site content endpoint — serves the CMS-managed landing page content.

No auth: the landing page is public. Falls back to DEFAULT_LANDING when nothing
has been saved yet, so the page always renders.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.default_content import DEFAULT_LANDING
from app.db.session import get_db
from app.models.contact_message import ContactMessage as ContactMessageRow
from app.models.site_content import SINGLETON_ID, SiteContent
from app.services import email_service

router = APIRouter(prefix="/site", tags=["Site"])


@router.get("/landing", summary="Public landing-page content (CMS)")
def get_landing_content(db: Session = Depends(get_db)) -> dict:
    row = db.get(SiteContent, SINGLETON_ID)
    if row is None or not row.content:
        return DEFAULT_LANDING
    return row.content


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    message: str = Field(min_length=1, max_length=4000)


@router.post("/contact", summary="Public contact form")
def submit_contact(body: ContactMessage, db: Session = Depends(get_db)) -> dict:
    """Accept a contact message. Always persists it (visible in the admin panel
    "Messages" tab) and additionally emails the site's contact address via SMTP
    when configured."""
    # Persist first so the message is never lost, even if email isn't set up.
    db.add(ContactMessageRow(name=body.name, email=body.email, message=body.message))
    db.commit()

    row = db.get(SiteContent, SINGLETON_ID)
    footer = (row.content or {}).get("footer", {}) if row else {}
    to = footer.get("email") or DEFAULT_LANDING["footer"]["email"]
    try:
        email_service.send_email(
            db,
            to_email=to,
            subject=f"New contact message from {body.name}",
            body=f"From: {body.name} <{body.email}>\n\n{body.message}",
        )
        sent = True
    except email_service.EmailError:
        sent = False  # SMTP not configured — still stored above
    return {"ok": True, "emailed": sent}
