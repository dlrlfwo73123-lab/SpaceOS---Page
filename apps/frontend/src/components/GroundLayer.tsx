import { useMemo } from 'react';
import type { GroundData, GroundLayerData, GroundKind } from '../lib/groundTiles';

// 장면 좌표: 1 단위 = 1m, x=동, z=-북 (BuildingTwin.coordToGrid 와 같은 등장방형 근사)
const M_PER_LAT = 111320;

const STYLE: Record<GroundKind, { color: string; y: number; offset: number }> = {
  carriageway: { color: '#454d5e', y: 0.04, offset: -1 },
  sidewalk: { color: '#9aa4b5', y: 0.07, offset: -2 },
  crosswalk: { color: '#e5e7eb', y: 0.10, offset: -3 },
};

function Layer({ layer, lat, lng }: { layer: GroundLayerData; lat: number; lng: number }) {
  const { positions, normals, indices } = useMemo(() => {
    const mPerLng = M_PER_LAT * Math.cos((lat * Math.PI) / 180);
    const n = layer.positions.length / 2;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (layer.positions[i * 2] - lng) * mPerLng;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = -(layer.positions[i * 2 + 1] - lat) * M_PER_LAT;
      nor[i * 3 + 1] = 1;
    }
    return { positions: pos, normals: nor, indices: new Uint32Array(layer.indices) };
  }, [layer, lat, lng]);

  const s = STYLE[layer.kind];
  return (
    <mesh position={[0, s.y, 0]} receiveShadow>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-normal" args={[normals, 3]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial
        color={s.color}
        roughness={0.95}
        side={2 /* DoubleSide: 좌표 반전으로 감김 방향이 뒤집혀도 보이게 */}
        transparent={layer.estimated}
        opacity={layer.estimated ? 0.82 : 1}
        polygonOffset
        polygonOffsetFactor={s.offset}
        polygonOffsetUnits={s.offset}
      />
    </mesh>
  );
}

export default function GroundLayer({ data, lat, lng }: { data: GroundData; lat: number; lng: number }) {
  return (
    <group>
      {data.layers.map((l, i) => (
        <Layer key={i} layer={l} lat={lat} lng={lng} />
      ))}
    </group>
  );
}
