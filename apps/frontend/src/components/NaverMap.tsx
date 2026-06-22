import { useEffect, useRef, useState } from 'react';

// TODO: Naver Maps JS API v3 타입 선언 — @types/naver-maps 패키지 없음, 직접 최소 선언
declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: Record<string, unknown>) => NaverMarker;
        Event: { addListener: (target: unknown, eventName: string, handler: (e: { coord: unknown }) => void) => void };
        panorama: {
          Panorama: new (el: HTMLElement, opts: Record<string, unknown>) => NaverPanoramaInstance;
        };
      };
    };
  }
}
interface NaverMapInstance { setCenter(latlng: unknown): void; getCenter(): unknown }
interface NaverMarker { setMap(map: NaverMapInstance | null): void }
interface NaverPanoramaInstance { setPosition(latlng: unknown): void }

// 서울 25개 구 중심 좌표 (WGS84)
// TODO: 동별 중심 좌표는 행정안전부 공간정보 API로 교체
const GU_CENTER: Record<string, [number, number]> = {
  '11680': [37.5172, 127.0473], // 강남구
  '11740': [37.5301, 127.1238], // 강동구
  '11305': [37.6396, 127.0255], // 강북구
  '11500': [37.5509, 126.8495], // 강서구
  '11620': [37.4784, 126.9516], // 관악구
  '11215': [37.5385, 127.0823], // 광진구
  '11530': [37.4954, 126.8874], // 구로구
  '11545': [37.4569, 126.8955], // 금천구
  '11350': [37.6542, 127.0568], // 노원구
  '11320': [37.6688, 127.0471], // 도봉구
  '11230': [37.5744, 127.0396], // 동대문구
  '11590': [37.5124, 126.9393], // 동작구
  '11440': [37.5663, 126.9018], // 마포구
  '11410': [37.5791, 126.9368], // 서대문구
  '11650': [37.4837, 127.0324], // 서초구
  '11200': [37.5633, 127.0371], // 성동구
  '11290': [37.5894, 127.0167], // 성북구
  '11710': [37.5145, 127.1059], // 송파구
  '11470': [37.5270, 126.8561], // 양천구
  '11560': [37.5264, 126.8963], // 영등포구
  '11170': [37.5311, 126.9810], // 용산구
  '11380': [37.6026, 126.9291], // 은평구
  '11110': [37.5735, 126.9788], // 종로구
  '11140': [37.5640, 126.9975], // 중구
  '11260': [37.5953, 127.0951], // 중랑구
};

const DEFAULT_CENTER: [number, number] = [37.5665, 126.9780]; // 서울 시청

type NaverMapProps = {
  guCode: string;
  onSelectBuilding?: (id: string) => void;
};

export function NaverMap({ guCode, onSelectBuilding }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMapInstance | null>(null);
  const panoramaRef = useRef<NaverPanoramaInstance | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [streetView, setStreetView] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 네이버 클라우드 플랫폼 Maps API Client ID — 서울특별시 전역 지도·거리뷰에 사용
  // .env.local의 VITE_NAVER_CLIENT_ID가 설정되어 있으면 그 값을 우선 사용
  const envClientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;
  const clientId = envClientId && envClientId !== 'YOUR_NAVER_CLIENT_ID' ? envClientId : '9nbzrvj8qj';

  useEffect(() => {
    if (scriptRef.current) return; // 이미 로드 중

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=panorama`;
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      initMap();
    };
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // 구 선택 시 지도/거리뷰 중심 이동 — 서울 전역 어디든 지도와 거리뷰 모두 지원
  useEffect(() => {
    if (!window.naver) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    const latlng = new window.naver.maps.LatLng(lat, lng);
    if (mapRef.current) mapRef.current.setCenter(latlng);
    if (panoramaRef.current) panoramaRef.current.setPosition(latlng);
  }, [guCode]);

  // 거리뷰 토글 시 Panorama 인스턴스 생성
  useEffect(() => {
    if (!streetView || !panoramaContainerRef.current || !window.naver?.maps.panorama) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    panoramaRef.current = new window.naver.maps.panorama.Panorama(panoramaContainerRef.current, {
      position: new window.naver.maps.LatLng(lat, lng),
      pov: { pan: 0, tilt: 0, fov: 100 },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetView]);

  function initMap() {
    if (!containerRef.current || !window.naver) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    mapRef.current = new window.naver.maps.Map(containerRef.current, {
      center: new window.naver.maps.LatLng(lat, lng),
      zoom: 14,
    });

    // 지도 클릭 시 해당 좌표를 거리뷰 중심으로 사용할 수 있도록 마지막 클릭 위치 저장
    window.naver.maps.Event.addListener(mapRef.current, 'click', (e) => {
      if (panoramaRef.current) panoramaRef.current.setPosition(e.coord);
      onSelectBuilding?.('demo-building');
    });

    // TODO: 공실 히트맵 오버레이 — GET /api/v1/heatmap?gu={guCode} 연동 후 추가
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
      <div className="mb-2 flex gap-1.5">
        <button
          onClick={() => setStreetView(false)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            !streetView ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          지도
        </button>
        <button
          onClick={() => setStreetView(true)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            streetView ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🔭 거리뷰
        </button>
        <span className="ml-auto self-center text-[11px] text-slate-400">
          지도를 클릭하면 해당 위치의 거리뷰로 이동합니다
        </span>
      </div>
      <div ref={containerRef} className="h-[420px] w-full rounded-xl overflow-hidden" style={{ display: streetView ? 'none' : 'block' }} />
      <div ref={panoramaContainerRef} className="h-[420px] w-full rounded-xl overflow-hidden" style={{ display: streetView ? 'block' : 'none' }} />
    </div>
  );
}
