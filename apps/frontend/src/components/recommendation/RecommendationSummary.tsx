import { DataFreshness } from '@/components/common/DataFreshness';
import type { RecommendationResult } from '@/types/recommendation';

export function RecommendationSummary({ result }: { result: RecommendationResult }) {
  const top = result.items[0];
  const queryLabel = result.mode === 'region'
    ? `${result.query.guName} ${result.query.dongName}`
    : result.query.industryName ?? '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          {result.mode === 'region' ? '지역 → 업종 추천 결과' : '업종 → 지역 추천 결과'}
        </h2>
        <DataFreshness generatedAt={result.generatedAt} />
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900">{queryLabel}</p>
      {top && (
        <p className="mt-2 text-sm text-slate-500">
          가장 적합한 결과: <span className="font-semibold text-indigo-600">
            {result.mode === 'region' ? top.industryName : `${top.guName} ${top.dongName}`}
          </span> (종합 점수 {top.totalScore}점)
        </p>
      )}
    </div>
  );
}
