import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import { getBuildingFloors, type BuildingFloor as Floor } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';

type BuildingTwinProps = {
  buildingId: string;
  lat?: number;
  lng?: number;
};

// ── 시드 기반 난수 ──────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function makePRNG(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 상수 ────────────────────────────────────────────────────────
const FALLBACK_FLOORS: Floor[] = [
  { level: 1, industry: '카페', vacant: false },
  { level: 2, industry: '미용실', vacant: true },
  { level: 3, industry: '편의점', vacant: false },
  { level: 4, industry: '의류', vacant: true },
  { level: 5, industry: '음식점', vacant: false },
];

const FLOOR_H = 3.5;
const BLD_W   = 18;
const BLD_D   = 13;
const GAP     = 0.1;

// 도시 블록 그리드: 셀 1개 = 38m, GRID_R=7 → 약 500m 반경
const CELL   = 38;
const GRID_R = 7;

// ── 주변 건물 데이터 생성 ────────────────────────────────────────
type NeighborBuilding = {
  gx: number; gz: number;
  floors: number; w: number; d: number;
  color: string;
};

const BLD_COLORS = [
  '#1e3a5f', '#1e293b', '#172554', '#1c1917',
  '#14532d', '#134e4a', '#3b0764', '#1e1b4b',
];

function generateNeighborhood(seed: string): NeighborBuilding[] {
  const rng = makePRNG(hashStr(seed));
  const out: NeighborBuilding[] = [];
  for (let gx = -GRID_R; gx <= GRID_R; gx++) {
    for (let gz = -GRID_R; gz <= GRID_R; gz++) {
      if (gx === 0 && gz === 0) continue;
      if (rng() < 0.08) continue;
      const floors = Math.max(1, Math.round(rng() * 18 + 2));
      const w = 12 + rng() * 16;
      const d = 10 + rng() * 14;
      const color = BLD_COLORS[Math.floor(rng() * BLD_COLORS.length)];
      out.push({ gx, gz, floors, w, d, color });
    }
  }
  return out;
}

