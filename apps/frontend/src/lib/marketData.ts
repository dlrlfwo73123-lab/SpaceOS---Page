// [데모 데이터] 아래 수치는 공공데이터 기반으로 보정한 합성 베이스라인이며 실제 값과 다를 수 있습니다.
// 실제 서비스 시 교체 대상 데이터 출처:
//  - 유동인구: 서울 열린데이터광장 "서울시 생활인구" (https://data.seoul.go.kr)
//  - 공실률: 한국부동산원 상업용부동산 임대동향조사 (https://www.reb.or.kr)
//  - 임대시세: 서울시 상권분석서비스 / 토지이음 공시지가 기반 추정 (https://golmok.seoul.go.kr)
//  - 인구밀도: 행정안전부 주민등록 인구통계 (https://jumin.mois.go.kr)
// is_demo=true — 모든 수치는 시드 기반 합성이며 실제 시장 상황과 다를 수 있습니다.
import { SEOUL_GU } from './seoul';

// ── 시드 기반 PRNG (mulberry32) — 같은 구/동/업종 조합은 항상 같은 값을 반환 ──
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(...parts: string[]) {
  return mulberry32(hashSeed(parts.join('|')));
}

// 구별 기준치 (소상공인시장진흥공단 통계 기반 더미 베이스라인)
const GU_BASE: Record<string, MarketStats> = {
  '11680': { floatingPop: 187400, popDensity: 18500, vacancyRate: 12.4, totalStores: 22310, openRate: 3.2, closeRate: 2.1, avgOpMonths: 38, revenueIdx: 168, survivalRate3y: 54.2, rentPer33: 18.5 },
  '11740': { floatingPop: 94200, popDensity: 14200, vacancyRate: 10.8, totalStores: 10540, openRate: 2.8, closeRate: 2.4, avgOpMonths: 42, revenueIdx: 112, survivalRate3y: 56.8, rentPer33: 9.2 },
  '11305': { floatingPop: 61800, popDensity: 16100, vacancyRate: 17.3, totalStores: 7820, openRate: 2.1, closeRate: 3.1, avgOpMonths: 28, revenueIdx: 78, survivalRate3y: 44.1, rentPer33: 5.8 },
  '11500': { floatingPop: 103500, popDensity: 12400, vacancyRate: 14.2, totalStores: 13900, openRate: 3.4, closeRate: 2.7, avgOpMonths: 35, revenueIdx: 101, survivalRate3y: 51.3, rentPer33: 8.1 },
  '11620': { floatingPop: 98700, popDensity: 24300, vacancyRate: 15.8, totalStores: 11200, openRate: 3.8, closeRate: 3.2, avgOpMonths: 30, revenueIdx: 89, survivalRate3y: 47.9, rentPer33: 7.4 },
  '11215': { floatingPop: 78900, popDensity: 19800, vacancyRate: 11.5, totalStores: 9640, openRate: 3.1, closeRate: 2.3, avgOpMonths: 36, revenueIdx: 107, survivalRate3y: 53.6, rentPer33: 9.8 },
  '11530': { floatingPop: 82100, popDensity: 17200, vacancyRate: 16.1, totalStores: 9880, openRate: 2.9, closeRate: 2.9, avgOpMonths: 33, revenueIdx: 88, survivalRate3y: 48.4, rentPer33: 6.9 },
  '11545': { floatingPop: 54300, popDensity: 21600, vacancyRate: 13.9, totalStores: 6120, openRate: 4.1, closeRate: 2.6, avgOpMonths: 27, revenueIdx: 95, survivalRate3y: 49.2, rentPer33: 7.2 },
  '11350': { floatingPop: 112300, popDensity: 20100, vacancyRate: 13.7, totalStores: 14500, openRate: 2.6, closeRate: 2.8, avgOpMonths: 40, revenueIdx: 93, survivalRate3y: 50.1, rentPer33: 7.6 },
  '11320': { floatingPop: 69400, popDensity: 22300, vacancyRate: 15.2, totalStores: 8200, openRate: 2.4, closeRate: 3.0, avgOpMonths: 37, revenueIdx: 81, survivalRate3y: 46.3, rentPer33: 5.9 },
  '11230': { floatingPop: 88600, popDensity: 25900, vacancyRate: 14.6, totalStores: 10900, openRate: 3.3, closeRate: 2.8, avgOpMonths: 34, revenueIdx: 98, survivalRate3y: 50.7, rentPer33: 8.8 },
  '11590': { floatingPop: 91200, popDensity: 23400, vacancyRate: 13.1, totalStores: 10100, openRate: 3.0, closeRate: 2.5, avgOpMonths: 39, revenueIdx: 104, survivalRate3y: 52.4, rentPer33: 8.3 },
  '11440': { floatingPop: 142800, popDensity: 22100, vacancyRate: 11.9, totalStores: 17400, openRate: 4.2, closeRate: 2.2, avgOpMonths: 32, revenueIdx: 139, survivalRate3y: 55.1, rentPer33: 13.6 },
  '11410': { floatingPop: 79300, popDensity: 18800, vacancyRate: 14.8, totalStores: 9300, openRate: 2.7, closeRate: 2.9, avgOpMonths: 36, revenueIdx: 92, survivalRate3y: 49.8, rentPer33: 8.1 },
  '11650': { floatingPop: 158700, popDensity: 15600, vacancyRate: 10.3, totalStores: 19800, openRate: 3.5, closeRate: 1.9, avgOpMonths: 43, revenueIdx: 155, survivalRate3y: 57.3, rentPer33: 16.2 },
  '11200': { floatingPop: 104600, popDensity: 20700, vacancyRate: 11.7, totalStores: 12300, openRate: 3.8, closeRate: 2.0, avgOpMonths: 38, revenueIdx: 128, survivalRate3y: 54.8, rentPer33: 11.4 },
  '11290': { floatingPop: 86400, popDensity: 19300, vacancyRate: 13.4, totalStores: 10200, openRate: 2.8, closeRate: 2.7, avgOpMonths: 37, revenueIdx: 91, survivalRate3y: 50.3, rentPer33: 7.8 },
  '11710': { floatingPop: 163200, popDensity: 21800, vacancyRate: 11.2, totalStores: 20100, openRate: 3.6, closeRate: 2.0, avgOpMonths: 41, revenueIdx: 147, survivalRate3y: 55.9, rentPer33: 14.8 },
  '11470': { floatingPop: 97800, popDensity: 18400, vacancyRate: 12.8, totalStores: 11700, openRate: 2.9, closeRate: 2.4, avgOpMonths: 40, revenueIdx: 106, survivalRate3y: 52.1, rentPer33: 9.4 },
  '11560': { floatingPop: 134500, popDensity: 17900, vacancyRate: 13.5, totalStores: 16200, openRate: 3.7, closeRate: 2.3, avgOpMonths: 36, revenueIdx: 131, survivalRate3y: 53.4, rentPer33: 12.1 },
  '11170': { floatingPop: 118900, popDensity: 13200, vacancyRate: 12.0, totalStores: 13800, openRate: 4.0, closeRate: 2.1, avgOpMonths: 37, revenueIdx: 143, survivalRate3y: 55.6, rentPer33: 13.9 },
  '11380': { floatingPop: 88100, popDensity: 15700, vacancyRate: 14.5, totalStores: 10400, openRate: 2.7, closeRate: 2.8, avgOpMonths: 36, revenueIdx: 87, survivalRate3y: 48.7, rentPer33: 6.7 },
  '11110': { floatingPop: 128400, popDensity: 10800, vacancyRate: 13.8, totalStores: 14900, openRate: 3.1, closeRate: 2.6, avgOpMonths: 44, revenueIdx: 125, survivalRate3y: 52.9, rentPer33: 12.8 },
  '11140': { floatingPop: 212000, popDensity: 11200, vacancyRate: 14.1, totalStores: 16700, openRate: 3.3, closeRate: 2.5, avgOpMonths: 45, revenueIdx: 162, survivalRate3y: 53.7, rentPer33: 17.2 },
  '11260': { floatingPop: 73600, popDensity: 21400, vacancyRate: 15.9, totalStores: 8700, openRate: 2.5, closeRate: 3.1, avgOpMonths: 33, revenueIdx: 82, survivalRate3y: 46.8, rentPer33: 6.2 },
};

