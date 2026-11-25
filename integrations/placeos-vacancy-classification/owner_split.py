#!/usr/bin/env python3
"""창업 가능 공실(분류 「창업 여력 있음」·「창업 가능 · 여력 얇음」) 중 건물주가 직접 올린 공실 구분 → 한 파일 HTML.

    PLACEOS_ROOT=/path/to/placeos python owner_split.py <출력 html> [--listings 파일.json]

- 분류는 classify.py 가 떨군 out/ 을 쓴다(먼저 classify.py 를 돌린다).
- 건물주 매물은 PlaceOS 공개 API `GET https://placeos.co.kr/api/v1/direct/listings` 에서 읽는다.
  공개 API 는 「게시 중 + 소유자 확인」(L3) 매물만 돌려준다 — 초안 · 확인 대기 매물과 소유자 정보(L5)는 오지 않는다.
- --listings 로 같은 모양({"items": [...]})의 JSON 파일을 주면 API 대신 그것을 쓴다(오프라인 점검용 · 보고서에 그렇게 적힌다).
- 매칭 키는 PlaceOS 앱과 같은 「건물 ID({pnu}-{n}) + 층」이다
  (apps/frontend/src/components/twin/ownerListings.ts · flow/screens/Direct.tsx 의 BuildingDirectCard).
"""
from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from html import escape as E
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))   # 같은 폴더의 build_report(공용 함수)를 쓴다
import build_report as B  # noqa: E402

API = "https://placeos.co.kr/api/v1/direct/listings"
KST = timezone(timedelta(hours=9))
A_CLS = ("A1", "A2")
KEEP = ("id", "title", "district_id", "building_id", "address", "floor", "unit_label", "area_m2", "deal_label",
        "deposit_manwon", "monthly_rent_manwon", "maintenance_manwon", "rent_free_months", "min_term_months",
        "available_from", "vacant_since", "popup_min_days", "popup_max_days", "popup_daily_manwon")


def ro(word: str) -> str:
    """조사 (으)로 — 받침이 있으면(ㄹ 제외) 「으로」."""
    ch = word.rstrip("」")[-1:]
    if ch and "가" <= ch <= "힣":
        jong = (ord(ch) - 0xAC00) % 28
        return word + ("으로" if jong not in (0, 8) else "로")
    return word + "로"


def fetch_listings(path: str | None) -> dict:
    """공개 API(또는 파일)에서 건물주 매물을 읽는다. 실패도 결과로 돌려준다 — 0 과 「못 읽음」을 가르기 위해."""
    at = datetime.now(KST)
    if path:
        d = json.loads(Path(path).read_text(encoding="utf-8"))
        return {"status": "file", "code": None, "detail": f"파일에서 읽음: {Path(path).name}", "items": d.get("items") or [], "at": at}
    cafile = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if Path("/root/.ccr/ca-bundle.crt").exists() else None)
    ctx = ssl.create_default_context(cafile=cafile)
    req = urllib.request.Request(API, headers={"Accept": "application/json", "User-Agent": "placeos-vacancy-report/1"})
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
            d = json.loads(r.read().decode("utf-8"))
            return {"status": "ok", "code": r.status, "detail": "", "items": d.get("items") or [], "at": at}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            detail = json.loads(body).get("detail")
        except ValueError:
            detail = body[:200]
        return {"status": "not_ready" if e.code == 503 else "error", "code": e.code, "detail": str(detail), "items": [], "at": at}
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return {"status": "error", "code": None, "detail": f"연결 실패: {e}", "items": [], "at": at}


def gold_floor_index(hub_ids: list[str]) -> tuple[dict, set]:
    """(건물 ID, 층) → 확신도(confirmed/probable). 확인 빈 층만 분류에 있으므로 추정 층은 여기서 따로 본다."""
    idx, bld = {}, set()
    for h in hub_ids:
        p = B.PLACEOS / "data" / "gold" / h / "vacant_floor_units.json"
        for u in (json.loads(p.read_text(encoding="utf-8")).get("units") or []):
            idx[(u.get("building_id"), u.get("floor"))] = u.get("certainty")
            bld.add(u.get("building_id"))
    return idx, bld


