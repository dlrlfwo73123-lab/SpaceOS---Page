# P3 – 서울 25개 구 확장과 성능 기준

## 구조 변경
- 타일 저장소는 **서울 전체 한 벌**: `apps/frontend/public/data/ground/seoul/` (`index.json` + `{위도idx}_{경도idx}.json`, 0.01° 격자). 구 단위 폴더가 아니다(구 경계 근처 트윈이 이웃 구 바닥도 봐야 하므로).
- `tools/ground/gu_presets.json`: 25개 구의 코드·이름·slug·내려받기 bbox(구 경계 외접 + 0.01° 여유). `make_gu_presets.py`로 `seoul.ts`/`seoulBoundaries.ts`에서 재생성.
- `fetch_ground.py`
  - `--gu 성동구slug|구코드|all`, bbox를 `--chunk-deg`(기본 0.04°, 25개 구 합계 187조각) 단위로 나눠 Overpass에 요청, 요청 사이 `--sleep`(기본 3초).
  - 조각 응답은 `data/raw/osm/<구코드>/`에 캐시(커밋 안 됨). 중단 후 재실행하면 받은 조각은 건너뛴다. `--offline`은 캐시만으로 재가공.
  - 타일은 병합 저장(같은 키는 새 것으로 교체, 이웃 구 타일 보존). `index.json`에 구별 생성 기록(`gu.<코드>`: 생성일, 입력 SHA-256, way 수, 추정 비율, 타일 목록).
- 프런트: 해당 위치 타일이 있으면 사용, 없으면 기존 격자 도로. 타일 JSON·index 캐시, (kind, estimated)별로 합쳐 draw call ≤ 6개, 추정 비율은 **불러온 타일의 면적 기준**.
- 폭 추정 면은 투명도 대신 한 단계 연한 색으로 표시(투명 블렌딩이 프레임 비용을 크게 늘림: 측정 5.8 → 7.3fps).
- 정점 절감: 면을 0.2m로 단순화(면적 변화 1% 이내, 테스트로 고정).

## 성능 기준 (제안 — 실기기 측정으로 확정 필요)
| 항목 | 기준 | 합성 고밀도 측정 | 판정 |
|---|---|---|---|
| 트윈 1회 열기 전송량(반경 1km, gzip) | ≤ 1.5 MB | 0.21 MB (9타일) | 통과 |
| 바닥 삼각형 수(1회) | ≤ 250,000 | 20,835 | 통과 |
| 최대 타일 크기(gzip) | ≤ 400 KB | 35 KB | 통과 |
| 로딩(파싱·병합 포함) | ≤ 1.5 s | 0.47~0.60 s (헤드리스 소프트웨어 렌더) | 통과(참고치) |
| 프레임 | 기준 기기에서 중앙값 ≥ 30 fps, 바닥 추가로 기존 대비 −20% 이내 | 소프트웨어 렌더 8.3fps → 8.3fps(−0%) | 상대치만 확인, **절대치 미검증** |
| JS 힙 증가 | ≤ +50 MB | +1~2 MB | 통과 |

- 기준 기기(제안): 일반 노트북 내장 GPU(예: Intel Iris Xe급), 1080p 창, Chrome 최신. 모바일은 별도 기준 필요.
- 재현: `python tools/ground/perf_report.py --check` (예산 초과 시 종료코드 1).
- 브라우저 프레임/로딩: 개발 서버에서 `?ground=perf` 등으로 열고 콘솔에서 `performance.getEntriesByName('ground-load-ms')`(로딩 시간)를 읽고, 프레임은 DevTools Performance 탭 또는 `requestAnimationFrame` 카운터로 측정한다.

## 서울 전체 규모 추정 (합성 밀도 외삽 — 확인된 값 아님)
- 타일 약 620~700개(서울 605km² ÷ 약 0.97km²). 합성 고밀도 평균 타일 gzip 약 23KB → 전체 약 15MB gzip(원본 약 50MB). 실제 OSM은 곡선·골목·보행로가 많아 **2~4배 커질 수 있다**: 수십 MB 가능. 이 경우 구별 지연 로딩(이미 타일 단위), 정적 호스팅 gzip/브로틀리, 단순화 허용오차 상향으로 대응.
- 합성 데이터는 직선 격자에 가까워 실제보다 단순하다. 따라서 위 "통과"는 **상한 보장이 아니다**. 성동구 실데이터로 `perf_report` 대신 실제 타일 크기·삼각형 수를 먼저 확인할 것.

## 실행 순서(PC)
```
py -3.11 -m venv .venv-print3d
.\.venv-print3d\Scripts\python.exe -m pip install -r tools/ground/requirements.txt
.\.venv-print3d\Scripts\python.exe tools/ground/fetch_ground.py --gu seongdong     # 먼저 1개 구로 크기·시간 확인
.\.venv-print3d\Scripts\python.exe tools/ground/fetch_ground.py --gu all           # 이후 전체
```
Overpass 공용 서버는 사용량 제한이 있다. `--sleep`을 늘리고 한 번에 여러 구를 돌릴 때는 시간대를 나눠서 실행할 것.

## 한계
- 실데이터로는 아직 한 번도 돌려 보지 못했다(이 환경에서 Overpass 접속 불가).
- 구 경계 병합 규칙은 "나중 실행이 이긴다"이며, bbox 여유 1km 덕에 경계 타일은 대부분 한 번의 실행으로 온전히 채워지지만 검증은 실데이터로 해야 한다.
- 모바일·저사양 기기 기준과 실제 GPU 프레임은 측정하지 않았다.