const DEFAULT_BASE: MarketStats = {
  floatingPop: 100000, popDensity: 18000, vacancyRate: 14.0, totalStores: 12000,
  openRate: 3.0, closeRate: 2.5, avgOpMonths: 36, revenueIdx: 100, survivalRate3y: 51.0, rentPer33: 9.0,
};

// 업종별 보정 계수 — 지표 성격에 맞춰 곱/가산
const INDUSTRY_FACTOR: Record<string, Partial<MarketStats> & { mult?: Partial<Record<keyof MarketStats, number>> }> = {
  ALL:    { mult: {} },
  F45:    { mult: { closeRate: 1.35, openRate: 1.15, rentPer33: 1.05, survivalRate3y: 0.92, avgOpMonths: 0.85 } }, // 음식점: 폐업률 높음
  G47:    { mult: { closeRate: 1.2, revenueIdx: 0.85, survivalRate3y: 0.9 } },                                    // 소매업: 온라인 경쟁
  I56:    { mult: { openRate: 1.4, closeRate: 1.1, rentPer33: 0.95 } },                                            // 카페: 창업 활발
  S96:    { mult: { rentPer33: 0.9, survivalRate3y: 1.05, avgOpMonths: 1.1 } },                                    // 미용·뷰티
  G4711:  { mult: { closeRate: 0.7, survivalRate3y: 1.3, avgOpMonths: 1.4 } },                                     // 편의점: 안정적
  Q86:    { mult: { closeRate: 0.5, survivalRate3y: 1.45, avgOpMonths: 1.6, revenueIdx: 1.1 } },                   // 의료·약국: 매우 안정
  P85:    { mult: { closeRate: 0.85, survivalRate3y: 1.15, openRate: 0.9 } },                                      // 교육·학원
  K64:    { mult: { closeRate: 0.6, survivalRate3y: 1.35, revenueIdx: 1.2 } },                                     // 금융·보험
  J62:    { mult: { openRate: 1.25, closeRate: 1.0, revenueIdx: 1.15 } },                                          // IT·서비스
  ETC:    { mult: {} },
};