def build(dest: Path, listings_path: str | None) -> None:
    rows = json.loads((B.OUT / "rows.json").read_text(encoding="utf-8"))
    hubs = json.loads((B.OUT / "hubs.json").read_text(encoding="utf-8"))
    uci = json.loads((B.PLACEOS / "data/gold/page_use_check_inputs.json").read_text(encoding="utf-8"))
    rates = json.loads((B.PLACEOS / "data/gold/platform_posting_cost_rates.json").read_text(encoding="utf-8"))["tiers"]
    floor_factor = json.loads((B.PLACEOS / "data/gold/platform_posting_inputs.json").read_text(encoding="utf-8")).get("floor_factor") or {}
    ox = {t: rates[t]["opex_rate_ex_rent"] for t in B.TI}
    kp = {t: rates[t]["profit_rate"] for t in B.TI}

    hub_ids, enc, purps_l, zone_l, was_l, _ = B.encode_rows(rows, hubs, uci, ox)
    gold_idx, gold_bld = gold_floor_index(hub_ids)
    by_key = defaultdict(list)                       # (건물 ID, 층) → rows 번호
    for i, r in enumerate(rows):
        by_key[(r["u"].get("building_id"), r["u"].get("floor"))].append(i)

    res = fetch_listings(listings_path)
    owner, groups, group_of_row = [], [], {}
    for it in res["items"]:
        o = {k: it.get(k) for k in KEEP}
        key = (o.get("building_id"), o.get("floor"))
        hit = by_key.get(key) or []
        a_hit = [i for i in hit if rows[i]["cls"] in A_CLS]
        if not o.get("building_id"):
            o["cat"], o["why"] = "O2", "건물 ID 없이 주소만 있는 매물 — 빈 층 목록과 잇지 못함"
        elif a_hit:
            o["cat"], o["why"] = "O1", f"창업 가능 분류의 같은 층({B.CL_NAME[B.CLS.index(rows[a_hit[0]]['cls'])]})"
        elif hit:
            o["cat"], o["why"] = "O2", f"같은 층이 {ro('「' + B.CL_NAME[B.CLS.index(rows[hit[0]]['cls'])] + '」')} 분류됨"
        elif gold_idx.get(key) == "probable":
            o["cat"], o["why"] = "O2", "PlaceOS 추정(probable) 빈 층과 같은 층 — 이번 분류(확인 빈 층) 밖"
        elif (o.get("floor") or 0) <= 0:
            o["cat"], o["why"] = "O2", "지하층 매물 — 빈 층 목록은 지상층만 다룸"
        elif o.get("building_id") in gold_bld:
            o["cat"], o["why"] = "O2", "같은 건물의 다른 층이 빈 층 목록에 있음 — 이 층은 PlaceOS가 비었다고 보지 않던 층"
        else:
            o["cat"], o["why"] = "O2", "PlaceOS 빈 층 목록에 없는 건물·층 — 건물주가 새로 알려 준 공실"
        oi = len(owner)
        owner.append(o)
        if a_hit:
            ri = a_hit[0]
            if ri not in group_of_row:
                group_of_row[ri] = len(groups)
                groups.append([])
            groups[group_of_row[ri]].append(oi)

    # 창업 가능 층(A1·A2)만 싣는다. r[30] = 같은 층 건물주 매물 묶음 번호(-1 = 없음)
    a_idx = [i for i, r in enumerate(rows) if r["cls"] in A_CLS]
    out_rows = [enc[i] + [group_of_row.get(i, -1)] for i in a_idx]
    n = len(a_idx)
    uniq_a = len({(rows[i]["u"]["building_id"], rows[i]["u"]["floor"]) for i in a_idx})
    c_a1 = sum(1 for i in a_idx if rows[i]["cls"] == "A1")
    c_a2 = n - c_a1
    o1_floors = sum(1 for i in a_idx if i in group_of_row)
    o1_list = sum(1 for o in owner if o["cat"] == "O1")
    o2_list = sum(1 for o in owner if o["cat"] == "O2")
    d_floors = n - o1_floors
    d_a1 = sum(1 for i in a_idx if rows[i]["cls"] == "A1" and i not in group_of_row)
    d_a2 = d_floors - d_a1

    # ── 상권 표 ──
    hub_meta, hub_rows = [], []
    own_by_hub = Counter(o.get("district_id") for o in owner)
    for hi, h in enumerate(hub_ids):
        ri = [i for i in a_idx if rows[i]["hub"] == h]
        a1 = sum(1 for i in ri if rows[i]["cls"] == "A1")
        o1 = sum(1 for i in ri if i in group_of_row)
        # 구는 상권 전체 빈 층으로 정한다(앞 보고서와 같게) — 창업 가능 층만 세면 경계 상권이 옆 구로 찍힌다(가로수길 → 서초구)
        allr = [r for r in rows if r["hub"] == h]
        gu = B.GU.get(Counter(r["u"]["pnu"][:5] for r in allr).most_common(1)[0][0], "") if allr else ""
        hub_meta.append([h, hubs[h]["name"], gu, hubs[h].get("rent_m2"), [a1, len(ri) - a1, 0, 0], len(ri)])
        if not ri and not own_by_hub.get(h):
            continue
        link = f"https://placeos.co.kr/#/explore?track=page&district={h}"
        hub_rows.append(
            f'<tr data-name="{E(hubs[h]["name"])}" data-total="{len(ri)}" data-c0="{a1}" data-c1="{len(ri) - a1}" '
            f'data-o1="{o1}" data-own="{own_by_hub.get(h, 0)}" data-d="{len(ri) - o1}">'
            f'<td class="hub-name"><b><a href="{link}" target="_blank" rel="noopener">{E(hubs[h]["name"])}</a></b><span>{E(gu)}</span></td>'
            f'<td class="r num">{B.f(len(ri))}</td><td class="r num">{B.f(a1)}</td><td class="r num">{B.f(len(ri) - a1)}</td>'
            f'<td class="r num">{B.f(o1)}</td><td class="r num">{B.f(own_by_hub.get(h, 0))}</td><td class="r num">{B.f(len(ri) - o1)}</td></tr>')

    # ── 건물주 매물 목록(정적) ──
    if owner:
        cards = []
        for o in sorted(owner, key=lambda x: (x["cat"], x.get("district_id") or "", x.get("floor") or 0)):
            hub_name = hubs.get(o.get("district_id") or "", {}).get("name", o.get("district_id") or "상권 미상")
            terms = " · ".join(x for x in [
                f"{o['floor']}층" if o.get("floor") else "", f"호실 {o['unit_label']}" if o.get("unit_label") else "",
                f"{o['area_m2']:,}㎡" if o.get("area_m2") else "", o.get("deal_label") or "",
                f"보증금 {o['deposit_manwon']:,}만원" if o.get("deposit_manwon") is not None else "",
                f"월세 {o['monthly_rent_manwon']:,}만원" if o.get("monthly_rent_manwon") is not None else "",
                f"관리비 {o['maintenance_manwon']:,}만원" if o.get("maintenance_manwon") else "",
                f"입주 가능 {o['available_from']}" if o.get("available_from") else ""] if x)
            tag = "창업 가능 층과 겹침" if o["cat"] == "O1" else "이번 분류 밖"
            cards.append(
                f'<li class="card ocard"><div class="ohead"><span class="badge src own"><i class="sw" aria-hidden="true">⌂</i>건물주 직접 등록</span>'
                f'<span class="tag">{tag}</span></div><b>{E(o.get("title") or "(제목 없음)")}</b>'
                f'<p class="muted">{E(hub_name)} · {E(o.get("address") or "")}</p><p>{E(terms)}</p><p class="muted">{E(o["why"])}</p>'
                f'<a href="https://placeos.co.kr/#/listing/{E(o["id"])}" target="_blank" rel="noopener">PlaceOS에서 매물 보기</a></li>')
        owner_html = f'<ol class="olist">{"".join(cards)}</ol>'
    else:
        owner_html = ('<p class="empty">아직 없습니다. 위 「지금 상태」대로 공개 API 가 매물을 돌려주지 않았습니다. '
                      '건물주 매물이 생긴 뒤 이 보고서를 다시 만들면 여기에 매물마다 조건(층 · 호실 · 면적 · 보증금 · 월세)과 '
                      '「창업 가능 층과 겹침 / 이번 분류 밖」이 붙습니다.</p>')

    if res["status"] == "not_ready":
        empty_note = "건물주가 직접 올린 공실이 아직 없습니다 — 직거래 데이터베이스 표가 없어 공개 API 가 503 을 돌려줍니다(위 「지금 상태」)."
    elif res["status"] == "error":
        empty_note = "건물주 매물을 읽지 못해 이 거르기는 비어 있습니다(위 「지금 상태」)."
    elif not owner:
        empty_note = "건물주가 직접 올린 확인 매물(게시 중)이 아직 없습니다 — 공개 API 가 0건을 돌려줍니다(위 「지금 상태」)."
    elif not o1_floors:
        empty_note = f"창업 가능 층과 겹치는 건물주 매물이 없습니다 — 건물주 매물 {B.f(len(owner))}건은 모두 이번 분류 밖입니다(위 「건물주가 올린 매물」)."
    else:
        empty_note = ""
    res["detail"] = (res["detail"] or "").rstrip(".")
    at = res["at"]
    at_txt = at.strftime("%Y-%m-%d %H:%M") + " KST"
    code_txt = f"HTTP {res['code']}" if res["code"] else ("파일" if res["status"] == "file" else "응답 없음")
    total_own = len(owner)
    if res["status"] == "not_ready":
        status_h = "아직 0건 — 건물주가 공실을 올릴 수 있는 길이 아직 열리지 않았습니다"
        status_p = (f"PlaceOS 직거래(건물주 매물 · 입점 희망서) 기능은 2026-11-22 배포됐지만, 매물을 담을 데이터베이스 표가 아직 없어 "
                    f"공개 API 가 {code_txt} 「{E(res['detail'])}」을 돌려줍니다({at_txt} 조회). "
                    f"그래서 이 0 은 건물주가 올리지 않았다는 뜻이 아니라 <b>올릴 수 없는 상태</b>라는 뜻입니다. "
                    f"창업 가능 층 {B.f(n)}개는 모두 PlaceOS 가 자료로 찾은 빈 층입니다.")
    elif res["status"] == "error":
        status_h = "건물주 매물을 읽지 못했습니다"
        status_p = f"공개 API 조회가 실패했습니다({code_txt} · {E(res['detail'])} · {at_txt}). 0 으로 세지 않고 「모름」으로 둡니다."
    elif res["status"] == "ok" and not total_own:
        status_h = "0건 — 직거래는 열렸지만 아직 게시된 건물주 확인 매물이 없습니다"
        status_p = (f"공개 API 가 {code_txt} · 0건을 돌려줍니다({at_txt} 조회). 2026-11-23 에는 503(직거래 데이터베이스 표 없음)이었는데 "
                    f"그 사이 표가 준비됐습니다. 그래서 이 0 은 「아직 아무 건물주도 게시하지 않았다」는 뜻입니다. 건물주가 등록 → 소유자 확인 → 게시하면 "
                    f"이 보고서를 다시 만들어(<code>owner_split.py</code>) 채웁니다. 창업 가능 층 {B.f(n)}개는 지금 모두 PlaceOS 가 자료로 찾은 빈 층입니다.")
    else:
        status_h = f"건물주 직접 등록 {B.f(total_own)}건 — 창업 가능 층과 겹치는 층 {B.f(o1_floors)}개"
        status_p = (f"{'파일에서 읽은 매물입니다(오프라인 점검용). ' if res['status'] == 'file' else ''}"
                    f"공개 API 는 게시 중 · 소유자 확인 매물만 돌려줍니다({code_txt} · {at_txt}).")
    steps = ("<ol class=\"steps\"><li>PlaceOS 프로덕션 데이터베이스(Neon)에 직거래 표 마이그레이션 3단계 적용 — 프로덕션 DB를 바꾸는 일이라 운영자가 직접 정해서 수동으로 적용합니다</li>"
             "<li>건물주가 PlaceOS 「건물주이신가요? 빈 층 정보와 배치도 사진 올리기」에서 층 · 호실 단위로 공실 등록</li>"
             "<li>소유자 확인(관리자가 인터넷등기소로 대조) 뒤 게시 — 확인 전 매물은 공개되지 않습니다</li>"
             "<li>이 보고서를 다시 만들면(<code>owner_split.py</code>) 공개 API 에서 읽어 아래 구분이 채워집니다</li></ol>"
             if res["status"] == "not_ready" else "")
    status_html = (f'<div class="status"><div class="big num">{B.f(total_own) if res["status"] != "error" else "?"}<small style="font-size:14px;font-weight:600;color:var(--ink-3)"> 건</small></div>'
                   f'<div><h3>{status_h}</h3><p>{status_p}</p>{steps}</div></div>')

    tiles = (
        f'<div class="tiles t3">'
        f'<div class="tile"><div class="tile-h"><span class="badge src own" style="padding:0;border:0;background:none"><i class="sw" aria-hidden="true">⌂</i></span>건물주 직접 등록 · 창업 가능 층과 겹침</div>'
        f'<div class="tile-v">{B.f(o1_floors)}<small>개 층 · 매물 {B.f(o1_list)}건</small></div>'
        f'<div class="tile-s">창업 여력 있음·가능으로 분류된 층에 건물주가 같은 층을 직접 올린 경우. <b>실제 조건(월세 · 호실)</b>이 붙습니다.</div></div>'
        f'<div class="tile"><div class="tile-h"><span class="badge src own" style="padding:0;border:0;background:none"><i class="sw" aria-hidden="true">⌂</i></span>건물주 직접 등록 · 이번 분류 밖</div>'
        f'<div class="tile-v">{B.f(o2_list)}<small>건</small></div>'
        f'<div class="tile-s">조건부·어려움 층, 추정 빈 층, 지하층, PlaceOS가 비었다고 보지 않던 층에 올라온 매물.</div></div>'
        f'<div class="tile"><div class="tile-h"><span class="badge src data" style="padding:0;border:0;background:none"><i class="sw" aria-hidden="true">▦</i></span>자료로 찾은 빈 층(건물주 등록 없음)</div>'
        f'<div class="tile-v">{B.f(d_floors)}<small>개 층</small></div>'
        f'<div class="tile-s">{B.sw(0)} 여력 있음 {B.f(d_a1)} · {B.sw(1)} 가능·얇음 {B.f(d_a2)}. 건축물대장 · 상가정보 · 인허가 대조로 찾은 층이고 <b>건물주 확인 전</b>입니다.</div></div>'
        f'</div>')

    cats = (f'<ol class="rules">'
            f'<li><div class="rh"><span class="badge src own"><i class="sw" aria-hidden="true">⌂</i>건물주 직접 등록</span> · 창업 가능 층과 겹침 — {B.f(o1_floors)}개 층</div>'
            f'<ul><li>건물주 매물의 <b>건물 ID + 층</b>이 「창업 여력 있음」·「창업 가능 · 여력 얇음」 층과 같을 때. PlaceOS 앱이 3D 트윈 · 자리 상세에서 건물주 매물을 붙이는 키와 같습니다.</li>'
            f'<li>한 층에 호실 매물이 여럿이면 그 층에 모두 붙습니다. 등급은 R-ONE 추정 기준 그대로이고, 건물주가 적은 월세로 수지를 다시 봐야 합니다.</li></ul></li>'
            f'<li><div class="rh"><span class="badge src own"><i class="sw" aria-hidden="true">⌂</i>건물주 직접 등록</span> · 이번 분류 밖 — {B.f(o2_list)}건</div>'
            f'<ul><li>같은 층이 조건부·어려움으로 분류됨 · 추정(probable) 빈 층 · 지하층 · 같은 건물의 다른 층만 목록에 있음 · 빈 층 목록에 없는 건물 · 건물 ID 없이 주소만 있음 — 매물마다 이유를 적습니다.</li></ul></li>'
            f'<li><div class="rh"><span class="badge src data"><i class="sw" aria-hidden="true">▦</i>자료로 찾은 빈 층</span> — {B.f(d_floors)}개 층</div>'
            f'<ul><li>창업 가능 층 중 건물주 매물이 붙지 않은 층. 비었는지·얼마인지는 건물주 확인 전입니다.</li></ul></li></ol>')

    payload = {"meta": {"today": date.today().isoformat(), "classCounts": [c_a1, c_a2, 0, 0], "srcCounts": [o1_floors, d_floors], "ownerEmptyNote": empty_note,
                        "reasonCounts": {k: sum(1 for i in a_idx if k in rows[i]["reasons"]) for k in B.REASONS},
                        "kosisProfit": kp, "floorFactor": floor_factor},
               "hubs": hub_meta, "purps": purps_l, "zones": zone_l, "was": was_l, "rows": out_rows,
               "owner": owner, "ownerGroups": groups,
               "reasons": B.REASONS, "ind": B.IND, "tiers": B.TI, "cls": B.CLS}
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    basis = uci.get("basis") or {}
    rep = {
        "<!--TODAY-->": date.today().isoformat(), "<!--N-->": B.f(n), "<!--A1-->": B.f(c_a1), "<!--A2-->": B.f(c_a2),
        "<!--ALLN-->": B.f(len(rows)), "<!--UNIQA-->": B.f(uniq_a), "<!--AT-->": E(at_txt), "<!--CODE-->": E(code_txt), "<!--EUM-->": E(basis.get("eum_fetched", "")),
        "<!--STATUS-->": status_html, "<!--TILES-->": tiles, "<!--CATS-->": cats, "<!--HUBROWS-->": "\n".join(hub_rows),
        "<!--OWNERS-->": owner_html,
    }
    html = B.inline_assets((B.HERE / "template_owner.html").read_text(encoding="utf-8"))
    for k, v in rep.items():
        html = html.replace(k, v)
    html = html.replace("/*__DATA__*/", data)
    assert "<!--" not in html.replace("<!doctype", ""), "치환 안 된 자리표시자가 있다"
    dest.write_text(html, encoding="utf-8")
    print("wrote", dest, f"{dest.stat().st_size / 1e6:.2f} MB", "api", res["status"], res["code"],
          f"owner {total_own} (O1 floors {o1_floors}, O2 {o2_list}) · data floors {d_floors} of {n}")


if __name__ == "__main__":
    args = sys.argv[1:]
    lp = None
    if "--listings" in args:
        k = args.index("--listings")
        lp = args[k + 1]
        del args[k:k + 2]
    build(Path(args[0]), lp)
