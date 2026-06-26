"""Deterministic recommendation endpoints.

Scoring is fully non-AI (`services/scoring.py`); AI only narrates the
already-computed scores (`services/ai_explainer.py`). Data currently comes
exclusively from `app/data/mock_market.py`, which is explicitly mock/demo
data — every response here sets `is_demo=true` and forces `confidence=0`
accordingly. Swapping in a real adapter later should only require changing
the data-fetch call below, not the scoring/explanation pipeline.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.data import seoul
from app.repositories.market_repository import MockMarketRepository
from app.schemas.recommendation import (
    IndustryRecommendationRequest,
    RecommendationItem,
    RecommendationResult,
    RegionRecommendationRequest,
)
from app.services import ai_explainer, scoring
from app.services.confidence import mock_confidence

router = APIRouter()

_REGION_CANDIDATE_INDUSTRIES = [i for i in seoul.INDUSTRY_CODES if i["code"] != "ALL"]
_market_repository = MockMarketRepository()


def _build_item(gu_code: str, dong_code: str, industry_code: str) -> RecommendationItem:
    gu_name = seoul.gu_name_of(gu_code)
    dong_name = seoul.dong_name_of(gu_code, dong_code)
    industry_name = seoul.industry_name_of(industry_code)
    dong_count = seoul.dong_count_of(gu_code)

    stats = _market_repository.get_stats(gu_code, dong_code, industry_code, dong_count=dong_count)
    breakdown = scoring.score_breakdown(stats)
    total_score = scoring.total_score_of(breakdown)
    confidence = mock_confidence()
    area_label = f"{gu_name} {dong_name}".strip()
    explanation = ai_explainer.explain(area_label, industry_name, stats, breakdown, total_score, confidence["is_demo"])

    return RecommendationItem(
        id=f"{gu_code}-{dong_code}-{industry_code}",
        rank=0,
        gu_code=gu_code,
        gu_name=gu_name,
        dong_code=dong_code,
        dong_name=dong_name,
        industry_code=industry_code,
        industry_name=industry_name,
        total_score=total_score,
        breakdown=breakdown,
        confidence=confidence,
        explanation=explanation,
        expected_monthly_revenue=round((stats["revenue_idx"] / 100) * 2000),
        rent_per_33=round(stats["rent_per_33"], 1),
        survival_rate_3y=round(stats["survival_rate_3y"], 1),
    )


def _rank(items: list[RecommendationItem]) -> list[RecommendationItem]:
    ordered = sorted(items, key=lambda it: it.total_score, reverse=True)
    for idx, item in enumerate(ordered):
        item.rank = idx + 1
    return ordered


@router.post("/recommendations/by-region", response_model=RecommendationResult)
def recommend_by_region(payload: RegionRecommendationRequest) -> RecommendationResult:
    """Top industries for a chosen gu/dong, ranked by deterministic score."""
    items = [
        _build_item(payload.gu_code, payload.dong_code, ind["code"])
        for ind in _REGION_CANDIDATE_INDUSTRIES
    ]
    ranked = _rank(items)[:5]
    return RecommendationResult(
        mode="region",
        is_demo=True,
        query={
            "gu_code": payload.gu_code,
            "gu_name": seoul.gu_name_of(payload.gu_code),
            "dong_code": payload.dong_code,
            "dong_name": seoul.dong_name_of(payload.gu_code, payload.dong_code),
        },
        items=ranked,
    )


@router.post("/recommendations/by-industry", response_model=RecommendationResult)
def recommend_by_industry(payload: IndustryRecommendationRequest) -> RecommendationResult:
    """Top gu/dong locations for a chosen industry, ranked by deterministic score."""
    items = [
        _build_item(gu_code, dong_code, payload.industry_code)
        for gu_code, dong_code in seoul.all_gu_dong_pairs()
    ]
    ranked = _rank(items)[:6]
    return RecommendationResult(
        mode="industry",
        is_demo=True,
        query={
            "industry_code": payload.industry_code,
            "industry_name": seoul.industry_name_of(payload.industry_code),
        },
        items=ranked,
    )
