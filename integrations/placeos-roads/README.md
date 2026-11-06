# placeos.co.kr 3D 트윈에 실제 도로 넣기 — 적용 묶음

시안(Case 2)에서 만든 실제 도로 표시를 **실제 사이트(placeos.co.kr)**에 넣기 위한 코드 묶음입니다.
실제 사이트 저장소는 아직 이 작업 세션에 연결되지 않아, 공개된 사이트 파일(번들)에서 확인한 구조에 맞춰 만들었습니다.
저장소가 연결되면 아래 '붙이는 자리'대로 바로 옮겨 넣으면 됩니다.

| 파일 | 하는 일 | 확인 |
|---|---|---|
| `backend/twin_roads.py` | 건물 주변 반경 300m 실제 도로(OpenStreetMap)를 벡터 타일에서 읽어 이름 · 등급 · 추정 폭과 함께 돌려줌. 도로명주소의 도로가 건물 바로 앞인지 검사(`road_check`). 표준 라이브러리만 사용 | 시험 8개 통과, 실제 타일 서버로 받기 0.4~0.8초(같은 타일 다시 받으면 0.1초 안) |
| `backend/tests/` | 네트워크 없이 도는 시험(실제 타일 2장 포함) | `python -m unittest discover -s integrations/placeos-roads/backend/tests` |
| `frontend/twinRoads.ts` | three.js 도로 층: 보도 · 차도 · 노란 중앙선 · 흰 차선 · 교차로 횡단보도 · 도로 이름(+ 주소 도로 라벨) | TypeScript strict 검사 통과(three r170 = 실제 사이트와 같은 판), 브라우저 렌더 확인 |
| `frontend/RoadCheckSection.tsx` | 트윈 왼쪽 패널 '도로 · 위치 확인'(주소 도로 판정 · 도로 켜고 끄기 · 카카오맵 비교 링크 · 출처) | 같은 검사 통과 |

## 실제 사이트에서 확인한 구조 (공개 번들 기준)

- 트윈 데이터: `GET /api/v1/buildings/{id}/twin?district=…` → `lat`, `lng`, `ring`(건물 외곽선 [위도, 경도]), `neighbors`, `floors`, `road_addr` 등.
- 3D 장면(`TwinScene` 청크의 `createTwinScene`): three.js r170. 외곽선을 `x = (경도−lng)·111320·cos(lat)`, `y = (위도−lat)·111320`로 바꿔 Shape를 만들고 `rotateX(−π/2)`로 세웁니다. 바닥은 y = −0.02. 라벨은 CSS2DRenderer. 반환 객체에 `setNeighbors(on)` 같은 켜고 끄기 함수가 있습니다.
- 이 묶음의 도로 층은 **같은 투영 · 같은 좌표 방향**(장면 −z가 북쪽)을 씁니다. 실제 사이트 방식으로 세운 건물 외곽선 위에 얹어 렌더해 정렬을 확인했습니다.

## 붙이는 자리

### 1. 서버 (FastAPI)

`twin_roads.py`를 `apps/backend/app/` 아래(예: `app/data/twin_roads.py`)에 두고, 트윈 응답을 만드는 곳에서 합칩니다.

```python
from starlette.concurrency import run_in_threadpool
from app.data.twin_roads import roads_for_twin

# twin = 지금 돌려주는 트윈 dict (lat, lng, ring, road_addr …)
extra = await run_in_threadpool(roads_for_twin, twin['lat'], twin['lng'], twin.get('ring'), twin.get('road_addr'))
twin.update(extra)   # roads, roads_source, road_check (타일을 못 받으면 roads=[] + roads_error, 트윈은 그대로)
```

- 블로킹 네트워크 호출이라 `run_in_threadpool`로 부릅니다(이벤트 루프를 막지 않게).
- 타일은 인스턴스 메모리에 캐시됩니다(최대 512장). 응답에 추가되는 크기는 성수동 시험 건물 기준 약 6.5KB입니다(도로가 촘촘한 곳은 더 큼).
- 외부 접속: 서버가 `tiles.openfreemap.org`에 접속합니다(키 없음). 화면(CSP)은 바꿀 필요가 없습니다.
- 응답 모델(Pydantic)을 쓰면 `roads: list[dict]`, `roads_source: dict | None`, `road_check: dict | None`, `roads_error: str | None` 필드를 추가합니다.

### 2. 3D 장면 (`createTwinScene`)

주변 건물 그룹을 장면에 넣은 바로 다음:

```ts
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createRoadLayer } from './twinRoads';

const roadLayer = createRoadLayer(t.roads ?? [], t.lat, t.lng, {
  addressRoad: t.road_check?.name,
  makeLabel: (text, kind) => {
    const el = document.createElement('div');
    el.className = kind === 'address' ? 'twin3d-road-label is-address' : 'twin3d-road-label';
    el.textContent = text;
    return new CSS2DObject(el);
  },
});
scene.add(roadLayer.group);
```

반환 객체에 추가합니다.

```ts
setRoads(on: boolean) { roadLayer.group.visible = on; requestRender(); },
roadStats: roadLayer.stats,
```

`dispose()` 맨 앞에 `roadLayer.dispose();`를 넣습니다. 이 함수가 라벨을 하나씩 떼어 HTML 라벨도 지웁니다.

CSS:

```css
.twin3d-road-label{font:600 10px/1.2 inherit;color:#64748b;background:rgba(255,255,255,.75);border-radius:6px;padding:2px 6px;white-space:nowrap;pointer-events:none}
.twin3d-road-label.is-address{font-weight:700;color:#1e293b;background:#fff;border:1px solid #94a3b8}
```

### 3. 트윈 창 왼쪽 패널 (`BuildingTwinDialog`)

'건물 정보' 섹션 다음에 넣습니다. `roadsOn` 상태를 두고 장면의 `setRoads`를 부릅니다.

```tsx
<RoadCheckSection name={twin.name ?? '건물'} lat={twin.lat} lng={twin.lng}
  check={twin.road_check} source={twin.roads_source} stats={scene?.roadStats ?? null}
  roadsOn={roadsOn} onToggle={on => { setRoadsOn(on); scene?.setRoads(on); }} error={twin.roads_error} />
```

## 알아 둘 점

- **출처 표기 필수**: "© OpenStreetMap 기여자 (ODbL)". 패널이 표시합니다.
- **추정값**: 폭 · 차로 · 횡단보도는 도로 등급으로 추정한 그림입니다(아는 길은 `WIDTH_OVERRIDES`). 실측 폭이 필요하면 도로명주소 전자지도 실폭도로로 바꿉니다.
- **카카오맵**: 화면 · API 결과는 저장할 수 없어 쓰지 않습니다. 같은 좌표를 여는 링크(`map.kakao.com/link/map/…`, `…/roadview/…`)로 눈 비교만 합니다.
- **주소 도로 검사**(`road_check`): 건물 외곽선에서 도로명주소의 도로 가장자리까지 12m 안이면 ✓. 멀면 좌표 · 주소 · 외곽선을 확인할 신호입니다. 시안에서는 이 검사로 데모 건물 3곳이 실제 도로 앞이 아니었던 것을 찾았습니다.
- **타일 판**: 타일 주소는 `https://tiles.openfreemap.org/planet`(TileJSON)에서 그때그때 읽어 새 판을 따라갑니다.
