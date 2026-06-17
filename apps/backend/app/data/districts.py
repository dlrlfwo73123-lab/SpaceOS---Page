"""Gold-layer access for district-level statistical trends.

Keyed by Seoul 행정구역 gu_code (e.g. "11680" = 강남구) — distinct from
`gold.py`, which serves the heatmap grid by district slug (e.g. "gangnam")
for the map view. This stands in for a future Gold table of monthly
vacancy-rate aggregates; the final point is flagged `predicted=True` as a
placeholder for a future forecasting model call.
"""

from __future__ import annotations

from datetime import date


def _hash(gu_code: str, salt: int) -> int:
    return sum(ord(c) * (i + 1) for i, c in enumerate(gu_code)) + salt


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    idx = year * 12 + (month - 1) + delta
    return idx // 12, idx % 12 + 1


def get_district_trend(gu_code: str, months: int = 12) -> list[dict]:
    """Deterministic monthly vacancy-rate trend for a district, oldest first.

    Returns `months` observed points plus one forward-looking predicted
    point appended at the end.
    """
    base = 8 + (_hash(gu_code, 0) % 12)
    today = date.today()

    points = []
    for i in range(months):
        year, month = _shift_month(today.year, today.month, -(months - 1 - i))
        h = _hash(gu_code, i * 13 + 3)
        wobble = (h % 7) - 3
        rate = max(2.0, round(base + wobble + i * 0.05, 1))
        points.append({"month": f"{year:04d}-{month:02d}", "vacancy_rate": rate, "predicted": False})

    pred_year, pred_month = _shift_month(today.year, today.month, 1)
    h = _hash(gu_code, months * 13 + 3)
    pred_rate = max(2.0, round(points[-1]["vacancy_rate"] + ((h % 5) - 2) * 0.5, 1))
    points.append({"month": f"{pred_year:04d}-{pred_month:02d}", "vacancy_rate": pred_rate, "predicted": True})

    return points
