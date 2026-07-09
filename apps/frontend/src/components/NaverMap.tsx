import { useEffect, useRef, useState } from 'react';
import { getMarketStats } from '@/lib/marketData';
import { SEOUL_GU } from '@/lib/seoul';
import { loadNaverMaps, onNaverMapsAuthFailure } from '@/lib/loadNaverMaps';
import { GU_POLYGONS, getDongCenter } from '@/lib/seoulBoundaries';
import type { NaverMapInstance, NaverMarker, NaverInfoWindow, NaverPolygon } from '@/types/naver-maps';

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

function vacancyColor(rate: number): string {
  if (rate >= 15) return '#dc2626';
  if (rate >= 12) return '#f59e0b';
  return '#16a34a';
}

type NaverMapProps = {
  guCode: string;
  dongCode?: string;
  industryCode?: string;
  onSelectBuilding?: (id: string) => void;
};

export function NaverMap({ guCode, dongCode = '', industryCode = 'ALL', onSelectBuilding }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const dongMarkerRef = useRef<NaverMarker | null>(null);
  const infoWindowRef = useRef<NaverInfoWindow | null>(null);
  const polygonsRef = useRef<NaverPolygon[]>([]);
  const selectedPolyRef = useRef<NaverPolygon | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const envClientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;
  const clientId = envClientId && envClientId !== 'YOUR_NAVER_CLIENT_ID' ? envClientId : 'x8gtogoy1i';

  useEffect(() => {
    const unsubscribe = onNaverMapsAuthFailure((message) => setAuthError(message));
    let cancelled = false;
    loadNaverMaps(clientId)
      .then(() => { if (!cancelled) setScriptLoaded(true); })
      .catch((err) => console.error(err));
    return () => { cancelled = true; unsubscribe(); };
  }, [clientId]);

  // scriptLoaded 후 containerRef DOM 마운트 보장 → initMap
  useEffect(() => {
    if (!scriptLoaded || mapRef.current) return;
    if (containerRef.current) { initMap(); return; }
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled || mapRef.current) return;
      if (containerRef.current) { initMap(); window.clearInterval(id); }
    }, 50);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [scriptLoaded]);

  // 구/동 변경 → 지도 중심 이동 + 마커·폴리곤 업데이트
  useEffect(() => {
    if (!window.naver || !scriptLoaded || !mapRef.current) return;
    try {
      const [gLat, gLng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
      mapRef.current.setCenter(new window.naver.maps.LatLng(gLat, gLng));
      mapRef.current.setZoom(dongCode ? 15 : 13);
      updatePolygons();
      updateDongMarker();
    } catch (err) {
      console.error('지도 갱신 실패', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guCode, dongCode, industryCode, scriptLoaded]);

  function ll(lat: number, lng: number) {
    return new window.naver.maps.LatLng(lat, lng);
  }

  function initMap() {
    if (!containerRef.current || !window.naver) return;
    try {
      const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
      mapRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(lat, lng),
        zoom: 11,
      });
      window.naver.maps.Event.addListener(mapRef.current, 'click', () => {
        onSelectBuilding?.('demo-building');
      });
      updatePolygons();
      updateDongMarker();
    } catch (err) {
      console.error('네이버 지도 초기화 실패', err);
      setAuthError('지도를 초기화하는 중 오류가 발생했습니다. 네이버 지도 Open API 인증 상태를 확인하세요.');
    }
  }

  function clearPolygons() {
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];
    selectedPolyRef.current?.setMap(null);
    selectedPolyRef.current = null;
  }

  function updatePolygons() {
    if (!mapRef.current || !window.naver) return;
    clearPolygons();

    // 선택된 구 경계 강조
    const coords = GU_POLYGONS[guCode];
    if (coords) {
      selectedPolyRef.current = new window.naver.maps.Polygon({
        map: mapRef.current,
        paths: [coords.map(([lat, lng]) => ll(lat, lng))],
        strokeColor: '#4f46e5',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: '#6366f1',
        fillOpacity: 0.18,
      });
    }

    // 나머지 구 경계 연하게 표시
    Object.entries(GU_POLYGONS).forEach(([code, c]) => {
      if (code === guCode) return;
      polygonsRef.current.push(new window.naver.maps.Polygon({
        map: mapRef.current!,
        paths: [c.map(([lat, lng]) => ll(lat, lng))],
        strokeColor: '#6366f1',
        strokeOpacity: 0.25,
        strokeWeight: 1,
        fillColor: '#818cf8',
        fillOpacity: 0.05,
      }));
    });
  }

  function updateDongMarker() {
    if (!mapRef.current || !window.naver) return;
    dongMarkerRef.current?.setMap(null);
    infoWindowRef.current?.close();
    if (!dongCode) return;

    const [lat, lng] = getDongCenter(dongCode, guCode);
    const latlng = ll(lat, lng);
    const stats = getMarketStats(guCode, dongCode, industryCode);
    const color = vacancyColor(stats.vacancyRate);
    const gu = SEOUL_GU.find((g) => g.code === guCode);
    const dong = gu?.dongs.find((d) => d.code === dongCode);

    if (!dongMarkerRef.current) {
      dongMarkerRef.current = new window.naver.maps.Marker({ position: latlng, map: mapRef.current });
    } else {
      dongMarkerRef.current.setPosition(latlng);
      dongMarkerRef.current.setMap(mapRef.current);
    }
    dongMarkerRef.current.setIcon({
      content: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
      anchor: new window.naver.maps.Point(8, 8),
    });

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.naver.maps.InfoWindow({ content: ' ' });
    }
    infoWindowRef.current.setContent(`
      <div style="padding:10px 12px;min-width:160px;font-size:12px;line-height:1.6;">
        <p style="font-weight:700;margin-bottom:4px;">${gu?.name ?? ''} ${dong?.name ?? ''}</p>
        <p>공실률: <b style="color:${color}">${stats.vacancyRate.toFixed(1)}%</b></p>
        <p>유동인구: ${Math.round(stats.floatingPop).toLocaleString()}명</p>
        <p>인구밀도: ${Math.round(stats.popDensity).toLocaleString()}명/km²</p>
        <p>임대시세: ${stats.rentPer33.toFixed(1)}만원/3.3㎡</p>
      </div>
    `);
    infoWindowRef.current.open(mapRef.current, dongMarkerRef.current);
  }

  if (authError) {
    return (
      <div className="flex h-[65vh] min-h-[640px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-center px-6">
        <span className="text-2xl">⚠️</span>
        <p className="text-sm font-semibold text-red-700">{authError}</p>
        <p className="text-xs text-red-500">NCP 콘솔 › AI·NAVER API › Maps › 앱 관리에서 Web 서비스 URL에<br /><code>https://dlrlfwo73123-lab.github.io</code> 등록 여부를 확인하세요.</p>
      </div>
    );
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
