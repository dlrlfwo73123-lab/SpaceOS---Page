// 건물 외곽(로컬 m 좌표) → 압출 메시. 의존성 없이 BufferGeometry 속성 배열만 만든다.
// 장면 좌표: x=동, z=-북, y=높이. 지붕은 귀 자르기(ear clipping)로 삼각분할(구멍 없는 외곽만 지원).

export const FLOOR_H = 3.5;

export type Pt = [number, number]; // [x, z]
export type LocalBuilding = { ring: Pt[]; h: number; est: boolean };

export type MeshArrays = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
};

export function signedArea(r: Pt[]): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

function pointInTri(p: Pt, a: Pt, b: Pt, c: Pt): boolean {
  const s = (p1: Pt, p2: Pt, p3: Pt) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** 외곽 꼭짓점 인덱스 삼각형 목록. 어떤 방향의 외곽이 와도 동작한다. 막히면 남은 부분을 팬으로 마무리. */
export function earClip(ring: Pt[]): number[] {
  const n = ring.length;
  if (n < 3) return [];
  const idx = Array.from({ length: n }, (_, i) => i);
  if (signedArea(ring) < 0) idx.reverse();
  const out: number[] = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < n * n) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const ia = idx[(k + idx.length - 1) % idx.length], ib = idx[k], ic = idx[(k + 1) % idx.length];
      const a = ring[ia], b = ring[ib], c = ring[ic];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross <= 1e-9) continue; // 오목/퇴화 꼭짓점
      let ok = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (pointInTri(ring[j], a, b, c)) { ok = false; break; }
      }
      if (!ok) continue;
      out.push(ia, ib, ic);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  else for (let i = 1; i + 1 < idx.length; i++) out.push(idx[0], idx[i], idx[i + 1]); // 팬 마무리(비정상 외곽)
  return out;
}

export function pointInRing(x: number, z: number, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** 중심 건물 박스(±hx, ±hz)와 겹치는 외곽인가 */
export function overlapsBox(ring: Pt[], hx: number, hz: number): boolean {
  if (pointInRing(0, 0, ring)) return true;
  if (ring.some(([x, z]) => Math.abs(x) <= hx && Math.abs(z) <= hz)) return true;
  return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].some(([x, z]) => pointInRing(x, z, ring));
}

/** 여러 건물을 하나의 메시 배열로. UV: 벽은 v = 높이/FLOOR_H(층 줄무늬 반복), 지붕은 평평한 영역(0.5,0.5). */
export function buildExtrusion(buildings: LocalBuilding[]): MeshArrays {
  let vCount = 0, iCount = 0;
  for (const b of buildings) {
    vCount += b.ring.length * 4 + b.ring.length;
    iCount += b.ring.length * 6 + (b.ring.length - 2) * 3;
  }
  const positions = new Float32Array(vCount * 3);
  const normals = new Float32Array(vCount * 3);
  const uvs = new Float32Array(vCount * 2);
  const indices = new Uint32Array(iCount);
  let v = 0, t = 0;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number) => {
    positions.set([x, y, z], v * 3);
    normals.set([nx, ny, nz], v * 3);
    uvs.set([u, w], v * 2);
    return v++;
  };
  // 삼각형의 기하 법선이 원하는 법선과 같은 쪽이 되도록(앞면=바깥) 꼭짓점 순서를 맞춘다 → 단면(FrontSide) 렌더링 가능
  const tri = (a: number, b: number, c: number, nx: number, ny: number, nz: number) => {
    const ux = positions[b * 3] - positions[a * 3], uy = positions[b * 3 + 1] - positions[a * 3 + 1], uz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const wx = positions[c * 3] - positions[a * 3], wy = positions[c * 3 + 1] - positions[a * 3 + 1], wz = positions[c * 3 + 2] - positions[a * 3 + 2];
    const dot = (uy * wz - uz * wy) * nx + (uz * wx - ux * wz) * ny + (ux * wy - uy * wx) * nz;
    if (dot >= 0) indices.set([a, b, c], t); else indices.set([a, c, b], t);
    t += 3;
  };
  for (const b of buildings) {
    const r = b.ring, n = r.length;
    const ccw = signedArea(r) > 0;
    let along = 0;
    for (let i = 0; i < n; i++) {
      const [x1, z1] = r[i], [x2, z2] = r[(i + 1) % n];
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz) || 1;
      const nx = ccw ? dz / len : -dz / len, nz = ccw ? -dx / len : dx / len; // 바깥쪽 법선
      const fl = b.h / FLOOR_H;
      const a0 = put(x1, 0, z1, nx, 0, nz, along / FLOOR_H, 0);
      const a1 = put(x2, 0, z2, nx, 0, nz, (along + len) / FLOOR_H, 0);
      const a2 = put(x2, b.h, z2, nx, 0, nz, (along + len) / FLOOR_H, fl);
      const a3 = put(x1, b.h, z1, nx, 0, nz, along / FLOOR_H, fl);
      tri(a0, a1, a2, nx, 0, nz);
      tri(a0, a2, a3, nx, 0, nz);
      along += len;
    }
    const base = v;
    for (const [x, z] of r) put(x, b.h, z, 0, 1, 0, 0.5, 0.5);
    const et = earClip(r);
    for (let i = 0; i < et.length; i += 3) tri(base + et[i], base + et[i + 1], base + et[i + 2], 0, 1, 0);
  }
  return { positions, normals, uvs, indices: indices.subarray(0, t) };
}
