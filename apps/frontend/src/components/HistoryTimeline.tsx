import { useEffect, useState } from 'react';
import { getBuildingHistory, type BuildingHistoryEvent } from '@/lib/api';

const EVENT_BADGE: Record<string, string> = {
  '신규입점': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  '폐업': 'bg-red-100 text-red-700 border border-red-200',
  '업종변경': 'bg-blue-100 text-blue-700 border border-blue-200',
};

const EVENT_DOT: Record<string, string> = {
  '신규입점': 'bg-emerald-500',
  '폐업': 'bg-red-500',
  '업종변경': 'bg-blue-500',
};

const FALLBACK_HISTORY: BuildingHistoryEvent[] = [
  {
    date: '2025-11', store_name: '블루보틀 역삼점', floor: 1, industry: '카페',
    event: '신규입점', open_date: '2025-11-03', close_date: null, op_months: null,
    rent_monthly: 680, close_reason_summary: null,
  },
  {
    date: '2025-08', store_name: '미르헤어 역삼점', floor: 2, industry: '미용실',
    event: '폐업', open_date: '2024-01-15', close_date: '2025-08-31', op_months: 19,
    rent_monthly: 420,
    close_reason_summary: '임대료 인상과 매출 감소가 겹쳐 수익성이 악화됐습니다.',
  },
];

type HistoryTimelineProps = { buildingId: string };

export default function HistoryTimeline({ buildingId }: HistoryTimelineProps) {
  const [history, setHistory] = useState<BuildingHistoryEvent[]>(FALLBACK_HISTORY);

  useEffect(() => {
    getBuildingHistory(buildingId)
      .then((data) => setHistory(data.length ? data : FALLBACK_HISTORY))
      .catch((err) => {
        console.warn('히스토리 로드 실패, fallback 사용', err);
        setHistory(FALLBACK_HISTORY);
      });
  }, [buildingId]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">공실 히스토리 타임라인</p>
        <span className="text-xs text-slate-400">
          건물 ID: <span className="font-mono">{buildingId}</span>
        </span>
      </div>

      <ol className="relative space-y-6 border-l-2 border-slate-100 pl-6">
        {history.map((ev, i) => (
          <li key={`${ev.date}-${i}`} className="relative">
            <span
              className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                EVENT_DOT[ev.event] ?? 'bg-slate-400'
              }`}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-400">{ev.date}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EVENT_BADGE[ev.event] ?? ''}`}>
                {ev.event}
              </span>
              <span className="text-sm font-bold text-slate-800">{ev.store_name}</span>
              <span className="text-xs text-slate-400">{ev.floor}F · {ev.industry}</span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {ev.open_date} ~ {ev.close_date ?? '영업 중'}
              {ev.op_months != null && <span className="ml-1.5">· {ev.op_months}개월 영업</span>}
              <span className="ml-1.5">· 임차비 {ev.rent_monthly}만원/월</span>
            </p>

            {ev.close_reason_summary && (
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2">
                <span className="mt-0.5 text-sm">🤖</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                    AI 폐업 사유 요약
                  </p>
                  <p className="text-xs text-indigo-700">{ev.close_reason_summary}</p>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
