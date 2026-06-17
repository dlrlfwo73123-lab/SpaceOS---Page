"""Gold-layer access for building floor composition.

Same placeholder seam as `gold.py`: deterministic pseudo-data keyed off the
building id, standing in for a curated Gold table until a real
warehouse/lakehouse connection is wired up.
"""

from __future__ import annotations

_INDUSTRIES: tuple[str, ...] = (
    "카페", "음식점", "편의점", "미용실", "의류", "약국", "학원", "사무실",
)


def _floor_count(building_id: str) -> int:
    """Deterministic floor count in [4, 8] derived from the building id."""
    return 4 + (sum(ord(c) for c in building_id) % 5)


def _floor_industry(building_id: str, level: int) -> str:
    digest = sum(ord(c) for c in building_id) + level * 7
    return _INDUSTRIES[digest % len(_INDUSTRIES)]


def _floor_vacant(building_id: str, level: int) -> bool:
    """~25% of floors come back vacant, deterministically."""
    digest = sum(ord(c) * (i + 1) for i, c in enumerate(building_id)) + level * 13
    return digest % 4 == 0


def get_building_floors(building_id: str) -> list[dict]:
    """Return Gold-layer floor-by-floor occupancy for a building.

    Powers the 3D digital twin: each floor carries its `level`, current
    `industry`, and whether it is `vacant`.
    """
    count = _floor_count(building_id)
    return [
        {
            "level": level,
            "industry": _floor_industry(building_id, level),
            "vacant": _floor_vacant(building_id, level),
        }
        for level in range(1, count + 1)
    ]


# Buildings with a captured/scanned 3D model. Unlike floor occupancy, most
# buildings won't have one, so this is a registry rather than a generator.
_BUILDING_MODELS: dict[str, str] = {
    "demo-building": "/models/demo-building.glb",
}


def get_building_model(building_id: str) -> dict | None:
    """Return the GLB model URL for a building, or None if none is captured."""
    model_url = _BUILDING_MODELS.get(building_id)
    if model_url is None:
        return None
    return {"building_id": building_id, "model_url": model_url}
