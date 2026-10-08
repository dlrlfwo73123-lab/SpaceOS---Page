"""'지도에서 공실 점을 누르면 나오는 층'과 '3D 트윈의 층별 현황'이 서로 맞는지 재현 실험.

앱 흐름(NaverMap.addVacancyMarker): 점 클릭 → 팝업/모달에 marker.floor 표시, 트윈은 /buildings/vacancy-<id>/floors 호출.
  A) 백엔드가 있을 때: 백엔드 get_building_floors("vacancy-<id>") 의 층 수·공실 층과 비교
  B) 백엔드가 없을 때(정적 배포): 프런트의 FALLBACK_FLOORS(5층, 2·4층 공실)와 비교
출력: JSON (표준출력). 사용: python tools/qa/floor_consistency.py
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/backend"))
from app.data.buildings import get_building_floors  # noqa: E402

FALLBACK_VACANT = {2, 4}  # BuildingTwin.FALLBACK_FLOORS (5층, 2·4층 공실)
FALLBACK_COUNT = 5


def main() -> None:
    raw = subprocess.run(["node", str(ROOT / "tools/qa/dump_markers.mjs")], capture_output=True, text=True, check=True).stdout
    groups = json.loads(raw)
    rows = [(g["guCode"], m) for g in groups for m in g["markers"]]
    n = len(rows)
    a = {"floor_exists": 0, "floor_is_vacant_in_twin": 0}
    b = {"floor_exists": 0, "floor_is_vacant_in_twin": 0}
    counts, mismatch_examples = [], []
    for gu, m in rows:
        fl = get_building_floors(f"vacancy-{m['id']}")
        counts.append(len(fl))
        vac = {f["level"] for f in fl if f["vacant"]}
        a["floor_exists"] += m["floor"] <= len(fl)
        a["floor_is_vacant_in_twin"] += m["floor"] in vac
        b["floor_exists"] += m["floor"] <= FALLBACK_COUNT
        b["floor_is_vacant_in_twin"] += m["floor"] in FALLBACK_VACANT
        if m["floor"] not in vac and len(mismatch_examples) < 6:
            mismatch_examples.append({"gu": gu, "marker_id": m["id"], "popup_floor": m["floor"], "twin_floors": len(fl), "twin_vacant_levels": sorted(vac)})
    out = {
        "markers": n, "gu": len(groups),
        "popup_floor_range": [min(m["floor"] for _, m in rows), max(m["floor"] for _, m in rows)],
        "twin_floor_count_range": [min(counts), max(counts)],
        "with_backend": {k: {"count": v, "pct": round(100 * v / n, 1)} for k, v in a.items()},
        "without_backend_fallback": {k: {"count": v, "pct": round(100 * v / n, 1)} for k, v in b.items()},
        "examples_popup_floor_not_vacant_in_twin": mismatch_examples,
        "deterministic": get_building_floors("vacancy-x") == get_building_floors("vacancy-x"),
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
