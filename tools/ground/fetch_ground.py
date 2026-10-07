"""서울 바닥 타일 생성 CLI (구 단위 실행, 서울 전체 한 벌의 타일 저장소에 병합).

  python tools/ground/fetch_ground.py --gu seongdong           # slug 또는 구 코드(11200)
  python tools/ground/fetch_ground.py --gu all                 # 25개 구 순차 실행(오래 걸림)
  python tools/ground/fetch_ground.py --gu seongdong --offline # data/raw 캐시만 사용(재가공)
  python tools/ground/fetch_ground.py --gu seongdong --osm-json raw.json   # 이미 받은 파일 하나로

Overpass 에는 bbox 를 --chunk-deg 단위 조각으로 나눠 요청하고(요청 사이 --sleep 초 대기),
조각별 응답을 data/raw/osm/<구코드>/ 에 캐시한다(커밋 안 됨). 중단 후 재실행하면 받은 조각은 건너뛴다.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from osm_ground import build_surfaces, estimated_area_ratio, overpass_query  # noqa: E402
from tiles import tiles_for, write_tiles  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
PRESETS = json.loads((Path(__file__).with_name("gu_presets.json")).read_text(encoding="utf-8"))
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
DEFAULT_OUT = REPO / "apps/frontend/public/data/ground/seoul"


def resolve_gu(arg: str) -> list[str]:
    if arg == "all":
        return sorted(PRESETS)
    for code, v in PRESETS.items():
        if arg in (code, v["slug"]):
            return [code]
    raise SystemExit(f"알 수 없는 구: {arg} (slug/코드/all)")


def chunks(bbox, step):
    s, w, n, e = bbox
    for i in range(math.ceil((n - s) / step - 1e-9)):
        for j in range(math.ceil((e - w) / step - 1e-9)):
            yield (round(s + i * step, 4), round(w + j * step, 4),
                   round(min(n, s + (i + 1) * step), 4), round(min(e, w + (j + 1) * step), 4))


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
                time.sleep(2 ** attempt * 2)
    raise SystemExit(f"Overpass 내려받기 실패: {last}")


def load_gu_raw(code: str, step: float, sleep: float, offline: bool) -> tuple[dict, str]:
    """구 bbox 의 조각 응답을 모아 way id 로 중복 제거한 하나의 OSM dict 와 입력 해시를 돌려준다."""
    cache = REPO / "data" / "raw" / "osm" / code
    cache.mkdir(parents=True, exist_ok=True)
    elements, h = {}, hashlib.sha256()
    for box in chunks(PRESETS[code]["bbox"], step):
        f = cache / ("_".join(map(str, box)) + ".json")
        if not f.exists():
            if offline:
                raise SystemExit(f"--offline 인데 캐시 없음: {f.name}")
            f.write_bytes(download(overpass_query(box)))
            time.sleep(sleep)
        raw = f.read_bytes()
        h.update(raw)
        for el in json.loads(raw).get("elements", []):
            elements[(el["type"], el["id"])] = el
    return {"elements": list(elements.values())}, h.hexdigest()


def run_gu(code, a, osm=None, raw_hash=None) -> None:
    t0 = time.time()
    if osm is None:
        osm, raw_hash = load_gu_raw(code, a.chunk_deg, a.sleep, a.offline)
    surfaces = build_surfaces(osm)
    tiles = tiles_for(surfaces)
    meta = {
        "gu": PRESETS[code]["slug"], "guCode": code, "generated": date.today().isoformat(),
        "source": "OpenStreetMap contributors (ODbL)", "attribution": "© OpenStreetMap contributors",
        "input_sha256": raw_hash, "synthetic": a.synthetic, "ways": len(osm["elements"]),
        "estimated_area_ratio": estimated_area_ratio(surfaces), "crs_in_tiles": "EPSG:4326",
        "width_rules": "tag > lanes*3.0 > class default; sidewalk 2.0m, crosswalk 3.0m (estimated=true)",
    }
    p = write_tiles(tiles, a.out, meta, gu_code=code, clean=a.clean)
    print(f"[{code} {PRESETS[code]['name']}] ways={meta['ways']} tiles={len(tiles)} "
          f"estimated={meta['estimated_area_ratio']} {time.time() - t0:.1f}s → {p}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gu", default="seongdong")
    ap.add_argument("--osm-json", help="이미 받은 Overpass JSON 하나로 처리(단일 구만)")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--chunk-deg", type=float, default=0.04)
    ap.add_argument("--sleep", type=float, default=3.0, help="Overpass 요청 사이 대기(초)")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--synthetic", action="store_true", help="합성 샘플임을 meta에 기록")
    ap.add_argument("--clean", action="store_true", help="출력 폴더의 기존 타일을 먼저 지움(기본은 병합)")
    a = ap.parse_args()
    codes = resolve_gu(a.gu)
    if a.osm_json:
        if len(codes) != 1:
            raise SystemExit("--osm-json 은 단일 구에만 사용")
        raw = Path(a.osm_json).read_bytes()
        run_gu(codes[0], a, json.loads(raw), hashlib.sha256(raw).hexdigest())
        return
    for i, c in enumerate(codes):
        run_gu(c, a)


if __name__ == "__main__":
    main()
