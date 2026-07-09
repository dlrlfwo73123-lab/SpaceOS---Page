import { useEffect, useRef, useState } from 'react';
import { GU_POLYGONS, getDongCenter } from '@/lib/seoulBoundaries';

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        Marker: new (opts: Record<string, unknown>) => NaverMarker;
        Polygon: new (opts: Record<string, unknown>) => NaverPolygon;
        Event: { addListener: (target: unknown, ev: string, h: () => void) => void };
      };
    };
  }
}
interface NaverMapInstance { setCenter(ll: unknown): void; setZoom(z: number): void }
interface NaverMarker { setMap(m: NaverMapInstance | null): void }
interface NaverPolygon { setMap(m: NaverMapInstance | null): void }

const GU_CENTER: Record<string, [number, number]> = {
  '11680': [37.5172, 127.0473], '11740': [37.5301, 127.1238],
  '11305': [37.6396, 127.0255], '11500': [37.5509, 126.8495],
  '11620': [37.4784, 126.9516], '11215': [37.5385, 127.0823],
  '11530': [37.4954, 126.8874], '11545': [37.4569, 126.8955],
  '11350': [37.6542, 127.0568], '11320': [37.6688, 127.0471],
  '11230': [37.5744, 127.0396], '11590': [37.5124, 126.9393],
  '11440': [37.5663, 126.9018], '11410': [37.5791, 126.9368],
  '11650': [37.4837, 127.0324], '11200': [37.5633, 127.0371],
  '11290': [37.5894, 127.0167], '11710': [37.5145, 127.1059],
  '11470': [37.5270, 126.8561], '11560': [37.5264, 126.8963],
  '11170': [37.5311, 126.9810], '11380': [37.6026, 126.9291],
  '11110': [37.5735, 126.9788], '11140': [37.5640, 126.9975],
  '11260': [37.5953, 127.0951],
};

const DEFAULT_CENTER: [number, number] = [37.5665, 126.9780];

type NaverMapProps = {
  guCode: string;
  dongCode?: string;
  onSelectBuilding?: (id: string) => void;
};

export function NaverMap({ guCode, dongCode, onSelectBuilding }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const polygonsRef = useRef<NaverPolygon[]>([]);
  const selectedPolyRef = useRef<NaverPolygon | null>(null);
  const dongMarkerRef = useRef<NaverMarker | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const envClientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;
  const clientId = envClientId && envClientId !== 'YOUR_NAVER_CLIENT_ID' ? envClientId : '3a91WbDxtOPaPehOXqhl';

  // 1단계: 스크립트 로드 (상태 변경만 — DOM 마운트 대기)
  useEffect(() => {
    if (scriptRef.current) return;
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
    scriptRef.current = script;
    return () => {
      if (scriptRef.current) { document.head.removeChild(scriptRef.current); scriptRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // 2단계: scriptLoaded → map div가 DOM에 마운트된 후 initMap 호출
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.naver) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    mapRef.current = new window.naver.maps.Map(containerRef.current, {
      center: new window.naver.maps.LatLng(lat, lng),
      zoom: 11,
    });
    window.naver.maps.Event.addListener(mapRef.current, 'click', () => {
      onSelectBuilding?.('demo-building');
    });
    setMapReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  // 3단계: 지도 준비 or 구 변경 → 오버레이 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
    mapRef.current.setZoom(13);
    updateOverlays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, guCode]);

  // 4단계: 동 변경 → 마커 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.naver) return;
    updateDongMarker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, dongCode]);

  function ll(lat: number, lng: number) {
    return new window.naver.maps.LatLng(lat, lng);
  }

  function clearPolygons() {
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];
    selectedPolyRef.current?.setMap(null);
    selectedPolyRef.current = null;
  }

  function clearDongMarker() {
    dongMarkerRef.current?.setMap(null);
    dongMarkerRef.current = null;
  }

  function updateOverlays() {
    if (!mapRef.current || !window.naver) return;
    clearPolygons();
    clearDongMarker();

    // 선택된 구 경계 강조
    const coords = GU_POLYGONS[guCode];
    if (coords) {
      const poly = new window.naver.maps.Polygon({
        map: mapRef.current,
        paths: [coords.map(([lat, lng]) => ll(lat, lng))],
        strokeColor: '#4f46e5',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: '#6366f1',
        fillOpacity: 0.2,
      });
      selectedPolyRef.current = poly;
    }

    // 나머지 구 경계도 연하게 표시
    Object.entries(GU_POLYGONS).forEach(([code, coords]) => {
      if (code === guCode) return;
      const poly = new window.naver.maps.Polygon({
        map: mapRef.current!,
        paths: [coords.map(([lat, lng]) => ll(lat, lng))],
        strokeColor: '#6366f1',
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: '#818cf8',
        fillOpacity: 0.06,
      });
      polygonsRef.current.push(poly);
    });

    updateDongMarker();
  }

  function updateDongMarker() {
    if (!mapRef.current || !window.naver) return;
    clearDongMarker();
    if (!dongCode || !guCode) return;

    const [lat, lng] = getDongCenter(dongCode, guCode);
    dongMarkerRef.current = new window.naver.maps.Marker({
      map: mapRef.current,
      position: ll(lat, lng),
      icon: {
        content: `<div style="width:14px;height:14px;border-radius:50%;background:#4f46e5;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        anchor: new window.naver.maps.Point(7, 7),
      },
    });
  }

  return (
    <>
      {!scriptLoaded && (
        <div className="flex h-[65vh] min-h-[640px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
          <span className="text-2xl">🗺️</span>
          <p className="text-sm font-semibold text-slate-700">네이버 지도 불러오는 중…</p>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-[65vh] min-h-[640px] w-full rounded-xl overflow-hidden"
        style={{ display: scriptLoaded ? 'block' : 'none' }}
      />
    </>
  );
}
