const CALLBACK_NAME = '__spaceOSNaverMapsReady';

let loadPromise: Promise<void> | null = null;
let authFailureHandler: ((message: string) => void) | null = null;

// 인증 실패(도메인 미등록, 잘못된 키 등) 시 네이버 SDK가 window.navermap_authFailure()를 호출함.
// 정의되어 있지 않으면 ReferenceError가 던져져 React 렌더 트리가 그대로 죽으므로,
// 항상 전역에 정의해 두고 구독자(컴포넌트)에게 안전하게 알려준다.
window.navermap_authFailure = () => {
  authFailureHandler?.('네이버 지도 Open API 인증에 실패했습니다. NCP 콘솔에서 Client ID와 Web 서비스 URL 등록을 확인하세요.');
};

export function onNaverMapsAuthFailure(handler: (message: string) => void): () => void {
  authFailureHandler = handler;
  return () => {
    if (authFailureHandler === handler) authFailureHandler = null;
  };
}

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

