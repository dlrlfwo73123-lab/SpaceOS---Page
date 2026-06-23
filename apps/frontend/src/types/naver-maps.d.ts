// Naver Maps JS API v3 — @types/naver-maps 패키지 없음, 직접 최소 선언
export interface NaverMapInstance { setCenter(latlng: unknown): void; getCenter(): unknown; setZoom(zoom: number): void }
export interface NaverMarker { setMap(map: NaverMapInstance | null): void; setPosition(latlng: unknown): void; setIcon(icon: unknown): void }
export interface NaverInfoWindow { open(map: NaverMapInstance, marker: NaverMarker): void; close(): void; setContent(html: string): void }
export interface NaverPanoramaInstance { setPosition(latlng: unknown): void }

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        Marker: new (opts: Record<string, unknown>) => NaverMarker;
        InfoWindow: new (opts: Record<string, unknown>) => NaverInfoWindow;
        Event: { addListener: (target: unknown, eventName: string, handler: (e: { coord: unknown }) => void) => void };
        Panorama: new (el: HTMLElement, opts: Record<string, unknown>) => NaverPanoramaInstance;
      };
    };
    __spaceOSNaverMapsReady?: () => void;
  }
}
