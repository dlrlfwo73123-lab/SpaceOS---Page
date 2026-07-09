import { lazy, Suspense, useState } from 'react';
import { getMarketStats, getMetricTrend, METRIC_LABELS, type MarketStats } from '@/lib/marketData';

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
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}<span className="ml-1 text-slate-300">· 클릭하여 3년 추이 보기</span>
      </p>
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="유동인구"
          value={Math.round(s.floatingPop).toLocaleString()}
          sub="일평균 (명)"
          color="text-indigo-600"
          trend="up"
          trendGood="up"
          onClick={() => setActiveMetric('floatingPop')}
        />
        <StatCard
          label="공실률"
          value={`${s.vacancyRate.toFixed(1)}%`}
          sub="점포 공실 비율"
          color={s.vacancyRate >= 15 ? 'text-red-600' : s.vacancyRate >= 12 ? 'text-amber-600' : 'text-emerald-600'}
          trend={s.vacancyRate >= 15 ? 'up' : 'down'}
          trendGood="down"
          onClick={() => setActiveMetric('vacancyRate')}
        />
        <StatCard
          label="인구밀도"
          value={Math.round(s.popDensity).toLocaleString()}
          sub="명 / km²"
          color="text-slate-600"
          onClick={() => setActiveMetric('popDensity')}
        />
        <StatCard
          label="임대시세"
          value={`${s.rentPer33.toFixed(1)}만원`}
          sub="3.3㎡ 기준"
          color="text-violet-600"
          onClick={() => setActiveMetric('rentPer33')}
        />
      </div>

      <p className="mt-1 text-[10px] text-slate-400">
        ※ 데모 데이터 — 공공데이터 기반 합성 수치이며 실제 시장 상황과 다를 수 있습니다.
        출처 기준: 서울 열린데이터광장 · 한국부동산원 · 서울시 상권분석서비스
      </p>

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
