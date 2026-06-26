"""Deterministic MOCK commercial-district metrics for the recommendation engine.

This is explicitly a mock/demo data source (ported from the frontend's former
in-browser `marketData.ts` generator) — every value returned from this module
must be surfaced to the user with `is_demo=true` and `confidence=0`, never
presented as real measured data. Real ingestion (소상공인시장진흥공단/서울
열린데이터광장 등) belongs in a separate adapter under `app/adapters/` with
the same return shape, so callers won't need to change.
"""

from __future__ import annotations

GU_BASE: dict[str, dict[str, float]] = {
    "11680": {"floating_pop": 187400, "pop_density": 18500, "vacancy_rate": 12.4, "total_stores": 22310, "open_rate": 3.2, "close_rate": 2.1, "avg_op_months": 38, "revenue_idx": 168, "survival_rate_3y": 54.2, "rent_per_33": 18.5},
    "11740": {"floating_pop": 94200, "pop_density": 14200, "vacancy_rate": 10.8, "total_stores": 10540, "open_rate": 2.8, "close_rate": 2.4, "avg_op_months": 42, "revenue_idx": 112, "survival_rate_3y": 56.8, "rent_per_33": 9.2},
    "11305": {"floating_pop": 61800, "pop_density": 16100, "vacancy_rate": 17.3, "total_stores": 7820, "open_rate": 2.1, "close_rate": 3.1, "avg_op_months": 28, "revenue_idx": 78, "survival_rate_3y": 44.1, "rent_per_33": 5.8},
    "11500": {"floating_pop": 103500, "pop_density": 12400, "vacancy_rate": 14.2, "total_stores": 13900, "open_rate": 3.4, "close_rate": 2.7, "avg_op_months": 35, "revenue_idx": 101, "survival_rate_3y": 51.3, "rent_per_33": 8.1},
    "11620": {"floating_pop": 98700, "pop_density": 24300, "vacancy_rate": 15.8, "total_stores": 11200, "open_rate": 3.8, "close_rate": 3.2, "avg_op_months": 30, "revenue_idx": 89, "survival_rate_3y": 47.9, "rent_per_33": 7.4},
    "11215": {"floating_pop": 78900, "pop_density": 19800, "vacancy_rate": 11.5, "total_stores": 9640, "open_rate": 3.1, "close_rate": 2.3, "avg_op_months": 36, "revenue_idx": 107, "survival_rate_3y": 53.6, "rent_per_33": 9.8},
    "11530": {"floating_pop": 82100, "pop_density": 17200, "vacancy_rate": 16.1, "total_stores": 9880, "open_rate": 2.9, "close_rate": 2.9, "avg_op_months": 33, "revenue_idx": 88, "survival_rate_3y": 48.4, "rent_per_33": 6.9},
    "11545": {"floating_pop": 54300, "pop_density": 21600, "vacancy_rate": 13.9, "total_stores": 6120, "open_rate": 4.1, "close_rate": 2.6, "avg_op_months": 27, "revenue_idx": 95, "survival_rate_3y": 49.2, "rent_per_33": 7.2},
    "11350": {"floating_pop": 112300, "pop_density": 20100, "vacancy_rate": 13.7, "total_stores": 14500, "open_rate": 2.6, "close_rate": 2.8, "avg_op_months": 40, "revenue_idx": 93, "survival_rate_3y": 50.1, "rent_per_33": 7.6},
    "11320": {"floating_pop": 69400, "pop_density": 22300, "vacancy_rate": 15.2, "total_stores": 8200, "open_rate": 2.4, "close_rate": 3.0, "avg_op_months": 37, "revenue_idx": 81, "survival_rate_3y": 46.3, "rent_per_33": 5.9},
    "11230": {"floating_pop": 88600, "pop_density": 25900, "vacancy_rate": 14.6, "total_stores": 10900, "open_rate": 3.3, "close_rate": 2.8, "avg_op_months": 34, "revenue_idx": 98, "survival_rate_3y": 50.7, "rent_per_33": 8.8},
    "11590": {"floating_pop": 91200, "pop_density": 23400, "vacancy_rate": 13.1, "total_stores": 10100, "open_rate": 3.0, "close_rate": 2.5, "avg_op_months": 39, "revenue_idx": 104, "survival_rate_3y": 52.4, "rent_per_33": 8.3},
    "11440": {"floating_pop": 142800, "pop_density": 22100, "vacancy_rate": 11.9, "total_stores": 17400, "open_rate": 4.2, "close_rate": 2.2, "avg_op_months": 32, "revenue_idx": 139, "survival_rate_3y": 55.1, "rent_per_33": 13.6},
    "11410": {"floating_pop": 79300, "pop_density": 18800, "vacancy_rate": 14.8, "total_stores": 9300, "open_rate": 2.7, "close_rate": 2.9, "avg_op_months": 36, "revenue_idx": 92, "survival_rate_3y": 49.8, "rent_per_33": 8.1},
    "11650": {"floating_pop": 158700, "pop_density": 15600, "vacancy_rate": 10.3, "total_stores": 19800, "open_rate": 3.5, "close_rate": 1.9, "avg_op_months": 43, "revenue_idx": 155, "survival_rate_3y": 57.3, "rent_per_33": 16.2},
    "11200": {"floating_pop": 104600, "pop_density": 20700, "vacancy_rate": 11.7, "total_stores": 12300, "open_rate": 3.8, "close_rate": 2.0, "avg_op_months": 38, "revenue_idx": 128, "survival_rate_3y": 54.8, "rent_per_33": 11.4},
    "11290": {"floating_pop": 86400, "pop_density": 19300, "vacancy_rate": 13.4, "total_stores": 10200, "open_rate": 2.8, "close_rate": 2.7, "avg_op_months": 37, "revenue_idx": 91, "survival_rate_3y": 50.3, "rent_per_33": 7.8},
    "11710": {"floating_pop": 163200, "pop_density": 21800, "vacancy_rate": 11.2, "total_stores": 20100, "open_rate": 3.6, "close_rate": 2.0, "avg_op_months": 41, "revenue_idx": 147, "survival_rate_3y": 55.9, "rent_per_33": 14.8},
    "11470": {"floating_pop": 97800, "pop_density": 18400, "vacancy_rate": 12.8, "total_stores": 11700, "open_rate": 2.9, "close_rate": 2.4, "avg_op_months": 40, "revenue_idx": 106, "survival_rate_3y": 52.1, "rent_per_33": 9.4},
    "11560": {"floating_pop": 134500, "pop_density": 17900, "vacancy_rate": 13.5, "total_stores": 16200, "open_rate": 3.7, "close_rate": 2.3, "avg_op_months": 36, "revenue_idx": 131, "survival_rate_3y": 53.4, "rent_per_33": 12.1},
    "11170": {"floating_pop": 118900, "pop_density": 13200, "vacancy_rate": 12.0, "total_stores": 13800, "open_rate": 4.0, "close_rate": 2.1, "avg_op_months": 37, "revenue_idx": 143, "survival_rate_3y": 55.6, "rent_per_33": 13.9},
    "11380": {"floating_pop": 88100, "pop_density": 15700, "vacancy_rate": 14.5, "total_stores": 10400, "open_rate": 2.7, "close_rate": 2.8, "avg_op_months": 36, "revenue_idx": 87, "survival_rate_3y": 48.7, "rent_per_33": 6.7},
    "11110": {"floating_pop": 128400, "pop_density": 10800, "vacancy_rate": 13.8, "total_stores": 14900, "open_rate": 3.1, "close_rate": 2.6, "avg_op_months": 44, "revenue_idx": 125, "survival_rate_3y": 52.9, "rent_per_33": 12.8},
    "11140": {"floating_pop": 212000, "pop_density": 11200, "vacancy_rate": 14.1, "total_stores": 16700, "open_rate": 3.3, "close_rate": 2.5, "avg_op_months": 45, "revenue_idx": 162, "survival_rate_3y": 53.7, "rent_per_33": 17.2},
    "11260": {"floating_pop": 73600, "pop_density": 21400, "vacancy_rate": 15.9, "total_stores": 8700, "open_rate": 2.5, "close_rate": 3.1, "avg_op_months": 33, "revenue_idx": 82, "survival_rate_3y": 46.8, "rent_per_33": 6.2},
}

