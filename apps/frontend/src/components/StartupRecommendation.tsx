import { useMemo, useState } from 'react';
import { getStartupAreaRecs, type StartupAreaRec } from '@/lib/marketData';

type Props = {
  guCode: string;
  guName: string;
  industryCode: string;
  dongs: { code: string; name: string }[];
  onSelectDong?: (code: string) => void;
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 65 ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      {score}점
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const styles = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-700', 'bg-orange-200 text-orange-700', 'bg-slate-100 text-slate-500', 'bg-slate-100 text-slate-500'];
  return (
    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${styles[rank - 1] ?? styles[4]}`}>
      {rank}
    </span>
  );
}

function AreaCard({ rec, onSelect }: { rec: StartupAreaRec; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <RankBadge rank={rec.rank} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800">{rec.dongName}</p>
          <p className="text-[11px] text-slate-400">{rec.guName}</p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block text-[11px] text-slate-500">
            <span className="text-red-500 font-medium">공실 {rec.vacancyRate}%</span>
            {' · '}
            <span>{Math.round(rec.floatingPop).toLocaleString()}명</span>
            {' · '}
            <span>{rec.rentPer33}만원/3.3㎡</span>
          </div>
          <ScoreBadge score={rec.score} />
          <span className="text-slate-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
          <div className="grid grid-cols-3 gap-3 mb-3 text-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">공실률</p>
              <p className="text-sm font-bold text-red-600">{rec.vacancyRate}%</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">유동인구</p>
              <p className="text-sm font-bold text-slate-700">{Math.round(rec.floatingPop).toLocaleString()}명</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">임대시세</p>
              <p className="text-sm font-bold text-slate-700">{rec.rentPer33}만원</p>
            </div>
          </div>
          <ul className="space-y-1 mb-3">
            {rec.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600">
                <span className="mt-0.5 text-emerald-500">✓</span>{r}
              </li>
            ))}
          </ul>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            이 동 지도에서 보기
          </button>
        </div>
      )}
    </div>
  );
}

export default function StartupRecommendation({ guCode, guName, industryCode, dongs, onSelectDong }: Props) {
  const recs = useMemo(
    () => getStartupAreaRecs(guCode, industryCode, guName, dongs),
    [guCode, industryCode, guName, dongs],
  );

  if (!guCode || dongs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-400">구를 선택하면 창업 추천 동 순위가 표시됩니다</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">창업 지역 추천</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {guName} 내 동별 유동인구·공실률·임대시세 종합 점수 기준 · 데모 데이터
          </p>
        </div>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Top {recs.length}</span>
      </div>

      <div className="space-y-2">
        {recs.map((rec) => (
          <AreaCard
            key={rec.dongCode}
            rec={rec}
            onSelect={() => onSelectDong?.(rec.dongCode)}
          />
        ))}
      </div>

      <p className="text-[10px] text-slate-400">
        ※ 점수 = 유동인구 가중치(30%) + 저공실률 가중치(40%) + 저임대료 가중치(30%). 데모 합성 데이터 기반이며 실제 창업 판단에 직접 사용하지 마십시오.
      </p>
    </section>
  );
}
