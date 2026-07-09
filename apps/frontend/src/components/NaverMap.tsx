import { useEffect, useRef, useState } from 'react';
import { getMarketStats, getVacancyMarkers } from '@/lib/marketData';
import { SEOUL_GU } from '@/lib/seoul';
import { loadNaverMaps, onNaverMapsAuthFailure } from '@/lib/loadNaverMaps';
import { GU_POLYGONS, getAllDongCenters } from '@/lib/seoulBoundaries';
import type { NaverMapInstance, NaverMarker, NaverInfoWindow, NaverPolygon, NaverPanoramaInstance } from '@/types/naver-maps';

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
const SEOUL_CENTER: [number, number] = [37.5665, 126.9780];

function vacancyColor(rate: number): string {
  if (rate >= 15) return '#dc2626';
  if (rate >= 12) return '#f59e0b';
  return '#16a34a';
}

type DongItem = { code: string; name: string };

type NaverMapProps = {
  guCode: string;
  dongCode?: string;
  industryCode?: string;
  guDongs?: DongItem[];
  onSelectBuilding?: (id: string) => void;
  onSelectVacancy?: (id: string) => void;
};

export function NaverMap({ guCode, dongCode = '', industryCode = 'ALL', guDongs = [], onSelectBuilding, onSelectVacancy }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const panoramaRef = useRef<NaverPanoramaInstance | null>(null);
  const infoWindowRef = useRef<NaverInfoWindow | null>(null);
  const polygonsRef = useRef<NaverPolygon[]>([]);
  const selectedPolyRef = useRef<NaverPolygon | null>(null);
  const dongMarkersRef = useRef<NaverMarker[]>([]);
  const vacancyMarkersRef = useRef<NaverMarker[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [streetView, setStreetView] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const envClientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;
  const clientId = envClientId && envClientId !== 'YOUR_NAVER_CLIENT_ID' ? envClientId : 'x8gtogoy1i';

  useEffect(() => {
    const unsub = onNaverMapsAuthFailure((msg) => setAuthError(msg));
    let cancelled = false;
    loadNaverMaps(clientId)
      .then(() => { if (!cancelled) setScriptLoaded(true); })
      .catch(console.error);
    return () => { cancelled = true; unsub(); };
  }, [clientId]);

  // scriptLoaded → map div DOM 마운트 후 initMap
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

  // 거리뷰 토글 시 Panorama 인스턴스 생성
  useEffect(() => {
    if (!streetView || !panoramaContainerRef.current || !window.naver?.maps?.Panorama) return;
    const [lat, lng] = guCode ? (GU_CENTER[guCode] ?? SEOUL_CENTER) : SEOUL_CENTER;
    if (!panoramaRef.current) {
      panoramaRef.current = new window.naver.maps.Panorama(panoramaContainerRef.current, {
        position: new window.naver.maps.LatLng(lat, lng),
        pov: { pan: 0, tilt: 0, fov: 100 },
      });
    } else {
      panoramaRef.current.setPosition(new window.naver.maps.LatLng(lat, lng));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetView, guCode]);

  // 구/동/업종 변경 → 지도 업데이트
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !window.naver) return;
    try {
      const [lat, lng] = guCode ? (GU_CENTER[guCode] ?? SEOUL_CENTER) : SEOUL_CENTER;
      mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
      mapRef.current.setZoom(guCode ? (dongCode ? 14 : 12) : 11);
      updatePolygons();
      updateDongMarkers();
      updateVacancyMarkers();
    } catch (err) {
      console.error('지도 갱신 실패', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guCode, dongCode, industryCode, guDongs, scriptLoaded]);

  function ll(lat: number, lng: number) {
    return new window.naver.maps.LatLng(lat, lng);
  }

  function initMap() {
    if (!containerRef.current || !window.naver) return;
    try {
      const [lat, lng] = guCode ? (GU_CENTER[guCode] ?? SEOUL_CENTER) : SEOUL_CENTER;
      mapRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(lat, lng),
        zoom: guCode ? 12 : 11,
      });
      window.naver.maps.Event.addListener(mapRef.current, 'click', (e) => {
        if (panoramaRef.current && e) panoramaRef.current.setPosition((e as { coord: unknown }).coord);
        onSelectBuilding?.('demo-building');
      });
      updatePolygons();
      updateDongMarkers();
      updateVacancyMarkers();
    } catch (err) {
      console.error('네이버 지도 초기화 실패', err);
      setAuthError('지도 초기화 오류. NCP 콘솔에서 Client ID와 Web 서비스 URL 등록을 확인하세요.');
    }
  }

  function clearPolygons() {
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];
    selectedPolyRef.current?.setMap(null);
    selectedPolyRef.current = null;
  }

  function clearDongMarkers() {
    dongMarkersRef.current.forEach((m) => m.setMap(null));
    dongMarkersRef.current = [];
    infoWindowRef.current?.close();
  }

  function clearVacancyMarkers() {
    vacancyMarkersRef.current.forEach((m) => m.setMap(null));
    vacancyMarkersRef.current = [];
  }

  function updatePolygons() {
    if (!mapRef.current || !window.naver) return;
    clearPolygons();

    if (!guCode) {
      // 서울 전체 — 25개 구 모두 동일한 스타일로 표시
      Object.entries(GU_POLYGONS).forEach(([, coords]) => {
        polygonsRef.current.push(new window.naver.maps.Polygon({
          map: mapRef.current!,
          paths: [coords.map(([la, ln]) => ll(la, ln))],
          strokeColor: '#4f46e5',
          strokeOpacity: 0.5,
          strokeWeight: 1.5,
          fillColor: '#818cf8',
          fillOpacity: 0.12,
        }));
      });
    } else {
      // 선택된 구 강조 + 나머지 구 연하게
      const selCoords = GU_POLYGONS[guCode];
      if (selCoords) {
        selectedPolyRef.current = new window.naver.maps.Polygon({
          map: mapRef.current,
          paths: [selCoords.map(([la, ln]) => ll(la, ln))],
          strokeColor: '#4f46e5',
          strokeOpacity: 0.95,
          strokeWeight: 3,
          fillColor: '#6366f1',
          fillOpacity: 0.18,
        });
      }
      Object.entries(GU_POLYGONS).forEach(([code, coords]) => {
        if (code === guCode) return;
        polygonsRef.current.push(new window.naver.maps.Polygon({
          map: mapRef.current!,
          paths: [coords.map(([la, ln]) => ll(la, ln))],
          strokeColor: '#6366f1',
          strokeOpacity: 0.2,
          strokeWeight: 1,
          fillColor: '#818cf8',
          fillOpacity: 0.04,
        }));
      });
    }
  }

  function updateDongMarkers() {
    if (!mapRef.current || !window.naver) return;
    clearDongMarkers();
    if (!guCode || guDongs.length === 0) return;

    // 선택된 구의 모든 동을 점으로 표시
    const centers = getAllDongCenters(guDongs, guCode);
    const gu = SEOUL_GU.find((g) => g.code === guCode);

    centers.forEach(({ code, name, center }) => {
      const stats = getMarketStats(guCode, code, industryCode);
      const color = vacancyColor(stats.vacancyRate);
      const isSelected = code === dongCode;

      const marker = new window.naver.maps.Marker({
        position: ll(center[0], center[1]),
        map: mapRef.current!,
        icon: {
          content: isSelected
            ? `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color},0 2px 6px rgba(0,0,0,0.4);"></div>`
            : `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);opacity:0.85"></div>`,
          anchor: new window.naver.maps.Point(isSelected ? 10 : 6, isSelected ? 10 : 6),
        },
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.naver.maps.InfoWindow({ content: ' ' });
        }
        infoWindowRef.current.setContent(`
          <div style="padding:10px 12px;min-width:160px;font-size:12px;line-height:1.6;">
            <p style="font-weight:700;margin-bottom:4px;">${gu?.name ?? ''} ${name}</p>
            <p>공실률: <b style="color:${color}">${stats.vacancyRate.toFixed(1)}%</b></p>
            <p>유동인구: ${Math.round(stats.floatingPop).toLocaleString()}명</p>
            <p>인구밀도: ${Math.round(stats.popDensity).toLocaleString()}명/km²</p>
            <p>임대시세: ${stats.rentPer33.toFixed(1)}만원/3.3㎡</p>
          </div>
        `);
        infoWindowRef.current.open(mapRef.current!, marker);
        if (panoramaRef.current) panoramaRef.current.setPosition(ll(center[0], center[1]));
      });

      dongMarkersRef.current.push(marker);
    });
  }

  function updateVacancyMarkers() {
    if (!mapRef.current || !window.naver) return;
    clearVacancyMarkers();
    if (!guCode) return;

    const centers = getAllDongCenters(guDongs, guCode);
    const markers = getVacancyMarkers(guCode, dongCode, centers, dongCode ? 8 : 15);

    markers.forEach((v) => {
      const marker = new window.naver.maps.Marker({
        position: ll(v.lat, v.lng),
        map: mapRef.current!,
        icon: {
          content: `<div style="width:10px;height:10px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(239,68,68,0.6);"></div>`,
          anchor: new window.naver.maps.Point(5, 5),
        },
        zIndex: 50,
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.naver.maps.InfoWindow({ content: ' ' });
        }
        infoWindowRef.current.setContent(`
          <div style="padding:10px 14px;min-width:180px;font-size:12px;line-height:1.7;">
            <p style="font-weight:700;font-size:13px;margin-bottom:6px;color:#dc2626;">📍 공실 매물 (데모)</p>
            <p style="color:#64748b;margin-bottom:4px;">${v.dongName}</p>
            <p>층: <b>${v.floor}층</b></p>
            <p>면적: <b>${v.sqm}㎡</b></p>
            <p>월세: <b>${v.rentMonthly}만원/월</b></p>
            <p>전 업종: ${v.lastIndustry}</p>
            <p>공실 기간: ${v.emptyMonths}개월</p>
            <p style="margin-top:6px;font-size:10px;color:#94a3b8;">※ 데모 데이터 — 실제 매물과 다름</p>
          </div>
        `);
        infoWindowRef.current.open(mapRef.current!, marker);
        onSelectVacancy?.(v.id);
        onSelectBuilding?.(`vacancy-${v.id}`);
      });

      vacancyMarkersRef.current.push(marker);
    });
  }

  if (authError) {
    return (
      <div className="flex h-[65vh] min-h-[580px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-center px-6">
        <span className="text-2xl">⚠️</span>
        <p className="text-sm font-semibold text-red-700">{authError}</p>
        <p className="text-xs text-red-500">
          NCP 콘솔 › AI·NAVER API › Maps › 앱 관리 › Web 서비스 URL에<br />
          <code className="bg-red-100 px-1 rounded">https://dlrlfwo73123-lab.github.io</code> 등록 후 새로고침
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 지도/거리뷰 토글 */}
      {scriptLoaded && (
        <div className="mb-2 flex gap-1.5">
          <button
            onClick={() => setStreetView(false)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${!streetView ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            🗺 지도
          </button>
          <button
            onClick={() => setStreetView(true)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${streetView ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            🔭 거리뷰
          </button>
          {guCode ? (
            <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#16a34a',border:'1px solid white'}}></span>저공실</span>
              <span className="inline-flex items-center gap-1"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#f59e0b',border:'1px solid white'}}></span>중간</span>
              <span className="inline-flex items-center gap-1"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#dc2626',border:'1px solid white'}}></span>고공실</span>
              <span className="ml-2 inline-flex items-center gap-1"><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#ef4444',border:'1px solid white'}}></span>공실 매물</span>
            </span>
          ) : (
            <span className="ml-auto self-center text-[11px] text-slate-400">구를 선택하면 동별 공실률이 점으로 표시됩니다</span>
          )}
        </div>
      )}

      {/* 로딩 */}
      {!scriptLoaded && (
        <div className="flex h-[65vh] min-h-[580px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
          <span className="text-2xl">🗺️</span>
          <p className="text-sm font-semibold text-slate-700">네이버 지도 불러오는 중…</p>
        </div>
      )}

      {/* 지도 */}
      <div
        ref={containerRef}
        className="h-[65vh] min-h-[580px] w-full rounded-xl overflow-hidden"
        style={{ display: scriptLoaded && !streetView ? 'block' : 'none' }}
      />

      {/* 거리뷰 */}
      <div
        ref={panoramaContainerRef}
        className="h-[65vh] min-h-[580px] w-full rounded-xl overflow-hidden"
        style={{ display: scriptLoaded && streetView ? 'block' : 'none' }}
      />
    </div>
  );
}
