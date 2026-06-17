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

export type BuildingHistoryPoint = {
  level: number;
  industry: string;
  vacant: boolean;
};

export type BuildingFloor = {
  level: number;
  industry: string;
  vacant: boolean;
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

export async function getBuildingHistory(id: string): Promise<BuildingHistoryPoint[]> {
  return request<BuildingHistoryPoint[]>(`/buildings/${encodeURIComponent(id)}/history`);
}

export async function getBuildingFloors(id: string): Promise<BuildingFloor[]> {
  return request<BuildingFloor[]>(`/buildings/${encodeURIComponent(id)}/floors`);
}
