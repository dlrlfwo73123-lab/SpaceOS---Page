import React, { useMemo, useState } from 'react';
import { getStoreHistory, getRecommendations, type Recommendation } from '@/lib/marketData';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type EventType = '신규입점' | '폐업' | '업종변경';

type HistoryRow = {
  date: string;
  storeName: string;
  floor: number;
  sqm: number;
  openDate: string;
  closeDate: string | null;
  opMonths: number | null;
  industry: string;
  industryCode: string;
  event: EventType;
  rentMonthly: number | null;   // 만원/월
  closeReason: string | null;
};

type VacantFloor = {
  floor: number;
  sqm: number;
  rentMonthly: number;
  lastIndustry: string;
  lastCloseReason: string;
  recommendations: Recommendation[];
};

// ─────────────────────────────────────────────
// 스타일 상수
// ─────────────────────────────────────────────
const EVENT_STYLE: Record<string, string> = {
  '신규입점': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  '폐업':    'bg-red-100 text-red-700 border border-red-200',
  '업종변경': 'bg-blue-100 text-blue-700 border border-blue-200',
};
const CODE_COLOR: Record<string, string> = {
  I56: 'text-amber-600', G47: 'text-violet-600', G4711: 'text-cyan-600',
  F45: 'text-orange-600', Q86: 'text-green-600', S96: 'text-pink-600',
  P85: 'text-indigo-600', R90: 'text-rose-600', R93: 'text-teal-600',
  L68: 'text-sky-600', F47: 'text-lime-600',
};

const SCORE_COLOR = (s: number) =>
  s >= 90 ? 'text-emerald-600' : s >= 80 ? 'text-indigo-600' : 'text-amber-600';

