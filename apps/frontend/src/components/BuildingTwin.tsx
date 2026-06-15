import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';

type Floor = { level: number; industry: string; vacant: boolean };
type BuildingTwinProps = { floors: Floor[] };

// 1:1000 스케일 — 실제 1m = Three.js 0.001 units
// 건물 폭/깊이: 실제 20m → 0.020 units  (단위: 3D unit = 1m 로 편의상 1 unit = 1m)
// 층고: 실제 3.5m → Three.js 3.5 units  → 보기 편하게 1:1000 = 0.0035이 맞지만
// 화면에 보이려면 상대 비율만 맞추면 됨: floorH=3.5, bldW=20, bldD=15 (1unit=1m 기준)
const SCALE = 1;           // 1 Three.js unit = 1m (1:1000은 스케일바로 표기)
const FLOOR_H = 3.5 * SCALE;    // 층고 3.5m
const BLD_W   = 20  * SCALE;    // 건물 폭 20m
const BLD_D   = 15  * SCALE;    // 건물 깊이 15m
const GAP     = 0.15 * SCALE;   // 층 사이 간격

const OCCUPIED_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706'];
const VACANT_COLOR    = '#cbd5e1';

function FloorMesh({ floor, index, selected, onClick }: {
  floor: Floor; index: number; selected: boolean; onClick: () => void;
}) {
  const y = index * (FLOOR_H + GAP) + FLOOR_H / 2;
  const color = floor.vacant ? VACANT_COLOR : OCCUPIED_COLORS[index % OCCUPIED_COLORS.length];

  return (
    <group onClick={onClick}>
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[BLD_W, FLOOR_H, BLD_D]} />
        <meshStandardMaterial
          color={selected ? '#f59e0b' : color}
          transparent
          opacity={floor.vacant ? 0.55 : 0.92}
        />
      </mesh>
      {/* 층 번호 라벨 */}
      <Text
        position={[BLD_W / 2 + 1.5, y, 0]}
        fontSize={1.4}
        color={floor.vacant ? '#94a3b8' : '#1e293b'}
        anchorX="left"
        anchorY="middle"
      >
        {`${floor.level}F`}
      </Text>
    </group>
  );
}

// 스케일바 — 2D overlay (SVG)
function ScaleBar() {
  // 1:1000 스케일: Three.js에서 1unit=1m, 화면 표시는 "20m"
  return (
    <div className="absolute bottom-3 right-3 flex flex-col items-end gap-0.5">
      <svg width="80" height="16">
        <line x1="0" y1="8" x2="80" y2="8" stroke="white" strokeWidth="2" />
        <line x1="0" y1="4" x2="0" y2="12" stroke="white" strokeWidth="2" />
        <line x1="80" y1="4" x2="80" y2="12" stroke="white" strokeWidth="2" />
        <text x="40" y="6" textAnchor="middle" fill="white" fontSize="8" fontFamily="monospace">20m</text>
      </svg>
      <span className="text-[10px] text-white/60 font-mono">1:1,000</span>
    </div>
  );
}

export default function BuildingTwin({ floors }: BuildingTwinProps) {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const totalH = floors.length * (FLOOR_H + GAP);
  const camY   = totalH / 2;
  const camDist = Math.max(BLD_W, totalH) * 1.8;

  const vacantCount = floors.filter((f) => f.vacant).length;
  const vacancyPct  = Math.round((vacantCount / floors.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">3D 디지털 트윈</p>
          <p className="text-xs text-slate-400">층고 3.5m 기준 · 스케일 1:1,000</p>
        </div>
        <div className="text-right text-xs">
          <span className="font-mono text-amber-400">{vacantCount}</span>
          <span className="text-slate-400">/{floors.length}층 공실 ({vacancyPct}%)</span>
        </div>
      </div>

      {/* Three.js 캔버스 */}
      <div className="relative mb-4 h-[420px] overflow-hidden rounded-xl border border-white/10 bg-slate-900">
        <Canvas
          camera={{ position: [camDist * 0.8, camY, camDist * 0.8], fov: 40 }}
          className="h-full w-full"
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[30, 50, 30]} intensity={1.2} castShadow />
          <directionalLight position={[-20, 20, -20]} intensity={0.4} />

          {/* 바닥 그리드 */}
          <gridHelper args={[60, 20, '#334155', '#1e293b']} position={[0, 0, 0]} />

          {/* 건물 층 */}
          {floors.map((floor, i) => (
            <FloorMesh
              key={floor.level}
              floor={floor}
              index={i}
              selected={selectedFloor === floor.level}
              onClick={() => setSelectedFloor(selectedFloor === floor.level ? null : floor.level)}
            />
          ))}

          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={10}
            maxDistance={120}
            target={[0, camY, 0]}
          />
        </Canvas>

        <ScaleBar />

        {/* 선택 층 정보 팝업 */}
        {selectedFloor !== null && (() => {
          const f = floors.find((fl) => fl.level === selectedFloor);
          return f ? (
            <div className="absolute left-3 top-3 rounded-xl bg-black/70 px-3 py-2 text-xs backdrop-blur-sm">
              <p className="font-bold text-white">{f.level}층 · {f.industry}</p>
              <p className={f.vacant ? 'text-amber-400' : 'text-emerald-400'}>
                {f.vacant ? '공실' : '운영 중'}
              </p>
              <p className="text-slate-400 mt-0.5">
                실제 높이 {((f.level - 1) * 3.5).toFixed(1)}m ~ {(f.level * 3.5).toFixed(1)}m
              </p>
            </div>
          ) : null;
        })()}
      </div>

      {/* 층 목록 */}
      <div className="space-y-1.5 rounded-xl bg-white/5 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">층별 현황</p>
        {[...floors].reverse().map((floor) => (
          <button
            key={floor.level}
            onClick={() => setSelectedFloor(selectedFloor === floor.level ? null : floor.level)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors ${
              selectedFloor === floor.level
                ? 'bg-amber-500/20 text-amber-300'
                : 'hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono font-bold w-6 text-right">{floor.level}F</span>
              <span className="text-slate-300">{floor.industry}</span>
              <span className="text-slate-500 text-[10px]">{(floor.level * 3.5).toFixed(1)}m</span>
            </span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${
              floor.vacant
                ? 'bg-amber-900/50 text-amber-300'
                : 'bg-emerald-900/50 text-emerald-300'
            }`}>
              {floor.vacant ? '공실' : '운영'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
