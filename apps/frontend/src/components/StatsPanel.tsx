// TODO: 실제 데이터는 GET /api/v1/districts/{guCode}/stats 에서 받아올 것 (소상공인시장진흥공단 API)
const GU_STATS: Record<string, GuStats> = {
  '11680': { floatingPop: 187400, popDensity: 18500, vacancyRate: 12.4, totalStores: 22310, openRate: 3.2, closeRate: 2.1, avgOpMonths: 38, revenueIdx: 168, survivalRate3y: 54.2, rentPer33: 18.5 },
  '11740': { floatingPop: 94200, popDensity: 14200, vacancyRate: 10.8, totalStores: 10540, openRate: 2.8, closeRate: 2.4, avgOpMonths: 42, revenueIdx: 112, survivalRate3y: 56.8, rentPer33: 9.2 },
  '11305': { floatingPop: 61800, popDensity: 16100, vacancyRate: 17.3, totalStores: 7820, openRate: 2.1, closeRate: 3.1, avgOpMonths: 28, revenueIdx: 78, survivalRate3y: 44.1, rentPer33: 5.8 },
  '11500': { floatingPop: 103500, popDensity: 12400, vacancyRate: 14.2, totalStores: 13900, openRate: 3.4, closeRate: 2.7, avgOpMonths: 35, revenueIdx: 101, survivalRate3y: 51.3, rentPer33: 8.1 },
  '11620': { floatingPop: 98700, popDensity: 24300, vacancyRate: 15.8, totalStores: 11200, openRate: 3.8, closeRate: 3.2, avgOpMonths: 30, revenueIdx: 89, survivalRate3y: 47.9, rentPer33: 7.4 },
  '11215': { floatingPop: 78900, popDensity: 19800, vacancyRate: 11.5, totalStores: 9640, openRate: 3.1, closeRate: 2.3, avgOpMonths: 36, revenueIdx: 107, survivalRate3y: 53.6, rentPer33: 9.8 },
  '11530': { floatingPop: 82100, popDensity: 17200, vacancyRate: 16.1, totalStores: 9880, openRate: 2.9, closeRate: 2.9, avgOpMonths: 33, revenueIdx: 88, survivalRate3y: 48.4, rentPer33: 6.9 },
  '11545': { floatingPop: 54300, popDensity: 21600, vacancyRate: 13.9, totalStores: 6120, openRate: 4.1, closeRate: 2.6, avgOpMonths: 27, revenueIdx: 95, survivalRate3y: 49.2, rentPer33: 7.2 },
  '11350': { floatingPop: 112300, popDensity: 20100, vacancyRate: 13.7, totalStores: 14500, openRate: 2.6, closeRate: 2.8, avgOpMonths: 40, revenueIdx: 93, survivalRate3y: 50.1, rentPer33: 7.6 },
  '11320': { floatingPop: 69400, popDensity: 22300, vacancyRate: 15.2, totalStores: 8200, openRate: 2.4, closeRate: 3.0, avgOpMonths: 37, revenueIdx: 81, survivalRate3y: 46.3, rentPer33: 5.9 },
  '11230': { floatingPop: 88600, popDensity: 25900, vacancyRate: 14.6, totalStores: 10900, openRate: 3.3, closeRate: 2.8, avgOpMonths: 34, revenueIdx: 98, survivalRate3y: 50.7, rentPer33: 8.8 },
  '11590': { floatingPop: 91200, popDensity: 23400, vacancyRate: 13.1, totalStores: 10100, openRate: 3.0, closeRate: 2.5, avgOpMonths: 39, revenueIdx: 104, survivalRate3y: 52.4, rentPer33: 8.3 },
  '11440': { floatingPop: 142800, popDensity: 22100, vacancyRate: 11.9, totalStores: 17400, openRate: 4.2, closeRate: 2.2, avgOpMonths: 32, revenueIdx: 139, survivalRate3y: 55.1, rentPer33: 13.6 },
  '11410': { floatingPop: 79300, popDensity: 18800, vacancyRate: 14.8, totalStores: 9300, openRate: 2.7, closeRate: 2.9, avgOpMonths: 36, revenueIdx: 92, survivalRate3y: 49.8, rentPer33: 8.1 },
  '11650': { floatingPop: 158700, popDensity: 15600, vacancyRate: 10.3, totalStores: 19800, openRate: 3.5, closeRate: 1.9, avgOpMonths: 43, revenueIdx: 155, survivalRate3y: 57.3, rentPer33: 16.2 },
  '11200': { floatingPop: 104600, popDensity: 20700, vacancyRate: 11.7, totalStores: 12300, openRate: 3.8, closeRate: 2.0, avgOpMonths: 38, revenueIdx: 128, survivalRate3y: 54.8, rentPer33: 11.4 },
  '11290': { floatingPop: 86400, popDensity: 19300, vacancyRate: 13.4, totalStores: 10200, openRate: 2.8, closeRate: 2.7, avgOpMonths: 37, revenueIdx: 91, survivalRate3y: 50.3, rentPer33: 7.8 },
  '11710': { floatingPop: 163200, popDensity: 21800, vacancyRate: 11.2, totalStores: 20100, openRate: 3.6, closeRate: 2.0, avgOpMonths: 41, revenueIdx: 147, survivalRate3y: 55.9, rentPer33: 14.8 },
  '11470': { floatingPop: 97800, popDensity: 18400, vacancyRate: 12.8, totalStores: 11700, openRate: 2.9, closeRate: 2.4, avgOpMonths: 40, revenueIdx: 106, survivalRate3y: 52.1, rentPer33: 9.4 },
  '11560': { floatingPop: 134500, popDensity: 17900, vacancyRate: 13.5, totalStores: 16200, openRate: 3.7, closeRate: 2.3, avgOpMonths: 36, revenueIdx: 131, survivalRate3y: 53.4, rentPer33: 12.1 },
  '11170': { floatingPop: 118900, popDensity: 13200, vacancyRate: 12.0, totalStores: 13800, openRate: 4.0, closeRate: 2.1, avgOpMonths: 37, revenueIdx: 143, survivalRate3y: 55.6, rentPer33: 13.9 },
  '11380': { floatingPop: 88100, popDensity: 15700, vacancyRate: 14.5, totalStores: 10400, openRate: 2.7, closeRate: 2.8, avgOpMonths: 36, revenueIdx: 87, survivalRate3y: 48.7, rentPer33: 6.7 },
  '11110': { floatingPop: 128400, popDensity: 10800, vacancyRate: 13.8, totalStores: 14900, openRate: 3.1, closeRate: 2.6, avgOpMonths: 44, revenueIdx: 125, survivalRate3y: 52.9, rentPer33: 12.8 },
  '11140': { floatingPop: 212000, popDensity: 11200, vacancyRate: 14.1, totalStores: 16700, openRate: 3.3, closeRate: 2.5, avgOpMonths: 45, revenueIdx: 162, survivalRate3y: 53.7, rentPer33: 17.2 },
  '11260': { floatingPop: 73600, popDensity: 21400, vacancyRate: 15.9, totalStores: 8700, openRate: 2.5, closeRate: 3.1, avgOpMonths: 33, revenueIdx: 82, survivalRate3y: 46.8, rentPer33: 6.2 },
};

