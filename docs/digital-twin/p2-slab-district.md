# P2 – 층 슬래브 색 · 구 경계 · 공실률 표시

## 변경 요약
| 영역 | 내용 |
|---|---|
| API(호환 유지) | `GET /buildings/{id}/floors` 응답에 선택 필드 `certainty` 추가: 공실 층만 `confirmed`/`probable`, 그 외 `null`. **현재 값은 건물 ID에서 만든 placeholder**(Gold 연동 전). 기존 필드는 그대로 |
| 층 슬래브 색 | 공실 confirmed=빨강, probable=주황, 그 외 층=회색(반투명 = 층고 3.5m 가정). `certainty`가 없는 공실은 **확정으로 승격하지 않고 probable 색**으로 그리며 층 목록에 "공실·미상"으로 표시 |
| 구 경계 | `seoulBoundaries.ts`의 구 경계를 바닥 리본으로 표시(반경 1km 안에 있을 때). 색은 구 공실률 구간색. 범례에 "○○구 경계까지 약 N m" |
| 구 공실률 | 헤더에 "○○구 공실률 X% (낮음/보통/높음 · 데모)". 실데이터(`gu-stats.json`, is_demo=false)가 있으면 그것을, 없으면 기존 데모 지표를 사용. 구간: 15%↑ 높음(빨강), 12%↑ 보통(주황), 그 외 낮음(초록) – 기존 StatsPanel 기준과 동일, 표시값(소수 1자리) 기준 판정 |
| 공실 데칼 | 주변 공실 위치마다 바닥에 주황 반투명 원(반경 55m)을 겹쳐 그려 공실이 몰린 곳이 진하게 보임 |

## 파일
`apps/backend/app/data/buildings.py`, `apps/frontend/src/lib/{api,guBoundary}.ts`, `components/{BuildingTwin,DistrictOverlay}.tsx`

## 한계
- 층 `certainty`, 주변 공실 위치, 공실률(데모 시)은 모두 placeholder다. 도면 5의 "높이 추정" 반투명은 실제 층고 정보가 없어 모든 비공실 층에 적용했다.
- 구 경계는 2013년 통계청 경계 기반(저장소 기존 데이터)이며 정밀 경계가 아니다. 구 안/밖 영역 색 구분은 아직 없다.
- 구 단위 공실률의 변동(동 분할 난수)이 있어 데모 값은 ±수 % 흔들릴 수 있다.
- 지도(네이버) 클릭 → 트윈 전체 흐름은 이 환경에서 검증하지 못했다(컴포넌트 직접 마운트로 검증).
