export type HeatmapPoint = {
  grid_id: string;
  lng: number;
  lat: number;
  vacancy_rate: number;
};

export type BuildingHistoryPoint = {
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

export async function getHeatmap(district = 'lapesta'): Promise<HeatmapPoint[]> {
  return request<HeatmapPoint[]>(`/heatmap?district=${encodeURIComponent(district)}`);
}

export async function fetchHeatmap(district = 'lapesta'): Promise<HeatmapPoint[]> {
  return getHeatmap(district);
}

export async function getBuildingHistory(id: string): Promise<BuildingHistoryPoint[]> {
  return request<BuildingHistoryPoint[]>(`/buildings/${encodeURIComponent(id)}/history`);
}