type MarketStats = {
  floatingPop: number;
  popDensity: number;
  vacancyRate: number;
  totalStores: number;
  openRate: number;
  closeRate: number;
  avgOpMonths: number;
  revenueIdx: number;
  survivalRate3y: number;
  rentPer33: number;
};

export type { MarketStats };

export const METRIC_LABELS: Record<keyof MarketStats, { label: string; unit: string; isPercent?: boolean }> = {
  floatingPop:    { label: '유동인구', unit: '명' },
  totalStores:    { label: '총 점포 수', unit: '개' },
  vacancyRate:    { label: '공실률', unit: '%', isPercent: true },
  revenueIdx:     { label: '매출지수', unit: 'pt' },
  openRate:       { label: '신규 개업률', unit: '%', isPercent: true },
  closeRate:      { label: '폐업률', unit: '%', isPercent: true },
  survivalRate3y: { label: '3년 생존률', unit: '%', isPercent: true },
  avgOpMonths:    { label: '평균 영업기간', unit: '개월' },
  popDensity:     { label: '인구밀도', unit: '명/km²' },
  rentPer33:      { label: '임대시세', unit: '만원/3.3㎡' },
};

function dongCountOf(guCode: string): number {
  return SEOUL_GU.find((g) => g.code === guCode)?.dongs.length ?? 5;
}

// 구 → 동 단위로 분할: 동 개수로 나누고 ±15% 변동을 시드 기반으로 부여
function scaleToDong(value: number, guCode: string, dongCode: string, key: keyof MarketStats): number {
  const dongCount = dongCountOf(guCode);
  const isRateLike = ['vacancyRate', 'openRate', 'closeRate', 'survivalRate3y', 'revenueIdx', 'avgOpMonths', 'rentPer33', 'popDensity'].includes(key);
  const rng = rngFor(guCode, dongCode, key);
  const variance = 0.85 + rng() * 0.3; // 0.85 ~ 1.15
  if (isRateLike) return value * variance;
  return (value / dongCount) * variance; // 인구/점포수 등 누적형 지표는 동 단위로 분할
}

export function getMarketStats(guCode: string, dongCode: string, industryCode: string): MarketStats {
  const base = GU_BASE[guCode] ?? DEFAULT_BASE;
  const factor = INDUSTRY_FACTOR[industryCode]?.mult ?? {};

  const keys = Object.keys(base) as (keyof MarketStats)[];
  const result = {} as MarketStats;
  for (const key of keys) {
    const dongValue = scaleToDong(base[key], guCode, dongCode, key);
    const mult = factor[key] ?? 1;
    result[key] = dongValue * mult;
  }
  return result;
}

