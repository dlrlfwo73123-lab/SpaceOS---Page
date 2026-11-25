#!/usr/bin/env python3
"""classify.py 의 결과(out/rows.json · hubs.json · validation.json) → 한 파일 HTML 보고서.

    PLACEOS_ROOT=/path/to/placeos python build_report.py <출력 html 경로>

요약 · 기준 · 이유 · 상권 표 · 검증은 정적 HTML 로 미리 그린다(자바스크립트가 꺼져도 읽힌다).
층별 목록(1만여 줄)만 자바스크립트가 데이터(JSON)에서 그린다.
"""
from __future__ import annotations

import json
import os
import statistics as st
import sys
from collections import Counter, defaultdict
from datetime import date
from html import escape as E
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
PLACEOS = Path(os.environ.get("PLACEOS_ROOT", "/home/user/placeos"))

REASONS = ["L_OPEN", "L_PUBLIC", "L_USE_CHANGE", "L_ZONE_BLOCK", "L_ZONE_MISSING", "L_OTHER_MISSING",
           "L_PARCEL_MISSING", "L_SALES", "E_PLUS", "E_THIN", "E_UPPER_ONLY", "E_NO", "E_NA",
           "P_LARGE", "P_EMPTY_BLD", "P_UPPER"]
HARD = ["L_USE_CHANGE", "E_NO", "L_PUBLIC", "L_ZONE_BLOCK"]
SOFT = ["L_ZONE_MISSING", "E_UPPER_ONLY", "P_LARGE", "P_EMPTY_BLD", "L_SALES", "L_OTHER_MISSING", "L_PARCEL_MISSING", "E_NA"]
IND = ["cafe", "restaurant", "convenience", "beauty", "education", "fitness"]
IND_KO = {"cafe": "카페·디저트", "restaurant": "음식점·술집", "convenience": "소매(편의점·옷·잡화)", "beauty": "미용·네일",
          "education": "학원·교육", "fitness": "운동(체력단련)"}
TI = ["premium", "value", "factory"]
TI_KO = {"premium": "고급화", "value": "가성비", "factory": "공장제"}
CLS = ["A1", "A2", "B", "C"]
CL_NAME = ["창업 여력 있음", "창업 가능 · 여력 얇음", "조건부 · 확인 필요", "창업 어려움"]
CL_SHORT = ["여력 있음", "가능·얇음", "조건부", "어려움"]
CL_ICON = ["✓", "!", "?", "✕"]
BLD = {"partial": 0, "high": 1, "empty": 2}
GU = {"11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구", "11215": "광진구", "11230": "동대문구",
      "11260": "중랑구", "11290": "성북구", "11305": "강북구", "11320": "도봉구", "11350": "노원구", "11380": "은평구",
      "11410": "서대문구", "11440": "마포구", "11470": "양천구", "11500": "강서구", "11530": "구로구", "11545": "금천구",
      "11560": "영등포구", "11590": "동작구", "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구",
      "11740": "강동구"}
# docs/finding-eum-landuse-2026-11-15.md §4 — 실시간 대장 용도코드로 돌린 같은 규칙(14,517층 · 행위제한을 받은 10,574층 기준)
REF_STATUS = {
    "restaurant": {"ledger_ok": 491, "needs_check": 3941, "use_change_needed": 6099, "zoning_prohibited": 43},
    "cafe": {"ledger_ok": 4, "needs_check": 9603, "use_change_needed": 967, "zoning_prohibited": 0},
    "convenience": {"ledger_ok": 469, "needs_check": 5167, "use_change_needed": 4938, "zoning_prohibited": 0},
    "beauty": {"ledger_ok": 35, "needs_check": 5601, "use_change_needed": 4938, "zoning_prohibited": 0},
    "education": {"ledger_ok": 1, "needs_check": 4629, "use_change_needed": 5900, "zoning_prohibited": 44},
    "fitness": {"ledger_ok": 0, "needs_check": 4417, "use_change_needed": 6114, "zoning_prohibited": 43},
}
ST_KO = {"ledger_ok": "대장상 가능", "needs_check": "확인 필요", "use_change_needed": "용도 변경 필요", "zoning_prohibited": "용도지역 금지"}
REF_HO = [("3", "제1종 근생", 7472), ("4", "제2종 근생", 5989), ("10", "교육연구", 310), ("5", "문화·집회", 224),
          ("7", "판매", 159), ("None", "코드 없음(미상)", 125)]


def f(n) -> str:
    return f"{n:,}"


def p(x, d=1) -> str:
    return f"{x * 100:.{d}f}%"


def mask(keys, universe):
    return sum(1 << universe.index(k) for k in keys if k in universe)


def bp(x):
    """비율 → 만분율 정수(소수 둘째 자리 %까지 보존)."""
    return None if x is None else int(round(x * 10000))


def pct_txt(m) -> str:
    a = abs(m * 100)
    return f"{'+' if m > 0 else ''}{m * 100:.{2 if 0 < a < 0.1 else 1}f}%"


def sw(i: int, small: bool = False) -> str:
    return f'<i class="sw c{i}" aria-hidden="true">{CL_ICON[i]}</i>'


def badge(i: int) -> str:
    return f'<span class="badge c{i}">{sw(i)}{CL_NAME[i]}</span>'


