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
