const CALLBACK_NAME = '__spaceOSNaverMapsReady';

let loadPromise: Promise<void> | null = null;

// 네이버 지도 SDK는 onload보다 콜백 파라미터 방식이 더 안정적으로 동작
// (스크립트가 비동기로 내부 초기화를 마친 뒤 콜백을 호출하므로 window.naver가 완전히 준비됨)
export function loadNaverMaps(clientId: string): Promise<void> {
  if (window.naver?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    window[CALLBACK_NAME] = () => resolve();

    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=panorama&language=ko&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.onerror = () => reject(new Error('네이버 지도 SDK 로드 실패'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
