#!/usr/bin/env python3
"""서울 확인(confirmed) 빈 층 → 창업 가능성 3분류.

PlaceOS 저장소(placeos, origin/main)의 Gold 산출물과 서비스 코드를 **그대로** 불러 쓴다.
  - 빈 층 목록   : data/gold/<거점>/vacant_floor_units.json (certainty == "confirmed")
  - 입점 점검    : app.services.use_check.check  (대장 층 용도 × 토지이음 행위제한)
  - 수지(3-Tier) : app.services.districts.tier_scenarios + posting_inputs.resolve_units
새 계수는 만들지 않는다. 대장 용도코드만 Gold 에 없어서 용도명으로 별표1 호를 근사한다(HO_BY_NAME).
"""
from __future__ import annotations

import json
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(os.environ.get("PLACEOS_ROOT", "/home/user/placeos")).resolve()
sys.path.insert(0, str(ROOT / "apps" / "backend"))
sys.path.insert(0, str(ROOT))

from app.services import districts as D  # noqa: E402
from app.services import floor_vacancy as FV  # noqa: E402
from app.services import posting_inputs as PI  # noqa: E402
from app.services import posting_revenue as PR  # noqa: E402
from app.services import use_check as UC  # noqa: E402
from app.services import vacant_inventory as VI  # noqa: E402
from data.config.page_hubs import ACTIVE_HUBS  # noqa: E402

OUT = Path(__file__).resolve().parent / "out"
OUT.mkdir(exist_ok=True)

# ── 1. 용도명 → 건축법 시행령 별표1 호 (근사) ─────────────────────────────────────────
# 별표1 의 면적 기준은 「같은 건축물에서 그 용도로 쓰는 바닥면적 합계」인데 여기서는 그 층 면적으로 근사한다.
FIXED = {
    # 제3호 제1종 근린생활시설
    "소매점": 3, "상점(소매점)": 3, "의약품판매소": 3, "의료기기판매소": 3,
    "이(미)용원": 3, "미용원": 3, "이용원": 3, "목욕장": 3, "일반목욕장": 3, "세탁소": 3,
    "의원": 3, "치과의원": 3, "한의원": 3, "침술원": 3, "조산원": 3, "조산소": 3, "안마원": 3, "산후조리원": 3,
    "기타제1종근린생활시설": 3, "탁구장": 3, "체육도장": 3,
    "공중화장실": 3, "마을공동시설": 3, "지역아동센터": 3, "파출소": 3, "지역자치센터": 3, "우체국": 3,
    "공공도서관": 3, "변전소": 3, "통신용시설": 3,
    # 제4호 제2종 근린생활시설
    "일반음식점": 4, "주점영업": 4, "기타제2종근린생활시설": 4, "기원": 4, "당구장": 4, "체력단련장": 4,
    "노래연습장": 4, "사진관": 4, "표구점": 4, "안마시술소": 4, "수리점": 4, "총포판매사": 4, "총포판매소": 4,
    "서점(1종근.생미해당)": 4, "자동차영업소": 4, "비디오물감상실": 4, "멀티미디어문화컨텐츠설비제공업소": 4,
    "인터넷컴퓨터게임시설제공업소": 4, "게임제공업소": 4, "청소년게임제공업소": 4, "복합유통게임제공업소": 4,
    "복합유통.제공업소": 4, "놀이형시설": 4,
    # 제5호 문화 및 집회시설
    "기타전시장": 5, "미술관": 5, "박물관": 5, "기념관": 5, "과학관": 5, "문화관": 5, "체험관": 5, "산업전시장": 5,
    "기타문화및집회시설": 5, "예식장": 5, "기타집회장": 5,
    "수도원": 6,
    # 제7호 판매시설
    "기타판매시설": 7, "기타소매시장": 7, "의약품도매점": 7, "일반게임제공업의시설": 7,
    "인터넷컴퓨터게임시설제공업의시설": 7, "청소년게임제공업의시설": 7, "복합유통게임제공업의시설": 7,
    # 제9호 의료시설
    "병원": 9, "요양병원": 9, "한방병원": 9, "치과병원": 9, "기타병원": 9, "기타의료시설": 9,
    # 제10호 교육연구시설
    "연구소": 10, "기타연구소": 10, "기타교육연구시설": 10, "교육원": 10, "교육(연수)원": 10, "연수원": 10,
    "도서관": 10, "초등학교": 10, "유치원": 10,
    # 제11호 노유자시설
    "노인복지시설": 11, "기타노유자시설": 11, "어린이집": 11, "영유아보육시설": 11, "사회복지시설": 11,
    "아동복지시설": 11, "기타아동관련시설": 11,
    # 제13호 운동시설 · 제14호 업무시설 · 제15호 숙박 · 제16호 위락
    "기타운동시설": 13, "기타 운동시설": 13, "체육관": 13, "체육장": 13,
    "자치단체청사": 14, "공관": 1,
    "여인숙": 15,
    "유흥주점": 16, "기타위락시설": 16, "무도장(학원)": 16, "투전기업소": 16, "유기장": 16,
    # 제19호 위험물 · 제20호 자동차 관련 · 제21호 동식물 · 제24호 방송통신 · 제27호 관광휴게
    "주유소": 19, "액화가스판매소": 19, "석유판매소": 19, "고압가스충전소": 19, "위험물취급소": 19,
    "유독물보관저장시설": 19, "도료류판매소": 19,
    "세차장": 20, "기타자동차관련시설": 20, "온실": 21, "전신전화국": 24, "공원에 부수되는 시설": 27,
}
# 면적으로 갈리는 것 — (기준㎡, 미만일 때 호, 이상일 때 호)
BY_AREA = {
    "휴게음식점": (300, 3, 4), "제과점": (300, 3, 4),
    "동물병원": (300, 3, 4), "동물미용실": (300, 3, 4), "동물위탁시설": (300, 3, 4),
    "부동산중개업소": (30, 3, 4), "결혼상담소": (30, 3, 4), "출판사": (30, 3, 4),
    "학원": (500, 4, 10), "교습소": (500, 4, 10), "직업훈련소": (500, 4, 10),
    "골프연습장": (500, 4, 13),
    "기타공연장": (500, 4, 5), "극장": (500, 4, 5), "극장(영화관)": (500, 4, 5), "영화관": (500, 4, 5), "음악당": (500, 4, 5),
    "단란주점": (150, 4, 16), "방송국": (1000, 3, 24),
}
UNKNOWN = {"기타근린생활시설"}  # 1종/2종 근생 중 어느 쪽인지 이름으로 못 정한다 → 코드 없음(확인 필요)
# 대장상 근생이지만 공공·기반 시설 — 상가정보·인허가에 안 잡혀 「빈 층」으로 남았을 가능성이 크다
PUBLIC = {"공중화장실", "파출소", "지역자치센터", "우체국", "공공도서관", "변전소", "통신용시설", "마을공동시설", "방송국"}