def seg(counts, total, kind="thin", label_prefix="") -> str:
    parts = []
    for i, c in enumerate(counts):
        if not c:
            continue
        share = c / total if total else 0
        tip = f"{CL_NAME[i]} · {f(c)}개 층\n{label_prefix}{p(share)}"
        inner = f"<span>{p(share)}</span>" if kind == "tall" else ""
        parts.append(f'<div class="part c{i}" style="flex:{c}" tabindex="0" data-tip="{E(tip)}">{inner}</div>')
    aria = " · ".join(f"{CL_NAME[i]} {f(c)}개({p(c / total) if total else '0%'})" for i, c in enumerate(counts))
    return f'<div class="seg {kind}" role="img" aria-label="{E(aria)}">{"".join(parts)}</div>'


def inline_assets(html: str) -> str:
    """공용 CSS · 스크립트를 HTML 안에 넣는다(한 파일로 열리게)."""
    return (html.replace("/*__CSS__*/", (HERE / "report.css").read_text(encoding="utf-8"))
                .replace("/*__LIB__*/", (HERE / "report_lib.js").read_text(encoding="utf-8")))


def encode_rows(rows: list, hubs: dict, uci: dict, ox: dict):
    """분류 행 → 보고서용 압축 배열. 두 보고서(전체 분류 · 건물주 등록 구분)가 같은 모양을 쓴다.

    반환: (hub_ids, out_rows, purps_l, zone_l, was_l, by_hub). out_rows[i] 는 rows[i] 와 같은 층이다.
    """
    zone_names = uci["zone_names"]
    hub_ids = list(hubs.keys())
    hub_ix = {h: i for i, h in enumerate(hub_ids)}
    purps_l, zone_l, was_l = [], [], []
    purps_ix, zone_ix, was_ix = {}, {}, {}

    def ix(v, lst, d):
        if v not in d:
            d[v] = len(lst)
            lst.append(v)
        return d[v]

    by_hub = defaultdict(list)
    out_rows = []
    for r in rows:
        u, info, econ = r["u"], r["info"], r["econ"]
        zones = [c for c, _ in (uci["parcels"].get(u["pnu"]) or []) if c.startswith("UQA") and not c.startswith("UQA0")]
        zlabel = "·".join(dict.fromkeys(zone_names.get(c, c) for c in zones)) or "미상"
        chk = 0
        for k in info["full_open"]:
            it = r["items"][k]
            chk |= (1 if it[0] == "c" else 0) | (2 if it[1] == "c" else 0) | (4 if it[3] == "c" else 0) | (8 if it[4] == "c" else 0)
        f1, here = econ.get("f1") or {}, econ.get("here") or {}
        f1r, herer = econ.get("f1_rev") or {}, econ.get("here_rev") or {}
        m1 = [(f1[t] / f1r[t]) if f1.get(t) is not None and f1r.get(t) else None for t in TI]
        mh = [(here[t] / herer[t]) if here.get(t) is not None and herer.get(t) else None for t in TI]
        best = max(((m, i) for i, m in enumerate(m1) if m is not None), default=(None, -1))
        here_ok = [t for t in TI if here.get(t) is not None and here[t] > 0]
        # 적자일 때만: 본전까지 추정 매출을 몇 % 더 올려야 하나(가장 가까운 가격대). 비임차 비용을 매출 비례로 보는 Posting 모델 그대로.
        need = None
        if m1 and all(m is not None and m <= 0 for m in m1 if m is not None) and any(m is not None for m in m1):
            need = min(((-m / (1 - ox[t]), i) for i, (t, m) in enumerate(zip(TI, m1)) if m is not None))
        out_rows.append([
            hub_ix[r["hub"]], u.get("n") or "", u.get("floor"), round(float(u.get("area_m2") or 0), 1),
            ix(u.get("purps") or "", purps_l, purps_ix), r["ho"] or 0, CLS.index(r["cls"]), mask(r["reasons"], REASONS),
            mask(info["full_open"], IND), mask(info["ledger_open"], IND), mask(info["same_use"], IND), chk,
            mask(info["f1_plus"], TI), mask(info["f1_ok"], TI), mask(here_ok, TI), mask(info["measured"], TI),
            bp(best[0]), best[1], int(round(float(u.get("bld_vacancy_rate") or 0))), BLD.get(u.get("bld_status"), 0),
            int(round(u["lat"] * 1e5)), int(round(u["lng"] * 1e5)), ix(zlabel, zone_l, zone_ix),
            ix((u.get("was") or "").strip(), was_l, was_ix), u.get("building_id") or "", len(u.get("com_floors") or []),
            [bp(x) for x in m1], [bp(x) for x in mh], bp(need[0]) if need else None, need[1] if need else -1,
        ])
        by_hub[r["hub"]].append(r)

    return hub_ids, out_rows, purps_l, zone_l, was_l, by_hub


