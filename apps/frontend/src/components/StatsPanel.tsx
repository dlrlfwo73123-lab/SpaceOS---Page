import { lazy, Suspense, useState } from 'react';
import { getMarketStats, getMetricTrend, getMetricQoQTrend, METRIC_LABELS, type MarketStats } from '@/lib/marketData';

const MetricTrendChart = lazy(() => import('./MetricTrendChart'));

type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendGood?: 'up' | 'down';
  onClick?: () => void;
};

function StatCard({ label, value, sub, color, trend, trendGood, onClick }: StatCardProps) {
  const isGood = trend === trendGood;
  const trendEl = trend && trend !== 'neutral' ? (
    <span className={`ml-1 text-xs font-bold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
      {trend === 'up' ? '▲' : '▼'}
    </span>
  ) : null;

  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md hover:border-indigo-300"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}<span className="ml-1 text-slate-300">· 클릭하여 3년 추이 보기</span></p>
      <p className={`mt-1 text-xl font-bold ${color} flex items-baseline`}>
        {value}{trendEl}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </button>
  );
}

type StatsPanelProps = { guCode?: string; dongCode?: string; industryCode?: string };

export default function StatsPanel({ guCode = '11680', dongCode = '', industryCode = 'ALL' }: StatsPanelProps) {
  const s = getMarketStats(guCode, dongCode, industryCode);
  const [activeMetric, setActiveMetric] = useState<keyof MarketStats | null>(null);

  function openMetric(key: keyof MarketStats) {
    setActiveMetric(key);
  }

  function qoq(key: keyof MarketStats) {
    return getMetricQoQTrend(guCode, dongCode, industryCode, key);
  }

  return (
    <div className="space-y-3">
      {/* 주요 4대 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="유동인구"
          value={Math.round(s.floatingPop).toLocaleString()}
          sub="일평균 (명)"
          color="text-indigo-600"
          trend={qoq('floatingPop')}
          trendGood="up"
          onClick={() => openMetric('floatingPop')}
        />
        <StatCard
          label="총 점포 수"
          value={Math.round(s.totalStores).toLocaleString()}
          sub="등록 점포"
          color="text-violet-600"
          trend={qoq('totalStores')}
          trendGood="up"
          onClick={() => openMetric('totalStores')}
        />
        <StatCard
          label="공실률"
          value={`${s.vacancyRate.toFixed(1)}%`}
          sub="점포 공실 비율"
          color={s.vacancyRate >= 15 ? 'text-red-600' : s.vacancyRate >= 12 ? 'text-amber-600' : 'text-emerald-600'}
          trend={qoq('vacancyRate')}
          trendGood="down"
          onClick={() => openMetric('vacancyRate')}
        />
        <StatCard
          label="매출지수"
          value={Math.round(s.revenueIdx).toString()}
          sub="전국 평균 = 100"
          color={s.revenueIdx >= 130 ? 'text-emerald-600' : s.revenueIdx >= 100 ? 'text-indigo-600' : 'text-slate-600'}
          trend={qoq('revenueIdx')}
          trendGood="up"
          onClick={() => openMetric('revenueIdx')}
        />
      </div>

      {/* 상세 6대 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="신규 개업률"
          value={`${s.openRate.toFixed(1)}%`}
          sub="분기 기준"
          color="text-emerald-600"
          trend={qoq('openRate')}
          trendGood="up"
          onClick={() => openMetric('openRate')}
        />
        <StatCard
          label="폐업률"
          value={`${s.closeRate.toFixed(1)}%`}
          sub="분기 기준"
          color={s.closeRate >= 3.0 ? 'text-red-600' : 'text-amber-600'}
          trend={qoq('closeRate')}
          trendGood="down"
          onClick={() => openMetric('closeRate')}
        />
        <StatCard
          label="3년 생존률"
          value={`${s.survivalRate3y.toFixed(1)}%`}
          sub="신규 개업 점포"
          color={s.survivalRate3y >= 55 ? 'text-emerald-600' : s.survivalRate3y >= 50 ? 'text-indigo-600' : 'text-amber-600'}
          trend={qoq('survivalRate3y')}
          trendGood="up"
          onClick={() => openMetric('survivalRate3y')}
        />
        <StatCard
          label="평균 영업기간"
          value={`${Math.round(s.avgOpMonths)}개월`}
          sub={`약 ${(s.avgOpMonths / 12).toFixed(1)}년`}
          color="text-slate-700"
          trend={qoq('avgOpMonths')}
          trendGood="up"
          onClick={() => openMetric('avgOpMonths')}
        />
        <StatCard
          label="인구밀도"
          value={Math.round(s.popDensity).toLocaleString()}
          sub="명 / km²"
          color="text-slate-600"
          trend={qoq('popDensity')}
          trendGood="up"
          onClick={() => openMetric('popDensity')}
        />
        <StatCard
          label="임대시세"
          value={`${s.rentPer33.toFixed(1)}만원`}
          sub="3.3㎡ 기준"
          color="text-violet-600"
          trend={qoq('rentPer33')}
          trendGood="down"
          onClick={() => openMetric('rentPer33')}
        />
      </div>

      {activeMetric && (
        <Suspense fallback={null}>
          <MetricTrendChart
            points={getMetricTrend(guCode, dongCode, industryCode, activeMetric)}
            label={METRIC_LABELS[activeMetric].label}
            unit={METRIC_LABELS[activeMetric].unit}
            onClose={() => setActiveMetric(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
