import { useMemo } from 'react';
import type { GroundBuilding } from '../lib/groundTiles';
import { buildExtrusion, overlapsBox, type LocalBuilding } from '../lib/extrude';

const M_PER_LAT = 111320;
/** 성능 보호 단계별 건물 표시 반경(m). 0단계가 기본, 프레임이 낮으면 BuildingTwin 의 PerfGovernor 가 한 단계씩 낮춘다. */
export const BUILDING_RADII = [600, 400, 250, 120] as const;
const CHUNK_M = 200;       // 200m 격자 조각 단위로 메시를 나눠 화면 밖 조각은 그리지 않는다(프러스텀 컬링)
const SHADOW_NEAR_M = 300; // 이 거리 안의 조각만 그림자를 만든다
const SELECTED_HALF = { x: 11, z: 8.5 }; // 선택 건물(18×13m) + 여유 — 겹치는 OSM 건물은 숨김

const MEASURED = '#a8b0bd';
const ESTIMATED = '#dde1e8'; // 높이 추정: 한 단계 연하게(투명 블렌딩은 비용이 커서 쓰지 않음)

/** 층 줄무늬: 세로 1 단위 = 1개 층. 바닥 쪽에 어두운 선. */
function useFloorTexture(): HTMLCanvasElement | null {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 4; c.height = 64;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 4, 64);
    g.fillStyle = '#7c8493'; g.fillRect(0, 59, 4, 5);
    return c;
  }, []);
}

function toLocal(b: GroundBuilding, lat0: number, lng0: number, mPerLng: number): LocalBuilding {
  const ring: [number, number][] = [];
  for (let i = 0; i < b.r.length; i += 2) ring.push([(b.r[i] - lng0) * mPerLng, -(b.r[i + 1] - lat0) * M_PER_LAT]);
  return { ring, h: b.h, est: b.e === 1 };
}

export function localBuildings(all: GroundBuilding[], lat: number, lng: number, radius: number): LocalBuilding[] {
  const mPerLng = M_PER_LAT * Math.cos((lat * Math.PI) / 180);
  const out: LocalBuilding[] = [];
  for (const b of all) {
    const lb = toLocal(b, lat, lng, mPerLng);
    const [x, z] = lb.ring[0];
    if (Math.hypot(x, z) > radius) continue;
    if (overlapsBox(lb.ring, SELECTED_HALF.x, SELECTED_HALF.z)) continue;
    out.push(lb);
  }
  return out;
}

function Group({ items, color, canvas, shadow }: { items: LocalBuilding[]; color: string; canvas: HTMLCanvasElement | null; shadow: boolean }) {
  const mesh = useMemo(() => buildExtrusion(items), [items]);
  if (items.length === 0) return null;
  return (
    <mesh castShadow={shadow}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[mesh.positions, 3]} />
        <bufferAttribute attach="attributes-normal" args={[mesh.normals, 3]} />
        <bufferAttribute attach="attributes-uv" args={[mesh.uvs, 2]} />
        <bufferAttribute attach="index" args={[mesh.indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.05}>
        {canvas && (
          <canvasTexture attach="map" args={[canvas]} wrapS={1000} wrapT={1000} onUpdate={(t) => { t.needsUpdate = true; }} />
        )}
      </meshStandardMaterial>
    </mesh>
  );
}

export default function BuildingLayer({ buildings, lat, lng, radius }: { buildings: GroundBuilding[]; lat: number; lng: number; radius: number }) {
  const canvas = useFloorTexture();
  const chunks = useMemo(() => {
    const map = new Map<string, { cx: number; cz: number; est: boolean; items: LocalBuilding[] }>();
    for (const b of localBuildings(buildings, lat, lng, radius)) {
      const cx = Math.floor(b.ring[0][0] / CHUNK_M), cz = Math.floor(b.ring[0][1] / CHUNK_M);
      const key = `${cx}|${cz}|${b.est}`;
      const c = map.get(key) ?? { cx, cz, est: b.est, items: [] };
      c.items.push(b);
      map.set(key, c);
    }
    return [...map.entries()].map(([key, c]) => ({ key, ...c }));
  }, [buildings, lat, lng, radius]);
  return (
    <group>
      {chunks.map((c) => (
        <Group
          key={c.key}
          items={c.items}
          color={c.est ? ESTIMATED : MEASURED}
          canvas={canvas}
          shadow={Math.hypot((c.cx + 0.5) * CHUNK_M, (c.cz + 0.5) * CHUNK_M) < SHADOW_NEAR_M}
        />
      ))}
    </group>
  );
}
