import { useEffect, useRef, useState } from 'react';
import { getMarketStats, getVacancyMarkers, getStartupAreaRecs, type VacancyMarker } from '@/lib/marketData';
import { SEOUL_GU } from '@/lib/seoul';
import { loadNaverMaps, onNaverMapsAuthFailure } from '@/lib/loadNaverMaps';
import { GU_POLYGONS, getAllDongCenters } from '@/lib/seoulBoundaries';
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
const SEOUL_CENTER: [number, number] = [37.5665, 126.9780];

// 25개 구별 고유 색상
const GU_COLOR_LIST = [
  '#ef4444','#f97316','#eab308','#84cc16','#22c55e',
  '#10b981','#14b8a6','#06b6d4','#3b82f6','#6366f1',
  '#8b5cf6','#a855f7','#ec4899','#f43f5e','#0ea5e9',
  '#d946ef','#fb923c','#4ade80','#34d399','#2dd4bf',
  '#38bdf8','#818cf8','#fb7185','#a3e635','#64748b',
];
const GU_CODE_ORDER = Object.keys(GU_CENTER);
function guColor(code: string) {
  const idx = GU_CODE_ORDER.indexOf(code);
  const hex = GU_COLOR_LIST[idx < 0 ? 0 : idx % GU_COLOR_LIST.length];
  return hex.startsWith('#') ? hex : `#${hex}`;
}

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
  onSelectVacancy?: (id: string, lat: number, lng: number, guCode: string, dongCode: string, vacancyData: VacancyMarker) => void;
};