// ── 주변 건물 메쉬 ──────────────────────────────────────────────
function NeighborMesh({ b }: { b: NeighborBuilding }) {
  const h = b.floors * FLOOR_H;
  return (
    <mesh position={[b.gx * CELL, h / 2, b.gz * CELL]} castShadow>
      <boxGeometry args={[b.w, h, b.d]} />
      <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

// ── 도로 그리드 ─────────────────────────────────────────────────
function Roads() {
  const lines: JSX.Element[] = [];
  const extent = GRID_R * CELL + CELL / 2;
  for (let i = -GRID_R; i <= GRID_R + 1; i++) {
    const pos = (i - 0.5) * CELL;
    lines.push(
      <mesh key={`hx${i}`} position={[0, 0.02, pos]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[extent * 2, 8]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>,
      <mesh key={`hz${i}`} position={[pos, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, extent * 2]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>
    );
  }
  return <>{lines}</>;
}

// ── 선택 건물 — 층별 상세 ────────────────────────────────────────
const FACADE_COLORS = ['#3b82f6', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b'];
const VACANT_COLOR  = '#94a3b8';

function FloorMesh({ floor, index, selected, onClick }: {
  floor: Floor; index: number; selected: boolean; onClick: () => void;
}) {
  const y = index * (FLOOR_H + GAP) + FLOOR_H / 2;
  const wc = floor.vacant ? VACANT_COLOR : FACADE_COLORS[index % FACADE_COLORS.length];
  const gc = floor.vacant ? '#c8d3de' : '#bfdbfe';

  return (
    <group onClick={onClick}>
      <mesh position={[0, y, 0]} castShadow>
        <boxGeometry args={[BLD_W, FLOOR_H - 0.25, BLD_D]} />
        <meshStandardMaterial
          color={selected ? '#f59e0b' : wc}
          transparent opacity={floor.vacant ? 0.65 : 0.95}
          roughness={0.35} metalness={0.12}
        />
      </mesh>
      <mesh position={[0, y, BLD_D / 2 + 0.05]}>
        <planeGeometry args={[BLD_W - 2, FLOOR_H - 0.75]} />
        <meshStandardMaterial
          color={selected ? '#fcd34d' : gc}
          transparent opacity={floor.vacant ? 0.3 : 0.55}
          roughness={0.05} metalness={0.65}
        />
      </mesh>
      <Text
        position={[BLD_W / 2 + 1.5, y, 0]}
        fontSize={1.2} color={floor.vacant ? '#94a3b8' : '#e2e8f0'}
        anchorX="left" anchorY="middle"
      >
        {`${floor.level}F  ${floor.industry}`}
      </Text>
    </group>
  );
}

function Rooftop({ topY }: { topY: number }) {
  return (
    <group>
      <mesh position={[0, topY + 0.3, 0]}>
        <boxGeometry args={[BLD_W + 0.4, 0.55, BLD_D + 0.4]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>
      <mesh position={[-BLD_W * 0.28, topY + 2.0, 0]}>
        <boxGeometry args={[BLD_W * 0.27, 3.5, BLD_D * 0.33]} />
        <meshStandardMaterial color="#1e293b" roughness={0.75} />
      </mesh>
    </group>
  );
}

function SelectionRing() {
  return (
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[BLD_W * 0.78, BLD_W * 0.85, 32]} />
      <meshStandardMaterial color="#f59e0b" transparent opacity={0.6} />
    </mesh>
  );
}

function ScaleBar() {
  return (
    <div className="absolute bottom-3 right-3 flex flex-col items-end gap-0.5 pointer-events-none">
      <svg width="90" height="16">
        <line x1="0" y1="8" x2="90" y2="8" stroke="white" strokeWidth="1.5" />
        <line x1="0" y1="4" x2="0" y2="12" stroke="white" strokeWidth="1.5" />
        <line x1="45" y1="5" x2="45" y2="11" stroke="white" strokeWidth="1" />
        <line x1="90" y1="4" x2="90" y2="12" stroke="white" strokeWidth="1.5" />
        <text x="0" y="6" fill="white" fontSize="7" fontFamily="monospace">0</text>
        <text x="35" y="6" fill="white" fontSize="7" fontFamily="monospace">250m</text>
        <text x="73" y="6" fill="white" fontSize="7" fontFamily="monospace">500m</text>
      </svg>
      <span className="text-[9px] text-white/50 font-mono">반경 ≈ 500m 범위 표시</span>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function BuildingTwin({ buildingId, lat: _lat, lng: _lng }: BuildingTwinProps) {
  const [floors, setFloors] = useState<Floor[]>(FALLBACK_FLOORS);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  useEffect(() => {
    setSelectedFloor(null);
    getBuildingFloors(buildingId)
      .then((d) => setFloors(d.length ? d : FALLBACK_FLOORS))
      .catch(() => setFloors(FALLBACK_FLOORS));
  }, [buildingId]);

  const neighbors = useMemo(() => generateNeighborhood(buildingId), [buildingId]);

  const totalH  = floors.length * (FLOOR_H + GAP);
  const camY    = totalH * 0.5;
  const camDist = 400;

  const vacantCount = floors.filter((f) => f.vacant).length;
  const vacancyPct  = Math.round((vacantCount / floors.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
      {/* 헤더 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">3D 디지털 트윈 · 주변 500m 도시 블록</p>
          <p className="text-xs text-slate-400">
            층고 3.5m · 셀 38m/블록 · {neighbors.length}동 주변 건물 · 데모 데이터
          </p>
        </div>
        <div className="text-right text-xs">
          <span className="font-mono text-amber-400">{vacantCount}</span>
          <span className="text-slate-400">/{floors.length}층 공실 ({vacancyPct}%)</span>
        </div>
      </div>

      {/* 3D 뷰 */}
      <div className="relative mb-4 h-[540px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900">
        <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-slate-400 text-sm">3D 렌더링 오류</div>}>
          <Canvas
            shadows
            camera={{ position: [camDist * 0.5, camDist * 0.55, camDist * 0.6], fov: 42 }}
            className="h-full w-full"
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[120, 200, 80]} intensity={1.2} castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-far={1200}
              shadow-camera-left={-500}
              shadow-camera-right={500}
              shadow-camera-top={500}
              shadow-camera-bottom={-500}
            />
            <directionalLight position={[-80, 100, -60]} intensity={0.3} color="#bfdbfe" />
            <hemisphereLight args={['#1e3a5f', '#0f172a', 0.45]} />
            <fog attach="fog" args={['#0f172a', 300, 900]} />

            {/* 지면 */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1200, 1200]} />
              <meshStandardMaterial color="#111827" roughness={0.95} />
            </mesh>

            {/* 도로 */}
            <Roads />

            {/* 주변 건물 (500m 반경) */}
            {neighbors.map((b, i) => (
              <NeighborMesh key={i} b={b} />
            ))}

            {/* 선택 건물 하이라이트 */}
            <SelectionRing />

            {/* 선택 건물 층별 */}
            {floors.map((floor, i) => (
              <FloorMesh
                key={floor.level}
                floor={floor}
                index={i}
                selected={selectedFloor === floor.level}
                onClick={() => setSelectedFloor(selectedFloor === floor.level ? null : floor.level)}
              />
            ))}
            <Rooftop topY={totalH} />

            <Text
              position={[0, totalH + 5, 0]}
              fontSize={3} color="#f59e0b" anchorX="center" anchorY="bottom"
            >
              ▼ 선택 공실
            </Text>

            <OrbitControls
              enableDamping dampingFactor={0.08}
              minDistance={15} maxDistance={800}
              target={[0, camY * 0.4, 0]}
            />
          </Canvas>
        </ErrorBoundary>

        <ScaleBar />

        {/* 층 선택 오버레이 */}
        {selectedFloor !== null && (() => {
          const f = floors.find((fl) => fl.level === selectedFloor);
          return f ? (
            <div className="absolute left-3 top-3 rounded-xl bg-black/75 px-3 py-2 text-xs backdrop-blur-sm">
              <p className="font-bold text-white">{f.level}층 · {f.industry}</p>
              <p className={f.vacant ? 'text-amber-400' : 'text-emerald-400'}>{f.vacant ? '공실' : '운영 중'}</p>
              <p className="text-slate-400 mt-0.5">{((f.level - 1) * 3.5).toFixed(1)}m ~ {(f.level * 3.5).toFixed(1)}m</p>
            </div>
          ) : null;
        })()}

        {/* 데모 배너 */}
        <div className="absolute top-2 right-2 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
          데모 데이터
        </div>

        {/* 이웃 건물 수 */}
        <div className="absolute bottom-10 left-3 rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] text-slate-300 backdrop-blur-sm">
          <p className="font-semibold text-white">주변 건물 {neighbors.length}동</p>
          <p className="text-slate-400">반경 약 500m 범위 · 시드 기반 데모</p>
        </div>
      </div>

      {/* 층별 현황 */}
      <div className="space-y-1.5 rounded-xl bg-white/5 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">층별 현황 (선택 건물)</p>
        {[...floors].reverse().map((floor) => (
          <button
            key={floor.level}
            onClick={() => setSelectedFloor(selectedFloor === floor.level ? null : floor.level)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
              selectedFloor === floor.level ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono font-bold w-6 text-right">{floor.level}F</span>
              <span className="text-slate-300">{floor.industry}</span>
              <span className="text-slate-500 text-[10px]">{(floor.level * 3.5).toFixed(1)}m</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${
              floor.vacant ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'
            }`}>
              {floor.vacant ? '공실' : '운영'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
