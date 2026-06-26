import { formatWon } from '@/lib/formatters';
import type { RecommendationItem } from '@/types/recommendation';
import { ScoreBreakdown } from './ScoreBreakdown';
import { EvidenceList } from './EvidenceList';
import { RiskList } from './RiskList';
import { DataConfidenceBadge } from './DataConfidenceBadge';

type Props = {
  item: RecommendationItem;
  mode: 'region' | 'industry';
  selected?: boolean;
  onSelect?: () => void;
};

export function RecommendationCard({ item, mode, selected, onSelect }: Props) {
  const title = mode === 'region' ? item.industryName : `${item.guName} ${item.dongName}`;
  const subtitle = mode === 'region' ? `${item.guName} ${item.dongName}` : item.industryName;

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-colors ${
        selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.rank}위 추천</span>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-600">{item.totalScore}</p>
          <p className="text-[11px] text-slate-400">종합 점수</p>
        </div>
      </div>

      <div className="mt-3">
        <ScoreBreakdown items={item.breakdown} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-center text-xs">
        <div>
          <p className="font-semibold text-slate-700">{formatWon(item.expectedMonthlyRevenue)}</p>
          <p className="text-slate-400">예상 월매출</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">{item.rentPer33.toFixed(1)}만원</p>
          <p className="text-slate-400">3.3㎡당 임대시세</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DataConfidenceBadge level={item.dataConfidence} />
          {item.isDemo && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              데모 데이터
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400">3년 생존율 {item.survivalRate3y}%</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <EvidenceList items={item.evidences} />
        <RiskList items={item.risks} />
      </div>
    </button>
  );
}