HO_NAMES = dict(UC.HO_NAMES)
HO_NAMES.update({19: "위험물 저장 및 처리 시설", 20: "자동차 관련 시설", 21: "동물 및 식물 관련 시설",
                 24: "방송통신시설", 27: "관광 휴게시설"})


def ho_approx(purps: str, area_m2: float) -> int | None:
    p = (purps or "").strip()
    if p in UNKNOWN or not p:
        return None
    if p in FIXED:
        return FIXED[p]
    if p in BY_AREA:
        lim, lo, hi = BY_AREA[p]
        return lo if area_m2 < lim else hi
    raise KeyError(p)


# ── 2. 일반 창업 6업종 (use_check.INDUSTRY_ACTS 의 키) ─────────────────────────────────
FOUNDER = [
    ("cafe", "카페·디저트", "휴게음식점"),
    ("restaurant", "음식점·술집", "일반음식점"),
    ("convenience", "소매(편의점·옷·잡화)", "일용품 소매점"),
    ("beauty", "미용·네일", "미용원"),
    ("education", "학원·교육", "학원"),
    ("fitness", "운동(체력단련)", "체력단련장"),
]
FOOD = {"cafe", "restaurant"}
DEST = {"beauty", "education", "fitness"}
TIERS = ("premium", "value", "factory")
TIER_KO = {"premium": "고급화", "value": "가성비", "factory": "공장제"}
SIGUNGU_KO = {"11680": "강남구", "11710": "송파구", "11740": "강동구", "11320": "도봉구"}


def item_status(res: dict, item: str) -> str | None:
    for c in res["checks"]:
        if c["item"] == item:
            return c["status"]
    return None


