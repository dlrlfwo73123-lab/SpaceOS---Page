"""Deterministic, non-AI weighted scoring for the recommendation engine.

Per project rule, AI never ranks or scores — this module is the sole source
of `total_score` and per-component breakdown. The AI explainer (see
`ai_explainer.py`) only narrates the numbers this module already produced.

Weights and component definitions follow the originally specified scoring
model. Inputs here come from `app/data/mock_market.get_market_stats()`,
which is explicitly demo data (see that module's docstring) — this scorer
itself is data-source-agnostic and will work unchanged once a real adapter
supplies the same metric keys.
"""

from __future__ import annotations

WEIGHTS: dict[str, float] = {
    "demand": 0.22,
    "competition_opportunity": 0.15,
    "survival": 0.15,
    "growth": 0.12,
    "rent_efficiency": 0.12,
    "closure_stability": 0.10,
    "accessibility": 0.07,
    "building_fit": 0.07,
}

assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9

COMPONENT_LABELS: dict[str, str] = {
    "demand": "수요(유동인구·매출지수)",
    "competition_opportunity": "경쟁/공실 기회",
    "survival": "3년 생존율",
    "growth": "신규개업률",
    "rent_efficiency": "임대 효율",
    "closure_stability": "폐업 안정성",
    "accessibility": "접근성(인구밀도 기반 추정)",
    "building_fit": "업종 적합도(평균 영업기간 기반 추정)",
}


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _score_demand(stats: dict[str, float]) -> float:
    floating = _clamp((stats["floating_pop"] / 2000) * 10)
    revenue = _clamp(stats["revenue_idx"] * 0.6)
    return _clamp(floating * 0.5 + revenue * 0.5)


def _score_competition_opportunity(stats: dict[str, float]) -> float:
    # Some vacancy signals an opening opportunity; too much signals a dying market.
    vacancy = stats["vacancy_rate"]
    if vacancy <= 8:
        opportunity = 55 + vacancy * 2
    elif vacancy <= 14:
        opportunity = 70
    else:
        opportunity = max(0, 70 - (vacancy - 14) * 5)
    return _clamp(opportunity)


def _score_survival(stats: dict[str, float]) -> float:
    return _clamp(stats["survival_rate_3y"] * 1.6)


def _score_growth(stats: dict[str, float]) -> float:
    return _clamp(stats["open_rate"] * 22)


def _score_rent_efficiency(stats: dict[str, float]) -> float:
    if stats["rent_per_33"] <= 0:
        return 0.0
    ratio = stats["revenue_idx"] / stats["rent_per_33"]
    return _clamp(ratio * 4)


def _score_closure_stability(stats: dict[str, float]) -> float:
    return _clamp(100 - stats["close_rate"] * 18)


def _score_accessibility(stats: dict[str, float]) -> float:
    return _clamp((stats["pop_density"] / 28000) * 100)


def _score_building_fit(stats: dict[str, float]) -> float:
    return _clamp((stats["avg_op_months"] / 50) * 100)


_COMPONENT_SCORERS = {
    "demand": _score_demand,
    "competition_opportunity": _score_competition_opportunity,
    "survival": _score_survival,
    "growth": _score_growth,
    "rent_efficiency": _score_rent_efficiency,
    "closure_stability": _score_closure_stability,
    "accessibility": _score_accessibility,
    "building_fit": _score_building_fit,
}


def score_breakdown(stats: dict[str, float]) -> list[dict]:
    """Per-component scores (0-100) and weights, in WEIGHTS order."""
    return [
        {
            "key": key,
            "label": COMPONENT_LABELS[key],
            "score": round(_COMPONENT_SCORERS[key](stats), 1),
            "weight": weight,
        }
        for key, weight in WEIGHTS.items()
    ]


def total_score_of(breakdown: list[dict]) -> int:
    weighted = sum(item["score"] * item["weight"] for item in breakdown)
    return round(weighted)
