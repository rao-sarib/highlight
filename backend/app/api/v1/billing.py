"""
Plans & billing endpoints.

Two ways to get onto a paid package:
  • Real payment — POST /checkout returns a Stripe hosted-checkout URL; Stripe
    then calls POST /webhook, which upgrades the user's plan on success.
  • Test bypass — POST /dev-activate flips the plan instantly with no payment.
    This powers the "Activate (test — no payment)" button used for the demo;
    remove it (and the button) before going live.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.dependencies import get_current_user
from app.core.plans import PLANS, get_plan
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services import stripe_service
from app.services.quota_service import usage_for

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])


class PlanModel(BaseModel):
    key: str
    name: str
    price_monthly: int
    max_projects: int
    max_crawl_pages: int
    monthly_scan_quota: int
    engines: list[str]
    features: list[str]
    blurb: str
    purchasable: bool


class UsageModel(BaseModel):
    used: int
    quota: int
    period: str
    remaining: int


class BillingMe(BaseModel):
    plan: PlanModel
    usage: UsageModel
    projects_used: int
    projects_limit: int
    stripe_enabled: bool


class SwitchPlanRequest(BaseModel):
    plan_key: str


class CheckoutResponse(BaseModel):
    url: str


def _plan_model(plan_key: str) -> PlanModel:
    p = get_plan(plan_key)
    return PlanModel(
        key=p.key,
        name=p.name,
        price_monthly=p.price_monthly,
        max_projects=p.max_projects,
        max_crawl_pages=p.max_crawl_pages,
        monthly_scan_quota=p.monthly_scan_quota,
        engines=list(p.engines),
        features=list(p.features),
        blurb=p.blurb,
        purchasable=p.purchasable,
    )


@router.get("/plans", response_model=list[PlanModel], summary="List available plans")
def list_plans() -> list[PlanModel]:
    return [_plan_model(key) for key in PLANS]


def _me(db: Session, user: User) -> BillingMe:
    projects_used = len(
        db.exec(select(Project.id).where(Project.owner_id == user.id)).all()
    )
    return BillingMe(
        plan=_plan_model(user.plan),
        usage=UsageModel(**usage_for(user)),
        projects_used=projects_used,
        projects_limit=get_plan(user.plan).max_projects,
        stripe_enabled=stripe_service.is_configured(),
    )


@router.get("/me", response_model=BillingMe, summary="Current plan + usage")
def billing_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMe:
    return _me(db, current_user)


def _apply_plan(db: Session, user: User, plan_key: str) -> None:
    user.plan = plan_key
    db.add(user)
    db.commit()
    db.refresh(user)


@router.post("/checkout", response_model=CheckoutResponse, summary="Start Stripe checkout")
def create_checkout(
    body: SwitchPlanRequest,
    current_user: User = Depends(get_current_user),
) -> CheckoutResponse:
    """Create a Stripe hosted-checkout session for a purchasable package."""
    key = body.plan_key.strip().lower()
    plan = PLANS.get(key)
    if plan is None or not plan.purchasable:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown or non-purchasable plan.")
    try:
        url = stripe_service.create_checkout_session(
            plan=plan, user_id=str(current_user.id), user_email=current_user.email
        )
    except stripe_service.StripeError as exc:
        # 409 so the frontend can fall back to the test-activation button.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return CheckoutResponse(url=url)


@router.post("/webhook", summary="Stripe webhook (payment confirmation)")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    """Verify the Stripe event and upgrade the buyer's plan on success."""
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event = stripe_service.construct_event(payload, signature)
    except stripe_service.StripeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        meta = session.get("metadata") or {}
        user_id = meta.get("user_id") or session.get("client_reference_id")
        plan_key = (meta.get("plan_key") or "").lower()
        if user_id and plan_key in PLANS:
            user = db.exec(select(User).where(User.id == user_id)).first()
            if user is not None:
                _apply_plan(db, user, plan_key)
                logger.info("Stripe: upgraded user %s to %s", user_id, plan_key)

    return {"received": True}


@router.post("/dev-activate", response_model=BillingMe, summary="TEST: activate a plan without payment")
def dev_activate_plan(
    body: SwitchPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMe:
    """Demo-only bypass: set the plan instantly with no payment.

    Lets the panel see package limits/features change without a live charge.
    Remove this endpoint (and its button) before going to production.
    """
    key = body.plan_key.strip().lower()
    if key not in PLANS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown plan.")
    _apply_plan(db, current_user, key)
    return _me(db, current_user)
