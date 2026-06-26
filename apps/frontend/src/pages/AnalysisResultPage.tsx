import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRegionRecommendation } from '@/hooks/useRegionRecommendation';
import { useIndustryRecommendation } from '@/hooks/useIndustryRecommendation';
import { RecommendationSummary } from '@/components/recommendation/RecommendationSummary';
import { RecommendationCard } from '@/components/recommendation/RecommendationCard';
import { RecommendationMap } from '@/components/map/RecommendationMap';
import { BuildingDetailDrawer } from '@/components/map/BuildingDetailDrawer';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { DataSourcePanel } from '@/components/common/DataSourcePanel';
import type { RegionAnalysisInput, IndustryAnalysisInput } from '@/types/analysis';
import type { RecommendationItem } from '@/types/recommendation';

type LocationState =
  | { mode: 'region'; input: RegionAnalysisInput }
  | { mode: 'industry'; input: IndustryAnalysisInput }
  | undefined;

export default function AnalysisResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [selected, setSelected] = useState<RecommendationItem | null>(null);

  const regionResult = useRegionRecommendation(state?.mode === 'region' ? state.input : null);
  const industryResult = useIndustryRecommendation(state?.mode === 'industry' ? state.input : null);

  if (!state) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl">
          <ErrorState message="분석 조건이 없습니다. 처음으로 돌아가 다시 시도해 주세요." onRetry={() => navigate('/')} />
        </div>
      </main>
    );
  }

  const { data, loading, error } = state.mode === 'region' ? regionResult : industryResult;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <button onClick={() => navigate(-1)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">← 조건 다시 입력</button>

        {loading && <LoadingState label="추천 결과를 분석하는 중…" />}
        {error && <ErrorState message={error} onRetry={() => navigate(-1)} />}

        {data && (
          <>
            <RecommendationSummary result={data} />
            <DataSourcePanel />

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                {data.items.map((item) => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    mode={data.mode}
                    selected={selected?.id === item.id}
                    onSelect={() => setSelected(item)}
                  />
                ))}
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm font-semibold">지도</p>
                  <RecommendationMap
                    guCode={(selected ?? data.items[0])?.guCode ?? ''}
                    dongCode={(selected ?? data.items[0])?.dongCode ?? ''}
                    industryCode={(selected ?? data.items[0])?.industryCode ?? 'ALL'}
                  />
                </div>
                <BuildingDetailDrawer item={selected} onClose={() => setSelected(null)} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
