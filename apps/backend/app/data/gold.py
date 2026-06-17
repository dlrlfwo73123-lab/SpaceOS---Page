"""Gold-layer access for district vacancy aggregates.

In the medallion architecture this module is the seam between the API and
the curated (Gold) tables produced by the data pipeline. The lookup below
stands in for that table until a real warehouse/lakehouse connection is
wired up — callers only depend on `get_district_grid`, so swapping the body
for a SQL/parquet read later won't change `districts.py`.
"""

from __future__ import annotations

DISTRICT_CENTERS: dict[str, tuple[float, float]] = {
    "lapesta": (126.978, 37.5665),
    "gangnam": (127.0276, 37.4979),
    "hongdae": (126.9255, 37.5572),
    "jongno": (126.9920, 37.5703),
    "default": (126.978, 37.5665),
}

# Offsets (lng, lat) for a small grid of cells around each district center.
_GRID_OFFSETS: tuple[tuple[float, float], ...] = (
    (0.0, 0.0),
    (0.001, 0.0005),
    (-0.001, -0.0007),
    (0.0008, -0.0009),
    (-0.0007, 0.001),
)


def _seeded_rate(grid_id: str, salt: int) -> float:
    """Deterministic pseudo-rate in [0, 1] derived from the grid id."""
    digest = sum((ord(c) * (i + 1) for i, c in enumerate(grid_id))) + salt
    return round((digest % 100) / 100, 2)


def get_district_grid(district: str) -> list[dict]:
    """Return Gold-layer grid cells for a commercial district.

    Each cell carries the historical `vacancy_rate` and the model's
    `predicted_rate` (next-period forecast) for that cell.
    """
    center = DISTRICT_CENTERS.get(district, DISTRICT_CENTERS["default"])
    lng0, lat0 = center

    cells = []
    for i, (dlng, dlat) in enumerate(_GRID_OFFSETS):
        grid_id = f"{district}-{i}"
        cells.append(
            {
                "grid_id": grid_id,
                "lng": round(lng0 + dlng, 6),
                "lat": round(lat0 + dlat, 6),
                "vacancy_rate": _seeded_rate(grid_id, salt=0),
                "predicted_rate": _seeded_rate(grid_id, salt=17),
            }
        )
    return cells