def build(dest: Path) -> None:
    rows = json.loads((OUT / "rows.json").read_text(encoding="utf-8"))
    hubs = json.loads((OUT / "hubs.json").read_text(encoding="utf-8"))
    val = json.loads((OUT / "validation.json").read_text(encoding="utf-8"))
    uci = json.loads((PLACEOS / "data/gold/page_use_check_inputs.json").read_text(encoding="utf-8"))
    rates = json.loads((PLACEOS / "data/gold/platform_posting_cost_rates.json").read_text(encoding="utf-8"))["tiers"]
    area = json.loads((PLACEOS / "data/gold/platform_posting_store_area.json").read_text(encoding="utf-8"))["tiers"]
    floor_factor = json.loads((PLACEOS / "data/gold/platform_posting_inputs.json").read_text(encoding="utf-8")).get("floor_factor") or {}
    zone_names = uci["zone_names"]
    kp = {t: rates[t]["profit_rate"] for t in TI}
    kr = {t: rates[t]["rent_rate"] for t in TI}
    ox = {t: rates[t]["opex_rate_ex_rent"] for t in TI}

    hub_ids, out_rows, purps_l, zone_l, was_l, by_hub = encode_rows(rows, hubs, uci, ox)

    n = len(rows)
    total_all = sum(int(v) for v in val["ho_all"].values())
    # 상권 반경이 겹치면 같은 층이 상권마다 들어간다(같은 vfu id · 상권마다 다른 수지) — 서로 다른 층은 (건물 ID, 층)으로 센다
    uniq = len({(r["u"]["building_id"], r["u"]["floor"]) for r in rows})
    uniq_a = len({(r["u"]["building_id"], r["u"]["floor"]) for r in rows if r["cls"] in ("A1", "A2")})
    cc = [sum(1 for r in rows if r["cls"] == c) for c in CLS]
    in_cls = {c: [r for r in rows if r["cls"] == c] for c in CLS}

    def cnt(rs, code):
        return sum(1 for r in rs if code in r["reasons"])

    def only(rs, code, pool):
        return sum(1 for r in rs if code in r["reasons"] and [x for x in r["reasons"] if x in pool] == [code])

    # ── 상권 표 ──
    hub_rows, hub_meta = [], []
    for h in hub_ids:
        rs = by_hub.get(h, [])
        v = hubs[h]
        gu = GU.get(Counter(r["u"]["pnu"][:5] for r in rs).most_common(1)[0][0], "") if rs else ""
        counts = [sum(1 for r in rs if r["cls"] == c) for c in CLS]
        med = []
        for t in TI:
            xs = [r["info"]["margin"][t] for r in rs if t in (r["info"].get("margin") or {})]
            med.append(st.median(xs) if xs else None)
        zmiss = cnt(rs, "L_ZONE_MISSING")
        hub_meta.append([h, v["name"], gu, v.get("rent_m2"), counts, len(rs)])
        cells = []
        for t, m in zip(TI, med):
            if m is None:
                reason = {"above_band": "평당매출이 상식 범위 위라 계산하지 않음", "no_sample": "매출 표본 부족",
                          "no_rate": "비용률 없음"}.get(v["status"][t], "자료 부족")
                cells.append(f'<span class="neg" data-tip="{E(TI_KO[t] + chr(10) + reason)}" tabindex="0">–</span>')
            else:
                cls = "pos mark-plus" if m >= kp[t] else ("pos" if m > 0 else "neg")
                cells.append(f'<span class="{cls}">{pct_txt(m)}</span>')
        link = f"https://placeos.co.kr/#/explore?track=page&district={h}"
        zcell = f'<span class="tag">미수집 {f(zmiss)}</span>' if zmiss else '<span class="muted">받음</span>'
        hub_rows.append(
            f'<tr data-name="{E(v["name"])}" data-total="{len(rs)}" data-c0="{counts[0]}" data-c1="{counts[1]}" '
            f'data-c2="{counts[2]}" data-c3="{counts[3]}" data-rent="{v.get("rent_m2") or 0}">'
            f'<td class="hub-name"><b><a href="{link}" target="_blank" rel="noopener">{E(v["name"])}</a></b><span>{E(gu)}</span></td>'
            f'<td class="r num">{f(len(rs))}</td>' + "".join(f'<td class="r num">{f(c)}</td>' for c in counts) +
            f'<td class="hub-bar">{seg(counts, len(rs), "thin", label_prefix=v["name"] + " 빈 층의 ")}</td>'
            f'<td class="r num">{(format(v["rent_m2"], ".1f")) if v.get("rent_m2") else "–"}</td>'
            f'<td class="num">{" · ".join(cells)}</td><td>{zcell}</td></tr>')

    # ── 요약 수치 ──
    a_rows = in_cls["A1"] + in_cls["A2"]
    a_upper = sum(1 for r in a_rows if r["u"]["floor"] >= 3)
    a2_best = [max(r["info"]["margin"].values()) for r in in_cls["A2"] if r["info"].get("margin")]
    a1_best = [max(r["info"]["margin"].values()) for r in in_cls["A1"] if r["info"].get("margin")]
    a1_hubs = Counter(hubs[r["hub"]]["name"] for r in in_cls["A1"])
    e_no_hubs = Counter(hubs[r["hub"]]["name"] for r in rows if "E_NO" in r["reasons"])
    zmiss_gu = Counter(GU.get(r["u"]["pnu"][:5], r["u"]["pnu"][:5]) for r in in_cls["B"] if "L_ZONE_MISSING" in r["reasons"])
    zmiss_names = "·".join(g.replace("구", "") for g, _ in zmiss_gu.most_common(3)) + (" 전체와 " + "·".join(g for g, _ in zmiss_gu.most_common()[3:]) + " 일부" if len(zmiss_gu) > 3 else "")
    zone_only = [r for r in in_cls["B"] if [x for x in r["reasons"] if x in SOFT] == ["L_ZONE_MISSING"]]
    zone_only_plus = sum(1 for r in zone_only if "E_PLUS" in r["reasons"])
    top = lambda c, k=6: " · ".join(f"{E(a)} {f(b)}" for a, b in c.most_common(k))

    tiles = "".join(
        f'<div class="tile"><div class="tile-h">{sw(i)}{CL_NAME[i]}</div>'
        f'<div class="tile-v">{f(cc[i])}<small>개 층 · {p(cc[i] / n)}</small></div><div class="tile-s">{desc}</div></div>'
        for i, desc in enumerate([
            "법·용도로 막히지 않고, 1층 기준 <b>임대료 부담이 서울 평균 이하</b>인 가격대가 있음",
            "법·용도로 막히지 않고 흑자지만, 임대료 부담이 서울 평균보다 커 <b>남는 몫이 얇음</b>",
            "막는 사유는 없지만 <b>자료가 비었거나 확인할 조건</b>(상층 수지·대형·건물 전체 공실 등)이 있음",
            "<b>용도변경이 필요</b>하거나 공공시설이거나, 1층인데 <b>세 가격대 모두 적자</b>",
        ]))
    tiles = f'<div class="tiles">{tiles}</div>'
    seg_top = seg(cc, n, "tall", label_prefix="확인 빈 층의 ")
    legend = "".join(f"<li>{sw(i)}{CL_NAME[i]}</li>" for i in range(4))
    seg_top += f'<ul class="legend" aria-hidden="true">{legend}</ul>'

    rc_b = {k: cnt(in_cls["B"], k) for k in SOFT}

    def need_of(r):
        m = r["info"].get("margin") or {}
        if not m or any(v > 0 for v in m.values()):
            return None
        return min(-v / (1 - ox[t]) for t, v in m.items())

    eno_need = [x for x in (need_of(r) for r in rows if "E_NO" in r["reasons"]) if x is not None]
    eq = st.quantiles(eno_need, n=4)
    gap = lambda r: max(r["info"]["margin"][t] - kp[t] for t in r["info"]["margin"])
    g1 = st.median(gap(r) for r in in_cls["A1"])
    g2 = st.median(gap(r) for r in in_cls["A2"])
    points = [
        f"<b>「창업 여력 있음」은 {f(cc[0])}개 층({p(cc[0] / n)})이고 {len(a1_hubs)}개 상권에만 있습니다.</b> 이 상권들은 1층 기준으로도 "
        f"임대료 부담이 서울 같은 가격대 평균 이하인 가격대가 있습니다. 많은 곳: {top(a1_hubs)}.",
        f"<b>가장 많은 등급은 「창업 가능 · 여력 얇음」 {f(cc[1])}개입니다.</b> 흑자는 나지만 1층 기준 최고 순익률 중앙값이 "
        f"{st.median(a2_best) * 100:.1f}%로 서울 평균(고급화 {p(kp['premium'])} · 가성비 {p(kp['value'])} · 공장제 {p(kp['factory'])})보다 얇습니다. "
        f"PlaceOS 서빙 상권이 서울 평균보다 임대료가 비싼 자리라 생기는 실제 신호로, Posting 모델 기록과 같은 방향입니다. "
        f"가장 나은 가격대의 서울 평균과의 차이는 「여력 있음」 중앙 {g1 * 100:+.1f}%p, 「가능 · 얇음」 중앙 {g2 * 100:+.1f}%p로 경계 가까이 몰린 층도 많습니다.",
        f"<b>「조건부」 {f(cc[2])}개 중 {f(rc_b['L_ZONE_MISSING'])}개는 토지이음 행위제한을 아직 받지 않은 층({top(zmiss_gu, 6)})이고, "
        f"그중 {f(len(zone_only))}개는 이 이유 하나뿐입니다.</b> 행위제한을 받아 막는 것이 없으면 위 두 등급으로 옮겨 갈 층이고, 그중 {f(zone_only_plus)}개는 수지가 서울 평균 이상입니다. "
        f"나머지 조건: 상층 임대료로만 흑자 {f(rc_b['E_UPPER_ONLY'])} · 300㎡ 이상 {f(rc_b['P_LARGE'])} · 건물 전체 공실 {f(rc_b['P_EMPTY_BLD'])} · 판매시설 층 {f(rc_b['L_SALES'])}(겹침 포함).",
        f"<b>「창업 어려움」은 {f(cc[3])}개({p(cc[3] / n)})입니다.</b> 근생 밖 용도라 용도변경이 필요한 층 {f(cnt(in_cls['C'], 'L_USE_CHANGE'))} · "
        f"공공·기반 시설 {f(cnt(in_cls['C'], 'L_PUBLIC'))} · 1층인데 세 가격대 모두 적자인 층 {f(cnt(in_cls['C'], 'E_NO'))}({len(e_no_hubs)}개 상권: {top(e_no_hubs, 8)}). "
        f"1층 적자 층은 본전 근처가 많습니다 — 가장 가까운 가격대로 본전까지 추정 매출을 중앙 {eq[1] * 100:.1f}%(사분위 {eq[0] * 100:.1f}~{eq[2] * 100:.1f}%) 더 올려야 합니다.",
        f"<b>「여력 있음」·「가능」 {f(len(a_rows))}개 중 {f(a_upper)}개({p(a_upper / len(a_rows))})가 3층 이상입니다.</b> "
        f"법·수지로는 열려 있어도 찾아오는 업종(학원·미용·운동) 위주로 보세요. 1~2층은 {f(len(a_rows) - a_upper)}개입니다.",
    ]
    points_html = "".join(f'<li data-n="{i + 1}">{t}</li>' for i, t in enumerate(points))

    bands_html = ""
    for b, cond in (("1층", lambda x: x == 1), ("2층", lambda x: x == 2), ("3층 이상", lambda x: x >= 3)):
        cs = [sum(1 for r in in_cls[c] if cond(r["u"]["floor"])) for c in CLS]
        tot = sum(cs)
        cnt_txt = " · ".join(f"{CL_SHORT[i]} {f(c)}" for i, c in enumerate(cs))
        bands_html += (f'<div class="band-row"><span class="lbl">{b}<br><span class="muted num" style="font-weight:400;font-size:12px">{f(tot)}개</span></span>'
                       f'{seg(cs, tot, "thin", label_prefix=b + " 빈 층의 ")}<span class="cnt num">{cnt_txt}</span></div>')

    # ── 기준 ──
    rules = f"""<ol class="rules">
<li><div class="rh">1 {badge(3)} 하나라도 해당하면</div><ul>
<li><b>용도변경 필요</b> — 일반 창업 6업종 모두 대장 층 용도와 건축법 분류(시행령 별표1 호)가 다릅니다 · {f(cnt(in_cls['C'], 'L_USE_CHANGE'))}개</li>
<li><b>1층 수지 적자</b> — 1층인데 세 가격대 모두 월 순익이 0 이하입니다 · {f(cnt(in_cls['C'], 'E_NO'))}개</li>
<li><b>공공·기반 시설</b> — 공중화장실·파출소·변전소·공공도서관처럼 임대 매물로 보기 어려운 용도 · {f(cnt(in_cls['C'], 'L_PUBLIC'))}개</li>
<li><b>용도지역 금지</b> — 대장상 들어갈 업종의 행위가 토지이음에 「금지」 · {f(cnt(in_cls['C'], 'L_ZONE_BLOCK'))}개</li></ul></li>
<li><div class="rh">2 {badge(2)} 어려움 사유는 없고 하나라도 해당하면</div><ul>
<li><b>행위제한 미수집</b> — 토지이음 행위제한을 아직 받지 않은 필지({zmiss_names}) · {f(rc_b['L_ZONE_MISSING'])}개</li>
<li><b>상층 임대료로만 흑자</b> — 1층 기준으론 적자, 이 층 임대료(층 계수)를 넣어야 흑자 · {f(rc_b['E_UPPER_ONLY'])}개</li>
<li><b>300㎡ 이상</b> — 휴게음식점 1·2종 경계이자 가맹점 중앙 면적(56~69㎡)의 4배 이상 · {f(rc_b['P_LARGE'])}개</li>
<li><b>건물 전체 공실</b> — 상업층이 모두 비어 신축·리모델링·재건축·매각 여부부터 확인 · {f(rc_b['P_EMPTY_BLD'])}개</li>
<li><b>판매시설 층</b> — PlaceOS 점검은 용도변경으로 보지만 판매시설 안 상점일 수 있음 · {f(rc_b['L_SALES'])}개</li></ul></li>
<li><div class="rh">3 위 둘이 아니면 수지로 — {badge(0)} {badge(1)}</div><ul>
<li><b>여력 있음</b> — 1층 기준 순익률이 서울 같은 가격대 평균 영업이익률(KOSIS 2024: 고급화 {p(kp['premium'])} · 가성비 {p(kp['value'])} · 공장제 {p(kp['factory'])}) 이상인 가격대가 하나라도 있습니다 · {f(cc[0])}개</li>
<li><b>가능 · 여력 얇음</b> — 흑자인 가격대는 있지만 모두 서울 평균 미만입니다 · {f(cc[1])}개</li>
<li class="muted">서울 평균 이상 = 매출에서 임대료가 차지하는 비중이 서울 같은 가격대 평균({p(kr['premium'])} · {p(kr['value'])} · {p(kr['factory'])}) 이하라는 뜻입니다. 기준선을 따로 정하지 않고 서울 평균에서 가져왔습니다.</li></ul></li>
</ol>"""
    ftc = " · ".join(f"{TI_KO[t]} {area[t]['pyeong']}평" for t in TI)
    ff_txt = " · ".join(f"{k} {v}" for k, v in floor_factor.items() if not k.startswith("B"))
    axes = f"""<div class="axes">
<div class="card axis"><h4>① 법·용도 — 그 층에 들어갈 수 있는 분류인가</h4>
<p>PlaceOS 입점 점검(<code>use_check</code>) 규칙을 그대로 돌렸습니다: 대장 층 용도의 건축법 분류 × 업종이 속할 분류, 필지 용도지역의 행위제한, 다른 지역지구.</p>
<ul><li>일반 창업 6업종: 카페·디저트(휴게음식점) · 음식점·술집(일반음식점) · 소매(일용품 소매점) · 미용·네일(미용원) · 학원·교육(학원) · 운동(체력단련장)</li>
<li>6업종 중 하나라도 같은 분류로 들어가면 「열림」. 의원·약국(면허 업종), 숙박·전시는 뺐습니다.</li></ul>
<p class="src">건축물대장 층별개요(Gold) · V-World 용도지역 {E((uci.get('basis') or {}).get('vworld_updated_max', ''))} · 토지이음 행위제한 {E((uci.get('basis') or {}).get('eum_fetched', ''))}</p></div>
<div class="card axis"><h4>② 수지 — 임대료를 매출이 감당하나</h4>
<p>PlaceOS Posting 3-Tier(외식 3가격대 고급화·가성비·공장제) 계산을 그 층에 그대로 돌렸습니다.</p>
<ul><li>월 순익 = 매출 × (1 − 비임차 영업비용률) − 임대료</li>
<li>매출 = 상권분석(상권 간 비율) × KOSIS(절대 수준) ÷ 공정위 점포 면적({ftc}) × 면적</li>
<li>임대료 = R-ONE 1층 임대료 × 면적 (× 층 계수 {E(ff_txt)} — 실측 아님)</li>
<li>매출에 층 보정이 없어 등급은 <b>1층 기준</b>으로 가릅니다. 상층은 이 층 임대료로도 계산해 이유에 적었습니다.</li></ul>
<p class="src">R-ONE 소규모상가 임대료 · 서울시 상권분석 추정매출 · KOSIS 서비스업조사(서울 2024) · 공정위 가맹사업 정보공개서</p></div>
<div class="card axis"><h4>③ 자리 — 바로 빌릴 수 있는 모양인가</h4>
<ul style="margin-top:0"><li><b>300㎡ 이상</b>: 층 전체 면적이라 호실로 나뉘어 임대되는지 확인</li>
<li><b>건물 전체 공실</b>: 신축 입주 전 · 리모델링 · 재건축 · 매각 여부 확인</li>
<li><b>3층 이상</b>: 찾아오는 업종(학원·미용·운동) 위주 — 등급에는 반영하지 않고 이유에만 적습니다</li></ul>
<p class="src">빈 층 Gold(층별개요 면적 · 상가정보 점포 층 · 인허가)</p></div>
</div>"""

    # ── 이유 막대 ──
    purps_c = lambda code, k=6: top(Counter(r["u"]["purps"] for r in rows if code in r["reasons"]), k)
    groups = [
        (3, "「창업 어려움」으로 보낸 이유", in_cls["C"], HARD, {
            "L_USE_CHANGE": ("용도변경 필요", purps_c("L_USE_CHANGE")),
            "E_NO": ("1층 수지 적자", top(e_no_hubs, 8)),
            "L_PUBLIC": ("공공·기반 시설", purps_c("L_PUBLIC")),
            "L_ZONE_BLOCK": ("용도지역 금지", "")}),
        (2, "「조건부」로 보낸 이유", in_cls["B"], SOFT, {
            "L_ZONE_MISSING": ("행위제한 미수집", top(zmiss_gu, 6)),
            "E_UPPER_ONLY": ("상층 임대료로만 흑자", top(Counter(hubs[r["hub"]]["name"] for r in in_cls["B"] if "E_UPPER_ONLY" in r["reasons"]), 8)),
            "P_LARGE": ("300㎡ 이상", "층 전체 면적 — 호실 분할 확인"),
            "P_EMPTY_BLD": ("건물 전체 공실", "신축·리모델링·재건축·매각 확인"),
            "L_SALES": ("판매시설 층", purps_c("L_SALES", 4)),
            "L_OTHER_MISSING": ("지역지구 미수집", ""), "L_PARCEL_MISSING": ("필지 자료 없음", ""), "E_NA": ("수지 자료 없음", "")}),
    ]
    vmax = max([cnt(rs, k) for _, _, rs, pool, _ in groups for k in pool] + [cc[0], cc[1], cnt(rows, "P_UPPER")])
    rb = ""
    for ci, title, rs, pool, labels in groups:
        rb += f'<div class="rgroup"><div class="rgroup-h">{badge(ci)}<span>{title}</span><span class="muted">· {f(len(rs))}개 층</span></div>'
        for k in pool:
            c = cnt(rs, k)
            if not c:
                continue
            o = only(rs, k, pool)
            lab, sub = labels[k]
            w = max(0.3, c / vmax * 80)
            tip = f"{lab} · {f(c)}개 층\n이 이유 하나만: {f(o)}개"
            rb += (f'<div class="rbar"><div class="rl">{lab}<small>{sub}</small></div><div class="rv"><div class="track">'
                   f'<div class="fill" style="width:{w:.2f}%" tabindex="0" data-tip="{E(tip)}"></div>'
                   f'<span class="val num">{f(c)} <small>({f(o)})</small></span></div></div></div>')
        rb += "</div>"
    a_tot = len(a_rows)
    rb += f'<div class="rgroup"><div class="rgroup-h">{badge(0)}{badge(1)}<span>둘을 가른 수지</span><span class="muted">· {f(a_tot)}개 층 · 기준선 = 서울 같은 가격대 평균 영업이익률</span></div>'
    for code, lab, sub, c in (("E_PLUS", "서울 평균 이상 가격대 있음", f"1층 기준 최고 순익률 중앙 {st.median(a1_best) * 100:.1f}%", cc[0]),
                              ("E_THIN", "흑자지만 모두 서울 평균 미만", f"1층 기준 최고 순익률 중앙 {st.median(a2_best) * 100:.1f}%", cc[1])):
        w = c / vmax * 80
        rb += (f'<div class="rbar"><div class="rl">{lab}<small>{sub}</small></div><div class="rv"><div class="track">'
               f'<div class="fill" style="width:{w:.2f}%" tabindex="0" data-tip="{E(lab + chr(10) + f(c) + "개 층")}"></div>'
               f'<span class="val num">{f(c)}</span></div></div></div>')
    rb += "</div>"
    up_all = cnt(rows, "P_UPPER")
    rb += (f'<div class="rgroup"><div class="rgroup-h"><span>참고 — 등급에는 반영하지 않음</span></div>'
           f'<div class="rbar"><div class="rl">3층 이상<small>찾아오는 업종 위주 · 여력 있음·가능 중 {f(a_upper)}개</small></div><div class="rv"><div class="track">'
           f'<div class="fill" style="width:{up_all / vmax * 80:.2f}%" tabindex="0" data-tip="{E("3층 이상" + chr(10) + f(up_all) + "개 층(전체)")}"></div>'
           f'<span class="val num">{f(up_all)}</span></div></div></div></div>')

    # ── 검증 ──
    vs = val["status_all"]
    vrows, maxdiff = "", 0.0
    for k in IND:
        mine = vs[k]
        nm = sum(c for s, c in mine.items() if s != "missing_inputs")
        nr = sum(REF_STATUS[k].values())
        cells = ""
        for s in ST_KO:
            a, b = mine.get(s, 0), REF_STATUS[k][s]
            d = abs(a / nm - b / nr) * 100
            maxdiff = max(maxdiff, d)
            cells += f'<td class="r num">{f(a)} <span class="muted">/ {f(b)}</span></td>'
        vrows += f"<tr><td>{IND_KO[k]}</td>{cells}</tr>"
    ho_rows = "".join(
        f'<tr><td>{lab}</td><td class="r num">{f(int(val["ho_all"].get(key, 0)))}</td><td class="r num">{f(ref)}</td></tr>'
        for key, lab, ref in REF_HO)
    validation = f"""<div class="card"><h3 style="margin-top:0">용도명 근사 검증 — 저장소의 코드 기반 집계와 비교</h3>
<p class="muted" style="margin:0 0 10px;font-size:13.5px">Gold 층 대장에는 용도코드가 없어 용도명으로 별표1 호를 정했습니다(예: 소매점 → 제1종 근생, 학원 500㎡ 미만 → 제2종 근생).
같은 규칙을 실시간 대장 용도코드로 돌린 집계(<code>docs/finding-eum-landuse-2026-11-15.md</code> §4, 확인+추정 {f(total_all)}층 중 행위제한을 받은 10,574층)와 비교하면 업종 · 판정별 비율 차이가 <b>최대 {maxdiff:.1f}%p</b>입니다.</p>
<div class="tablewrap" style="box-shadow:none"><table><thead><tr><th>업종 <span class="muted">근사 / 코드 기반</span></th>{''.join(f'<th class="r">{v}</th>' for v in ST_KO.values())}</tr></thead><tbody>{vrows}</tbody></table></div>
<div class="tablewrap" style="box-shadow:none;margin-top:10px;max-width:520px"><table><thead><tr><th>대장 층 용도(별표1 호) · 전체 {f(total_all)}층</th><th class="r">근사</th><th class="r">코드 기반</th></tr></thead><tbody>{ho_rows}</tbody></table></div></div>"""

    limits = [
        "<b>허가 판정이 아닙니다.</b> 건축물대장·토지이음 기재 기준이며, 영업신고·용도변경·소방·정화조·주차는 관할 구청(건축과·위생과 등)에서 확인해야 합니다. PlaceOS 입점 점검 화면과 같은 원칙입니다.",
        "<b>「확인」 공실은 자료 대조로 확정한 층입니다.</b> 상업층 중 상가정보 점포 층·인허가로 확인되지 않는 층이며 현장 확인이 아닙니다(현장 라벨 0/458 — 실력 검정 불가). 상가정보에 안 잡히는 쓰임(공공·복지·연구·사무)이 있으면 실제로는 쓰이는 층일 수 있습니다.",
        f"<b>대장 용도코드는 근사입니다.</b> 용도명으로 별표1 호를 정했고, 면적 기준(같은 건물 합계)은 그 층 면적으로 근사했습니다. 「기타근린생활시설」 {f(sum(1 for r in rows if r['ho'] is None))}개 층은 1·2종을 정하지 못해 코드 없음(확인 필요)으로 점검했습니다.",
        "<b>수지는 PlaceOS Posting 3-Tier 그대로입니다.</b> 층 계수는 실측이 아니므로 이유에 적은 임대료는 「이 층 월세」가 아닙니다. 매출에 층 보정이 없어 1층 기준으로 가렸고, 학원·미용·운동의 매출은 모델 밖입니다. 투자비(인테리어 등)는 손으로 적은 계수라 등급에 쓰지 않았습니다.",
        "<b>면적은 그 층 전체입니다.</b> 한 층이 여러 호실로 나뉜 건물은 실제 임대 단위가 더 작을 수 있습니다(어느 호가 비었는지는 어떤 공개 자료에도 없음).",
        f"<b>{zmiss_names}는 행위제한을 받지 않아</b> 법·용도 판정을 미뤘습니다(조건부). 받으면 다시 나뉩니다(PlaceOS 입점 점검도 같은 곳을 「자료 부족」으로 답합니다).",
        "<b>건물주 확인 매물(직거래)은 이 보고서에 없습니다.</b> 프로덕션 DB 표가 아직 없어(2026-11-23 <code>/api/v1/direct/listings</code> 503) 0건입니다.",
        f"<b>추정(probable) 빈 층 {f(total_all - n)}개는 뺐습니다.</b> 층 미상 점포가 앉았을 수 있는 층이라 「검증된 공실」로 보지 않았습니다.",
        f"<b>층 수는 상권별로 셌습니다(2026-11-25 정정).</b> 상권 반경이 겹치는 곳의 층은 상권마다 한 번씩 들어가 있어 {f(n)}개 중 서로 다른 (건물, 층)은 "
        f"{f(uniq)}개이고, 「여력 있음 · 가능」 {f(cc[0] + cc[1])}개 중 서로 다른 층은 {f(uniq_a)}개입니다. 같은 층도 상권마다 수지(그 상권 매출 · 임대료)가 달라 등급이 갈릴 수 있습니다.",
        "<b>공실 예측(LSTM)·상권 순위는 쓰지 않았습니다.</b> KPI① 검증 전(보호 게이트 · 참고 판정)이라 등급 근거로 삼지 않습니다.",
        "<b>PlaceOS 점검과 다르게 둔 두 곳:</b> 판매시설 층은 「용도변경 필요」 대신 조건부, 공공·기반 시설 층은 대장상 근생이어도 어려움으로 뒀습니다(이 분류의 판단).",
    ]
    sources = [
        "빈 층: <code>data/gold/&lt;상권&gt;/vacant_floor_units.json</code> (서울 81개 상권, 2026-10-11 빌드) — 건축HUB 층별개요 · 소상공인 상가(상권)정보 · 지방행정 인허가",
        "입점 점검 규칙: <code>apps/backend/app/services/use_check.py</code> · 입력 <code>data/gold/page_use_check_inputs.json</code>",
        "수지: <code>apps/backend/app/services/districts.py</code>(tier_scenarios) · <code>posting_inputs.py</code> · <code>posting_revenue.py</code> · 입력 <code>data/gold/platform_posting_*.json</code>",
        f"서울 평균 기준선: KOSIS 서비스업조사 시도/산업별 총괄(서울 2024) 영업이익률 · 임차료율 — 고급화 {p(kp['premium'])}/{p(kr['premium'])} · 가성비 {p(kp['value'])}/{p(kr['value'])} · 공장제 {p(kp['factory'])}/{p(kr['factory'])}",
        "코드 기반 비교값: <code>docs/finding-eum-landuse-2026-11-15.md</code> §4",
        "재현: SpaceOS---Page 저장소 <code>integrations/placeos-vacancy-classification/</code> — <code>classify.py</code>(placeos 체크아웃에서 실행) → <code>build_report.py</code>. placeos <code>main</code> 9fb2a2c 기준.",
    ]

    payload = {"meta": {"today": date.today().isoformat(), "classCounts": cc,
                        "reasonCounts": {k: cnt(rows, k) for k in REASONS},
                        "kosisProfit": kp, "floorFactor": floor_factor},
               "hubs": hub_meta, "purps": purps_l, "zones": zone_l, "was": was_l, "rows": out_rows,
               "reasons": REASONS, "ind": IND, "tiers": TI, "cls": CLS}
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    basis = uci.get("basis") or {}
    rep = {
        "<!--TODAY-->": date.today().isoformat(), "<!--N-->": f(n), "<!--HUBS-->": str(len(hub_ids)), "<!--UNIQ-->": f(uniq),
        "<!--PROB-->": f(total_all - n), "<!--VW-->": E(basis.get("vworld_updated_max", "")), "<!--EUM-->": E(basis.get("eum_fetched", "")),
        "<!--TILES-->": tiles, "<!--SEG-->": seg_top, "<!--POINTS-->": points_html, "<!--BANDS-->": bands_html,
        "<!--RULES-->": rules, "<!--AXES-->": axes, "<!--REASONBARS-->": rb, "<!--HUBROWS-->": "\n".join(hub_rows),
        "<!--VALIDATION-->": validation, "<!--LIMITS-->": "".join(f"<li>{x}</li>" for x in limits),
        "<!--SOURCES-->": "".join(f"<li>{x}</li>" for x in sources),
    }
    html = inline_assets((HERE / "template.html").read_text(encoding="utf-8"))
    for k, v in rep.items():
        html = html.replace(k, v)
    html = html.replace("/*__DATA__*/", data)
    assert "<!--" not in html.replace("<!doctype", ""), "치환 안 된 자리표시자가 있다"
    dest.write_text(html, encoding="utf-8")
    print("wrote", dest, f"{dest.stat().st_size / 1e6:.2f} MB", dict(zip(CLS, cc)), f"maxdiff {maxdiff:.2f}pp")


if __name__ == "__main__":
    build(Path(sys.argv[1]))
