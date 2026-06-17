import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { fetchHeatmap, type HeatmapFeatureCollection } from '@/lib/api';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
mapboxgl.accessToken = TOKEN ?? '';

type VacancyHeatmapProps = {
  district?: string;
  onSelectBuilding?: (buildingId: string) => void;
};

const districtCenters: Record<string, [number, number]> = {
  lapesta: [126.978, 37.5665],
  gangnam: [127.0276, 37.4979],
  hongdae: [126.9255, 37.5572],
  jongno: [126.9920, 37.5703],
  default: [126.978, 37.5665],
};

const fallback: HeatmapFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { grid_id: 'g1', lng: 126.978, lat: 37.5665, vacancy_rate: 0.82, predicted_rate: 0.78 },
    { grid_id: 'g2', lng: 126.979, lat: 37.567, vacancy_rate: 0.64, predicted_rate: 0.69 },
    { grid_id: 'g3', lng: 126.977, lat: 37.5658, vacancy_rate: 0.51, predicted_rate: 0.55 },
    { grid_id: 'g4', lng: 126.9802, lat: 37.5652, vacancy_rate: 0.73, predicted_rate: 0.7 },
  ].map(({ grid_id, lng, lat, vacancy_rate, predicted_rate }) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { grid_id, vacancy_rate, predicted_rate },
  })),
};

export function VacancyHeatmap({ district = 'lapesta', onSelectBuilding }: VacancyHeatmapProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Mapbox 토큰 없으면 fallback UI
  if (!TOKEN) {
    return (
      <div className="flex h-[600px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-100 text-slate-500">
        <span className="text-4xl">🗺️</span>
        <p className="text-sm font-medium">지도를 표시하려면 Mapbox 토큰이 필요합니다</p>
        <code className="rounded bg-slate-200 px-2 py-1 text-xs">
          VITE_MAPBOX_TOKEN=pk.xxx 를 .env.local 에 추가하세요
        </code>
        {/* TODO: 공식 Mapbox 토큰 발급 후 .env.local에 설정 */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {fallback.features.map((f) => (
            <button
              key={f.properties.grid_id}
              onClick={() => onSelectBuilding?.(f.properties.grid_id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-indigo-400"
            >
              <span className="font-medium">{f.properties.grid_id}</span>
              <span className="ml-2 text-amber-600">
                공실율 {Math.round(f.properties.vacancy_rate * 100)}%
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!ref.current) return;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: districtCenters[district] ?? districtCenters.default,
      zoom: 14,
    });

    map.on('load', async () => {
      try {
        const collection = await fetchHeatmap(district);
        const data = collection.features.length ? collection : fallback;

        map.addSource('vacancy', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.features.map((f) => ({
              type: 'Feature',
              properties: {
                w: f.properties.vacancy_rate,
                grid_id: f.properties.grid_id,
                predicted_rate: f.properties.predicted_rate,
              },
              geometry: f.geometry,
            })),
          },
        });

        map.addLayer({
          id: 'vacancy-heat',
          type: 'heatmap',
          source: 'vacancy',
          paint: {
            'heatmap-weight': ['get', 'w'],
            'heatmap-radius': 28,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)', 0.4, '#fde68a', 0.7, '#fb923c', 1, '#dc2626',
            ],
          },
        });

        map.addLayer({
          id: 'vacancy-point',
          type: 'circle',
          source: 'vacancy',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'w'], 0, 4, 1, 10],
            'circle-color': ['step', ['get', 'w'], '#4f46e5', 0.5, '#f59e0b', 0.8, '#dc2626'],
            'circle-opacity': 0.8,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        });

        map.on('click', 'vacancy-point', (e) => {
          const id = e.features?.[0]?.properties?.grid_id ?? 'demo-building';
          onSelectBuilding?.(String(id));
        });
      } catch (err) {
        console.warn('Heatmap load failed, fallback 사용', err);
      }
    });

    return () => map.remove();
  }, [district, onSelectBuilding]);

  return <div ref={ref} className="h-[600px] w-full rounded-xl" />;
}

export default VacancyHeatmap;
