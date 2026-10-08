"""OSM(Overpass `out geom`) 도로·보도·횡단보도 → 바닥 면(차도/보도/횡단보도).

폭이 태그에 없으면 규칙으로 추정하고 그 사실을 `estimated`/`width_source`에 남긴다.
계산은 미터 좌표계(EPSG:5186)에서 하고, 결과는 호출자가 필요한 좌표계로 변환한다.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from pyproj import Transformer
from shapely.geometry import LineString
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

CRS_M = "EPSG:5186"
TO_M = Transformer.from_crs("EPSG:4326", CRS_M, always_xy=True).transform
TO_LL = Transformer.from_crs(CRS_M, "EPSG:4326", always_xy=True).transform

ROAD_DEFAULT_W = {
    "motorway": 14.0, "trunk": 14.0, "primary": 14.0, "secondary": 12.0, "tertiary": 10.0,
    "unclassified": 6.0, "residential": 6.0, "living_street": 5.0, "service": 4.0,
    "motorway_link": 6.0, "trunk_link": 6.0, "primary_link": 6.0,
    "secondary_link": 5.0, "tertiary_link": 5.0,
}
LANE_W = 3.0
SIDEWALK_W = 2.0
CROSSWALK_W = 3.0
SIMPLIFY_M = 0.2
SIDEWALK_TAGS = {"both", "left", "right", "yes"}


@dataclass
class Surface:
    kind: str            # carriageway | sidewalk | crosswalk
    estimated: bool
    geom: object         # shapely geometry in EPSG:5186 metres
    width_sources: set


def overpass_query(bbox: tuple[float, float, float, float], timeout: int = 180) -> str:
    s, w, n, e = bbox
    return (f'[out:json][timeout:{timeout}];(way["highway"]({s},{w},{n},{e});'
            f'way["building"]({s},{w},{n},{e}););out geom;')


def _num(v) -> float | None:
    if v is None:
        return None
    m = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", str(v))
    return float(m.group(1)) if m else None


def road_width(tags: dict) -> tuple[float, str]:
    w = _num(tags.get("width"))
    if w:
        return w, "tag"
    lanes = _num(tags.get("lanes"))
    if lanes:
        return lanes * LANE_W, "lanes"
    return ROAD_DEFAULT_W.get(tags.get("highway"), 6.0), "class_default"


def _line(el) -> LineString | None:
    pts = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
    if len(pts) < 2:
        return None
    return shp_transform(TO_M, LineString(pts))


def _strip(line: LineString, width: float):
    return line.buffer(width / 2, cap_style="flat", join_style="round")


def build_surfaces(osm: dict) -> list[Surface]:
    roads, side_explicit, cross = [], [], []
    for el in osm.get("elements", []):
        if el.get("type") != "way":
            continue
        tags = el.get("tags", {})
        hw = tags.get("highway")
        if not hw:
            continue
        line = _line(el)
        if line is None:
            continue
        if hw == "footway" and tags.get("footway") == "crossing" or hw == "crossing":
            w = _num(tags.get("width"))
            cross.append((line, w or CROSSWALK_W, "tag" if w else "default"))
        elif hw == "footway" and tags.get("footway") == "sidewalk":
            w = _num(tags.get("width"))
            side_explicit.append((line, w or SIDEWALK_W, "tag" if w else "default"))
        elif hw in ROAD_DEFAULT_W:
            w, src = road_width(tags)
            roads.append((line, w, src, tags))

    def group(items, kind, getw):
        out = {}
        for it in items:
            w, src = getw(it)
            est = src != "tag"
            out.setdefault(est, ([], set()))
            out[est][0].append(_strip(it[0], w))
            out[est][1].add(src)
        return [Surface(kind, est, unary_union(g), s) for est, (g, s) in out.items()]

    car = group(roads, "carriageway", lambda r: (r[1], r[2]))
    car_union = unary_union([s.geom for s in car]) if car else None

    sw_parts = {True: ([], set()), False: ([], set())}
    for line, w, src in side_explicit:
        est = src != "tag"
        sw_parts[est][0].append(_strip(line, w)); sw_parts[est][1].add(src)
    explicit_union = unary_union([g for est in sw_parts for g in sw_parts[est][0]]) if side_explicit else None
    # 도로 태그(sidewalk=both/left/right)에서 만든 보도: 별도 보도 선이 이미 덮은 곳은 건너뜀
    for line, w, _src, tags in roads:
        side = tags.get("sidewalk")
        if side not in SIDEWALK_TAGS or line.length < 1:
            continue
        sides = {"both": (1, -1), "yes": (1, -1), "left": (1,), "right": (-1,)}[side]
        for sgn in sides:
            try:
                off = line.offset_curve(sgn * (w / 2 + SIDEWALK_W / 2))
            except Exception:  # noqa: BLE001 - 퇴화 도형은 건너뜀
                continue
            if off.is_empty or off.geom_type != "LineString":
                continue
            strip = _strip(off, SIDEWALK_W)
            if explicit_union is not None and strip.intersection(explicit_union).area > 0.5 * strip.area:
                continue
            sw_parts[True][0].append(strip); sw_parts[True][1].add("road_tag")
    sidewalks = []
    for est, (geoms, srcs) in sw_parts.items():
        if geoms:
            g = unary_union(geoms)
            if car_union is not None:
                g = g.difference(car_union)
            if not g.is_empty:
                sidewalks.append(Surface("sidewalk", est, g, srcs))
    cw = group(cross, "crosswalk", lambda c: (c[1], c[2]))
    out = [s for s in car + sidewalks + cw if not s.geom.is_empty]
    for s in out:  # 정점 수 절감: 0.2m 이내 단순화(화면에서 구분 불가, 면적 변화는 테스트로 제한)
        s.geom = s.geom.simplify(SIMPLIFY_M, preserve_topology=True)
    return out


def estimated_area_ratio(surfaces: list[Surface]) -> float:
    total = sum(s.geom.area for s in surfaces)
    return round(sum(s.geom.area for s in surfaces if s.estimated) / total, 4) if total else 0.0
