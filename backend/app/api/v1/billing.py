"""
Plans & billing endpoints.

No real payment provider (this is an FYP) — switching plans is instant and free,
which also lets a demo show how the limits/features change between tiers.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.dependencies import get_current_user
from app.core.plans import PLANS, get_plan
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.services.quota_service import usage_for

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


class SwitchPlanRequest(BaseModel):
    plan_key: str


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
    )


@router.get("/me", response_model=BillingMe, summary="Current plan + usage")
def billing_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMe:
    return _me(db, current_user)


@router.post("/switch", response_model=BillingMe, summary="Switch plan (instant, no payment)")
def switch_plan(
    body: SwitchPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BillingMe:
    key = body.plan_key.strip().lower()
    if key not in PLANS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown plan.")
    current_user.plan = key
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return _me(db, current_user)
