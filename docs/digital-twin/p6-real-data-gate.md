# P6 – 실데이터 투입 준비 (실행기 · 검증기 · CI)

> "P6"도 앞서 정리한 계획에 없던 단계라 정했다: 지금까지 모든 성능·예산 판정이 "성동구 실데이터를 PC에서 한 번 생성해야 가능"에 막혀 있으므로, 그 한 번을 쉽고 판정 가능하게 만든다.

## 1. PC에서 한 줄 실행 (인터넷 필요)
```
py -3.11 -m venv .venv-print3d
.\.venv-print3d\Scripts\python.exe -m pip install -r tools/ground/requirements.txt
.\.venv-print3d\Scripts\python.exe tools/ground/run_all.py --gu seongdong
```
→ 생성(`fetch_ground.py`) → 검증(`verify_ground_output.py`) → **`ground-run-report.md`** 한 파일. 이 파일 내용을 그대로 붙여 주면 판정할 수 있다.

종료 코드: **0** 통과 / **1** 타일 무결성 실패 / **2** 예산 초과 / **3** 생성 실패(Overpass 접속·제한).

| 결과 | 의미 | 다음 행동 |
|---|---|---|
| 0 | 스키마·범위 이상 없음, 예산 이내 | 앱에서 성동구 공실 선택 → 실제 바닥·건물 확인, 예산을 실측으로 확정 |
| 1 | 손상/비정상 타일(보고서에 오류 목록) | 보고서를 붙여 주면 원인 수정. 해당 구만 `--clean` 재생성 가능 |
| 2 | 무결성은 정상이나 전송량/삼각형 초과 | 단순화 허용오차·건물 표시 반경·타일 분할 조정 |
| 3 | 내려받기 실패 | 시간대를 바꾸거나 `--sleep` 증가. 받은 조각은 캐시되어 재실행 시 이어서 받음 |

## 2. 검증기가 보는 것 (`verify_ground_output.py`)
- index ↔ 파일 일치(누락=오류, 고아=경고), `v`/`tileDeg`/`meta` 필드, 타일 키와 내용 일치.
- 레이어: kind, `estimated`(bool), 길이(짝수/3의 배수), 삼각형 인덱스 범위, NaN·무한대, 서울 범위·타일 범위 이탈, 퇴화 삼각형 비율.
- 건물: 외곽 점 수·유한성, 높이 0 초과 400m 이하, `e`∈{0,1}, `l` 정수, 중심이 타일 안.
- 통계: 높이 추정 건물 비율, 바닥 폭 추정 면적 비율, 총 크기·삼각형·건물 수.
- **예산**: 모든 타일을 중심으로 열었을 때(반경 1km) 최악의 gzip 전송량(≤1.5MB)과 렌더 삼각형(바닥+600m 건물, ≤25만), 타일 하나 최대 gzip(≤400KB), 퇴화 삼각형 비율(≤1%).
- 한계: 프레임 속도는 측정하지 않는다(브라우저·GPU 필요). 예산 통과가 30fps를 보장하지 않는다.

## 3. CI (`.github/workflows/tools-ci.yml`)
`tools/**`, `apps/**` 변경 시: Python 3.11에서 print3d·ground·backend 테스트(Deprecation 경고를 오류로), 합성 고밀도 예산(`perf_report.py --check`), 샘플 타일 검증 / Node 20에서 `tsc -b`, 압출 점검, 빌드. 외부 서버 접속 없음.
- 같은 단계를 이 세션에서 **Python 3.11 새 가상환경 + requirements만 설치**로 실행해 통과를 확인했다(69개). GitHub Actions 위에서 실제로 돌려 보지는 못했다(푸시 후 첫 실행 결과를 확인해야 함).

## 4. 이번에 같이 고친 것
- `shapely.ops.transform`(2.1에서 deprecated)을 `osm_ground.reproject` 하나로 모아 새 API로 교체, 요구 버전을 `shapely>=2.1`로 통일(print3d도 ground 모듈을 쓰므로).
- 테스트 중 검증기 테스트 하나가 실패했으나 원인은 제 테스트 입력 오류(타일 범위 안쪽 값)였고 검증기는 정상이었다.