// ─────────────────────────────────────────────
// 공실 추천 카드
// ─────────────────────────────────────────────
function RecommendCard({ rec, floor, rentMonthly }: { rec: Recommendation; floor: number; rentMonthly: number }) {
  const [expanded, setExpanded] = useState(false);
  const breakEvenRevenue = Math.round(rentMonthly * 3.5); // 임대료×3.5 = 손익분기 기준 (원가율 고려)

  return (
    <div className={`rounded-xl border transition-all ${expanded ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
      {/* 카드 헤더 — 항상 표시 */}
      <button
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          {/* 순위 배지 */}
          <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            rec.rank === 1 ? 'bg-amber-400 text-white' : rec.rank === 2 ? 'bg-slate-300 text-slate-700' : 'bg-orange-200 text-orange-700'
          }`}>
            {rec.rank}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">{rec.industry}</p>
            <p className={`text-[11px] font-mono font-semibold ${CODE_COLOR[rec.industryCode] ?? 'text-slate-400'}`}>
              {rec.industryCode}
            </p>
          </div>
        </div>

        {/* 핵심 지표 */}
        <div className="flex flex-wrap items-center gap-3 text-right">
          <div>
            <p className={`text-lg font-bold ${SCORE_COLOR(rec.score)}`}>{rec.score}<span className="text-xs text-slate-400">/100</span></p>
            <p className="text-[10px] text-slate-400">추천점수</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">{rec.avgMonthlyRevenue.toLocaleString()}만원</p>
            <p className="text-[10px] text-slate-400">예상 월매출</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">{rec.survivalRate3y}%</p>
            <p className="text-[10px] text-slate-400">3년생존율</p>
          </div>
          <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* 점수 바 */}
      <div className="mx-4 mb-3 h-1.5 rounded-full bg-slate-100">
        <div
          className={`h-1.5 rounded-full transition-all ${rec.score >= 90 ? 'bg-emerald-500' : rec.score >= 80 ? 'bg-indigo-500' : 'bg-amber-500'}`}
          style={{ width: `${rec.score}%` }}
        />
      </div>

      {/* 상세 분석 — 펼침 */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

          {/* 재무 요약 */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: '창업 비용', value: `${(rec.startupCostMin/1000).toFixed(1)}~${(rec.startupCostMax/1000).toFixed(1)}억원` },
              { label: '손익분기 매출', value: `${breakEvenRevenue.toLocaleString()}만원/월` },
              { label: '투자 회수', value: `약 ${rec.paybackMonths}개월` },
              { label: '3층 임차비', value: `${rentMonthly}만원/월` },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 p-2.5 text-center">
                <p className="text-[10px] text-slate-400">{item.label}</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* 추천 이유 */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">추천 이유</p>
            <ul className="space-y-1.5">
              {rec.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="mt-0.5 text-emerald-500 flex-shrink-0">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 위험 요소 */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-red-500">주의 사항</p>
            <ul className="space-y-1.5">
              {rec.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="mt-0.5 text-red-400 flex-shrink-0">!</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 공실 층 분석 패널
// ─────────────────────────────────────────────
function VacancyAnalysisPanel({ vacant }: { vacant: VacantFloor }) {
  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-5 shadow-sm">
      {/* 패널 헤더 */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-white">
              {vacant.floor}층 공실
            </span>
            <span className="text-xs text-slate-500">{vacant.sqm}㎡ · 임차비 {vacant.rentMonthly}만원/월</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-slate-800">창업 업종 추천 분석</p>
          <p className="text-xs text-slate-500 mt-0.5">
            전 입점 업종: <span className="font-semibold">{vacant.lastIndustry}</span>
            <span className="ml-2 text-red-500">({vacant.lastCloseReason})</span>
          </p>
        </div>
        <div className="rounded-lg bg-white border border-amber-200 px-3 py-2 text-right text-xs text-slate-500">
          <p className="font-bold text-amber-700 text-sm">{vacant.recommendations.length}개 업종 추천</p>
          <p>AI 상권 분석 기반</p>
          {/* TODO: 실제 AI 추천은 POST /api/v1/ai/recommend 연동 */}
        </div>
      </div>

      {/* 추천 카드 목록 */}
      <div className="space-y-3">
        {vacant.recommendations.map((rec) => (
          <RecommendCard key={rec.rank} rec={rec} floor={vacant.floor} rentMonthly={vacant.rentMonthly} />
        ))}
      </div>

      <p className="mt-3 text-[10px] text-slate-400">
        ※ 추천 데이터는 소상공인시장진흥공단·행정안전부 통계 기반 더미 데이터입니다.
        실제 창업 전 현장 상권 조사를 병행하세요.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
type FilterTab = '전체' | '신규입점' | '폐업' | '업종변경';

type StoreHistoryProps = {
  buildingId?: string;
  guCode?: string;
  dongCode?: string;
  industryCode?: string;
  guName?: string;
  dongName?: string;
};

export default function StoreHistory({
  buildingId,
  guCode = '11680',
  dongCode = '',
  industryCode = 'ALL',
  guName = '강남구',
  dongName = '역삼동',
}: StoreHistoryProps) {
  const [tab, setTab] = useState<FilterTab>('전체');

  const tabs: FilterTab[] = ['전체', '신규입점', '폐업', '업종변경'];

  // 구/동/업종 필터가 바뀔 때마다 점포 이력 · 추천 데이터를 재생성
  const allHistory = useMemo(
    () => getStoreHistory(guCode, dongCode, industryCode) as HistoryRow[],
    [guCode, dongCode, industryCode],
  );
  const vacantFloors = useMemo<VacantFloor[]>(() => {
    const closedRows = allHistory.filter((r) => r.event === '폐업').slice(0, 2);
    const recs = getRecommendations(guCode, dongCode, industryCode, guName, dongName);
    return closedRows.map((row) => ({
      floor: row.floor,
      sqm: row.sqm,
      rentMonthly: row.rentMonthly ?? 0,
      lastIndustry: row.industry,
      lastCloseReason: row.closeReason ?? '-',
      recommendations: recs,
    }));
  }, [allHistory, guCode, dongCode, industryCode, guName, dongName]);

  const filtered = tab === '전체' ? allHistory : allHistory.filter((r) => r.event === tab);

  const openCount  = allHistory.filter((r) => r.event === '신규입점').length;
  const closeCount = allHistory.filter((r) => r.event === '폐업').length;
  const avgMonths  = Math.round(
    allHistory.filter((r) => r.opMonths).reduce((a, r) => a + (r.opMonths ?? 0), 0) /
    Math.max(1, allHistory.filter((r) => r.opMonths).length)
  );
  const avgRent = Math.round(
    allHistory.filter((r) => r.rentMonthly).reduce((a, r) => a + (r.rentMonthly ?? 0), 0) /
    Math.max(1, allHistory.filter((r) => r.rentMonthly).length)
  );

  return (
    <div className="space-y-5">

      {/* 점포 이력 전체가 더미 데이터임을 명시 — 폐업 원인 등 추정 불가 항목 포함 */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-medium text-orange-700">
        ⚠ 이하 점포 이력·폐업 원인·임차비는 데모 데이터입니다. 실제 폐업 사유는 확인된 바 없으며, 실제 영업 정보가 아닙니다.
      </div>

      {/* ── 점포 이력 테이블 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">점포 이력</p>
              <p className="text-xs text-slate-400 mt-0.5">건물 ID: <span className="font-mono">{buildingId ?? '-'}</span></p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">신규 {openCount}건</span>
              <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">폐업 {closeCount}건</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">평균 {avgMonths}개월 영업</span>
              <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">평균 임차 {avgRent}만원/월</span>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 text-left whitespace-nowrap">날짜</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">가게 이름</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">층 · 면적</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">업종</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">이벤트</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">임차비</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">개업일</th>
                <th className="px-4 py-2.5 text-left whitespace-nowrap">폐업일</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">영업기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row, i) => (
                <React.Fragment key={`frag-${i}`}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{row.storeName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-indigo-600">{row.floor}F</span>
                      <span className="ml-1 text-xs text-slate-400">{row.sqm}㎡</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-800">{row.industry}</span>
                      <span className={`ml-1.5 font-mono text-[10px] font-semibold ${CODE_COLOR[row.industryCode] ?? 'text-slate-400'}`}>
                        {row.industryCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EVENT_STYLE[row.event] ?? ''}`}>
                        {row.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-violet-700">
                      {row.rentMonthly ? `${row.rentMonthly}만원` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.openDate}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.closeDate ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                      {row.opMonths ? `${row.opMonths}개월` : '영업 중'}
                    </td>
                  </tr>
                  {/* 폐업 원인 — 행 아래에 인라인 표시 */}
                  {row.closeReason && (
                    <tr className="bg-red-50/40">
                      <td colSpan={9} className="px-4 pb-2.5 pt-1">
                        <p className="text-[11px] text-red-600">
                          <span className="font-bold mr-1">폐업 원인 (데모 예시, 실제 사유 아님):</span>
                          {row.closeReason}
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 공실 창업 추천 분석 ── */}
      {vacantFloors.map((v, i) => (
        <VacancyAnalysisPanel key={`${v.floor}-${i}`} vacant={v} />
      ))}

    </div>
  );
}
