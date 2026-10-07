// 구 경계 → 장면 좌표(m) 리본 메시, 구 경계까지 거리. 장면: x=동, z=-북 (BuildingTwin과 동일한 등장방형 근사)
import { GU_POLYGONS } from './seoulBoundaries';

const M_PER_LAT = 111320;

export type Ribbon = { positions: Float32Array; indices: Uint32Array };

function toLocal(lat0: number, lng0: number) {
  const mPerLng = M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);
  return (lat: number, lng: number): [number, number] => [(lng - lng0) * mPerLng, -(lat - lat0) * M_PER_LAT];
}

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** 중심(0,0)에서 구 경계 선분까지의 최단 거리(m). 경계 데이터가 없으면 null. */
export function distanceToGuBoundary(guCode: string, lat: number, lng: number): number | null {
  const poly = GU_POLYGONS[guCode];
  if (!poly || poly.length < 2) return null;
  const f = toLocal(lat, lng);
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = f(poly[i][0], poly[i][1]);
    const [bx, bz] = f(poly[i + 1][0], poly[i + 1][1]);
    best = Math.min(best, segDist(0, 0, ax, az, bx, bz));
  }
  return best;
}

/** 반경 안의 경계 선분을 폭 widthM 리본으로. 반경 안에 경계가 없으면 null. */
export function guBoundaryRibbon(guCode: string, lat: number, lng: number, radiusM = 1000, widthM = 4): Ribbon | null {
  const poly = GU_POLYGONS[guCode];
  if (!poly || poly.length < 2) return null;
  const f = toLocal(lat, lng);
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const [ax, az] = f(poly[i][0], poly[i][1]);
    const [bx, bz] = f(poly[i + 1][0], poly[i + 1][1]);
    if (segDist(0, 0, ax, az, bx, bz) > radiusM) continue;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) continue;
    const nx = (-dz / len) * (widthM / 2), nz = (dx / len) * (widthM / 2);
    const o = pos.length / 3;
    pos.push(ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx - nx, 0, bz - nz, bx + nx, 0, bz + nz);
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  return idx.length ? { positions: new Float32Array(pos), indices: new Uint32Array(idx) } : null;
}