export function NaverMap({ guCode, dongCode = '', industryCode = 'ALL', guDongs = [], onSelectBuilding, onSelectVacancy }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const infoWindowRef = useRef<NaverInfoWindow | null>(null);
  const polygonsRef = useRef<NaverPolygon[]>([]);
  const selectedPolyRef = useRef<NaverPolygon | null>(null);
  const dongMarkersRef = useRef<NaverMarker[]>([]);
  const vacancyMarkersRef = useRef<NaverMarker[]>([]);
  const startupMarkersRef = useRef<NaverMarker[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
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

  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !window.naver) return;
    try {
      const [lat, lng] = guCode ? (GU_CENTER[guCode] ?? SEOUL_CENTER) : SEOUL_CENTER;
      mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
      mapRef.current.setZoom(guCode ? (dongCode ? 14 : 12) : 11);
      updatePolygons();
      updateDongMarkers();
      updateVacancyMarkers();
      clearStartupMarkers();
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
      window.naver.maps.Event.addListener(mapRef.current, 'click', () => {
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

  function clearStartupMarkers() {
    startupMarkersRef.current.forEach((m) => m.setMap(null));
    startupMarkersRef.current = [];
  }

  function updatePolygons() {
    if (!mapRef.current || !window.naver) return;
    clearPolygons();

    if (!guCode) {
      // 서울 전체 — 25개 구 각자 고유 색상으로 표시
      GU_CODE_ORDER.forEach((code) => {
        const coords = GU_POLYGONS[code];
        if (!coords) return;
        const color = guColor(code);
        polygonsRef.current.push(new window.naver.maps.Polygon({
          map: mapRef.current!,
          paths: [coords.map(([la, ln]) => ll(la, ln))],
          strokeColor: color,
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
          fillColor: color,
          fillOpacity: 0.15,
        }));
      });
    } else {
      // 선택된 구 강조 + 나머지 구 연하게
      const color = guColor(guCode);
      const selCoords = GU_POLYGONS[guCode];
      if (selCoords) {
        selectedPolyRef.current = new window.naver.maps.Polygon({
          map: mapRef.current,
          paths: [selCoords.map(([la, ln]) => ll(la, ln))],
          strokeColor: color,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          fillColor: color,
          fillOpacity: 0.18,
        });
      }
      Object.entries(GU_POLYGONS).forEach(([code, coords]) => {
        if (code === guCode) return;
        const c = guColor(code);
        polygonsRef.current.push(new window.naver.maps.Polygon({
          map: mapRef.current!,
          paths: [coords.map(([la, ln]) => ll(la, ln))],
          strokeColor: c,
          strokeOpacity: 0.3,
          strokeWeight: 1,
          fillColor: c,
          fillOpacity: 0.05,
        }));
      });
    }
  }

  function updateDongMarkers() {
    if (!mapRef.current || !window.naver) return;
    clearDongMarkers();
    if (!guCode || guDongs.length === 0) return;

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
      });

      dongMarkersRef.current.push(marker);
    });
  }

  function addVacancyMarker(v: VacancyMarker, guName?: string, markerGuCode?: string) {
    if (!mapRef.current || !window.naver) return;
    const marker = new window.naver.maps.Marker({
      position: ll(v.lat, v.lng),
      map: mapRef.current!,
      icon: {
        content: `<div style="width:10px;height:10px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(239,68,68,0.6);cursor:pointer;"></div>`,
        anchor: new window.naver.maps.Point(5, 5),
      },
      zIndex: 50,
    });

    window.naver.maps.Event.addListener(marker, 'click', () => {
      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.naver.maps.InfoWindow({ content: ' ' });
      }
      const locationLabel = guName ? `${guName} · ${v.dongName}` : v.dongName;
      infoWindowRef.current.setContent(`
        <div style="padding:8px 12px;min-width:160px;font-size:12px;line-height:1.6;">
          <p style="font-weight:700;font-size:13px;margin-bottom:4px;color:#dc2626;">📍 공실 매물</p>
          <p style="color:#64748b;margin-bottom:4px;">${locationLabel}</p>
          <p>층: <b>${v.floor}층</b> · 면적: <b>${v.sqm}㎡</b></p>
          <p style="margin-top:4px;font-size:10px;color:#6366f1;font-weight:600;">▶ 클릭하여 상세정보 보기</p>
        </div>
      `);
      infoWindowRef.current.open(mapRef.current!, marker);

      const effectiveGuCode = markerGuCode ?? guCode;
      onSelectVacancy?.(v.id, v.lat, v.lng, effectiveGuCode, v.dongCode, v);
      onSelectBuilding?.(`vacancy-${v.id}`);

      // 창업 추천 마커 표시
      showStartupMarkers(effectiveGuCode, v.dongCode);
    });

    vacancyMarkersRef.current.push(marker);
  }

  function showStartupMarkers(vGuCode: string, vDongCode: string) {
    clearStartupMarkers();
    if (!mapRef.current || !window.naver) return;

    const gu = SEOUL_GU.find((g) => g.code === vGuCode);
    if (!gu) return;

    const recs = getStartupAreaRecs(vGuCode, industryCode, gu.name, gu.dongs, 3);
    const centers = getAllDongCenters(gu.dongs, vGuCode);

    recs.forEach((rec, idx) => {
      const dongCenter = centers.find((c) => c.code === rec.dongCode);
      if (!dongCenter) return;

      const rankColors = ['#f59e0b', '#94a3b8', '#fb923c'];
      const color = rankColors[idx] ?? '#6366f1';
      const label = idx + 1;

      const marker = new window.naver.maps.Marker({
        position: ll(dongCenter.center[0], dongCenter.center[1]),
        map: mapRef.current!,
        icon: {
          content: `<div style="background:${color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
          anchor: new window.naver.maps.Point(11, 11),
        },
        zIndex: 60,
      });

      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.naver.maps.InfoWindow({ content: ' ' });
        }
        infoWindowRef.current.setContent(`
          <div style="padding:8px 12px;min-width:160px;font-size:12px;line-height:1.6;">
            <p style="font-weight:700;margin-bottom:2px;">⭐ 창업 추천 ${label}위</p>
            <p style="color:#64748b;">${rec.guName} ${rec.dongName}</p>
            <p>추천 점수: <b>${rec.score}점</b></p>
            <p>공실률: ${rec.vacancyRate}% · 임대: ${rec.rentPer33}만/3.3㎡</p>
            <p>유동인구: ${Math.round(rec.floatingPop).toLocaleString()}명</p>
            ${vDongCode === rec.dongCode ? '<p style="color:#6366f1;font-size:10px;">← 현재 공실 위치</p>' : ''}
          </div>
        `);
        infoWindowRef.current.open(mapRef.current!, marker);
      });

      startupMarkersRef.current.push(marker);
    });
  }

  function updateVacancyMarkers() {
    if (!mapRef.current || !window.naver) return;
    clearVacancyMarkers();

    if (!guCode) {
      // 서울 전체: 25개 구 각 2~3개 공실 마커 표시
      SEOUL_GU.forEach((gu) => {
        const dongSlice = gu.dongs.slice(0, 5);
        const centers = getAllDongCenters(dongSlice, gu.code);
        const markers = getVacancyMarkers(gu.code, '', centers, 2);
        markers.forEach((v) => addVacancyMarker(v, gu.name, gu.code));
      });
      return;
    }

    const centers = getAllDongCenters(guDongs, guCode);
    const markers = getVacancyMarkers(guCode, dongCode, centers, dongCode ? 8 : 15);
    markers.forEach((v) => addVacancyMarker(v));
  }

  if (authError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-center px-6">
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
    <div className="relative h-full w-full">
      {/* 범례 */}
      {scriptLoaded && (
        <div className="absolute bottom-3 left-3 z-10 rounded-xl bg-white/90 px-3 py-2 shadow text-[11px] space-y-1 backdrop-blur-sm">
          {guCode ? (
            <>
              <p className="font-semibold text-slate-500 mb-1">동별 공실 현황</p>
              <span className="flex items-center gap-1 text-slate-600"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#16a34a',border:'1px solid white'}}></span>저공실 (&lt;12%)</span>
              <span className="flex items-center gap-1 text-slate-600"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#f59e0b',border:'1px solid white'}}></span>중간 (12~15%)</span>
              <span className="flex items-center gap-1 text-slate-600"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#dc2626',border:'1px solid white'}}></span>고공실 (&gt;15%)</span>
              <span className="flex items-center gap-1 text-slate-600 pt-1 border-t border-slate-100"><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#ef4444',border:'1px solid white'}}></span>공실 매물</span>
              <span className="flex items-center gap-1 text-slate-600"><span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#f59e0b',border:'2px solid white'}}></span>창업 추천</span>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-500 mb-1">구별 색상</p>
              <span className="flex items-center gap-1 text-slate-600"><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#ef4444',border:'1px solid white'}}></span>공실 매물 클릭 → 상세</span>
            </>
          )}
        </div>
      )}

      {/* 로딩 */}
      {!scriptLoaded && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
          <span className="text-2xl">🗺️</span>
          <p className="text-sm font-semibold text-slate-700">네이버 지도 불러오는 중…</p>
        </div>
      )}

      {/* 지도 */}
      <div
        ref={containerRef}
        className="h-full w-full rounded-xl overflow-hidden"
        style={{ display: scriptLoaded ? 'block' : 'none' }}
      />
    </div>
  );
}
