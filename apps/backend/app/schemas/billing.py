"""Billing schemas: subscription plans and entitlements.

No real payment provider is wired up — these endpoints expose a fixed,
mock plan catalog and a mock "current subscription" so the frontend can
build pricing/entitlement UI now. Payment UI must stay disabled/"준비 중"
until a real billing provider is integrated, per project policy.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

PlanId = Literal["free", "pro", "team"]
SubscriptionStatus = Literal["active", "trialing", "canceled", "none"]


class PlanFeature(BaseModel):
    key: str
    label: str
    included: bool


class Plan(BaseModel):
    id: PlanId
    name: str
    price_monthly_krw: int
    is_demo_pricing: bool
    features: list[PlanFeature]
    monthly_analysis_quota: int | None  # None == unlimited


class Entitlements(BaseModel):
    plan_id: PlanId
    status: SubscriptionStatus
    is_demo: bool
    monthly_analysis_quota: int | None
    analyses_used_this_month: int
    payment_enabled: bool
    note: str = Field(
        default="실제 결제 연동 전까지 모든 구독/사용량 데이터는 mock입니다."
    )
