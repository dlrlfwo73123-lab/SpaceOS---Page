from fastapi import APIRouter

from app.data.buildings import get_building_floors

router = APIRouter()


@router.get("/buildings/{id}/floors")
def get_floors(id: str) -> list[dict]:
    """Floor-by-floor occupancy for a building, for the 3D digital twin."""
    return get_building_floors(id)
