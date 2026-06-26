from fastapi import APIRouter, HTTPException

from app.data.buildings import get_building_floors, get_building_history, get_building_model

router = APIRouter()


@router.get("/buildings/{id}/floors")
def get_floors(id: str) -> list[dict]:
    """Floor-by-floor occupancy for a building, for the 3D digital twin."""
    return get_building_floors(id)


@router.get("/buildings/{id}/model")
def get_model(id: str) -> dict:
    """GLB model URL for a building's 3D digital twin, if one is captured."""
    model = get_building_model(id)
    if model is None:
        raise HTTPException(status_code=404, detail=f"No 3D model for building: {id}")
    return model


@router.get("/buildings/{id}/history")
def get_history(id: str) -> list[dict]:
    """Store-occupancy timeline for a building's vacancy history.

    Deterministic mock data — every entry is explicitly marked `is_demo`
    and `close_reason_summary` is a placeholder example, never a real
    confirmed closure reason, per the project's no-fabrication rule.
    """
    return [{**event, "is_demo": True} for event in get_building_history(id)]