// 분기별(3년, 12분기) 시계열 — 마지막 값이 getMarketStats() 스냅샷과 일치하도록 역산
export type TrendPoint = { month: string; value: number; predicted: boolean };

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function getMetricTrend(
  guCode: string,
  dongCode: string,
  industryCode: string,
  metric: keyof MarketStats,
  quarters = 12,
): TrendPoint[] {
  const current = getMarketStats(guCode, dongCode, industryCode)[metric];
  const rng = rngFor(guCode, dongCode, industryCode, metric, 'trend');
  const driftDirection = rng() > 0.5 ? 1 : -1;
  const driftPct = (rng() * 0.18 + 0.04) * driftDirection; // ±4~22% 3년 누적 변동
  const seasonAmp = current * (0.03 + rng() * 0.05);
  const noiseAmp = current * 0.015;

  const now = new Date();
  const currentQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const points: TrendPoint[] = [];
  for (let i = quarters - 1; i >= 0; i--) {
    const d = new Date(currentQuarterStart.getFullYear(), currentQuarterStart.getMonth() - i * 3, 1);
    const progress = (quarters - 1 - i) / (quarters - 1); // 0 (12분기 전) → 1 (현재 분기)
    const trendBase = current * (1 - driftPct * (1 - progress));
    const seasonal = Math.sin((quarters - 1 - i) / 2) * seasonAmp;
    const noise = (rng() - 0.5) * 2 * noiseAmp;
    points.push({
      month: quarterLabel(d),
      value: Math.round((trendBase + seasonal + noise) * 100) / 100,
      predicted: false,
    });
  }
  // 마지막 관측치를 스냅샷 값으로 고정 + 1개월 후 예측치 1개 추가
  points[points.length - 1] = { ...points[points.length - 1], value: Math.round(current * 100) / 100 };
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const predictedDrift = current * (driftPct / quarters) * 0.7;
  points.push({
    month: `${quarterLabel(nextMonth)} (+1M 예측)`,
    value: Math.round((current + predictedDrift) * 100) / 100,
    predicted: true,
  });
  return points;
}

// 최근 2개 관측 분기를 비교해 상승/하락/유지 판정 (lowerIsBetter=true면 의미상 반대로 좋은 방향 표시는 호출 측에서 처리)
export function getMetricQoQTrend(
  guCode: string,
  dongCode: string,
  industryCode: string,
  metric: keyof MarketStats,
): 'up' | 'down' | 'neutral' {
  const points = getMetricTrend(guCode, dongCode, industryCode, metric);
  const observed = points.filter((p) => !p.predicted);
  const lastQ = observed[observed.length - 1].value;
  const prevQ = observed[observed.length - 2].value;
  if (prevQ === 0) return 'neutral';
  const pctChange = (lastQ - prevQ) / Math.abs(prevQ);
  if (Math.abs(pctChange) < 0.005) return 'neutral';
  return pctChange > 0 ? 'up' : 'down';
}

// ── 점포 이력 (필터별 생성) ──
export type StoreHistoryRow = {
  date: string;
  storeName: string;
  floor: number;
  sqm: number;
  openDate: string;
  closeDate: string | null;
  opMonths: number | null;
  industry: string;
  industryCode: string;
  event: '신규입점' | '폐업' | '업종변경';
  rentMonthly: number | null;
  closeReason: string | null;
};

const STORE_NAME_POOL = ['블루보틀', '미르헤어', 'GS25', '서울의류', '한강순두부', '스킨이즈', '탑에듀', '청담식품', '청년다방', '올리브영', '스타일난다', '교보문고', '메가커피', '파리바게뜨', '버거킹'];
const CLOSE_REASONS = [
  '임대료 인상 + 매출 감소로 인한 자진 폐업',
  '온라인 경쟁 심화로 오프라인 매출 급감, 재고 부담 증가',
  '인근 프랜차이즈 신규 진입으로 고객 이탈',
  '식자재·인건비 상승으로 영업이익 적자 전환',
  '계약 만료 후 임대인의 재건축 계획으로 종료',
  '상권 변화(유동인구 감소)에 따른 매출 하락',
];

function industryNameOf(code: string): string {
  const map: Record<string, string> = {
    F45: '음식점', G47: '소매업', I56: '카페·음료', S96: '미용·뷰티', G4711: '편의점',
    Q86: '의료·약국', P85: '교육·학원', K64: '금융·보험', J62: 'IT·서비스', ETC: '기타',
  };
  return map[code] ?? '기타';
}

