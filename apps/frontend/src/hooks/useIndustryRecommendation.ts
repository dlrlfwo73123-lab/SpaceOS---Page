import { useEffect, useState } from 'react';
import { fetchIndustryRecommendation } from '@/lib/api';
import type { IndustryAnalysisInput } from '@/types/analysis';
import type { RecommendationResult } from '@/types/recommendation';

export function useIndustryRecommendation(input: IndustryAnalysisInput | null) {
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchIndustryRecommendation(input)
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError('업종 기반 지역 추천을 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [input?.industryCode, input?.condition.budgetMin, input?.condition.budgetMax, input?.condition.areaSqm, input?.condition.priorExperience]);

  return { data, loading, error };
}
