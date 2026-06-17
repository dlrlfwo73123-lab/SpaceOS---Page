from fastapi import APIRouter, HTTPException

from app.data.gold import get_district_grid, get_grid_cell

router = APIRouter()


def _cell_to_feature(cell: dict) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [cell["lng"], cell["lat"]]},
        "properties": {
            "grid_id": cell["grid_id"],
            "vacancy_rate": cell["vacancy_rate"],
            "predicted_rate": cell["predicted_rate"],
        },
    }


@router.get("/heatmap")
def get_heatmap(district: str = "lapesta") -> dict:
    """Vacancy heatmap for a commercial district as a GeoJSON FeatureCollection.

    Each Feature is a Point grid cell whose properties carry the Gold-layer
    `vacancy_rate` (observed) and `predicted_rate` (forecast).
    """
    cells = get_district_grid(district)
    return {
        "type": "FeatureCollection",
        "features": [_cell_to_feature(cell) for cell in cells],
    }


@router.get("/heatmap/{id}")
def get_heatmap_cell(id: str) -> dict:
    """A single heatmap grid cell as a GeoJSON Feature, by grid_id."""
    cell = get_grid_cell(id)
    if cell is None:
        raise HTTPException(status_code=404, detail=f"Unknown grid_id: {id}")
    return _cell_to_feature(cell)
