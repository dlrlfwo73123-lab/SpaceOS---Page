# PlaceOS 확인 공실 — 창업 가능성 분류

서울 81개 서빙 상권의 **확인(confirmed) 빈 층**을 네 등급으로 나누고 층마다 이유를 적은 보고서를 만든다.
결과물: [`mockups/placeos-additions/PlaceOS 공실 창업 가능성 분류.html`](../../mockups/placeos-additions/PlaceOS%20%EA%B3%B5%EC%8B%A4%20%EC%B0%BD%EC%97%85%20%EA%B0%80%EB%8A%A5%EC%84%B1%20%EB%B6%84%EB%A5%98.html) (한 파일 · 오프라인으로 열림)

| 등급 | 뜻 |
|---|---|
| 창업 여력 있음 | 법·용도로 막히지 않고, 1층 기준 순익률이 서울 같은 가격대 평균 영업이익률(KOSIS 2024) 이상인 가격대가 있음 |
| 창업 가능 · 여력 얇음 | 법·용도로 막히지 않고 흑자지만 모두 서울 평균 미만 |
| 조건부 · 확인 필요 | 막는 사유는 없지만 행위제한 미수집 · 상층 임대료로만 흑자 · 300㎡ 이상 · 건물 전체 공실 · 판매시설 층 중 하나 |
| 창업 어려움 | 일반 창업 6업종 모두 용도변경 필요 · 공공·기반 시설 · 용도지역 금지 · 1층인데 세 가격대 모두 적자 중 하나 |

허가 판정이 아니다. 건축물대장·토지이음 기재와 PlaceOS 계산으로 본 1차 분류다.

## 무엇을 그대로 쓰나 (새 계수를 만들지 않는다)

PlaceOS 저장소(`seoghyeonbag36-max/placeos`)의 Gold 산출물과 서비스 코드를 **import 해서** 돌린다.

- 빈 층: `data/gold/<상권>/vacant_floor_units.json` 의 `certainty == "confirmed"`
- 법·용도: `apps/backend/app/services/use_check.check` — 대장 층 용도 × 토지이음 행위제한(입점 점검과 같은 규칙)
- 수지: `apps/backend/app/services/districts.tier_scenarios` + `posting_inputs.resolve_units` — Posting 3-Tier 그대로
  (`posting._resolve_requested_unit` 는 `settings` import 때문에 그 몇 줄만 옮겨 썼다)
- 기준선: `data/gold/platform_posting_cost_rates.json` 의 tier 별 `profit_rate`(KOSIS 서비스업조사 서울 2024)

Gold 층 대장에는 **용도코드가 없어** 용도명으로 건축법 시행령 별표1 호를 근사한다(`classify.py` 의 `FIXED`·`BY_AREA`).
같은 규칙을 실시간 대장 용도코드로 돌린 집계(`docs/finding-eum-landuse-2026-11-15.md` §4)와 업종·판정별 비율 차이는 최대 1.5%p 다.

## 실행

```bash
# placeos 체크아웃과 그 백엔드 의존성 중 pydantic · pydantic-settings 만 있으면 된다(FastAPI 불필요)
python -m venv .venv && .venv/bin/pip install pydantic pydantic-settings
PLACEOS_ROOT=/path/to/placeos .venv/bin/python classify.py          # → out/rows.json · hubs.json · validation.json (5초 안팎)
PLACEOS_ROOT=/path/to/placeos .venv/bin/python build_report.py "../../mockups/placeos-additions/PlaceOS 공실 창업 가능성 분류.html"
```

2026-11-23 · placeos `main` 9fb2a2c 기준으로 돌리면 전체 분류 보고서는 지금 파일과 바이트 단위로 같게 나온다(날짜가 바뀌면 생성일만 달라진다). 건물주 구분 보고서는 조회 시각이 들어가 매번 조금 달라진다.

## 건물주 직접 등록 구분 (owner_split.py)

창업 가능 층(여력 있음 · 가능)을 **건물주가 PlaceOS 직거래로 직접 올린 공실**과 **자료로 찾은 빈 층**으로 나눈다.
결과물: [`mockups/placeos-additions/PlaceOS 창업 가능 공실 건물주 등록 구분.html`](../../mockups/placeos-additions/PlaceOS%20%EC%B0%BD%EC%97%85%20%EA%B0%80%EB%8A%A5%20%EA%B3%B5%EC%8B%A4%20%EA%B1%B4%EB%AC%BC%EC%A3%BC%20%EB%93%B1%EB%A1%9D%20%EA%B5%AC%EB%B6%84.html)

- 건물주 매물은 만들 때 공개 API `GET https://placeos.co.kr/api/v1/direct/listings` 에서 읽는다(게시 중 + 소유자 확인 매물만 온다 · 소유자 정보는 오지 않는다).
- 매칭 키는 앱과 같은 **건물 ID + 층**. 창업 가능 층과 겹치면 「건물주 직접 등록」, 아니면 매물마다 「이번 분류 밖」 이유(조건부·어려움 층 · 추정 층 · 지하 · 다른 층 · 목록에 없는 건물 · 건물 ID 없음)를 적는다.
- API 가 503(직거래 DB 표 없음)이면 0 이 아니라 「올릴 수 없는 상태」로, 실패하면 「모름」으로 적는다.
- 2026-11-23 에는 API 503(직거래 표 없음)이었고, 2026-11-25 에는 **200 · 0건**(표는 준비됨 · 게시된 확인 매물 없음) — 창업 가능 6,243층(서로 다른 층 5,773) 모두 「자료로 찾은 빈 층」.

```bash
PLACEOS_ROOT=/path/to/placeos .venv/bin/python owner_split.py "../../mockups/placeos-additions/PlaceOS 창업 가능 공실 건물주 등록 구분.html"
# 오프라인 점검: 같은 모양({"items": [...]})의 파일로 — 보고서에 「파일에서 읽음」으로 적힌다
PLACEOS_ROOT=/path/to/placeos .venv/bin/python owner_split.py /tmp/test.html --listings 점검용.json
```

## 파일

- `classify.py` — 층마다 use_check(6업종) · 3-Tier(1층 기준 · 이 층 기준)를 돌리고 등급과 이유 코드를 낸다
- `build_report.py` — 요약 · 기준 · 이유 · 상권 표 · 검증은 정적 HTML 로, 층별 목록은 데이터(JSON)로 `template.html` 에 넣는다
- `template.html` — 전체 분류 보고서 틀. 자바스크립트가 꺼져도 요약 · 상권 표는 읽힌다
- `owner_split.py` · `template_owner.html` — 건물주 직접 등록 구분 보고서
- `report.css` · `report_lib.js` — 두 보고서가 함께 쓰는 디자인 · 층별 목록(거르기 · 이유 · CSV) — 만들 때 HTML 안에 넣는다
