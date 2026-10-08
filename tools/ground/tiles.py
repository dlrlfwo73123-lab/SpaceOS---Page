"""바닥 면 → 0.01° 타일(삼각형 메시 JSON). 프런트는 의존성 없이 그대로 그린다."""
from __future__ import annotations

import json
import math
from pathlib import Path

import shapely
from shapely.geometry import Polygon
from shapely.ops import transform as shp_transform

from osm_ground import TO_LL, TO_M, Surface

TILE_DEG = 0.01


def tile_key(lat: float, lng: float) -> str:
    return f"{math.floor(lat / TILE_DEG + 1e-9)}_{math.floor(lng / TILE_DEG + 1e-9)}"


def _tile_polygon_m(ty: int, tx: int) -> Polygon:
    s, n = ty * TILE_DEG, (ty + 1) * TILE_DEG
    w, e = tx * TILE_DEG, (tx + 1) * TILE_DEG
    return Polygon([TO_M(w, s), TO_M(e, s), TO_M(e, n), TO_M(w, n)])


def _triangles(geom):
    polys = list(geom.geoms) if hasattr(geom, "geoms") else [geom]
    for p in polys:
        if p.geom_type != "Polygon" or p.area < 0.05:
            continue
        for t in shapely.constrained_delaunay_triangles(p).geoms:
            yield t


def mesh_for(geom_m) -> dict | None:
    pos, idx, cache = [], [], {}
    for t in _triangles(geom_m):
        ids = []
        for x, y in list(t.exterior.coords)[:3]:
            lon, lat = TO_LL(x, y)
            key = (round(lon, 6), round(lat, 6))
            if key not in cache:
                cache[key] = len(pos) // 2
                pos.extend(key)
            ids.append(cache[key])
        idx.extend(ids)
    return {"positions": pos, "indices": idx} if idx else None


def tiles_for(surfaces: list[Surface], buildings: list[dict] | None = None) -> dict[str, dict]:
    """{tile_key: {'v':1,'tile':key,'layers':[{kind,estimated,positions,indices}]}}"""
    keys = set()
    for s in surfaces:
        lon0, lat0, lon1, lat1 = shp_transform(TO_LL, s.geom).bounds
        for ty in range(math.floor(lat0 / TILE_DEG), math.floor(lat1 / TILE_DEG) + 1):
            for tx in range(math.floor(lon0 / TILE_DEG), math.floor(lon1 / TILE_DEG) + 1):
                keys.add((ty, tx))
    by_tile: dict[str, list[dict]] = {}
    for b in buildings or []:
        by_tile.setdefault(tile_key(*b["c"]), []).append(b)
        ty, tx = (int(v) for v in tile_key(*b["c"]).split("_"))
        keys.add((ty, tx))
    out = {}
    for ty, tx in sorted(keys):
        clip = _tile_polygon_m(ty, tx)
        layers = []
        area = {"estimated": 0.0, "measured": 0.0}
        for s in surfaces:
            part = s.geom.intersection(clip)
            if part.is_empty:
                continue
            m = mesh_for(part)
            if m:
                layers.append({"kind": s.kind, "estimated": s.estimated, **m})
                area["estimated" if s.estimated else "measured"] += part.area
        blds = [{"r": b["r"], "h": b["h"], "l": b["l"], "e": int(b["e"])} for b in by_tile.get(f"{ty}_{tx}", [])]
        if layers or blds:
            tile = {"v": 1, "tile": f"{ty}_{tx}", "area_m2": {k: round(v, 1) for k, v in area.items()}, "layers": layers}
            if blds:
                tile["buildings"] = blds
            out[f"{ty}_{tx}"] = tile
    return out


def write_tiles(tiles: dict[str, dict], out_dir: str | Path, meta: dict,
                gu_code: str | None = None, clean: bool = False) -> Path:
    """타일을 쓰고 index.json 을 갱신한다. 기본은 병합: 같은 키의 타일은 새 것으로 교체하고 나머지는 보존.

    구 경계 근처 타일은 이웃 구 실행에서도 만들어질 수 있다(bbox 에 1km 여유). 나중 실행이 이긴다.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    if clean:
        for old in out_dir.glob("*.json"):
            old.unlink()
    index_path = out_dir / "index.json"
    index = {"v": 1, "tileDeg": TILE_DEG, "tiles": [], "meta": {}, "gu": {}}
    if index_path.exists() and not clean:
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index.setdefault("gu", {})
    for k, t in tiles.items():
        (out_dir / f"{k}.json").write_text(json.dumps(t, separators=(",", ":")), encoding="utf-8")
    index["tiles"] = sorted(set(index["tiles"]) | set(tiles))
    index["meta"] = {**index.get("meta", {}), **{k: meta[k] for k in ("source", "attribution", "synthetic", "generated") if k in meta}}
    if gu_code:
        index["gu"][gu_code] = {k: v for k, v in meta.items() if k not in ("source", "attribution")} | {"tiles": sorted(tiles)}
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    return index_path
