// 바닥(차도·보도·횡단보도) 타일 로더. 타일은 tools/ground/fetch_ground.py 가 만든 삼각형 메시 JSON.
// 타일이 없으면 null을 돌려주고, 트윈은 기존 절차 생성 도로 격자를 그대로 쓴다.

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
  estimated_area_ratio: number;
  generated: string;
};

export type GroundData = { layers: GroundLayerData[]; meta: GroundMeta };

// P1 시범 구: 성동구만 지원
const GU_SLUG: Record<string, string> = { '11200': 'seongdong' };
const TILE_DEG = 0.01;
const M_PER_LAT = 111320;

export function groundSupported(guCode?: string): boolean {
  return !!guCode && guCode in GU_SLUG;
}

function dataBase(): string {
  return `${import.meta.env.BASE_URL}data/ground/`;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T; // SPA 폴백(HTML)이면 파싱 실패 → null
  } catch {
    return null;
  }
}

export async function loadGround(
  guCode: string | undefined,
  lat: number,
  lng: number,
  radiusM = 1000,
): Promise<GroundData | null> {
  if (!guCode || !(guCode in GU_SLUG)) return null;
  const useSample = new URLSearchParams(window.location.search).get('ground') === 'sample';
  const dir = `${dataBase()}${useSample ? '_sample' : GU_SLUG[guCode]}/`;
  const index = await getJson<{ v: number; tiles: string[]; meta: GroundMeta }>(`${dir}index.json`);
  if (!index || index.v !== 1) return null;

  const mPerLng = M_PER_LAT * Math.cos((lat * Math.PI) / 180);
  const dLat = radiusM / M_PER_LAT;
  const dLng = radiusM / mPerLng;
  const keys: string[] = [];
  for (let ty = Math.floor((lat - dLat) / TILE_DEG); ty <= Math.floor((lat + dLat) / TILE_DEG); ty++) {
    for (let tx = Math.floor((lng - dLng) / TILE_DEG); tx <= Math.floor((lng + dLng) / TILE_DEG); tx++) {
      const k = `${ty}_${tx}`;
      if (index.tiles.includes(k)) keys.push(k);
    }
  }
  if (keys.length === 0) return null;
  const tiles = await Promise.all(
    keys.map((k) => getJson<{ layers: GroundLayerData[] }>(`${dir}${k}.json`)),
  );
  const layers = tiles.flatMap((t) => t?.layers ?? []);
  return layers.length ? { layers, meta: index.meta } : null;
}
