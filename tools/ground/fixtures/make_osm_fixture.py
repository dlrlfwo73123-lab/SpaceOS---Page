"""합성 Overpass(`out geom`) 형식 샘플. 실제 성동구 데이터가 아니다.
성수동 부근 좌표 기준으로 가상의 격자 도로를 만든다(폭·보도 태그를 일부러 섞음)."""
import json
import math
from pathlib import Path

LAT0, LNG0 = 37.5446, 127.0557
MLAT, MLNG = 111320.0, 111320.0 * math.cos(math.radians(LAT0))
_id = [1000]


def pt(x, y):
    return {"lat": LAT0 + y / MLAT, "lon": LNG0 + x / MLNG}


def way(tags, pts):
    _id[0] += 1
    return {"type": "way", "id": _id[0], "tags": tags, "geometry": [pt(*p) for p in pts]}


els = []
E = 520
# 동서 도로 y = -400..400 (100m 간격 중 5개), 남북 도로 x = -400..400
for i, y in enumerate((-400, -200, 0, 200, 400)):
    t = [{"highway": "primary", "lanes": "4", "sidewalk": "both"},
         {"highway": "residential", "sidewalk": "both"},
         {"highway": "secondary", "width": "13", "sidewalk": "both"},
         {"highway": "residential"},
         {"highway": "tertiary", "lanes": "2", "sidewalk": "right"}][i]
    els.append(way(t, [(-E, y), (E, y)]))
for i, x in enumerate((-400, -200, 0, 200, 400)):
    t = [{"highway": "residential", "sidewalk": "both"}, {"highway": "service"},
         {"highway": "tertiary", "lanes": "2", "sidewalk": "both"},
         {"highway": "residential", "width": "7"}, {"highway": "residential", "sidewalk": "both"}][i]
    els.append(way(t, [(x, -E), (x, E)]))
# 별도 보도 선(폭 태그 있음/없음)
els.append(way({"highway": "footway", "footway": "sidewalk", "width": "3"}, [(-E, 8), (E, 8)]))
els.append(way({"highway": "footway", "footway": "sidewalk"}, [(-E, -8), (E, -8)]))
# 횡단보도
for x, y in ((0, 25), (0, -25), (200, 15), (-200, 15)):
    els.append(way({"highway": "footway", "footway": "crossing"}, [(x - 6, y), (x + 6, y)]))
# 보행 전용(차도 아님) – 무시되어야 함
els.append(way({"highway": "footway"}, [(-300, 300), (300, 300)]))
Path(__file__).with_name("synthetic_osm.json").write_text(
    json.dumps({"version": 0.6, "generator": "synthetic fixture", "elements": els}, indent=1), encoding="utf-8")