DEFAULT_BASE: dict[str, float] = {
    "floating_pop": 100000, "pop_density": 18000, "vacancy_rate": 14.0, "total_stores": 12000,
    "open_rate": 3.0, "close_rate": 2.5, "avg_op_months": 36, "revenue_idx": 100,
    "survival_rate_3y": 51.0, "rent_per_33": 9.0,
}

# 업종별 보정 계수 — 지표 성격에 맞춰 곱
INDUSTRY_MULT: dict[str, dict[str, float]] = {
    "ALL": {},
    "F45": {"close_rate": 1.35, "open_rate": 1.15, "rent_per_33": 1.05, "survival_rate_3y": 0.92, "avg_op_months": 0.85},
    "G47": {"close_rate": 1.2, "revenue_idx": 0.85, "survival_rate_3y": 0.9},
    "I56": {"open_rate": 1.4, "close_rate": 1.1, "rent_per_33": 0.95},
    "S96": {"rent_per_33": 0.9, "survival_rate_3y": 1.05, "avg_op_months": 1.1},
    "G4711": {"close_rate": 0.7, "survival_rate_3y": 1.3, "avg_op_months": 1.4},
    "Q86": {"close_rate": 0.5, "survival_rate_3y": 1.45, "avg_op_months": 1.6, "revenue_idx": 1.1},
    "P85": {"close_rate": 0.85, "survival_rate_3y": 1.15, "open_rate": 0.9},
    "K64": {"close_rate": 0.6, "survival_rate_3y": 1.35, "revenue_idx": 1.2},
    "J62": {"open_rate": 1.25, "close_rate": 1.0, "revenue_idx": 1.15},
    "ETC": {},
}

