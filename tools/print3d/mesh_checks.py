"""Printability checks on a mesh already in millimetres."""
from __future__ import annotations

from shapely.geometry import Polygon

from print_profile import fits_bed, validate_profile


def check_mesh(mesh, profile: dict) -> dict:
    p = validate_profile(profile)
    issues = []
    if not mesh.is_watertight:
        issues.append("not_watertight")
    if mesh.is_watertight and mesh.volume <= 0:
        issues.append("non_positive_volume")
    if len(mesh.split(only_watertight=False)) > 1:
        issues.append("floating_parts")
    # thinnest footprint feature: a footprint eroded by half the wall must survive
    top = mesh.section(plane_origin=[0, 0, mesh.bounds[0][2] + 1e-3], plane_normal=[0, 0, 1])
    if top is not None:
        for poly in top.to_2D()[0].polygons_full:
            if Polygon(poly).buffer(-p["min_wall_mm"] / 2).is_empty:
                issues.append("below_min_wall")
                break
    if mesh.extents[2] < p["min_wall_mm"]:
        issues.append("below_min_height")
    if not fits_bed(mesh.extents, p):
        issues.append("exceeds_bed")
    return {"ok": not issues, "issues": issues}
