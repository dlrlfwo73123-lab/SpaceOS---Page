"""Extrude building footprints into scaled blocks. Heights are never invented."""
from __future__ import annotations

import numpy as np
import shapely
import trimesh
from shapely.geometry import Polygon, shape

from coordinates import make_transformer, to_print_mm


def _polygons(geom):
    return list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]


def build_massing(usable: list[dict], scale_denominator: int = 1000,
                  crs: str = "EPSG:5186") -> list[dict]:
    """Return [{'building_id','mesh','floor_certainty','source'}] in print millimetres.

    The origin is the south-west corner of the whole block (parallel shift only).
    """
    tf = make_transformer(crs)
    projected = []
    for f in usable:
        g = shapely.transform(shape(f["geometry"]), lambda c: np.column_stack(tf.transform(c[:, 0], c[:, 1])))
        projected.append((f, g))
    minx = min(g.bounds[0] for _, g in projected)
    miny = min(g.bounds[1] for _, g in projected)
    k = to_print_mm(1.0, scale_denominator)
    out = []
    for f, g in projected:
        meshes = []
        for poly in _polygons(g):
            pts = [((x - minx) * k, (y - miny) * k) for x, y in poly.exterior.coords]
            holes = [[((x - minx) * k, (y - miny) * k) for x, y in r.coords] for r in poly.interiors]
            m = trimesh.creation.extrude_polygon(Polygon(pts, holes),
                                                 to_print_mm(f["properties"]["height_m"], scale_denominator))
            meshes.append(m)
        mesh = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
        out.append({
            "building_id": f["properties"]["building_id"],
            "mesh": mesh,
            "floor_certainty": f["properties"]["floor_certainty"],  # copied, never promoted
            "floors": f["properties"].get("floors"),
            "source": "gold_input",
            "status": "derived_from_input",
        })
    return out


def scale_bar(length_m: float, scale_denominator: int, width_mm: float = 2.0, h_mm: float = 1.0):
    """A bar whose printed length is the real `length_m` at the chosen scale."""
    return trimesh.creation.box(extents=[to_print_mm(length_m, scale_denominator), width_mm, h_mm])
