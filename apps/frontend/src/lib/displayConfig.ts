/**
 * 화면 표시 설정.
 *
 * SHOW_VACANCY_RATE — 공실률(%)·공실률 기반 색·점수 산식을 화면에 보일지 정한다.
 * 2026-11-07 요청으로 3D 디지털 트윈 홈페이지에서 공실률 관련 데이터를 숨겼다(false).
 * 공실 매물(빨간 점)·3D 트윈·임대시세 등 다른 데이터는 그대로 보인다.
 * 데이터 자체(lib/marketData.ts)는 지우지 않았으므로 true 로 바꾸면 종전 화면으로 돌아간다.
 */
export const SHOW_VACANCY_RATE = false;
