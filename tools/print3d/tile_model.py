"""트윈 데이터(바닥 + 건물 + 선택 건물 층 슬래브) → 1:1,000 출력용 색 파트 모형(3MF + STL).

입력은 Overpass JSON(OSM)이며 tools/ground 의 바닥·건물 규칙을 그대로 쓴다. 장비 한계(profile)가 없으면 만들지 않는다.
파트(서로 겹치지 않음): base(바닥판) / carriageway(차도 0.2mm) / sidewalk(보도 0.4mm) / crosswalk(횡단보도 0.4mm)
/ buildings_measured / buildings_estimated(높이 추정) / floors_confirmed / floors_probable / floors_other(선택 건물 층 슬래브).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import trimesh
from shapely.geometry import Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import transform as shp_transform
from shapely.ops import unary_union

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ground"))
import osm_buildings  # noqa: E402
import osm_ground  # noqa: E402

from print_profile import validate_profile  # noqa: E402
from threemf import write_3mf  # noqa: E402

COLORS = {
    "base": "#e5e7eb", "carriageway": "#374151", "sidewalk": "#9ca3af", "crosswalk": "#ffffff",
    "buildings_measured": "#a8b0bd", "buildings_estimated": "#dde1e8",
    "floors_confirmed": "#e11d48", "floors_probable": "#f97316", "floors_other": "#d4d4d8",
}
PLATE_MM, ROAD_MM, SIDE_MM, CROSS_MM = 2.0, 0.2, 0.4, 0.4


def _polys(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    return [p for part in getattr(g, "geoms", []) for p in _polys(part)]


def _drop_thin(g, min_w: float):
    """지름 min_w 보다 얇은 조각(침식하면 사라짐)은 출력 불가이므로 제거하고 개수를 센다."""
    keep, dropped = [], 0
    # 열림(opening): 0.1mm 이하의 잘록한 목·가시를 제거해 퇴화 삼각형(체적 0)이 생기지 않게 한다
    g = g.buffer(-0.1, join_style=2).buffer(0.1, join_style=2)
    for p in _polys(g):
        if p.area > 0 and not p.buffer(-min_w / 2).is_empty:
            keep.append(p)
        else:
            dropped += 1
    return unary_union(keep) if keep else Polygon(), dropped


def _extrude(g, z0: float, h: float) -> trimesh.Trimesh | None:
    ms = []
    for p in _polys(g):
        m = trimesh.creation.extrude_polygon(orient(p, 1.0), h)  # 바깥 CCW·구멍 CW 로 통일(체적 부호 보장)
        m.apply_translation([0, 0, z0])
        ms.append(m)
    return trimesh.util.concatenate(ms) if ms else None


def build_model(osm: dict, center_lat: float, center_lng: float, profile: dict, half_m: float = 100.0,
                scale: int = 1000, floors: list[dict] | None = None, select_radius_m: float = 15.0) -> dict:
    p = validate_profile(profile)
    k = 1000.0 / scale
    cx, cy = osm_ground.TO_M(center_lng, center_lat)
    x0, y0 = cx - half_m, cy - half_m
    aoi = box(x0, y0, cx + half_m, cy + half_m)
    to_local = lambda g: shp_transform(lambda x, y, z=None: ((np.asarray(x) - x0) * k, (np.asarray(y) - y0) * k), g)  # noqa: E731
    W = 2 * half_m * k
    report = {"scale": f"1:{scale}", "half_m": half_m, "plate_mm": [W, W], "excluded": [], "dropped_thin": {}}

    # 건물(AOI로 자름), 선택 건물 분리
    blds = []
    for b in osm_buildings.build_buildings(osm):
        ring = [osm_ground.TO_M(b["r"][i], b["r"][i + 1]) for i in range(0, len(b["r"]), 2)]
        poly = Polygon(ring)
        if not poly.is_valid:
            poly = poly.buffer(0)
        clip = poly.intersection(aoi)
        if clip.is_empty or clip.area < osm_buildings.MIN_AREA_M2:
            continue
        blds.append({"id": b["id"], "poly": clip, "h": b["h"], "est": b["e"], "full": poly})
    sel = None
    if floors:
        cands = [(b["full"].distance(Point(cx, cy)), b) for b in blds]
        cands = [c for c in cands if c[0] <= select_radius_m]
        if cands:
            sel = min(cands, key=lambda c: c[0])[1]
            blds.remove(sel)
    occupied = unary_union([b["poly"] for b in blds] + ([sel["poly"]] if sel else []))

    # 바닥 면: 건물 점유 영역을 빼고, 서로 겹치지 않게(횡단보도 > 보도/차도)
    surf = {"carriageway": [], "sidewalk": [], "crosswalk": []}
    for s in osm_ground.build_surfaces(osm):
        surf[s.kind].append(s.geom)
    g = {kd: unary_union(v).intersection(aoi) if v else Polygon() for kd, v in surf.items()}
    g["crosswalk"] = g["crosswalk"].difference(occupied)
    for kd in ("carriageway", "sidewalk"):
        g[kd] = g[kd].difference(occupied).difference(g["crosswalk"])
    parts: dict[str, trimesh.Trimesh] = {}
    plate = trimesh.creation.box(extents=[W, W, PLATE_MM])
    plate.apply_translation([W / 2, W / 2, PLATE_MM / 2])
    parts["base"] = plate
    for kd, mm in (("carriageway", ROAD_MM), ("sidewalk", SIDE_MM), ("crosswalk", CROSS_MM)):
        clean, dropped = _drop_thin(to_local(g[kd]), p["min_wall_mm"])
        report["dropped_thin"][kd] = dropped
        m = _extrude(clean, PLATE_MM, mm)
        if m is not None:
            parts[kd] = m

    # 일반 건물: 높이(mm) = 높이(m)*1000/scale, 개별 검사 후 파트로 합침
    groups = {"buildings_measured": [], "buildings_estimated": []}
    for b in blds:
        lp = to_local(b["poly"])
        clean, dropped = _drop_thin(lp, p["min_wall_mm"])
        if clean.is_empty:
            report["excluded"].append({"id": b["id"], "reason": "below_min_wall"})
            continue
        h_mm = b["h"] * k
        if h_mm < p["min_wall_mm"]:
            report["excluded"].append({"id": b["id"], "reason": "below_min_height"})
            continue
        if PLATE_MM + h_mm > p["bed_z_mm"]:
            report["excluded"].append({"id": b["id"], "reason": "exceeds_bed_z"})
            continue
        m = _extrude(clean, PLATE_MM, h_mm)
        groups["buildings_estimated" if b["est"] else "buildings_measured"].append(m)
    for name, ms in groups.items():
        if ms:
            parts[name] = trimesh.util.concatenate(ms)

    # 선택 건물: 층 슬래브(확정/추정/그 외), 층고 3.5m
    report["selected_building"] = None
    if sel and floors:
        lp, _ = _drop_thin(to_local(sel["poly"]), p["min_wall_mm"])
        fl = osm_buildings.FLOOR_H * k
        by = {"floors_confirmed": [], "floors_probable": [], "floors_other": []}
        for i, f in enumerate(sorted(floors, key=lambda f: f["level"])):
            if f.get("vacant"):
                key = "floors_confirmed" if f.get("certainty") == "confirmed" else "floors_probable"  # 미상은 확정으로 승격 안 함
            else:
                key = "floors_other"
            by[key].append(_extrude(lp, PLATE_MM + i * fl, fl))
        for name, ms in by.items():
            if ms:
                parts[name] = trimesh.util.concatenate(ms)
        report["selected_building"] = {"id": sel["id"], "floors": len(floors), "floor_mm": fl}
    report["parts"] = {n: {"triangles": int(len(m.faces)), "bodies": len(m.split(only_watertight=False)),
                           "volume_mm3": round(float(m.volume), 1), "color": COLORS[n]} for n, m in parts.items()}
    report["estimated_height_buildings"] = sum(1 for b in blds if b["est"])
    report["buildings"] = len(blds)
    return {"parts": parts, "report": report}


def validate_model(model: dict, profile: dict) -> dict:
    """모든 파트: 닫힌 체적, 양의 체적, 판 위에 붙어 있음, 베드 안. 문제 목록과 ok 를 돌려준다."""
    p = validate_profile(profile)
    issues = []
    for name, m in model["parts"].items():
        for i, body in enumerate(m.split(only_watertight=False)):
            if not body.is_watertight:
                issues.append({"part": name, "body": i, "issue": "not_watertight"})
            elif body.volume <= 0:
                issues.append({"part": name, "body": i, "issue": "non_positive_volume"})
            if name != "base" and body.bounds[0][2] < PLATE_MM - 1e-6:
                issues.append({"part": name, "body": i, "issue": "not_on_plate"})
    allm = trimesh.util.concatenate(list(model["parts"].values()))
    ex = allm.extents
    if ex[0] > p["bed_x_mm"] or ex[1] > p["bed_y_mm"] or ex[2] > p["bed_z_mm"]:
        issues.append({"part": "all", "issue": "exceeds_bed", "extents": [round(float(v), 1) for v in ex]})
    return {"ok": not issues, "issues": issues, "extents_mm": [round(float(v), 2) for v in ex]}


def export_model(model: dict, out_dir: str | Path) -> dict:
    out = Path(out_dir)
    (out / "parts").mkdir(parents=True, exist_ok=True)
    plist = [{"name": n, "mesh": m, "color": COLORS[n]} for n, m in model["parts"].items()]
    write_3mf(plist, out / "model.3mf")
    for n, m in model["parts"].items():
        m.export(out / "parts" / f"{n}.stl")
    trimesh.util.concatenate(list(model["parts"].values())).export(out / "model_all.stl")
    return {"3mf": "model.3mf", "stl_parts": sorted(p.name for p in (out / "parts").glob("*.stl")), "stl_all": "model_all.stl"}


def load_osm(path: str | Path) -> dict:
    """Overpass JSON 파일 하나 또는 조각 JSON 이 든 폴더(data/raw/osm/<구코드>) → way id 중복 제거."""
    path = Path(path)
    files = sorted(path.glob("*.json")) if path.is_dir() else [path]
    els = {}
    for f in files:
        for el in json.loads(f.read_text(encoding="utf-8")).get("elements", []):
            els[(el["type"], el["id"])] = el
    return {"elements": list(els.values())}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--osm", required=True, help="Overpass JSON 파일 또는 조각 폴더")
    ap.add_argument("--center", required=True, help="위도,경도")
    ap.add_argument("--half", type=float, default=100.0, help="반폭(m). 1:1000 에서 200m 사각 = 200mm 판")
    ap.add_argument("--scale", type=int, default=1000)
    ap.add_argument("--profile", required=True, help="장비 한계 JSON (없으면 만들지 않음)")
    ap.add_argument("--floors", help="선택 건물 층 JSON([{level,vacant,certainty}], /floors 응답)")
    ap.add_argument("--select-radius", type=float, default=15.0)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    lat, lng = (float(v) for v in a.center.split(","))
    profile = json.loads(Path(a.profile).read_text(encoding="utf-8"))
    floors = json.loads(Path(a.floors).read_text(encoding="utf-8")) if a.floors else None
    model = build_model(load_osm(a.osm), lat, lng, profile, a.half, a.scale, floors, a.select_radius)
    check = validate_model(model, profile)
    files = export_model(model, a.out) if check["ok"] else None
    res = {"validation": check, "files": files, **model["report"]}
    Path(a.out).mkdir(parents=True, exist_ok=True)
    (Path(a.out) / "report.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: res[k] for k in ("validation", "buildings", "estimated_height_buildings", "excluded", "files")}, ensure_ascii=False, indent=1))
    if not check["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
