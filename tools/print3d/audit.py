"""Audit a building GeoJSON before any modelling.

Never fills in missing values: buildings that cannot be modelled are listed with a reason.
Expected properties: pnu, building_id, height_m, floors, floor_certainty.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from shapely.geometry import shape

CERTAINTIES = {"confirmed", "probable"}


class AuditError(ValueError):
    pass


def load_features(path: str | Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["features"]


def audit(features: list[dict], require_height: bool = True) -> dict:
    """Return {'usable': [...], 'excluded': [{'id','reason'}], 'counts': {...}}.

    With require_height=True a missing/zero height raises instead of being defaulted.
    """
    pnu_counts = Counter(f["properties"].get("pnu") for f in features)
    usable, excluded = [], []
    for f in features:
        p = f["properties"]
        bid = p.get("building_id")
        reason = None
        geom = None
        try:
            geom = shape(f["geometry"])
        except Exception:  # noqa: BLE001 - malformed geometry is reported, not fatal
            reason = "unparseable_geometry"
        if reason is None and geom.geom_type not in ("Polygon", "MultiPolygon"):
            reason = "not_polygon"
        if reason is None and (geom.is_empty or not geom.is_valid):
            reason = "invalid_geometry"
        height = p.get("height_m")
        if reason is None and not height:
            if require_height:
                raise AuditError(f"building {bid}: height missing or 0 and no default is allowed")
            reason = "missing_height"
        if reason is None and pnu_counts[p.get("pnu")] > 1:
            reason = "ambiguous_pnu"
        if reason is None and p.get("floor_certainty") not in CERTAINTIES:
            reason = "unknown_floor_certainty"
        (excluded if reason else usable).append({"id": bid, "reason": reason} if reason else f)
    return {
        "usable": usable,
        "excluded": excluded,
        "counts": {"total": len(features), "usable": len(usable), "excluded": len(excluded)},
    }