const DEFAULT_STATS: GuStats = {
  floatingPop: 100000, popDensity: 18000, vacancyRate: 14.0, totalStores: 12000,
  openRate: 3.0, closeRate: 2.5, avgOpMonths: 36, revenueIdx: 100, survivalRate3y: 51.0, rentPer33: 9.0,
};

type GuStats = {
  floatingPop: number;    // 일평균 유동인구 (명)
  popDensity: number;     // 인구밀도 (명/km²)
  vacancyRate: number;    // 공실율 (%)
  totalStores: number;    // 총 점포 수
  openRate: number;       // 신규 개업률 (%)
  closeRate: number;      // 폐업률 (%)
  avgOpMonths: number;    // 평균 영업기간 (개월)
  revenueIdx: number;     // 매출지수 (전국 평균=100)
  survivalRate3y: number; // 3년 생존율 (%)
  rentPer33: number;      // 임대시세 (만원/3.3㎡)
};

type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendGood?: 'up' | 'down'; // 어느 방향이 긍정인지
};

function StatCard({ label, value, sub, color, trend, trendGood }: StatCardProps) {
  const isGood = trend === trendGood;
  const trendEl = trend && trend !== 'neutral' ? (
    <span className={`ml-1 text-xs font-bold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
      {trend === 'up' ? '▲' : '▼'}
    </span>
  ) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color} flex items-baseline`}>
        {value}{trendEl}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

type StatsPanelProps = { guCode?: string };

export default function StatsPanel({ guCode = '11680' }: StatsPanelProps) {
  const s = GU_STATS[guCode] ?? DEFAULT_STATS;

  return (
    <div className="space-y-3">
      {/* 주요 4대 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="유동인구"
          value={s.floatingPop.toLocaleString()}
          sub="일평균 (명)"
          color="text-indigo-600"
          trend="up"
          trendGood="up"
        />
        <StatCard
          label="총 점포 수"
          value={s.totalStores.toLocaleString()}
          sub="등록 점포"
          color="text-violet-600"
        />
        <StatCard
          label="공실율"
          value={`${s.vacancyRate.toFixed(1)}%`}
          sub="점포 공실 비율"
          color={s.vacancyRate >= 15 ? 'text-red-600' : s.vacancyRate >= 12 ? 'text-amber-600' : 'text-emerald-600'}
          trend={s.vacancyRate >= 15 ? 'up' : 'down'}
          trendGood="down"
        />
        <StatCard
          label="매출지수"
          value={s.revenueIdx.toString()}
          sub="전국 평균 = 100"
          color={s.revenueIdx >= 130 ? 'text-emerald-600' : s.revenueIdx >= 100 ? 'text-indigo-600' : 'text-slate-600'}
          trend={s.revenueIdx >= 100 ? 'up' : 'down'}
          trendGood="up"
        />
      </div>

      {/* 상세 6대 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="신규 개업률"
          value={`${s.openRate.toFixed(1)}%`}
          sub="분기 기준"
          color="text-emerald-600"
          trend="up"
          trendGood="up"
        />
        <StatCard
          label="폐업률"
          value={`${s.closeRate.toFixed(1)}%`}
          sub="분기 기준"
          color={s.closeRate >= 3.0 ? 'text-red-600' : 'text-amber-600'}
          trend={s.closeRate >= 3.0 ? 'up' : 'neutral'}
          trendGood="down"
        />
        <StatCard
          label="3년 생존율"
          value={`${s.survivalRate3y.toFixed(1)}%`}
          sub="신규 개업 점포"
          color={s.survivalRate3y >= 55 ? 'text-emerald-600' : s.survivalRate3y >= 50 ? 'text-indigo-600' : 'text-amber-600'}
        />
        <StatCard
          label="평균 영업기간"
          value={`${s.avgOpMonths}개월`}
          sub={`약 ${(s.avgOpMonths / 12).toFixed(1)}년`}
          color="text-slate-700"
        />
        <StatCard
          label="인구밀도"
          value={s.popDensity.toLocaleString()}
          sub="명 / km²"
          color="text-slate-600"
        />
        <StatCard
          label="임대시세"
          value={`${s.rentPer33}만원`}
          sub="3.3㎡ 기준"
          color="text-violet-600"
        />
      </div>
    </div>
  );
}
