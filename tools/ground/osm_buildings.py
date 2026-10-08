"""OSM 건물 외곽(way[building]) → 입체화용 레코드.

높이 규칙(우선순위): `height` 태그(m) > `building:levels` × FLOOR_H > 기본값(DEFAULT_H).
태그가 아닌 값은 estimated=True 로 남겨 화면에서 구분한다. 닫힌 way 만 사용한다(multipolygon relation 은 제외).
"""
from __future__ import annotations

import re

from shapely.geometry import Polygon

from osm_ground import TO_LL, TO_M, reproject

FLOOR_H = 3.5      # BuildingTwin.FLOOR_H 와 동일
DEFAULT_H = 7.0    # 태그가 전혀 없을 때(추정): 2층 규모
MIN_AREA_M2 = 5.0
SIMPLIFY_M = 0.3
MAX_RING_PTS = 60


def _num(v) -> float | None:
    m = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", str(v)) if v is not None else None
    return float(m.group(1)) if m else None


def building_height(tags: dict) -> tuple[float, int | None, str]:
    """(높이 m, 층수 또는 None, source) — source: tag | levels | default"""
    h = _num(tags.get("height"))
    lv = _num(tags.get("building:levels"))
    levels = int(lv) if lv and lv >= 1 else None
    if h and h > 0:
        return h, levels, "tag"
    if levels:
        return levels * FLOOR_H, levels, "levels"
    return DEFAULT_H, None, "default"


def build_buildings(osm: dict) -> list[dict]:
    out = []
    for el in osm.get("elements", []):
        tags = el.get("tags", {})
        if el.get("type") != "way" or "building" not in tags:
            continue
        pts = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
        if len(pts) < 4 or pts[0] != pts[-1]:
            continue
        poly = reproject(Polygon(pts), TO_M)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty or poly.geom_type != "Polygon" or poly.area < MIN_AREA_M2:
            continue
        poly = poly.simplify(SIMPLIFY_M, preserve_topology=True)
        if poly.geom_type != "Polygon" or poly.is_empty:
            continue
        ring = list(poly.exterior.coords)[:-1]
        if len(ring) < 3 or len(ring) > MAX_RING_PTS:
            continue
        h, levels, src = building_height(tags)
        c = poly.centroid
        clon, clat = TO_LL(c.x, c.y)
        flat = []
        for x, y in ring:
            lon, lat = TO_LL(x, y)
            flat += [round(lon, 6), round(lat, 6)]
        out.append({"id": el["id"], "r": flat, "h": round(h, 1), "l": levels, "e": src != "tag",
                    "src": src, "c": (clat, clon), "area": poly.area})
    return out
