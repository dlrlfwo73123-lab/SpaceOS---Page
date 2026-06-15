import { useEffect, useRef } from 'react';

// TODO: Naver Maps JS API v3 타입 선언 — @types/naver-maps 패키지 없음, 직접 최소 선언
declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (opts: Record<string, unknown>) => NaverMarker;
      };
    };
  }
}
interface NaverMapInstance { setCenter(latlng: unknown): void }
interface NaverMarker { setMap(map: NaverMapInstance | null): void }

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
  const mapRef = useRef<NaverMapInstance | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // TODO: VITE_NAVER_CLIENT_ID를 Naver Cloud Console에서 발급받아 .env.local에 설정
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || clientId === 'YOUR_NAVER_CLIENT_ID') return;
    if (scriptRef.current) return; // 이미 로드 중

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => initMap();
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

  // 구 선택 시 지도 중심 이동
  useEffect(() => {
    if (!mapRef.current || !window.naver) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    mapRef.current.setCenter(new window.naver.maps.LatLng(lat, lng));
  }, [guCode]);

  function initMap() {
    if (!containerRef.current || !window.naver) return;
    const [lat, lng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
    mapRef.current = new window.naver.maps.Map(containerRef.current, {
      center: new window.naver.maps.LatLng(lat, lng),
      zoom: 14,
    });

    // TODO: 공실 히트맵 오버레이 — GET /api/v1/heatmap?gu={guCode} 연동 후 추가
    // TODO: 클릭된 마커에서 onSelectBuilding 호출
  }

  if (!clientId || clientId === 'YOUR_NAVER_CLIENT_ID') {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
        <span className="text-2xl">🗺️</span>
        <p className="text-sm font-semibold text-slate-700">Naver Maps API 키 미설정</p>
        <p className="max-w-xs text-xs text-slate-400">
          {/* TODO: Naver Cloud Console (https://console.ncloud.com) 에서 ncpClientId 발급 후 */}
          <code className="rounded bg-slate-200 px-1 py-0.5">.env.local</code>에{' '}
          <code className="rounded bg-slate-200 px-1 py-0.5">VITE_NAVER_CLIENT_ID=...</code> 설정
        </p>
        <div className="mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs text-slate-500">
          <p className="mb-1 font-semibold text-slate-700">선택된 구 (미리보기)</p>
          <p>구 코드: <span className="font-mono">{guCode}</span></p>
          <p>중심: {(GU_CENTER[guCode] ?? DEFAULT_CENTER).map(v => v.toFixed(4)).join(', ')}</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-[420px] w-full rounded-xl overflow-hidden" />;
}
