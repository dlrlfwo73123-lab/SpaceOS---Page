// lib/extrude.ts 단위 점검: node scripts/check-extrude.mjs  (vite 가 쓰는 esbuild 로 TS를 변환해 실행)
import { transformSync } from 'esbuild';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../src/lib/extrude.ts', import.meta.url), 'utf8');
const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
const m = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const area = (ring, tri) => {
  let s = 0;
  for (let i = 0; i < tri.length; i += 3) {
    const [a, b, c] = [ring[tri[i]], ring[tri[i + 1]], ring[tri[i + 2]]];
    s += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  }
  return s;
};
const cases = {
  square: [[0, 0], [10, 0], [10, 10], [0, 10]],
  squareCW: [[0, 0], [0, 10], [10, 10], [10, 0]],
  L: [[0, 0], [20, 0], [20, 8], [8, 8], [8, 20], [0, 20]],
  U: [[0, 0], [30, 0], [30, 20], [20, 20], [20, 6], [10, 6], [10, 20], [0, 20]],
};
for (const [name, ring] of Object.entries(cases)) {
  const tri = m.earClip(ring);
  assert.equal(tri.length, (ring.length - 2) * 3, `${name}: 삼각형 수`);
  assert.ok(Math.abs(area(ring, tri) - Math.abs(m.signedArea(ring))) < 1e-6, `${name}: 면적 보존`);
}
// 벽 법선은 건물 바깥을 향한다(방향·오목 외곽 무관): 변 중점에서 법선 쪽으로 조금 나간 점은 외곽 밖, 반대쪽은 안
for (const ring of [cases.square, cases.squareCW, cases.L, cases.U]) {
  const mesh = m.buildExtrusion([{ ring, h: 7, est: false }]);
  for (let e = 0; e < ring.length; e++) {
    const v = e * 4; // 변마다 꼭짓점 4개(0,1 = 바닥 양끝)
    const mx = (mesh.positions[v * 3] + mesh.positions[(v + 1) * 3]) / 2;
    const mz = (mesh.positions[v * 3 + 2] + mesh.positions[(v + 1) * 3 + 2]) / 2;
    const nx = mesh.normals[v * 3], nz = mesh.normals[v * 3 + 2];
    assert.ok(!m.pointInRing(mx + nx * 0.05, mz + nz * 0.05, ring), `변 ${e}: 법선이 바깥쪽`);
    assert.ok(m.pointInRing(mx - nx * 0.05, mz - nz * 0.05, ring), `변 ${e}: 반대쪽은 안쪽`);
  }
}
// 모든 삼각형의 앞면(감는 방향)이 저장된 법선과 같은 쪽 → FrontSide 로 그려도 안 사라진다
for (const ring of [cases.square, cases.squareCW, cases.L, cases.U]) {
  const mesh = m.buildExtrusion([{ ring, h: 7, est: false }]);
  const P = mesh.positions, N = mesh.normals;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    const u = [0, 1, 2].map((k) => P[b * 3 + k] - P[a * 3 + k]), w = [0, 1, 2].map((k) => P[c * 3 + k] - P[a * 3 + k]);
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const d = cr[0] * N[a * 3] + cr[1] * N[a * 3 + 1] + cr[2] * N[a * 3 + 2];
    assert.ok(d > 0, '삼각형 앞면이 법선 방향');
  }
}
// 층 UV: 7m = 2층 반복
const sq = m.buildExtrusion([{ ring: cases.square, h: 7, est: false }]);
assert.equal(sq.uvs[3 * 2 + 1], 2);
// 중심 건물 겹침 판정
assert.ok(m.overlapsBox([[-5, -5], [5, -5], [5, 5], [-5, 5]], 11, 8.5));
assert.ok(!m.overlapsBox([[30, 30], [40, 30], [40, 40], [30, 40]], 11, 8.5));
console.log('extrude checks OK');