export function getStoreHistory(guCode: string, dongCode: string, industryCode: string, count = 8): StoreHistoryRow[] {
  const rng = rngFor(guCode, dongCode, industryCode, 'history');
  const industries = industryCode === 'ALL'
    ? ['F45', 'G47', 'I56', 'S96', 'G4711', 'Q86', 'P85', 'K64', 'J62', 'ETC']
    : [industryCode];

  const events: Array<'신규입점' | '폐업' | '업종변경'> = ['신규입점', '폐업', '업종변경'];
  const rows: StoreHistoryRow[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const ind = industries[Math.floor(rng() * industries.length)];
    const event = events[Math.floor(rng() * 10) < 4 ? 0 : Math.floor(rng() * 10) < 8 ? 1 : 2];
    const monthsAgo = Math.floor(rng() * 24);
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1 + Math.floor(rng() * 27));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const floor = 1 + Math.floor(rng() * 5);
    const sqm = 40 + Math.floor(rng() * 60);
    const rentMonthly = 300 + Math.floor(rng() * 500);
    const isClosed = event === '폐업';
    const opMonths = isClosed ? 6 + Math.floor(rng() * 36) : null;
    const openDate = isClosed
      ? `${d.getFullYear() - Math.floor((opMonths ?? 12) / 12)}-${String(((d.getMonth() - (opMonths ?? 12) % 12) % 12 + 12) % 12 + 1).padStart(2, '0')}-01`
      : `${dateStr}-01`;

    rows.push({
      date: dateStr,
      storeName: `${STORE_NAME_POOL[Math.floor(rng() * STORE_NAME_POOL.length)]} ${industryNameOf(ind)}점`,
      floor,
      sqm,
      openDate,
      closeDate: isClosed ? `${dateStr}-${String(1 + Math.floor(rng() * 27)).padStart(2, '0')}` : null,
      opMonths,
      industry: industryNameOf(ind),
      industryCode: ind,
      event,
      rentMonthly,
      closeReason: isClosed ? CLOSE_REASONS[Math.floor(rng() * CLOSE_REASONS.length)] : null,
    });
  }

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ── 창업 업종 추천 (필터별 생성) ──
export type Recommendation = {
  rank: number;
  industry: string;
  industryCode: string;
  score: number;
  survivalRate3y: number;
  avgMonthlyRevenue: number;
  startupCostMin: number;
  startupCostMax: number;
  paybackMonths: number;
  reasons: string[];
  risks: string[];
};

const ALL_INDUSTRY_CODES = ['F45', 'G47', 'I56', 'S96', 'G4711', 'Q86', 'P85', 'K64', 'J62', 'ETC'];

export function getRecommendations(
  guCode: string,
  dongCode: string,
  industryCode: string,
  guName: string,
  dongName: string,
): Recommendation[] {
  const rng = rngFor(guCode, dongCode, industryCode, 'recommend');
  // 선택된 업종이 'ALL'이 아니면 해당 업종을 제외한 후보 중 상위 3개를 추천 (이미 포화된 업종은 추천하지 않음)
  const candidates = ALL_INDUSTRY_CODES.filter((c) => c !== industryCode);
  const stats = getMarketStats(guCode, dongCode, industryCode);

  const picked = [...candidates].sort(() => rng() - 0.5).slice(0, 3);

  return picked.map((code, idx) => {
    const indStats = getMarketStats(guCode, dongCode, code);
    const score = Math.round(60 + rng() * 35 - (indStats.closeRate - 2) * 3);
    return {
      rank: idx + 1,
      industry: industryNameOf(code),
      industryCode: code,
      score: Math.max(50, Math.min(99, score)),
      survivalRate3y: Math.round(indStats.survivalRate3y * 10) / 10,
      avgMonthlyRevenue: Math.round((indStats.revenueIdx / 100) * (1500 + rng() * 1500)),
      startupCostMin: Math.round(2500 + rng() * 2000),
      startupCostMax: Math.round(5000 + rng() * 5000),
      paybackMonths: Math.round(18 + rng() * 20),
      reasons: [
        `${guName} ${dongName} 일평균 유동인구 ${Math.round(stats.floatingPop).toLocaleString()}명 — ${industryNameOf(code)} 주요 고객층 분석 결과 적합`,
        `${guName} ${industryNameOf(code)} 3년 생존율 ${indStats.survivalRate3y.toFixed(1)}% (서울 평균 대비 경쟁력 있음)`,
        `해당 업종 평균 영업기간 ${Math.round(indStats.avgOpMonths)}개월로 안정적 운영 가능`,
      ],
      risks: [
        `${guName} 임대시세 3.3㎡당 ${indStats.rentPer33.toFixed(1)}만원 — 초기 고정비 부담 고려 필요`,
        `폐업률 ${indStats.closeRate.toFixed(1)}% 수준의 경쟁 강도 존재`,
      ],
    };
  });
}
