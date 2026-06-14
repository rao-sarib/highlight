"""
Stripe payment integration.

Hosted Checkout flow:
  1. POST /billing/checkout  -> create_checkout_session() returns a Stripe URL.
  2. User pays on Stripe's hosted page.
  3. Stripe calls POST /billing/webhook -> construct_event() verifies the
     signature, and on `checkout.session.completed` we upgrade the user's plan.

The whole module degrades gracefully when STRIPE_SECRET_KEY is unset (so the
app still runs and the demo "test bypass" path works without Stripe keys).
"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.core.plans import Plan

logger = logging.getLogger(__name__)

try:  # stripe is optional until keys are configured
    import stripe  # type: ignore
except Exception:  # pragma: no cover - import guard
    stripe = None  # type: ignore


class StripeError(Exception):
    """Raised when a Stripe operation cannot be completed."""


def is_configured() -> bool:
    """True when the Stripe SDK is installed and a secret key is set."""
    return stripe is not None and bool(settings.STRIPE_SECRET_KEY.strip())


def _client():
    if not is_configured():
        raise StripeError(
            "Stripe is not configured. Set STRIPE_SECRET_KEY in the backend "
            "environment (or use the test-activation button for the demo)."
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY.strip()
    return stripe


def create_checkout_session(
    *,
    plan: Plan,
    user_id: str,
    user_email: str,
) -> str:
    """Create a hosted Checkout session for `plan` and return its URL.

    Uses dynamic price_data so no pre-created Stripe Price IDs are required.
    Note: Stripe rejects $0 payments — set a real price_monthly before using
    this path (the demo uses the test-activation bypass instead).
    """
    client = _client()
    if plan.price_monthly <= 0:
        raise StripeError(
            f"The {plan.name} package is currently $0 — Stripe can't charge $0. "
            "Use the test-activation button for the demo, or set a real price."
        )

    base = settings.FRONTEND_BASE_URL.rstrip("/")
    session = client.checkout.Session.create(
        mode="payment",
        customer_email=user_email or None,
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": plan.price_monthly * 100,
                    "product_data": {"name": f"HIGHLIGHT {plan.name} plan"},
                },
            }
        ],
        # Carried back to us on the webhook so we know who bought what.
        metadata={"user_id": user_id, "plan_key": plan.key},
        client_reference_id=user_id,
        success_url=f"{base}/settings/plan?checkout=success",
        cancel_url=f"{base}/settings/plan?checkout=cancelled",
    )
    return session.url


def construct_event(payload: bytes, signature: str):
    """Verify a webhook signature and return the parsed Stripe event."""
    client = _client()
    secret = settings.STRIPE_WEBHOOK_SECRET.strip()
    if not secret:
        raise StripeError("STRIPE_WEBHOOK_SECRET is not set; cannot verify webhook.")
    try:
        return client.Webhook.construct_event(payload, signature, secret)
    except Exception as exc:  # signature mismatch / malformed payload
        raise StripeError(f"Invalid Stripe webhook signature: {exc}") from exc
