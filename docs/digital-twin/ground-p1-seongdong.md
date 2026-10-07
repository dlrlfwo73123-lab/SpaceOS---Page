# P1 – 성동구 바닥(차도·보도·횡단보도) 레이어

## 구성
| 파일 | 역할 |
|---|---|
| `tools/ground/fetch_ground.py` | OSM(Overpass) 내려받기 → 바닥 면 생성 → 0.01° 타일(삼각형 메시 JSON) 저장 |
| `tools/ground/osm_ground.py` | 폭 규칙: `width` 태그 > `lanes`×3.0m > 도로 등급 기본값. 보도 2.0m, 횡단보도 3.0m. 태그가 아닌 값은 `estimated=true` |
| `tools/ground/tiles.py` | 타일 분할·삼각분할·저장 |
| `apps/frontend/src/lib/groundTiles.ts`, `components/GroundLayer.tsx` | 타일 로드·렌더. 성동구(11200)만 지원 |
| `apps/frontend/public/data/ground/_sample/` | **합성 샘플**(실데이터 아님). `?ground=sample` 로만 로드 |

## 실데이터 생성 (인터넷 되는 PC, 저장소 루트)
```
py -3.11 -m venv .venv-print3d
.\.venv-print3d\Scripts\python.exe -m pip install -r tools/ground/requirements.txt
.\.venv-print3d\Scripts\python.exe tools/ground/fetch_ground.py --gu seongdong
```
- 결과: `apps/frontend/public/data/ground/seongdong/` (index.json + 타일). 원천 JSON은 `data/raw/osm/`(커밋 안 됨)에 저장되고 SHA-256이 index.json에 기록된다.
- Overpass 내려받기가 오래 걸리거나 실패하면 받은 JSON으로: `--osm-json <파일>`.
- 타일이 없으면 트윈은 기존 격자 도로를 그대로 쓴다(회귀 없음).

## 데이터 표기
OSM 출처(ⓒ OpenStreetMap contributors, ODbL)를 화면 범례에 표시한다. 폭이 추정된 면은 반투명으로 그리고 추정 면적 비율을 표시한다.

## 알려진 한계
- 실데이터로는 아직 생성하지 못했다(이 환경에서 Overpass 접속 불가). 성능·용량·OSM 품질은 실제 생성 후 확인해야 한다.
- 성동구 전체 타일을 한 번에 받는 쿼리는 용량이 클 수 있다. 문제가 있으면 bbox를 나눠 받는 방식으로 바꾼다.
- OSM에 보도가 없는 길은 `sidewalk` 태그가 있을 때만 보도가 생긴다. 건물 외곽·층 슬래브 색·구 경계는 P2.
- 주변 건물은 여전히 절차 생성 가짜 데이터다(`BuildingTwin.tsx`의 "데모 데이터").
