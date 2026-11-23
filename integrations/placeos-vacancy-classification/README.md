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

2026-11-23 · placeos `main` 9fb2a2c 기준으로 돌리면 지금 파일과 바이트 단위로 같게 나온다(날짜가 바뀌면 생성일만 달라진다).

## 파일

- `classify.py` — 층마다 use_check(6업종) · 3-Tier(1층 기준 · 이 층 기준)를 돌리고 등급과 이유 코드를 낸다
- `build_report.py` — 요약 · 기준 · 이유 · 상권 표 · 검증은 정적 HTML 로, 층별 목록은 데이터(JSON)로 `template.html` 에 넣는다
- `template.html` — 보고서 틀(CSS · 층별 목록 필터 · CSV 내려받기). 자바스크립트가 꺼져도 요약 · 상권 표는 읽힌다
