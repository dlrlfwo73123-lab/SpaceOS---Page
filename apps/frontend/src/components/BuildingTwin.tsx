import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import { getBuildingFloors, type BuildingFloor as Floor } from '@/lib/api';
import { ErrorBoundary } from './ErrorBoundary';
import type { NaverPanoramaInstance } from '@/types/naver-maps';

type BuildingTwinProps = {
  buildingId: string;
  lat?: number;
  lng?: number;
};

const FALLBACK_FLOORS: Floor[] = [
  { level: 1, industry: '카페', vacant: false },
  { level: 2, industry: '미용실', vacant: true },
  { level: 3, industry: '편의점', vacant: false },
  { level: 4, industry: '의류', vacant: true },
  { level: 5, industry: '음식점', vacant: false },
];

const FLOOR_H = 3.5;
const BLD_W   = 22;
const BLD_D   = 16;
const GAP     = 0.12;

const FACADE_COLORS = ['#3b82f6', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b'];
const VACANT_COLOR  = '#94a3b8';

function FloorMesh({ floor, index, selected, onClick }: {
  floor: Floor; index: number; selected: boolean; onClick: () => void;
}) {
  const y = index * (FLOOR_H + GAP) + FLOOR_H / 2;
  const wallColor = floor.vacant ? VACANT_COLOR : FACADE_COLORS[index % FACADE_COLORS.length];
  const glassColor = floor.vacant ? '#c8d3de' : '#bfdbfe';
  const glassOpacity = floor.vacant ? 0.3 : 0.55;

  return (
    <group onClick={onClick}>
      <mesh position={[0, y, 0]}>
        <boxGeometry args={[BLD_W, FLOOR_H - 0.3, BLD_D]} />
        <meshStandardMaterial
          color={selected ? '#f59e0b' : wallColor}
          transparent
          opacity={floor.vacant ? 0.6 : 0.9}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, y, BLD_D / 2 + 0.05]}>
        <planeGeometry args={[BLD_W - 2, FLOOR_H - 0.8]} />
        <meshStandardMaterial
          color={selected ? '#fcd34d' : glassColor}
          transparent
          opacity={glassOpacity}
          roughness={0.05}
          metalness={0.6}
        />
      </mesh>
      <Text
        position={[BLD_W / 2 + 1.8, y, 0]}
        fontSize={1.3}
        color={floor.vacant ? '#94a3b8' : '#e2e8f0'}
        anchorX="left"
        anchorY="middle"
      >
        {`${floor.level}F  ${floor.industry}`}
      </Text>
    </group>
  );
}

