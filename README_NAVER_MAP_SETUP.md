# 네이버 지도 설정

## Client ID 설정

1. [NCP 콘솔](https://console.ncloud.com) > AI·NAVER API > Maps 신청
2. Application 등록 후 **인증 정보** 탭에서 Client ID 확인
3. **Maps** 서비스 환경에 배포 도메인(예: `https://<user>.github.io`)을 Web 서비스 URL로 등록
4. 로컬 개발 시 `apps/frontend/.env.local` 파일에 추가:
   ```
   VITE_NAVER_CLIENT_ID=발급받은_CLIENT_ID
   ```
5. GitHub Pages 배포 시에는 `.github/workflows/deploy.yml`의 `VITE_NAVER_CLIENT_ID` 값을 사용

## 구조

- `apps/frontend/src/lib/loadNaverMaps.ts` — SDK 스크립트를 콜백 방식으로 로드 (중복 로드 방지)
- `apps/frontend/src/types/naver-maps.d.ts` — Naver Maps JS API v3 최소 타입 선언
- `apps/frontend/src/components/NaverMap.tsx` — 지도/거리뷰 컴포넌트

## 자주 발생하는 오류

- **인증 실패**: Client ID 또는 Web 서비스 URL 등록이 잘못된 경우
- **500 Internal Server Error**: NCP 계정 결제 수단 미등록 또는 활성화 대기 중
