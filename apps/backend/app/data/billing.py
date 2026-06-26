"""Mock subscription plan catalog and a single mock "current user" entitlement.

There is no auth/user system or payment provider wired up yet, so there is
exactly one mock entitlement record (no user_id lookup) and pricing is
explicitly flagged as demo. Real billing wiring must come from an explicit
follow-up instruction, per project policy.
"""

from __future__ import annotations

PLANS: list[dict] = [
    {
        "id": "free",
        "name": "Free",
        "price_monthly_krw": 0,
        "is_demo_pricing": True,
        "monthly_analysis_quota": 3,
        "features": [
            {"key": "region_analysis", "label": "지역 기반 추천", "included": True},
            {"key": "industry_analysis", "label": "업종 기반 추천", "included": True},
            {"key": "data_provenance", "label": "데이터 출처/신뢰도 패널", "included": True},
            {"key": "export_report", "label": "분석 결과 내보내기", "included": False},
            {"key": "priority_support", "label": "우선 지원", "included": False},
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_monthly_krw": 29000,
        "is_demo_pricing": True,
        "monthly_analysis_quota": 50,
        "features": [
            {"key": "region_analysis", "label": "지역 기반 추천", "included": True},
            {"key": "industry_analysis", "label": "업종 기반 추천", "included": True},
            {"key": "data_provenance", "label": "데이터 출처/신뢰도 패널", "included": True},
            {"key": "export_report", "label": "분석 결과 내보내기", "included": True},
            {"key": "priority_support", "label": "우선 지원", "included": False},
        ],
    },
    {
        "id": "team",
        "name": "Team",
        "price_monthly_krw": 99000,
        "is_demo_pricing": True,
        "monthly_analysis_quota": None,
        "features": [
            {"key": "region_analysis", "label": "지역 기반 추천", "included": True},
            {"key": "industry_analysis", "label": "업종 기반 추천", "included": True},
            {"key": "data_provenance", "label": "데이터 출처/신뢰도 패널", "included": True},
            {"key": "export_report", "label": "분석 결과 내보내기", "included": True},
            {"key": "priority_support", "label": "우선 지원", "included": True},
        ],
    },
]

# No auth system exists yet, so this is the single mock entitlement record
# returned to every caller — not per-user data.
MOCK_ENTITLEMENTS: dict = {
    "plan_id": "free",
    "status": "none",
    "is_demo": True,
    "monthly_analysis_quota": 3,
    "analyses_used_this_month": 0,
    "payment_enabled": False,
}


def plan_by_id(plan_id: str) -> dict | None:
    for plan in PLANS:
        if plan["id"] == plan_id:
            return plan
    return None
