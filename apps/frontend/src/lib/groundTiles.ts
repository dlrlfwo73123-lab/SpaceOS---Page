// 바닥(차도·보도·횡단보도) 타일 로더. 타일은 tools/ground/fetch_ground.py 가 만든 삼각형 메시 JSON이며
// 서울 전체가 한 벌(`/data/ground/seoul/`)이다. 해당 위치 타일이 없으면 null → 트윈은 기존 절차 생성 도로 격자를 쓴다.

export type GroundKind = 'carriageway' | 'sidewalk' | 'crosswalk';

export type GroundLayerData = {
  kind: GroundKind;
  estimated: boolean;
  positions: number[]; // [lon, lat, lon, lat, ...]
  indices: number[];
};

export type GroundMeta = {
  source: string;
  attribution: string;
  synthetic: boolean;
  generated: string;
  /** 불러온 타일의 면적 기준 폭 추정 비율(0~1) */
  estimated_area_ratio: number;
};

export type GroundData = { layers: GroundLayerData[]; meta: GroundMeta };

type TileJson = { layers: GroundLayerData[]; area_m2?: { estimated: number; measured: number } };
type IndexJson = { v: number; tiles: string[]; meta: Omit<GroundMeta, 'estimated_area_ratio'> };

const TILE_DEG = 0.01;
const M_PER_LAT = 111320;

function dataDir(): string {
  // 기본: 서울 전체 실데이터. ?ground=sample|perf 는 개발·검증용 폴더(_sample, _perf)
  const q = new URLSearchParams(window.location.search).get('ground');
  const name = q && /^[a-z]+$/.test(q) ? `_${q}` : 'seoul';
  return `${import.meta.env.BASE_URL}data/ground/${name}/`;
}

const jsonCache = new Map<string, Promise<unknown | null>>();

function getJson<T>(url: string): Promise<T | null> {
  let p = jsonCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => (res.ok ? res.json() : null)) // SPA 폴백(HTML)이면 파싱 실패 → catch
      .catch(() => null);
    jsonCache.set(url, p);
    p.then((v) => { if (v === null) jsonCache.delete(url); }); // 실패는 캐시하지 않는다
  }
  return p as Promise<T | null>;
}

/** 같은 (kind, estimated) 레이어를 하나로 합쳐 draw call 수를 줄인다(타일 수와 무관하게 최대 6개). */
function mergeLayers(all: GroundLayerData[]): GroundLayerData[] {
  const groups = new Map<string, GroundLayerData>();
  for (const l of all) {
    const key = `${l.kind}|${l.estimated}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { kind: l.kind, estimated: l.estimated, positions: [...l.positions], indices: [...l.indices] });
    } else {
      const base = g.positions.length / 2;
      for (const v of l.positions) g.positions.push(v);
      for (const i of l.indices) g.indices.push(i + base);
    }
  }
  return [...groups.values()];
}

export async function loadGround(lat: number, lng: number, radiusM = 1000): Promise<GroundData | null> {
  const t0 = performance.now();
  const dir = dataDir();
  const index = await getJson<IndexJson>(`${dir}index.json`);
  if (!index || index.v !== 1 || !Array.isArray(index.tiles)) return null;

  const mPerLng = M_PER_LAT * Math.cos((lat * Math.PI) / 180);
  const dLat = radiusM / M_PER_LAT;
  const dLng = radiusM / mPerLng;
  const have = new Set(index.tiles);
  const keys: string[] = [];
  for (let ty = Math.floor((lat - dLat) / TILE_DEG); ty <= Math.floor((lat + dLat) / TILE_DEG); ty++) {
    for (let tx = Math.floor((lng - dLng) / TILE_DEG); tx <= Math.floor((lng + dLng) / TILE_DEG); tx++) {
      const k = `${ty}_${tx}`;
      if (have.has(k)) keys.push(k);
    }
  }
  if (keys.length === 0) return null;
  const tiles = (await Promise.all(keys.map((k) => getJson<TileJson>(`${dir}${k}.json`)))).filter(
    (t): t is TileJson => t !== null,
  );
  const layers = mergeLayers(tiles.flatMap((t) => t.layers));
  if (layers.length === 0) return null;
  const est = tiles.reduce((s, t) => s + (t.area_m2?.estimated ?? 0), 0);
  const mea = tiles.reduce((s, t) => s + (t.area_m2?.measured ?? 0), 0);
  performance.mark?.('ground-loaded');
  performance.measure?.('ground-load-ms', { start: t0, end: performance.now(), detail: { tiles: tiles.length } });
  return { layers, meta: { ...index.meta, estimated_area_ratio: est + mea > 0 ? est / (est + mea) : 0 } };
}