_RATE_LIKE = {
    "vacancy_rate", "open_rate", "close_rate", "survival_rate_3y",
    "revenue_idx", "avg_op_months", "rent_per_33", "pop_density",
}


def _hash(*parts: str) -> int:
    s = "|".join(parts)
    h = 1779033703 ^ len(s)
    for ch in s:
        h ^= ord(ch)
        h = (h * 3432918353) & 0xFFFFFFFF
        h = ((h << 13) | (h >> 19)) & 0xFFFFFFFF
    return h


def _deterministic_unit(*parts: str) -> float:
    """Deterministic value in [0, 1) — same inputs always produce the same output."""
    return (_hash(*parts) % 10_000) / 10_000


def _scale_to_dong(value: float, gu_code: str, dong_code: str, key: str, dong_count: int) -> float:
    variance = 0.85 + _deterministic_unit(gu_code, dong_code, key) * 0.3  # 0.85~1.15
    if key in _RATE_LIKE:
        return value * variance
    return (value / max(1, dong_count)) * variance


def get_market_stats(gu_code: str, dong_code: str, industry_code: str, dong_count: int = 5) -> dict[str, float]:
    """Deterministic MOCK metrics for one gu/dong/industry combination.

    Not real data — always pair with is_demo=true / confidence=0 in any
    response that surfaces this.
    """
    base = GU_BASE.get(gu_code, DEFAULT_BASE)
    mult = INDUSTRY_MULT.get(industry_code, {})
    result: dict[str, float] = {}
    for key, value in base.items():
        dong_value = _scale_to_dong(value, gu_code, dong_code, key, dong_count)
        result[key] = dong_value * mult.get(key, 1.0)
    return result
