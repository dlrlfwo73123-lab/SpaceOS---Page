// 서울 25개 구 중심 좌표 (WGS84)
// TODO: 동/건물별 실제 좌표는 행정안전부 공간정보 API 연동 후 교체
export const GU_CENTER: Record<string, [number, number]> = {
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

export const DEFAULT_CENTER: [number, number] = [37.5665, 126.9780]; // 서울 시청

function hashString(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return h;
}

// 동 코드를 시드로 구 중심에서 ±0.6~1.4km 범위의 결정적(deterministic) 오프셋을 생성
// TODO: 실제 동 중심 좌표는 행정안전부 공간정보 API로 교체
export function dongOffset(guCode: string, dongCode: string): [number, number] {
  if (!dongCode) return [0, 0];
  const h = hashString(`${guCode}|${dongCode}`);
  const angle = (h % 360) * (Math.PI / 180);
  const radiusKm = 0.6 + ((h >>> 8) % 100) / 100; // 0.6~1.6km
  const dLat = (radiusKm / 111) * Math.cos(angle);
  const dLng = (radiusKm / (111 * Math.cos(37.55 * Math.PI / 180))) * Math.sin(angle);
  return [dLat, dLng];
}

export function dongCenter(guCode: string, dongCode: string): [number, number] {
  const [gLat, gLng] = GU_CENTER[guCode] ?? DEFAULT_CENTER;
  const [oLat, oLng] = dongOffset(guCode, dongCode);
  return [gLat + oLat, gLng + oLng];
}

export type MockBuilding = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

// 동 내 건물 단위 좌표/명칭은 실제 건물 등록부가 없어 동 중심에서 결정적으로
// 흩뿌린 mock 좌표다 — `mock-building-N` 형태의 id로, 실데이터처럼 보이는
// 임의의 건물명/주소를 만들지 않는다.
export function mockBuildingsInDong(guCode: string, dongCode: string): MockBuilding[] {
  if (!dongCode) return [];
  const [centerLat, centerLng] = dongCenter(guCode, dongCode);
  const count = 3 + (hashString(`${guCode}|${dongCode}|count`) % 3); // 3~5개

  return Array.from({ length: count }, (_, i) => {
    const h = hashString(`${guCode}|${dongCode}|building|${i}`);
    const angle = (h % 360) * (Math.PI / 180);
    const radiusKm = 0.05 + ((h >>> 8) % 30) / 100; // 0.05~0.35km
    const dLat = (radiusKm / 111) * Math.cos(angle);
    const dLng = (radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
    return {
      id: `mock-building-${dongCode}-${i + 1}`,
      name: `mock 건물 ${i + 1}`,
      lat: centerLat + dLat,
      lng: centerLng + dLng,
    };
  });
}
