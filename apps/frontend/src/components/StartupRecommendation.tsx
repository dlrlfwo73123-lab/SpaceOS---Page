import { useMemo, useState } from 'react';
import { getStartupAreaRecs, type StartupAreaRec } from '@/lib/marketData';
import { SEOUL_GU } from '@/lib/seoul';

type Props = {
  guCode: string;
  guName: string;
  industryCode: string;
  dongs: { code: string; name: string }[];
  onSelectDong?: (dongCode: string, guCode?: string) => void;
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

function ScoreFormula() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShow((v) => !v)}
        className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
      >
        점수 계산법 ?
      </button>
      {show && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-4 text-[12px] text-slate-700 space-y-3">
          <p className="font-bold text-slate-800 text-sm">창업 추천 점수 계산 공식</p>

          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 font-mono text-[11px] text-indigo-800">
            점수 = 유동인구점수(30) + 공실률점수(40) + 임대료점수(30)
          </div>

          <div className="space-y-2">
            <div>
              <p className="font-semibold text-indigo-700">① 유동인구 점수 (최대 30점)</p>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">min(유동인구 / 50,000, 3) × 30</p>
              <p className="text-slate-400 text-[11px]">유동인구 15만명 이상이면 만점(30점). 5만명 증가마다 10점 추가.</p>
            </div>
            <div>
              <p className="font-semibold text-indigo-700">② 공실률 점수 (최대 40점)</p>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">max(0, 20 − 공실률%) × 2</p>
              <p className="text-slate-400 text-[11px]">공실률 0%이면 40점, 20%이면 0점. 낮을수록 안정 상권.</p>
            </div>
            <div>
              <p className="font-semibold text-indigo-700">③ 임대료 점수 (최대 30점)</p>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">max(0, 20 − 임대시세) × 1.5</p>
              <p className="text-slate-400 text-[11px]">3.3㎡당 임대료가 낮을수록 초기 비용 부담이 적어 높은 점수.</p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-700">
            ⚠️ 현재 공식은 3개 지표 단순 가중합산. 경쟁 업체 수·접근성·인구 특성 등은 미반영. 참고용으로만 활용하세요.
          </div>

          <button onClick={() => setShow(false)} className="text-[11px] text-slate-400 underline">닫기</button>
        </div>
      )}
    </div>
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
  const recs = useMemo(() => {
    if (guCode) return getStartupAreaRecs(guCode, industryCode, guName, dongs, 5);
    // 서울 전체: 각 구에서 1위 동씩 뽑아 상위 5개
    const all: StartupAreaRec[] = [];
    SEOUL_GU.forEach((gu) => {
      const top = getStartupAreaRecs(gu.code, industryCode, gu.name, gu.dongs, 1);
      all.push(...top);
    });
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [guCode, industryCode, guName, dongs]);

  const title = guCode ? `${guName} 내 창업 지역 추천` : '서울 전체 창업 지역 추천';
  const subtitle = guCode
    ? `${guName} 동별 유동인구·공실률·임대시세 종합 점수 기준 · 데모 데이터`
    : '서울 25개 구 전체에서 상위 5개 동 추출 · 데모 데이터';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreFormula />
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Top {recs.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {recs.map((rec) => (
          <AreaCard
            key={`${rec.guCode}-${rec.dongCode}`}
            rec={rec}
            onSelect={() => onSelectDong?.(rec.dongCode, rec.guCode)}
          />
        ))}
      </div>

      <p className="text-[10px] text-slate-400">
        ※ 점수 = 유동인구(30점) + 저공실률(40점) + 저임대료(30점) 최대 100점. 데모 합성 데이터 기반이며 실제 창업 판단에 직접 사용하지 마십시오.
      </p>
    </section>
  );
}
