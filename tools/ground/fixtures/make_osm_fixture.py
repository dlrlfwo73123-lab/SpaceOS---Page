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
# 건물: 도로 격자 칸마다 3동(높이 태그 / 층수 태그 / 태그 없음) + 걸러져야 하는 것 2개
import random
rnd = random.Random(7)
def rect(x, y, w, d):
    return [(x, y), (x + w, y), (x + w, y + d), (x, y + d), (x, y)]
for gx in (-300, -100, 100, 300):
    for gy in (-300, -100, 100, 300):
        els.append(way({"building": "yes", "height": str(rnd.choice([9, 12.5, 21, 30]))}, rect(gx - 60, gy - 60, 40 + rnd.randint(0, 20), 30 + rnd.randint(0, 20))))
        els.append(way({"building": "apartments", "building:levels": str(rnd.choice([3, 5, 8, 12, 15]))}, rect(gx + 10, gy - 55, 35 + rnd.randint(0, 25), 40 + rnd.randint(0, 15))))
        els.append(way({"building": "yes"}, rect(gx - 55, gy + 10, 25 + rnd.randint(0, 15), 25 + rnd.randint(0, 15))))
els.append(way({"building": "yes", "height": "10"}, [(0, 0), (10, 0), (10, 10)]))        # 열린 way → 제외
els.append(way({"building": "shed"}, rect(40, 40, 1.5, 1.5)))                           # 5㎡ 미만 → 제외

Path(__file__).with_name("synthetic_osm.json").write_text(
    json.dumps({"version": 0.6, "generator": "synthetic fixture", "elements": els}, indent=1), encoding="utf-8")
