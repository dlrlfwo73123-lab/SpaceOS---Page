"""성동구 바닥 타일 생성 CLI.

  # 인터넷이 되는 PC에서 (Overpass로 원천 내려받기 → 타일 생성)
  python tools/ground/fetch_ground.py --gu seongdong
  # 이미 받은 Overpass JSON으로
  python tools/ground/fetch_ground.py --gu seongdong --osm-json raw.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_ground import build_surfaces, estimated_area_ratio, overpass_query  # noqa: E402
from tiles import tiles_for, write_tiles  # noqa: E402

# bbox = (south, west, north, east): 성동구 경계 + 약 1km 여유
GU = {"seongdong": {"code": "11200", "name": "성동구", "bbox": (37.515, 127.000, 37.580, 127.085)}}
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
REPO = Path(__file__).resolve().parents[2]


def download(query: str) -> bytes:
    last = None
    for url in ENDPOINTS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": query}).encode(),
                                             headers={"User-Agent": "spaceos-ground/1.0"})
                with urllib.request.urlopen(req, timeout=300) as r:
                    return r.read()
            except Exception as e:  # noqa: BLE001
                last = e
                time.sleep(2 ** attempt)
    raise SystemExit(f"Overpass 내려받기 실패: {last}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gu", default="seongdong", choices=GU)
    ap.add_argument("--osm-json", help="이미 받은 Overpass JSON 경로")
    ap.add_argument("--out", help="출력 폴더(기본: apps/frontend/public/data/ground/<gu>)")
    ap.add_argument("--synthetic", action="store_true", help="합성 샘플임을 meta에 기록")
    a = ap.parse_args()
    cfg = GU[a.gu]
    if a.osm_json:
        raw = Path(a.osm_json).read_bytes()
    else:
        raw = download(overpass_query(cfg["bbox"]))
        cache = REPO / "data" / "raw" / "osm"
        cache.mkdir(parents=True, exist_ok=True)
        (cache / f"{a.gu}-{date.today()}.json").write_bytes(raw)  # data/raw 는 커밋하지 않음
    surfaces = build_surfaces(json.loads(raw))
    tiles = tiles_for(surfaces)
    meta = {
        "gu": a.gu, "guCode": cfg["code"], "generated": date.today().isoformat(),
        "source": "OpenStreetMap contributors (ODbL)", "attribution": "© OpenStreetMap contributors",
        "input_sha256": hashlib.sha256(raw).hexdigest(), "synthetic": a.synthetic,
        "estimated_area_ratio": estimated_area_ratio(surfaces), "crs_in_tiles": "EPSG:4326",
        "width_rules": "tag > lanes*3.0 > class default; sidewalk 2.0m, crosswalk 3.0m (estimated=true)",
    }
    out = Path(a.out) if a.out else REPO / "apps/frontend/public/data/ground" / a.gu
    p = write_tiles(tiles, out, meta)
    print(f"tiles={len(tiles)} estimated_ratio={meta['estimated_area_ratio']} → {p}")


if __name__ == "__main__":
    main()
