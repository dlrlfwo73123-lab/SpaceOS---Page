"""Mock billing endpoints: plan catalog and current entitlements.

No real payment provider is integrated — `payment_enabled` is always False
here, and pricing is flagged `is_demo_pricing=True`. Payment UI in the
frontend must stay disabled/"준비 중" until a real billing provider is
wired up via an explicit follow-up instruction.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data.billing import MOCK_ENTITLEMENTS, PLANS, plan_by_id
from app.schemas.billing import Entitlements, Plan

router = APIRouter()


@router.get("/plans", response_model=list[Plan])
def list_plans() -> list[Plan]:
    return [Plan(**p) for p in PLANS]


@router.get("/plans/{plan_id}", response_model=Plan)
def get_plan(plan_id: str) -> Plan:
    plan = plan_by_id(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="plan not found")
    return Plan(**plan)


@router.get("/entitlements", response_model=Entitlements)
def get_entitlements() -> Entitlements:
    # No auth/user system exists yet, so this is a single mock record
    # rather than a per-user lookup.
    return Entitlements(**MOCK_ENTITLEMENTS)
