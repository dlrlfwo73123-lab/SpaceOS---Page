# P5 – 트윈 데이터 → 실물 출력 모형 (색 파트 3MF)

> "P5"는 앞서 정리한 계획에 없던 단계라, 원래 PDF의 출력 작업(3~6단계)과 P1~P4 데이터를 잇는 항목으로 정했다: 트윈에 쓰는 바닥·건물·층 certainty 색을 1:1,000(또는 지정 축척) 출력용 모형으로 내보내고 검수한다.

## 사용법
```
py -3.11 -m venv .venv-print3d
.\.venv-print3d\Scripts\python.exe -m pip install -r tools/print3d/requirements.txt
# 장비 값으로 profile 을 먼저 만든다(예: tools/print3d/profiles/example_profile.json 복사 후 수정). profile 이 없으면 만들지 않는다.
.\.venv-print3d\Scripts\python.exe tools/print3d/tile_model.py ^
  --osm data/raw/osm/11200 --center 37.5446,127.0557 --half 100 --scale 1000 ^
  --profile my_profile.json --floors floors.json --out out/seongdong-seongsu
.\.venv-print3d\Scripts\python.exe tools/print3d/preview_model.py out/seongdong-seongsu out/preview.png
```
- `--osm`: Overpass JSON 한 개 또는 `fetch_ground.py`가 캐시한 조각 폴더(`data/raw/osm/<구코드>`).
- `--floors`: 선택 건물의 `/buildings/{id}/floors` 응답 JSON. 중심에서 `--select-radius`(기본 15m) 안의 가장 가까운 건물을 층 슬래브(확정=빨강, 확정 아님/미상=주황, 그 외=회색)로 분해한다. **certainty가 없는 공실은 확정으로 올리지 않는다**(트윈과 같은 규칙).
- 1:1,000에서 `--half 100`(200m 사각)은 200mm 판이다. 베드보다 크면 `exceeds_bed`로 실패한다(`--scale`을 키우거나 `--half`를 줄일 것).

## 산출물 (`--out`)
| 파일 | 내용 |
|---|---|
| `model.3mf` | 파트별 객체 + 색(basematerials), 단위 mm. 슬라이서에서 파트별 필라멘트 지정용 |
| `parts/*.stl`, `model_all.stl` | 파트별 STL, 합친 STL(단색 미리보기·단색 출력용; 파트가 겹치지 않아 합쳐도 체적이 중복되지 않음) |
| `report.json` | 파트별 삼각형·몸체·체적, 제외 건물과 사유, 얇아서 버린 조각 수, 선택 건물 정보, 검증 결과 |

## 파트와 두께 (예시 값, 장비에 맞춰 조정)
base(판 2.0mm) / carriageway(0.2mm) / sidewalk(0.4mm) / crosswalk(0.4mm) / buildings_measured / buildings_estimated(높이 추정) / floors_confirmed / floors_probable / floors_other. 모든 파트는 판 위(z=2.0mm)에서 시작하고 평면상 서로 겹치지 않는다(보도·차도·횡단보도는 서로를, 모두 건물 점유 영역을 뺀다).

## 검수 (자동)
- 장비 한계(프린터·베드·노즐·재료·최소 벽 두께) 없으면 실행 거부.
- 몸체마다 닫힌 체적·양의 체적, 판 위에 붙어 있음, 전체가 베드 안.
- 최소 벽 두께보다 얇은 조각은 제거하고 건물은 `below_min_wall`/`below_min_height`/`exceeds_bed_z`로 제외·보고.
- 테스트 10개(`tests/test_tile_model.py`): 장비 필수, 검증 통과, 축척별 판 크기와 건물 높이(mm = m×1000/축척), 파트 비겹침, certainty 미승격, 베드 초과 보고, 얇은 조각 제거, 3MF 왕복(이름·삼각형 수·색·범위), CLI가 profile 없이 거부.
- 개발 중 검증이 실제 결함을 잡았다: 일부 보도 조각의 체적이 0/음수(폴리곤 방향·퇴화 삼각형) → 방향 통일과 0.1mm 열림 연산으로 해결.

## 한계 (정직하게)
- 슬라이서·프린터로 실제 출력하지 못했다. 3MF를 PrusaSlicer/Orca 등에서 열어 보지 못했으므로 **슬라이서 호환은 미검증**이다(왕복은 자체 파서로만 확인). 색 파트를 다른 장비에 그대로 호환된다고 주장하지 않는다.
- 0.2~0.4mm 두께 파트는 노즐/층 높이에 따라 출력되지 않을 수 있다. 장비의 층 높이에 맞게 `ROAD_MM/SIDE_MM/CROSS_MM`을 조정해야 한다.
- 합성 샘플로만 만들어 봤다. 실제 서울 건물 수·복잡도에서는 건물 수백 동·수만 삼각형이 되어 파일 크기와 처리 시간이 늘 수 있다(3MF는 텍스트 XML이라 큼).
- 건물 높이의 상당수는 추정이다(`buildings_estimated`로 분리했지만 실물 모형에서 높이를 실측처럼 보이게 할 수 있음). 모형 설명에 "높이 일부 추정"을 표기해야 한다.
- 선택 건물의 층 수·공실 상태는 현재 placeholder API 값이다.
