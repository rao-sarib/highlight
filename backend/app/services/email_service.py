"""
Email service — sends mail using the admin-configured SMTP settings.

Reads the singleton SmtpSettings row at send time. Degrades gracefully: raises
a clear EmailError when SMTP isn't configured so the caller can surface it.
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from sqlmodel import Session

from app.models.smtp_settings import SINGLETON_ID, SmtpSettings


class EmailError(Exception):
    """Raised when an email cannot be sent."""


def get_settings(db: Session) -> SmtpSettings:
    row = db.get(SmtpSettings, SINGLETON_ID)
    if row is None:
        row = SmtpSettings(id=SINGLETON_ID)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def send_email(db: Session, *, to_email: str, subject: str, body: str) -> None:
    """Send a plain-text email via the configured SMTP server."""
    cfg = get_settings(db)
    if not cfg.enabled:
        raise EmailError("SMTP is not enabled. Configure and enable it in the admin panel.")
    if not cfg.host or not cfg.from_email:
        raise EmailError("SMTP host and from-address are required.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{cfg.from_name} <{cfg.from_email}>" if cfg.from_name else cfg.from_email
    msg["To"] = to_email
    msg.set_content(body)

    # Gmail shows app passwords as "abcd efgh ijkl mnop" for readability, but the
    # password itself has no spaces — strip them so it works whether or not the
    # user copied the spaces. (App passwords never legitimately contain spaces.)
    password = cfg.password.replace(" ", "")

    try:
        if cfg.port == 465:
            with smtplib.SMTP_SSL(cfg.host, cfg.port, timeout=20) as server:
                if cfg.username:
                    server.login(cfg.username, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(cfg.host, cfg.port, timeout=20) as server:
                if cfg.use_tls:
                    server.starttls()
                if cfg.username:
                    server.login(cfg.username, password)
                server.send_message(msg)
    except Exception as exc:  # noqa: BLE001 - surface any SMTP failure cleanly
        raise EmailError(f"Failed to send email: {exc}") from exc
