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
  is_demo: boolean;
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

// VITE_API_BASE_URL points at the deployed backend origin (e.g. https://api.example.com).
// Falls back to a relative path for local dev, where vite.config.ts proxies /api to the dev backend.
const apiOrigin = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
const baseUrl = `${apiOrigin}/api/v1`;

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

// ── 지역/업종 추천 — 백엔드의 결정적(non-AI) 스코어링 엔진(/recommendations/by-*) 호출 ──
import type { RegionAnalysisInput, IndustryAnalysisInput, BusinessCondition } from '../types/analysis';
import type { RecommendationItem, RecommendationResult } from '../types/recommendation';

type BackendScoreBreakdownItem = { key: string; label: string; score: number; weight: number };
type BackendConfidence = { is_demo: boolean; confidence: number; label: 'high' | 'medium' | 'low' };
type BackendExplanation = {
  summary: string;
  reasons: string[];
  risks: string[];
  recommended_checks: string[];
  data_limitations: string[];
};
type BackendRecommendationItem = {
  id: string;
  rank: number;
  gu_code: string;
  gu_name: string;
  dong_code: string;
  dong_name: string;
  industry_code: string;
  industry_name: string;
  total_score: number;
  breakdown: BackendScoreBreakdownItem[];
  confidence: BackendConfidence;
  explanation: BackendExplanation;
  expected_monthly_revenue: number;
  rent_per_33: number;
  survival_rate_3y: number;
};
type BackendRecommendationResult = {
  mode: 'region' | 'industry';
  is_demo: boolean;
  query: {
    gu_code?: string;
    gu_name?: string;
    dong_code?: string;
    dong_name?: string;
    industry_code?: string;
    industry_name?: string;
  };
  items: BackendRecommendationItem[];
};

function toCondition(condition: BusinessCondition) {
  return {
    budget_min: condition.budgetMin,
    budget_max: condition.budgetMax,
    area_sqm: condition.areaSqm,
    prior_experience: condition.priorExperience,
  };
}

function toRecommendationItem(item: BackendRecommendationItem): RecommendationItem {
  return {
    id: item.id,
    rank: item.rank,
    guCode: item.gu_code,
    guName: item.gu_name,
    dongCode: item.dong_code,
    dongName: item.dong_name,
    industryCode: item.industry_code,
    industryName: item.industry_name,
    totalScore: item.total_score,
    breakdown: item.breakdown.map((b) => ({ label: b.label, score: b.score, weight: b.weight })),
    evidences: [item.explanation.summary, ...item.explanation.reasons],
    risks: item.explanation.risks,
    dataLimitations: item.explanation.data_limitations,
    dataConfidence: item.confidence.label,
    isDemo: item.confidence.is_demo,
    expectedMonthlyRevenue: item.expected_monthly_revenue,
    rentPer33: item.rent_per_33,
    survivalRate3y: item.survival_rate_3y,
  };
}

function toRecommendationResult(result: BackendRecommendationResult): RecommendationResult {
  return {
    mode: result.mode,
    generatedAt: new Date().toISOString(),
    isDemo: result.is_demo,
    query: {
      guCode: result.query.gu_code,
      guName: result.query.gu_name,
      dongCode: result.query.dong_code,
      dongName: result.query.dong_name,
      industryCode: result.query.industry_code,
      industryName: result.query.industry_name,
    },
    items: result.items.map(toRecommendationItem),
  };
}

// 지역 → 업종 추천: 선택된 구/동 조건에 가장 적합한 업종 상위 N개
export async function fetchRegionRecommendation(input: RegionAnalysisInput): Promise<RecommendationResult> {
  const body = await request<BackendRecommendationResult>('/recommendations/by-region', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gu_code: input.guCode,
      dong_code: input.dongCode,
      condition: toCondition(input.condition),
    }),
  });
  return toRecommendationResult(body);
}

// 업종 → 지역 추천: 선택된 업종 조건에 가장 적합한 구/동 상위 N개
// ── 데이터 출처/신선도/품질 — 모든 항목이 mock 소스임을 명시적으로 노출 ──
export type DataSourceInfo = {
  id: string;
  label: string;
  intendedSource: string;
  refreshCadence: string;
  status: 'mock' | 'live';
  liveAdapterImplemented: boolean;
};

export type DataFreshnessInfo = {
  sourceId: string;
  isDemo: boolean;
  asOf: string | null;
  staleness: string;
};

type BackendDataSourceInfo = {
  id: string;
  label: string;
  intended_source: string;
  refresh_cadence: string;
  status: 'mock' | 'live';
  live_adapter_implemented: boolean;
};

type BackendDataFreshnessInfo = {
  source_id: string;
  is_demo: boolean;
  as_of: string | null;
  staleness: string;
};

export async function fetchDataSources(): Promise<DataSourceInfo[]> {
  const body = await request<BackendDataSourceInfo[]>('/data-sources');
  return body.map((s) => ({
    id: s.id,
    label: s.label,
    intendedSource: s.intended_source,
    refreshCadence: s.refresh_cadence,
    status: s.status,
    liveAdapterImplemented: s.live_adapter_implemented,
  }));
}

export async function fetchDataFreshness(): Promise<DataFreshnessInfo[]> {
  const body = await request<BackendDataFreshnessInfo[]>('/data-freshness');
  return body.map((f) => ({
    sourceId: f.source_id,
    isDemo: f.is_demo,
    asOf: f.as_of,
    staleness: f.staleness,
  }));
}

export async function fetchIndustryRecommendation(input: IndustryAnalysisInput): Promise<RecommendationResult> {
  const body = await request<BackendRecommendationResult>('/recommendations/by-industry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      industry_code: input.industryCode,
      condition: toCondition(input.condition),
    }),
  });
  return toRecommendationResult(body);
}
