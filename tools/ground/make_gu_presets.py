"""apps/frontend 의 seoul.ts / seoulBoundaries.ts 에서 25개 구 프리셋(코드·이름·slug·bbox)을 만든다.
bbox = 구 경계 외접 사각형 + 0.01°(약 1km) 여유 (트윈 반경 1km가 구 밖으로 넘어가도 바닥이 있도록)."""
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SLUG = {"11110": "jongno", "11140": "jung", "11170": "yongsan", "11200": "seongdong", "11215": "gwangjin",
        "11230": "dongdaemun", "11260": "jungnang", "11290": "seongbuk", "11305": "gangbuk", "11320": "dobong",
        "11350": "nowon", "11380": "eunpyeong", "11410": "seodaemun", "11440": "mapo", "11470": "yangcheon",
        "11500": "gangseo", "11530": "guro", "11545": "geumcheon", "11560": "yeongdeungpo", "11590": "dongjak",
        "11620": "gwanak", "11650": "seocho", "11680": "gangnam", "11710": "songpa", "11740": "gangdong"}
MARGIN = 0.01

names = dict(re.findall(r"code: '(11\d{3})', name: '([^']+구)'", (REPO / "apps/frontend/src/lib/seoul.ts").read_text(encoding="utf-8")))
src = (REPO / "apps/frontend/src/lib/seoulBoundaries.ts").read_text(encoding="utf-8")
out = {}
for m in re.finditer(r"'(11\d{3})': \[\[(.*?)\]\],\s*//", src, re.S):
    pts = [tuple(map(float, p.split(","))) for p in re.findall(r"\[([0-9.]+, [0-9.]+)\]", "[" + m.group(2) + "]")]
    la, lo = [p[0] for p in pts], [p[1] for p in pts]
    code = m.group(1)
    out[code] = {"name": names[code], "slug": SLUG[code],
                 "bbox": [round(min(la) - MARGIN, 3), round(min(lo) - MARGIN, 3), round(max(la) + MARGIN, 3), round(max(lo) + MARGIN, 3)]}
assert len(out) == 25 and set(out) == set(SLUG) == set(names)
Path(__file__).with_name("gu_presets.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(out), "presets")
