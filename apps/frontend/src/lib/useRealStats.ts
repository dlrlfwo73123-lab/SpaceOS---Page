/**
 * GitHub Actions가 매일 갱신하는 /data/gu-stats.json을 읽어
 * PRNG 기본값에 실제 공공데이터를 덮어씌웁니다.
 *
 * is_demo=true → 데모 배너 표시
 * is_demo=false → "실제 데이터" 배너 표시
 */
import { useEffect, useState } from 'react';

export type RealGuStats = {
  is_demo: boolean;
  generated_at: string | null;
  source: string;
  population: Record<string, { population: number; referDate: string | null }>;
  rent: Record<string, { vacancyRate: number | null; rentIndex: number | null; baseYearMonth: string | null }>;
  land_price: Record<string, { changeRate: number | null; baseDate: string | null }>;
};

const DEFAULT: RealGuStats = {
  is_demo: true,
  generated_at: null,
  source: 'demo',
  population: {},
  rent: {},
  land_price: {},
};

let _cache: RealGuStats | null = null;
let _fetching = false;
const _listeners = new Set<(s: RealGuStats) => void>();

function fetchStats() {
  if (_fetching || _cache) return;
  _fetching = true;
  fetch('/SpaceOS---Page/data/gu-stats.json')
    .then((r) => r.json())
    .then((json) => {
      _cache = {
        is_demo: json._meta?.is_demo ?? true,
        generated_at: json._meta?.generated_at ?? null,
        source: json._meta?.source ?? 'demo',
        population: json.population ?? {},
        rent: json.rent ?? {},
        land_price: json.land_price ?? {},
      };
      _listeners.forEach((fn) => fn(_cache!));
    })
    .catch(() => {
      _cache = DEFAULT;
      _listeners.forEach((fn) => fn(_cache!));
    })
    .finally(() => { _fetching = false; });
}

export function useRealStats(): RealGuStats {
  const [stats, setStats] = useState<RealGuStats>(_cache ?? DEFAULT);
  useEffect(() => {
    if (_cache) { setStats(_cache); return; }
    _listeners.add(setStats);
    fetchStats();
    return () => { _listeners.delete(setStats); };
  }, []);
  return stats;
}

/** 구 코드로 실제 공실률 조회 (null = 데이터 없음) */
export function getRealVacancyRate(stats: RealGuStats, guCode: string): number | null {
  return stats.rent[guCode]?.vacancyRate ?? null;
}

/** 구 코드로 실제 인구 조회 (null = 데이터 없음) */
export function getRealPopulation(stats: RealGuStats, guCode: string): number | null {
  return stats.population[guCode]?.population ?? null;
}
