# PlaceOS 3D 출력 PoC – 재현·인수인계

보고서(2026-10-03, PlaceOS 3D 프린팅 공동 작업 보고서)의 0~4, 8단계를 `tools/print3d/`로 구현했다.
5~7단계는 보고서 지시대로 **계획·제안 문서만** 작성했다(`plan-5-6-7.md`).

## 0단계 환경 점검 결과 (이 저장소 기준)
- 저장소: `dlrlfwo73123-lab/SpaceOS---Page`. 보고서가 조사한 `seoghyeonbag36-max/spaceos`와 **다른 저장소**다.
- 이 저장소에는 `data/gold/**`(가로수길 GeoJSON), `AGENTS.md`, `pppp_status.py`가 **없다**. 따라서 실제 Gold 데이터 감사·모델링은 하지 못했다.
- 이미 있는 것: `apps/frontend/public/models/demo-building.glb`, `BuildingTwin.tsx`(3D 트윈), `/buildings/{id}/model` API. 보고서의 "Three.js 없음" 전제와 다르다. 이번 작업은 앱 파일을 수정하지 않았다.
- 층 정보(`apps/backend/app/data/buildings.py`)는 건물 ID로 만든 **결정적 가짜 데이터**라 입력으로 쓰지 않았다.
- Blender·슬라이서·프린터는 이 컨테이너에 없다. 메시 점검은 Python(trimesh)으로 했다.

## 재현 (새 PC, PowerShell)
```
py -3.11 -m venv .venv-print3d
.\.venv-print3d\Scripts\python.exe -m pip install -r tools/print3d/requirements.txt
.\.venv-print3d\Scripts\python.exe -m pytest tools/print3d/tests -q
```
기대 결과: `11 passed`.

## 구성
| 파일 | 역할(보고서 단계) |
|---|---|
| `manifest.py` | 커밋·입력 SHA-256·도구 버전 기록 (1) |
| `audit.py` | PNU 중복·높이 0·잘못된 도형·certainty 감사. 값을 채우지 않음 (1) |
| `coordinates.py` | WGS84 → EPSG:5186(m) → 축척 mm. 축 순서 (lon,lat) 고정 (2) |
| `massing.py` | 외곽선 압출 블록, 축척 막대, certainty 그대로 보존 (2) |
| `print_profile.py`, `mesh_checks.py`, `export_mesh.py` | 장비 한계 필수, 닫힌 체적·최소 두께·베드 검사, STL 내보내기와 재로딩 검증 (3) |
| `layout.py` | 개념 배치. 항상 `proposed`, 실측 주장 불가 (4) |
| `evidence.py` | 실측 주장에 증거 필수, 전달물 비밀 파일 스캔 (5, 8) |
| `fixtures/synthetic_blocks.geojson` | **합성 시드 fixture**(실데이터 아님, 6개 건물, 일부러 결함 포함) |

## 테스트 (보고서 제안 11개 전부 구현, 통과)
manifest, ambiguous_pnu, missing_height, crs/scale, certainty 보존, watertight, print_profile, concept_layout, measured 증거, roundtrip bounds, 비밀 파일 없음.

## 미검증·남은 판단 (검수 시 반드시 읽을 것)
1. 실제 Gold 데이터로 돌려 보지 않았다. 필드명(`pnu`, `building_id`, `height_m`, `floors`, `floor_certainty`)은 보고서 설명을 바탕으로 한 **가정**이다. 실제 스키마와 맞는지 확인해야 한다.
2. 실제 프린터·슬라이서·시험 출력은 하지 않았다(6단계). 프린터 프로필 값은 테스트용 예시다.
3. 최소 두께 검사는 외곽선 침식 기반의 근사다. 벽 두께를 정밀하게 보장하지 않는다.
4. 3MF 내보내기(색 파트)는 구현하지 않았다. STL만 지원한다.
5. 도면·LiDAR 실측(5단계)과 앱 연동(7단계)은 계획만 있다.
6. 인수인계 검수 담당자가 판단할 것: 대상 저장소 확정, Gold 데이터 공유 방식, 프린터 기준.

## 내 PC 적용 점검 (보고서 1~7장 기준)
- `tools/print3d/pc_setup_check.ps1`을 대상 저장소 루트에서 실행하면 `print3d-pc-check.md`(단계 1~7별 PASS/FAIL/WARN)가 생성된다. 읽기 전용이며 설치는 하지 않는다. Windows에서 실행해 보지 못했다.
- 보고서가 정한 1장 조건: 대상 `seoghyeonbag36-max/spaceos`, 소유자가 준 **전체 40자 SHA**로 `git switch --detach`, 작업 브랜치 `chore/3d-print-poc-worker`. 바탕화면 PDF·미커밋 파일·ignore 대상(`*.glb` 포함)은 clone으로 오지 않는다.
