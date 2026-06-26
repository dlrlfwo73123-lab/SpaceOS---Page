// 실제 행정동 경계 폴리곤(GeoJSON)은 행정안전부 공간정보 API 연동이 필요하며
// 아직 연결되지 않았다. 경계 데이터 없이 지도를 그대로 두면 "경계가 있는데
// 안 보인다"는 오해를 줄 수 있으므로, 없다는 사실을 명시적으로 표시한다.
export function DongPolygonLayer() {
  return (
    <div
      role="status"
      className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm"
    >
      ⚠ 행정구역 경계 데이터 없음 — 마커 기반 표시로 대체
    </div>
  );
}
