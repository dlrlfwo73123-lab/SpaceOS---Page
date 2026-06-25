export type HeatmapFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    grid_id: string;
    vacancy_rate: number;
    predicted_rate: number;
  };
};

export type HeatmapFeatureCollection = {
  type: 'FeatureCollection';
  features: HeatmapFeature[];
};

export type BuildingHistoryEvent = {
  date: string;
  store_name: string;
  floor: number;
  industry: string;
  event: '신규입점' | '폐업' | '업종변경';
  open_date: string;
  close_date: string | null;
  op_months: number | null;
  rent_monthly: number;
  close_reason_summary: string | null;
};

export type BuildingFloor = {
  level: number;
  industry: string;
  vacant: boolean;
};

export type BuildingModel = {
  building_id: string;
  model_url: string;
};

export type DistrictTrendPoint = {
  month: string;
  vacancy_rate: number;
  predicted: boolean;
};

const baseUrl = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getHeatmap(district = 'lapesta'): Promise<HeatmapFeatureCollection> {
  return request<HeatmapFeatureCollection>(`/heatmap?district=${encodeURIComponent(district)}`);
}

export async function fetchHeatmap(district = 'lapesta'): Promise<HeatmapFeatureCollection> {
  return getHeatmap(district);
}

export async function getBuildingHistory(id: string): Promise<BuildingHistoryEvent[]> {
  return request<BuildingHistoryEvent[]>(`/buildings/${encodeURIComponent(id)}/history`);
}

export async function getBuildingFloors(id: string): Promise<BuildingFloor[]> {
  return request<BuildingFloor[]>(`/buildings/${encodeURIComponent(id)}/floors`);
}

export async function getBuildingModel(id: string): Promise<BuildingModel> {
  return request<BuildingModel>(`/buildings/${encodeURIComponent(id)}/model`);
}

export async function getDistrictTrend(guCode: string): Promise<DistrictTrendPoint[]> {
  return request<DistrictTrendPoint[]>(`/districts/${encodeURIComponent(guCode)}/trend`);
}

// ── 지역/업종 추천 — 실제 백엔드 연동 전까지는 결정적(deterministic) 더미 데이터로 동작 ──
import { SEOUL_GU, INDUSTRY_CODES } from './seoul';
import { getMarketStats } from './marketData';
import type { RegionAnalysisInput, IndustryAnalysisInput } from '../types/analysis';
import type { RecommendationItem, RecommendationResult, ScoreBreakdownItem } from '../types/recommendation';

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

function guNameOf(code: string): string {
  return SEOUL_GU.find((g) => g.code === code)?.name ?? '';
}

function dongNameOf(guCode: string, dongCode: string): string {
  return SEOUL_GU.find((g) => g.code === guCode)?.dongs.find((d) => d.code === dongCode)?.name ?? '';
}

function industryNameOf(code: string): string {
  return INDUSTRY_CODES.find((i) => i.code === code)?.name ?? code;
}

function confidenceFor(rng: () => number): 'high' | 'medium' | 'low' {
  const v = rng();
  if (v > 0.66) return 'high';
  if (v > 0.33) return 'medium';
  return 'low';
}

function buildBreakdown(rng: () => number, stats: ReturnType<typeof getMarketStats>): ScoreBreakdownItem[] {
  return [
    { label: '유동인구', score: Math.max(0, Math.min(100, Math.round((stats.floatingPop / 2000) * (0.85 + rng() * 0.3)))), weight: 0.25 },
    { label: '공실률', score: Math.max(0, Math.min(100, Math.round(100 - stats.vacancyRate * 3.5))), weight: 0.2 },
    { label: '매출지수', score: Math.max(0, Math.min(100, Math.round(stats.revenueIdx * 0.6))), weight: 0.25 },
    { label: '3년 생존율', score: Math.max(0, Math.min(100, Math.round(stats.survivalRate3y * 1.6))), weight: 0.2 },
    { label: '임대시세 부담', score: Math.max(0, Math.min(100, Math.round(100 - stats.rentPer33 * 3))), weight: 0.1 },
  ];
}

function totalScoreOf(breakdown: ScoreBreakdownItem[]): number {
  const weighted = breakdown.reduce((sum, b) => sum + b.score * b.weight, 0);
  return Math.round(weighted);
}