def legal_eval(u: dict) -> dict:
    purps, area = u.get("purps") or "", float(u.get("area_m2") or 0)
    ho = ho_approx(purps, area)
    code = f"{ho:02d}000" if ho else None
    per = {}
    for key, _label, _act in FOUNDER:
        res = UC.check(u["pnu"], key, parts=[{"purps": purps, "area_m2": area, "code": code}], area_m2=area)
        per[key] = {
            "status": res["regulation_status"],
            "ledger": item_status(res, "대장 층 용도"),
            "zone": item_status(res, "용도지역 행위제한"),
            "parcel": item_status(res, "필지 용도지역"),
            "other": item_status(res, "다른 지역지구"),
            "area": item_status(res, "면적 기준"),
        }
    return {"ho": ho, "per": per}


# ── 3. 수지 (Posting 3-Tier) ───────────────────────────────────────────────────────
_peers: dict[str, list] = {}


def _resolve(hid: str, u: dict, floor_label: str) -> dict | None:
    """posting._resolve_requested_unit + _floor_unit_raw 를 그대로 옮긴 것(settings import 를 피하려고)."""
    if hid not in _peers:
        _peers[hid] = VI.units(hid) if PI.for_district(hid) else []
    raw = {"id": u["id"], "n": u.get("n"), "lat": u.get("lat"), "lng": u.get("lng"),
           "area": u.get("area"), "floor": floor_label, "was": u.get("was") or ""}
    return next((x for x in PI.resolve_units(hid, [*_peers[hid], raw]) if x.get("id") == u["id"]), None)


def econ_eval(hid: str, u: dict) -> dict:
    label = u.get("floor_label") or "1F"
    out = {}
    for basis, fl in (("f1", "1F"), ("here", label)):
        unit = _resolve(hid, u, fl)
        if unit is None:
            out[basis] = None
            continue
        sc = D.tier_scenarios(unit, hid)
        out[basis] = {t: (sc[t]["month_net"] if sc[t]["available"] else None) for t in TIERS}
        out[basis + "_rent"] = unit.get("rent")
        out[basis + "_rev"] = {t: sc[t]["month_rev"] for t in TIERS}
    out["foot"] = (unit or {}).get("foot")
    return out


# ── 4. 분류 ─────────────────────────────────────────────────────────────────────────
ST1 = {"ok": "o", "check": "c", "blocked": "b", "missing": "m"}
OPEN_LEDGER = {"ok", "check"}
KOSIS_PROFIT = {t: float(PR._rates()[t]["profit_rate"]) for t in TIERS}   # 서울 2024 영업이익률(임차료 포함 비용 뒤)
OPEN_ZONE = {"ok", "check"}


