"""Concept interior layout. Every output is 'proposed' and never claims measurement."""
from __future__ import annotations

from shapely.geometry import box


class LayoutError(ValueError):
    pass


def propose_layout(space: dict | None, items: list[dict]) -> dict:
    """space: {'width_m','depth_m','source'} from an approved input; items: {'name','w_m','d_m'}.

    Refuses without an approved concept space (the PDF's whole-floor area is not a room).
    Items are placed in rows; anything that does not fit is reported, never forced.
    """
    if not space or not space.get("source"):
        raise LayoutError("no approved space with a source; real room boundary is unknown")
    W, D = space["width_m"], space["depth_m"]
    placed, rejected = [], []
    x = y = row_h = 0.0
    for it in items:
        w, d = it["w_m"], it["d_m"]
        if x + w > W:
            x, y, row_h = 0.0, y + row_h, 0.0
        r = box(x, y, x + w, y + d)
        if y + d > D or any(r.intersects(box(*p["bounds"])) and r.intersection(box(*p["bounds"])).area > 1e-9
                            for p in placed):
            rejected.append(it["name"])
            continue
        placed.append({"name": it["name"], "bounds": (x, y, x + w, y + d), "status": "proposed"})
        x += w
        row_h = max(row_h, d)
    return {"status": "proposed", "measured": False, "space_source": space["source"],
            "placed": placed, "rejected": rejected}