function Rooftop({ topY, w, d }: { topY: number; w: number; d: number }) {
  return (
    <group>
      <mesh position={[0, topY + 0.3, 0]}>
        <boxGeometry args={[w + 0.4, 0.6, d + 0.4]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[-w * 0.3, topY + 2.1, 0]}>
        <boxGeometry args={[w * 0.28, 3.6, d * 0.35]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Lobby({ w, d }: { w: number; d: number }) {
  const cols: [number, number][] = [
    [-w * 0.38, -d * 0.35], [w * 0.38, -d * 0.35],
    [-w * 0.38, d * 0.35],  [w * 0.38, d * 0.35],
  ];
  return (
    <>
      {cols.map(([cx, cz], i) => (
        <mesh key={i} position={[cx, 0.75, cz]}>
          <cylinderGeometry args={[0.6, 0.7, 1.5, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

function ScaleBar() {
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

// 네이버 파노라마(거리뷰) — 실제 건물 위치 기반
function NaverPanorama({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<NaverPanoramaInstance | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (!containerRef.current) return;

    const tryInit = () => {
      if (!window.naver?.maps?.Panorama) {
        setStatus('unavailable');
        return;
      }
      try {
        if (panoramaRef.current) {
          panoramaRef.current.setPosition(new window.naver.maps.LatLng(lat, lng));
          setStatus('ready');
          return;
        }
        panoramaRef.current = new window.naver.maps.Panorama(containerRef.current!, {
          position: new window.naver.maps.LatLng(lat, lng),
          pov: { pan: 0, tilt: 0, fov: 90 },
        });
        // 파노라마 위치 변경 이벤트 감지 — 이미지 없을 때 fallback
        window.naver.maps.Event.addListener(panoramaRef.current, 'pano_status', (e: unknown) => {
          setStatus((e as string) === 'UNAVAILABLE' ? 'unavailable' : 'ready');
        });
        setStatus('ready');
      } catch {
        setStatus('unavailable');
      }
    };

    // 이미 로드된 경우 바로 실행, 아니면 대기
    if (window.naver?.maps?.Panorama) {
      tryInit();
    } else {
      const timer = window.setInterval(() => {
        if (window.naver?.maps?.Panorama) {
          window.clearInterval(timer);
          tryInit();
        }
      }, 200);
      return () => window.clearInterval(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <p className="text-xs text-slate-400">거리뷰 불러오는 중…</p>
        </div>
      )}
      {status === 'unavailable' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 text-center px-4">
          <span className="text-2xl">📷</span>
          <p className="text-xs font-semibold text-slate-300">거리뷰 이미지 없음</p>
          <p className="text-[10px] text-slate-500">해당 위치의 네이버 거리뷰 데이터가 없습니다</p>
        </div>
      )}
      <div className="absolute top-2 left-2 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
        네이버 거리뷰
      </div>
    </div>
  );
}

export default function BuildingTwin({ buildingId, lat, lng }: BuildingTwinProps) {
  const [floors, setFloors] = useState<Floor[]>(FALLBACK_FLOORS);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [view, setView] = useState<'3d' | 'street' | 'split'>('split');

  useEffect(() => {
    setSelectedFloor(null);
    getBuildingFloors(buildingId)
      .then((data) => setFloors(data.length ? data : FALLBACK_FLOORS))
      .catch(() => setFloors(FALLBACK_FLOORS));
  }, [buildingId]);

  const totalH = floors.length * (FLOOR_H + GAP);
  const camY   = totalH / 2;
  const camDist = Math.max(BLD_W, totalH) * 1.9;

  const vacantCount = floors.filter((f) => f.vacant).length;
  const vacancyPct  = Math.round((vacantCount / floors.length) * 100);

  const has3D = true;
  const hasStreetView = !!(lat && lng);

  const ThreeDCanvas = (
    <div className="relative h-full w-full">
      <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-slate-400 text-sm">3D 렌더링 오류</div>}>
        <Canvas
          camera={{ position: [camDist * 0.75, camY * 1.1, camDist * 0.75], fov: 38 }}
          className="h-full w-full"
        >
          <ambientLight intensity={0.45} />
          <directionalLight position={[40, 60, 30]} intensity={1.3} castShadow />
          <directionalLight position={[-30, 30, -20]} intensity={0.35} color="#bfdbfe" />
          <hemisphereLight args={['#1e3a5f', '#0f172a', 0.4]} />
          <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[80, 80]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          <gridHelper args={[80, 24, '#1e293b', '#1e293b']} position={[0, 0, 0]} />
          {[[-30, 0, 10], [32, 0, -8], [-28, 0, -15], [30, 0, 20]].map(([cx, , cz], i) => (
            <mesh key={i} position={[cx, 5 + i * 2, cz]}>
              <boxGeometry args={[14, 10 + i * 4, 10]} />
              <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
          ))}
          <Lobby w={BLD_W} d={BLD_D} />
          {floors.map((floor, i) => (
            <FloorMesh
              key={floor.level}
              floor={floor}
              index={i}
              selected={selectedFloor === floor.level}
              onClick={() => setSelectedFloor(selectedFloor === floor.level ? null : floor.level)}
            />
          ))}
          <Rooftop topY={totalH} w={BLD_W} d={BLD_D} />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={12}
            maxDistance={140}
            target={[0, camY, 0]}
          />
        </Canvas>
      </ErrorBoundary>
      <ScaleBar />
      {selectedFloor !== null && (() => {
        const f = floors.find((fl) => fl.level === selectedFloor);
        return f ? (
          <div className="absolute left-3 top-3 rounded-xl bg-black/70 px-3 py-2 text-xs backdrop-blur-sm">
            <p className="font-bold text-white">{f.level}층 · {f.industry}</p>
            <p className={f.vacant ? 'text-amber-400' : 'text-emerald-400'}>{f.vacant ? '공실' : '운영 중'}</p>
            <p className="text-slate-400 mt-0.5">{((f.level - 1) * 3.5).toFixed(1)}m ~ {(f.level * 3.5).toFixed(1)}m</p>
          </div>
        ) : null;
      })()}
      <div className="absolute top-2 right-2 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white">
        데모 데이터
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">3D 디지털 트윈</p>
          <p className="text-xs text-slate-400">
            층고 3.5m · 1:1,000 스케일
            {hasStreetView ? ' · 네이버 거리뷰 연동' : ''}
            {' · 데모 데이터'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="font-mono text-amber-400">{vacantCount}</span>
            <span className="text-slate-400">/{floors.length}층 공실 ({vacancyPct}%)</span>
          </div>
          {/* 뷰 전환 탭 */}
          {hasStreetView && (
            <div className="flex gap-1 rounded-lg bg-slate-800 p-0.5">
              {([['split', '분할'], ['street', '거리뷰'], ['3d', '3D']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    view === v ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 메인 뷰 */}
      <div className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900"
        style={{ height: view === 'split' ? '640px' : '480px' }}>
        {!hasStreetView || view === '3d' ? (
          // 3D만
          <div className="h-full w-full">{ThreeDCanvas}</div>
        ) : view === 'street' ? (
          // 거리뷰만
          <div className="h-full w-full">
            <Suspense fallback={null}>
              <NaverPanorama lat={lat!} lng={lng!} />
            </Suspense>
          </div>
        ) : (
          // 분할: 위쪽 거리뷰 + 아래쪽 3D
          <div className="flex h-full flex-col">
            <div className="relative" style={{ height: '50%' }}>
              <Suspense fallback={null}>
                <NaverPanorama lat={lat!} lng={lng!} />
              </Suspense>
              {/* 위치 좌표 표시 */}
              <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white/70">
                {lat!.toFixed(5)}, {lng!.toFixed(5)}
              </div>
            </div>
            <div className="relative border-t border-white/10" style={{ height: '50%' }}>
              {ThreeDCanvas}
            </div>
          </div>
        )}
      </div>

      {/* 층별 현황 */}
      <div className="space-y-1.5 rounded-xl bg-white/5 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">층별 현황</p>
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

      {hasStreetView && (
        <p className="mt-3 text-[10px] text-slate-500">
          거리뷰: 네이버 지도 파노라마 API 기반 실제 위치({lat!.toFixed(4)}, {lng!.toFixed(4)}) · 3D 모델은 층수/업종 기반 데모
        </p>
      )}
    </div>
  );
}
