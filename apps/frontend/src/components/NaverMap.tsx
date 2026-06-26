import { useEffect, useRef, useState } from 'react';
import { getMarketStats } from '@/lib/marketData';
import { SEOUL_GU } from '@/lib/seoul';
import { loadNaverMaps, onNaverMapsAuthFailure } from '@/lib/loadNaverMaps';
import { GU_CENTER, DEFAULT_CENTER, dongOffset, mockBuildingsInDong } from '@/lib/seoulCoords';
import type { NaverMapInstance, NaverMarker, NaverInfoWindow } from '@/types/naver-maps';

function vacancyColor(rate: number): string {
  if (rate >= 15) return '#dc2626'; // 적색: 고공실
  if (rate >= 12) return '#f59e0b'; // 주황: 중간
  return '#16a34a'; // 녹색: 저공실
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
  const buildingMarkersRef = useRef<NaverMarker[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 네이버 클라우드 플랫폼 Maps API Client ID — Repository Variable NAVER_MAP_CLIENT_ID로 주입
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) {
      setAuthError('네이버 지도 Client ID가 설정되지 않았습니다. VITE_NAVER_CLIENT_ID 환경변수를 확인하세요.');
      return;
    }
    const unsubscribe = onNaverMapsAuthFailure((message) => setAuthError(message));
    let cancelled = false;
    loadNaverMaps(clientId)
      .then(() => { if (!cancelled) setScriptLoaded(true); })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [clientId]);

  // 스크립트 로드 완료 + containerRef가 실제로 DOM에 렌더링된 후에만 지도 초기화
  // (script.onload 시점에는 로딩 placeholder가 표시 중이라 containerRef.current가 아직 null이므로,
  //  레이아웃 완료 후 ref가 채워졌는지 재확인하는 폴링으로 초기화 순서를 보장)
  useEffect(() => {
    if (!scriptLoaded || mapRef.current) return;
    if (containerRef.current) {
      initMap();
      return;
    }
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled || mapRef.current) return;
      if (containerRef.current) {
        initMap();
        window.clearInterval(id);
      }
    }, 50);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [scriptLoaded]);

  // 구 선택 시 지도 중심 이동 — 서울 전역 어디든 지원
  // SDK 내부 오류(인증 실패로 인한 타일/오버레이 처리 실패 등)가 React 렌더 트리를 무너뜨리지 않도록 try/catch로 격리
  useEffect(() => {
    if (!window.naver || !scriptLoaded || !mapRef.current) return;
    try {
      const [gLat, gLng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
      const [oLat, oLng] = dongOffset(guCode, dongCode);
      const lat = gLat + oLat;
      const lng = gLng + oLng;
      const latlng = new window.naver.maps.LatLng(lat, lng);

      mapRef.current.setCenter(latlng);
      mapRef.current.setZoom(dongCode ? 16 : 14);

      if (!dongCode) {
        dongMarkerRef.current?.setMap(null);
        infoWindowRef.current?.close();
        return;
      }

      const gu = SEOUL_GU.find((g) => g.code === guCode);
      const dong = gu?.dongs.find((d) => d.code === dongCode);
      const stats = getMarketStats(guCode, dongCode, industryCode);
      const color = vacancyColor(stats.vacancyRate);

      if (!dongMarkerRef.current) {
        dongMarkerRef.current = new window.naver.maps.Marker({
          position: latlng,
          map: mapRef.current,
        });
      } else {
        dongMarkerRef.current.setPosition(latlng);
        dongMarkerRef.current.setMap(mapRef.current);
      }
      dongMarkerRef.current.setIcon({
        content: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
        anchor: new window.naver.maps.Point(9, 9),
      });

      if (!infoWindowRef.current) {
        infoWindowRef.current = new window.naver.maps.InfoWindow({ content: ' ' });
      }
      infoWindowRef.current.setContent(`
        <div style="padding:10px 12px;min-width:160px;font-size:12px;line-height:1.5;">
          <p style="font-weight:700;margin-bottom:4px;">${gu?.name ?? ''} ${dong?.name ?? ''}</p>
          <p>공실률: <b style="color:${color}">${stats.vacancyRate.toFixed(1)}%</b></p>
          <p>유동인구: ${Math.round(stats.floatingPop).toLocaleString()}명</p>
          <p>매출지수: ${Math.round(stats.revenueIdx)}</p>
        </div>
      `);
      infoWindowRef.current.open(mapRef.current, dongMarkerRef.current);
    } catch (err) {
      console.error('네이버 지도 마커 갱신 실패', err);
      setAuthError('지도를 갱신하는 중 오류가 발생했습니다. 네이버 지도 Open API 인증 상태를 확인하세요.');
    }
  }, [guCode, dongCode, industryCode, scriptLoaded]);

  // 동 선택 시 건물 단위 마커 표시 — 실제 건물 등록부가 없어 동 중심에서
  // 결정적으로 흩뿌린 mock 좌표(lib/seoulCoords.mockBuildingsInDong)를 사용한다.
  // mock-building-N 형태의 id로, 실데이터인 것처럼 보이는 주소/건물명을 만들지 않는다.
  useEffect(() => {
    if (!window.naver || !scriptLoaded || !mapRef.current) return;
    buildingMarkersRef.current.forEach((m) => m.setMap(null));
    buildingMarkersRef.current = [];
    if (!dongCode) return;

    try {
      const buildings = mockBuildingsInDong(guCode, dongCode);
      buildingMarkersRef.current = buildings.map((b) => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(b.lat, b.lng),
          map: mapRef.current!,
          icon: {
            content: `<div style="width:12px;height:12px;border-radius:3px;background:#2563eb;border:1.5px solid white;box-shadow:0 0 3px rgba(0,0,0,0.4);cursor:pointer;"></div>`,
            anchor: new window.naver.maps.Point(6, 6),
          },
          title: b.name,
        });
        window.naver.maps.Event.addListener(marker, 'click', () => onSelectBuilding?.(b.id));
        return marker;
      });
    } catch (err) {
      console.error('건물 마커 표시 실패', err);
    }
  }, [guCode, dongCode, scriptLoaded, onSelectBuilding]);

  function initMap() {
    if (!containerRef.current || !window.naver) return;
    try {
      const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
      mapRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(lat, lng),
        zoom: 14,
      });

      // TODO: 공실 히트맵 오버레이 — GET /api/v1/heatmap?gu={guCode} 연동 후 추가
    } catch (err) {
      console.error('네이버 지도 초기화 실패', err);
      setAuthError('지도를 초기화하는 중 오류가 발생했습니다. 네이버 지도 Open API 인증 상태를 확인하세요.');
    }
  }

  if (authError) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-center px-6">
        <span className="text-2xl">⚠️</span>
        <p className="text-sm font-semibold text-red-700">{authError}</p>
        <p className="text-xs text-red-500">
          NCP 콘솔 &gt; AI·NAVER API &gt; Maps &gt; 인증 정보에서 Client ID와 Web 서비스 URL 등록을 확인하세요.
        </p>
      </div>
    );
  }

  if (!scriptLoaded) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
        <span className="text-2xl">🗺️</span>
        <p className="text-sm font-semibold text-slate-700">네이버 지도 불러오는 중…</p>
        <div className="mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-500">
          <p className="mb-1 font-semibold text-slate-700">선택된 구 (미리보기)</p>
          <p>구 코드: <span className="font-mono">{guCode}</span></p>
          <p>중심: {(GU_CENTER[guCode] ?? DEFAULT_CENTER).map(v => v.toFixed(4)).join(', ')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="h-[420px] w-full rounded-xl overflow-hidden" />
    </div>
  );
}
