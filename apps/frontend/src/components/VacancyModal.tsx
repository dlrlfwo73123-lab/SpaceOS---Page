import type { VacancyMarker } from '@/lib/marketData';
import { getMarketStats } from '@/lib/marketData';

type Props = {
  vacancy: VacancyMarker;
  guCode: string;
  guName: string;
  onClose: () => void;
};

export default function VacancyModal({ vacancy, guCode, guName, onClose }: Props) {
  const stats = getMarketStats(guCode, vacancy.dongCode, 'ALL');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-red-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">공실 매물 상세</p>
              <p className="text-base font-bold mt-0.5">{guName} · {vacancy.dongName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-[11px] opacity-60">※ 데모 데이터 — 실제 매물과 다름</p>
        </div>

        {/* 매물 정보 */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">매물 정보</p>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="층" value={`${vacancy.floor}층`} />
            <InfoCell label="면적" value={`${vacancy.sqm}㎡`} />
            <InfoCell label="월세" value={`${vacancy.rentMonthly}만원/월`} accent />
            <InfoCell label="공실 기간" value={`${vacancy.emptyMonths}개월`} />
            <InfoCell label="전 업종" value={vacancy.lastIndustry} spanFull />
          </div>
        </div>

        {/* 구분선 */}
        <div className="mx-5 my-3 border-t border-slate-100" />

        {/* 상권 지표 */}
        <div className="px-5 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">상권 지표 (동 기준)</p>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="유동인구" value={`${Math.round(stats.floatingPop).toLocaleString()}명`} />
            <InfoCell
              label="공실률"
              value={`${stats.vacancyRate.toFixed(1)}%`}
              accent={stats.vacancyRate >= 15}
              good={stats.vacancyRate < 12}
            />
            <InfoCell label="인구밀도" value={`${Math.round(stats.popDensity).toLocaleString()}명/km²`} />
            <InfoCell label="임대시세" value={`${stats.rentPer33.toFixed(1)}만/3.3㎡`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  label, value, accent, good, spanFull,
}: {
  label: string;
  value: string;
  accent?: boolean;
  good?: boolean;
  spanFull?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-slate-50 px-3 py-2 ${spanFull ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${accent ? 'text-red-600' : good ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}
