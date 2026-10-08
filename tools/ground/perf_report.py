"""합성 고밀도 도심 데이터로 파이프라인 비용을 측정한다 (실데이터 성능이 아님).

밀도 가정: 도로 약 18 km/km², 약 20m 간격 정점에 ±3m 흔들림, 보도 태그 60%. 서울 평균보다 촘촘한 '상한 가까운' 값.
출력: 처리 시간, 타일 수/크기(원본·gzip), 삼각형 수, 반경 1km 로딩량. 결과 JSON 을 표준출력으로 낸다.
"""
from __future__ import annotations

import gzip
import json
import math
import random
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_buildings import build_buildings  # noqa: E402
from osm_ground import build_surfaces  # noqa: E402
from tiles import tiles_for, write_tiles, TILE_DEG  # noqa: E402

# 성능 예산(제안). 기기 기준은 docs/digital-twin/p3-seoul-scale.md 참고. 실기기 측정으로 확정해야 한다.
BUDGET = {
    "open_1km_gzip_bytes": 1_500_000,   # 트윈 1회 열기(반경 1km) 전송량
    "open_1km_triangles": 250_000,      # 바닥 삼각형 수
    "tile_gzip_max": 400_000,           # 타일 하나(최악)
    "total_tris": 250_000,              # 바닥 + 렌더 반경(600m) 안 건물 삼각형 합
}

LAT0, LNG0 = 37.5446, 127.0557
MLAT, MLNG = 111320.0, 111320.0 * math.cos(math.radians(LAT0))


def make_osm(half_m=1200, spacing=110, seed=1):
    rnd = random.Random(seed)
    els, wid = [], [0]

    def way(tags, pts):
        wid[0] += 1
        els.append({"type": "way", "id": wid[0], "tags": tags,
                    "geometry": [{"lat": LAT0 + y / MLAT, "lon": LNG0 + x / MLNG} for x, y in pts]})

    def tags():
        r = rnd.random()
        t = ({"highway": "residential"} if r < .7 else {"highway": "service"} if r < .85
             else {"highway": "tertiary", "lanes": "2"} if r < .95 else {"highway": "primary", "lanes": "4"})
        if t["highway"] != "service" and rnd.random() < .6:
            t["sidewalk"] = "both"
        return t

    n = int(2 * half_m / spacing)
    for i in range(n + 1):
        off = -half_m + i * spacing + rnd.uniform(-15, 15)
        for horiz in (True, False):
            pts, s = [], -half_m
            while s <= half_m:
                pts.append((s, off + rnd.uniform(-3, 3)) if horiz else (off + rnd.uniform(-3, 3), s))
                s += 20
            way(tags(), pts)
    # 건물: 도심 밀도 약 3,000동/km² (서울 평균 약 1,000동/km² 보다 촘촘한 상한 가까운 값), 회전된 사각~육각 외곽
    nb = int(3000 * (2 * half_m / 1000) ** 2)
    for _ in range(nb):
        cx, cy = rnd.uniform(-half_m, half_m), rnd.uniform(-half_m, half_m)
        w, d, a = rnd.uniform(8, 22), rnd.uniform(8, 25), rnd.uniform(0, math.pi)
        pts = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2)]
        if rnd.random() < .3:
            pts.append((w / 4, d / 2 + 3))   # 지붕 쪽이 튀어나온 5각형
        pts.append((-w / 2, d / 2))
        ring = [(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts]
        t = rnd.random()
        tags = {"building": "yes", "height": str(round(rnd.uniform(6, 40), 1))} if t < .35 else \
               {"building": "apartments", "building:levels": str(rnd.randint(2, 15))} if t < .8 else {"building": "yes"}
        way(tags, ring + [ring[0]])
    for k in range(160):
        x, y = rnd.uniform(-half_m, half_m), rnd.uniform(-half_m, half_m)
        way({"highway": "footway", "footway": "crossing"}, [(x - 6, y), (x + 6, y)])
    return {"elements": els}, wid[0]


def main():
    osm, nways = make_osm()
    t0 = time.perf_counter(); surfaces = build_surfaces(osm); t_build = time.perf_counter() - t0
    t0 = time.perf_counter(); blds = build_buildings(osm); t_bld = time.perf_counter() - t0
    t0 = time.perf_counter(); tiles = tiles_for(surfaces, blds); t_tiles = time.perf_counter() - t0
    with tempfile.TemporaryDirectory() as d:
        write_tiles(tiles, d, {"synthetic": True})
        sizes = {k: ((Path(d) / f"{k}.json").stat().st_size, len(gzip.compress((Path(d) / f"{k}.json").read_bytes(), 6)))
                 for k in tiles}
    tri = {k: sum(len(l["indices"]) // 3 for l in t["layers"]) for k, t in tiles.items()}
    # 중심 타일에서 반경 1km 이 걸치는 타일 수(경도·위도 0.01° 격자)
    dlat, dlng = 1000 / MLAT, 1000 / MLNG
    need = {f"{ty}_{tx}" for ty in range(math.floor((LAT0 - dlat) / TILE_DEG), math.floor((LAT0 + dlat) / TILE_DEG) + 1)
            for tx in range(math.floor((LNG0 - dlng) / TILE_DEG), math.floor((LNG0 + dlng) / TILE_DEG) + 1)}
    need &= set(tiles)
    full = [k for k in tiles if k in need]
    def b_tri(b):
        n = len(b["r"]) // 2
        return 2 * n + (n - 2)
    rend = [b for b in blds if math.hypot((b["c"][1] - LNG0) * MLNG, (b["c"][0] - LAT0) * MLAT) <= 600]
    out = {
        "synthetic": True, "ways": nways,
        "build_surfaces_s": round(t_build, 2), "build_buildings_s": round(t_bld, 2), "buildings": len(blds), "tiles_for_s": round(t_tiles, 2), "tiles": len(tiles),
        "tile_bytes_mean": round(sum(s[0] for s in sizes.values()) / len(sizes)),
        "tile_gzip_mean": round(sum(s[1] for s in sizes.values()) / len(sizes)),
        "tile_gzip_max": max(s[1] for s in sizes.values()),
        "tri_per_tile_mean": round(sum(tri.values()) / len(tri)), "tri_per_tile_max": max(tri.values()),
        "building_tris_rendered_600m": sum(b_tri(b) for b in rend), "buildings_rendered_600m": len(rend),
        "open_1km": {"tiles": len(full), "raw_bytes": sum(sizes[k][0] for k in full),
                     "gzip_bytes": sum(sizes[k][1] for k in full), "triangles": sum(tri[k] for k in full)},
    }
    checks = {"open_1km_gzip_bytes": out["open_1km"]["gzip_bytes"], "open_1km_triangles": out["open_1km"]["triangles"],
              "tile_gzip_max": out["tile_gzip_max"],
              "total_tris": out["open_1km"]["triangles"] + out["building_tris_rendered_600m"]}
    out["budget"] = {k: {"value": v, "limit": BUDGET[k], "pass": v <= BUDGET[k]} for k, v in checks.items()}
    print(json.dumps(out, indent=1))
    if "--check" in sys.argv and not all(b["pass"] for b in out["budget"].values()):
        sys.exit(1)


if __name__ == "__main__":
    main()