function simulateDelay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function buildEvidenceAndRisks(
  areaLabel: string,
  industryName: string,
  stats: ReturnType<typeof getMarketStats>,
  condition: { budgetMin: number; budgetMax: number },
): { evidences: string[]; risks: string[] } {
  return {
    evidences: [
      `${areaLabel} 일평균 유동인구 ${Math.round(stats.floatingPop).toLocaleString()}명`,
      `${industryName} 3년 생존율 ${stats.survivalRate3y.toFixed(1)}%`,
      `예상 임대시세 3.3㎡당 ${stats.rentPer33.toFixed(1)}만원 — 예산 범위 ${condition.budgetMin.toLocaleString()}~${condition.budgetMax.toLocaleString()}만원과 비교 검토 필요`,
    ],
    risks: [
      `폐업률 ${stats.closeRate.toFixed(1)}% 수준의 경쟁 강도 존재`,
      `공실률 ${stats.vacancyRate.toFixed(1)}% — 상권 변동성 주의`,
    ],
  };
}

// 지역 → 업종 추천: 선택된 구/동 조건에 가장 적합한 업종 상위 N개
export async function fetchRegionRecommendation(input: RegionAnalysisInput): Promise<RecommendationResult> {
  const { guCode, dongCode, condition } = input;
  const guName = guNameOf(guCode);
  const dongName = dongNameOf(guCode, dongCode);
  const rng = rngFor(guCode, dongCode, String(condition.budgetMax), 'region-rec');

  const candidates = INDUSTRY_CODES.filter((i) => i.code !== 'ALL');
  const picked = [...candidates].sort(() => rng() - 0.5).slice(0, 5);

  const items: RecommendationItem[] = picked
    .map((ind, idx) => {
      const stats = getMarketStats(guCode, dongCode, ind.code);
      const breakdown = buildBreakdown(rng, stats);
      const totalScore = totalScoreOf(breakdown);
      const { evidences, risks } = buildEvidenceAndRisks(`${guName} ${dongName}`, ind.name, stats, condition);
      return {
        id: `${guCode}-${dongCode}-${ind.code}`,
        rank: idx + 1,
        guCode,
        guName,
        dongCode,
        dongName,
        industryCode: ind.code,
        industryName: ind.name,
        totalScore,
        breakdown,
        evidences,
        risks,
        dataConfidence: confidenceFor(rng),
        expectedMonthlyRevenue: Math.round((stats.revenueIdx / 100) * (1500 + rng() * 1500)),
        startupCostMin: Math.round(2500 + rng() * 2000),
        startupCostMax: Math.round(5000 + rng() * 5000),
        paybackMonths: Math.round(18 + rng() * 20),
        survivalRate3y: Math.round(stats.survivalRate3y * 10) / 10,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const result: RecommendationResult = {
    mode: 'region',
    generatedAt: new Date(2026, 5, 25).toISOString(),
    query: { guCode, guName, dongCode, dongName },
    items,
  };
  return simulateDelay(result);
}

// 업종 → 지역 추천: 선택된 업종 조건에 가장 적합한 구/동 상위 N개
export async function fetchIndustryRecommendation(input: IndustryAnalysisInput): Promise<RecommendationResult> {
  const { industryCode, condition } = input;
  const industryName = industryNameOf(industryCode);
  const rng = rngFor(industryCode, String(condition.budgetMax), 'industry-rec');

  const candidateDongs = SEOUL_GU.flatMap((g) => g.dongs.map((d) => ({ gu: g, dong: d })));
  const picked = [...candidateDongs].sort(() => rng() - 0.5).slice(0, 6);

  const items: RecommendationItem[] = picked
    .map((c, idx) => {
      const stats = getMarketStats(c.gu.code, c.dong.code, industryCode);
      const breakdown = buildBreakdown(rng, stats);
      const totalScore = totalScoreOf(breakdown);
      const { evidences, risks } = buildEvidenceAndRisks(`${c.gu.name} ${c.dong.name}`, industryName, stats, condition);
      return {
        id: `${c.gu.code}-${c.dong.code}-${industryCode}`,
        rank: idx + 1,
        guCode: c.gu.code,
        guName: c.gu.name,
        dongCode: c.dong.code,
        dongName: c.dong.name,
        industryCode,
        industryName,
        totalScore,
        breakdown,
        evidences,
        risks,
        dataConfidence: confidenceFor(rng),
        expectedMonthlyRevenue: Math.round((stats.revenueIdx / 100) * (1500 + rng() * 1500)),
        startupCostMin: Math.round(2500 + rng() * 2000),
        startupCostMax: Math.round(5000 + rng() * 5000),
        paybackMonths: Math.round(18 + rng() * 20),
        survivalRate3y: Math.round(stats.survivalRate3y * 10) / 10,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const result: RecommendationResult = {
    mode: 'industry',
    generatedAt: new Date(2026, 5, 25).toISOString(),
    query: { industryCode, industryName },
    items,
  };
  return simulateDelay(result);
}
