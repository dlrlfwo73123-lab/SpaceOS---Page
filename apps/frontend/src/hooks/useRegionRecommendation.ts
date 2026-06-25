import { useEffect, useState } from 'react';
import { fetchRegionRecommendation } from '@/lib/api';
import type { RegionAnalysisInput } from '@/types/analysis';
import type { RecommendationResult } from '@/types/recommendation';

export function useRegionRecommendation(input: RegionAnalysisInput | null) {
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRegionRecommendation(input)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError('지역 기반 업종 추천을 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [input?.guCode, input?.dongCode, input?.condition.budgetMin, input?.condition.budgetMax, input?.condition.areaSqm, input?.condition.priorExperience]);

  return { data, loading, error };
}
