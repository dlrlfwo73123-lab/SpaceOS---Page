from fastapi import APIRouter

from app.data.gold import get_district_grid

router = APIRouter()


@router.get("/heatmap")
def get_heatmap(district: str = "lapesta") -> dict:
    """Vacancy heatmap for a commercial district as a GeoJSON FeatureCollection.

    Each Feature is a Point grid cell whose properties carry the Gold-layer
    `vacancy_rate` (observed) and `predicted_rate` (forecast).
    """
    cells = get_district_grid(district)
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [cell["lng"], cell["lat"]]},
                "properties": {
                    "grid_id": cell["grid_id"],
                    "vacancy_rate": cell["vacancy_rate"],
                    "predicted_rate": cell["predicted_rate"],
                },
            }
            for cell in cells
        ],
    }
