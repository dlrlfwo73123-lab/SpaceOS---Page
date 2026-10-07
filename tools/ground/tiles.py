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


def tiles_for(surfaces: list[Surface]) -> dict[str, dict]:
    """{tile_key: {'v':1,'tile':key,'layers':[{kind,estimated,positions,indices}]}}"""
    keys = set()
    for s in surfaces:
        lon0, lat0, lon1, lat1 = shp_transform(TO_LL, s.geom).bounds
        for ty in range(math.floor(lat0 / TILE_DEG), math.floor(lat1 / TILE_DEG) + 1):
            for tx in range(math.floor(lon0 / TILE_DEG), math.floor(lon1 / TILE_DEG) + 1):
                keys.add((ty, tx))
    out = {}
    for ty, tx in sorted(keys):
        clip = _tile_polygon_m(ty, tx)
        layers = []
        for s in surfaces:
            part = s.geom.intersection(clip)
            if part.is_empty:
                continue
            m = mesh_for(part)
            if m:
                layers.append({"kind": s.kind, "estimated": s.estimated, **m})
        if layers:
            out[f"{ty}_{tx}"] = {"v": 1, "tile": f"{ty}_{tx}", "layers": layers}
    return out


def write_tiles(tiles: dict[str, dict], out_dir: str | Path, meta: dict) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("*.json"):
        old.unlink()
    for k, t in tiles.items():
        (out_dir / f"{k}.json").write_text(json.dumps(t, separators=(",", ":")), encoding="utf-8")
    index = {"v": 1, "tileDeg": TILE_DEG, "tiles": sorted(tiles), "meta": meta}
    p = out_dir / "index.json"
    p.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    return p
