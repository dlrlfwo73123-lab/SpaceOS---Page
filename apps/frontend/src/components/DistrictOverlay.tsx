import { useMemo } from 'react';
import { guBoundaryRibbon } from '../lib/guBoundary';

const M_PER_LAT = 111320;

/** 공실률 구간 색 (StatsPanel의 기준과 같음: 15%↑ 빨강, 12%↑ 주황, 그 외 초록) */
export function vacancyTone(rate: number | null): { hex: string; label: string } {
  if (rate === null) return { hex: '#64748b', label: '데이터 없음' };
  if (rate >= 15) return { hex: '#f43f5e', label: '높음' };
  if (rate >= 12) return { hex: '#f59e0b', label: '보통' };
  return { hex: '#10b981', label: '낮음' };
}

/** 구 경계선(반경 안에 있을 때만 보임). 색은 구 공실률 구간색. */
export function GuBoundaryRibbon({ guCode, lat, lng, color }: { guCode: string; lat: number; lng: number; color: string }) {
  const ribbon = useMemo(() => guBoundaryRibbon(guCode, lat, lng), [guCode, lat, lng]);
  if (!ribbon) return null;
  return (
    <mesh position={[0, 0.14, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[ribbon.positions, 3]} />
        <bufferAttribute attach="index" args={[ribbon.indices, 1]} />
      </bufferGeometry>
      <meshBasicMaterial color={color} side={2} transparent opacity={0.9} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
    </mesh>
  );
}

/** 주변 공실 위치마다 바닥에 겹쳐 쌓이는 원형 데칼 → 공실이 몰린 곳이 진하게 보임 */
export function VacancyDecals({ lat, lng, points, color }: {
  lat: number; lng: number; points: { id: string; lat: number; lng: number }[]; color: string;
}) {
  const mPerLng = M_PER_LAT * Math.cos((lat * Math.PI) / 180);
  return (
    <group>
      {points.map((p) => {
        const x = (p.lng - lng) * mPerLng;
        const z = -(p.lat - lat) * M_PER_LAT;
        if (Math.hypot(x, z) > 1000) return null;
        return (
          <mesh key={p.id} position={[x, 0.12, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[55, 40]} />
            <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
          </mesh>
        );
      })}
    </group>
  );
}
