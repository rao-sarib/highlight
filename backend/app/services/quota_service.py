"""
Monthly AI-scan quota tracking, keyed by plan.

A "scan" is a billable AI-visibility run (the live multi-engine scan, including
the one inside Run Full Analysis). Usage resets at the start of each calendar
month.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.plans import get_plan
from app.models.user import User


def _current_period() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def usage_for(user: User) -> dict:
    """Return {used, quota, period, remaining} for the current month."""
    period = _current_period()
    used = user.scans_used if user.scans_period == period else 0
    quota = get_plan(user.plan).monthly_scan_quota
    return {
        "used": used,
        "quota": quota,
        "period": period,
        "remaining": max(quota - used, 0),
    }


def consume_scan(user: User, db: Session) -> None:
    """Reset usage if the month rolled over, enforce the quota, then increment.

    Raises 402 if the user is out of scans for the month.
    """
    period = _current_period()
    if user.scans_period != period:
        user.scans_used = 0
        user.scans_period = period
    quota = get_plan(user.plan).monthly_scan_quota
    if user.scans_used >= quota:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"You've used all {quota} AI scans on your plan this month. "
                "Upgrade your plan for more, or wait for the monthly reset."
            ),
        )
    user.scans_used += 1
    db.add(user)
    db.commit()