def classify(u: dict, legal: dict, econ: dict) -> tuple[str, list[str], dict]:
    per = legal["per"]
    purps = (u.get("purps") or "").strip()
    reasons: list[str] = []
    info: dict = {}

    ledger_open = [k for k, *_ in FOUNDER if per[k]["ledger"] in OPEN_LEDGER]
    full_open = [k for k in ledger_open if per[k]["zone"] in OPEN_ZONE and per[k]["other"] not in ("missing",)]
    zone_blocked = [k for k in ledger_open if per[k]["zone"] == "blocked"]
    zone_missing = [k for k in ledger_open if per[k]["zone"] in (None, "missing")]
    same_use = [k for k in ledger_open if per[k]["ledger"] == "ok"]
    info.update(ledger_open=ledger_open, full_open=full_open, same_use=same_use)

    hard = soft = False
    # 법·용도
    if purps in PUBLIC:
        reasons.append("L_PUBLIC"); hard = True
    elif not ledger_open:
        if legal["ho"] == 7:
            reasons.append("L_SALES"); soft = True
        else:
            reasons.append("L_USE_CHANGE"); hard = True
    elif not full_open and zone_blocked and not zone_missing:
        reasons.append("L_ZONE_BLOCK"); hard = True
    elif not full_open:
        parcel_missing = all(per[k]["parcel"] in (None, "missing") for k in ledger_open)
        zone_unfetched = any(per[k]["zone"] in (None, "missing") for k in ledger_open)
        reasons.append("L_PARCEL_MISSING" if parcel_missing else ("L_ZONE_MISSING" if zone_unfetched else "L_OTHER_MISSING")); soft = True
    else:
        reasons.append("L_OPEN")

    # 수지
    f1, here = econ.get("f1"), econ.get("here")
    f1_ok = [t for t in TIERS if f1 and f1[t] is not None and f1[t] > 0]
    here_ok = [t for t in TIERS if here and here[t] is not None and here[t] > 0]
    measured = [t for t in TIERS if f1 and f1[t] is not None]
    info.update(f1_ok=f1_ok, here_ok=here_ok, measured=measured)
    # 기준선 = 서울 같은 가격대 외식업 평균 영업이익률(KOSIS 2024). 1층 기준 순익률이 그 이상이면 「여력 있음」.
    rev = econ.get("f1_rev") or {}
    margin = {t: f1[t] / rev[t] for t in measured if rev.get(t)}
    f1_plus = [t for t, m in margin.items() if m >= KOSIS_PROFIT[t]]
    info.update(f1_plus=f1_plus, margin={t: round(m, 4) for t, m in margin.items()})
    if not measured:
        reasons.append("E_NA"); soft = True
    elif f1_plus:
        reasons.append("E_PLUS")
    elif f1_ok:
        reasons.append("E_THIN")
    elif here_ok:
        reasons.append("E_UPPER_ONLY"); soft = True
    else:
        reasons.append("E_NO"); hard = True

    # 자리
    area = float(u.get("area_m2") or 0)
    if area >= 300:
        reasons.append("P_LARGE"); soft = True
    if u.get("bld_status") == "empty":
        reasons.append("P_EMPTY_BLD"); soft = True
    if (u.get("floor") or 1) >= 3:
        reasons.append("P_UPPER")  # 정보 — 등급을 바꾸지 않는다

    cls = "C" if hard else ("B" if soft else ("A1" if "E_PLUS" in reasons else "A2"))
    return cls, reasons, info


def main() -> None:
    seoul = [s for s, h in ACTIVE_HUBS.items() if h.city == "seoul"]
    t0 = time.time()
    rows, hubs = [], {}
    val = defaultdict(Counter)       # 검증용: 확인+추정 전체에 대해 업종별 종합 상태
    ho_all, ho_conf = Counter(), Counter()
    for hid in seoul:
        fv = FV.load(hid) or {}
        hub = ACTIVE_HUBS[hid]
        hubs[hid] = {"name": hub.name, "measured": PR.measured_tiers(hid),
                     "rent_m2": (PI.for_district(hid) or {}).get("rent_per_m2_krw_thousand"),
                     "foot": (PI.for_district(hid) or {}).get("foot"),
                     "pp": {t: PR.per_pyeong(hid, t) for t in TIERS},
                     "opex": {t: PR.opex_rate(t) for t in TIERS},
                     "status": {t: PR.tier_status(hid, t) for t in TIERS}}
        for u in fv.get("units") or []:
            legal = legal_eval(u)
            ho_all[legal["ho"]] += 1
            for k, *_ in FOUNDER:
                val[k][legal["per"][k]["status"]] += 1
            if u.get("certainty") != "confirmed":
                continue
            ho_conf[legal["ho"]] += 1
            econ = econ_eval(hid, u)
            cls, reasons, info = classify(u, legal, econ)
            rows.append({"hub": hid, "u": u, "ho": legal["ho"],
                         "per": {k: legal["per"][k]["status"] for k, *_ in FOUNDER},
                         "items": {k: "".join(ST1.get(legal["per"][k][f], "-") for f in ("ledger", "zone", "parcel", "other", "area"))
                                   for k, *_ in FOUNDER},
                         "econ": econ, "cls": cls, "reasons": reasons, "info": info})
        print(f"{hid:24s} {len(rows):6d}  {time.time() - t0:6.1f}s", flush=True)

    (OUT / "rows.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    (OUT / "hubs.json").write_text(json.dumps(hubs, ensure_ascii=False), encoding="utf-8")
    (OUT / "validation.json").write_text(json.dumps(
        {"ho_all": {str(k): v for k, v in ho_all.items()}, "ho_conf": {str(k): v for k, v in ho_conf.items()},
         "status_all": {k: dict(v) for k, v in val.items()}}, ensure_ascii=False, indent=1), encoding="utf-8")
    print("rows", len(rows), "classes", Counter(r["cls"] for r in rows))


if __name__ == "__main__":
    main()
