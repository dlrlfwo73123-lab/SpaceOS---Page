import { useState } from 'react';
import type { VacancyMarker } from '@/lib/marketData';
import { getMarketStats, getRecommendations } from '@/lib/marketData';

type Props = {
  vacancy: VacancyMarker;
  guCode: string;
  guName: string;
  onClose: () => void;
};

const INDUSTRY_EMOJI: Record<string, string> = {
  F45: '🍜', G47: '🛍️', I56: '☕', S96: '💇', G4711: '🏪',
  Q86: '💊', P85: '📚', K64: '🏦', J62: '💻', ETC: '🏢',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 65 ? '#6366f1' : '#f59e0b';
  const r = 22, circ = 2 * Math.PI * r;
  const pct = (score / 100) * circ;
  return (
    <div className="relative flex h-14 w-14 items-center justify-center flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${pct} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function RecommendCard({ rec, dongName }: { rec: ReturnType<typeof getRecommendations>[0]; dongName: string }) {
  const [open, setOpen] = useState(false);
  const emoji = INDUSTRY_EMOJI[rec.industryCode] ?? '🏢';
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-xl flex-shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">#{rec.rank}</span>
            <span className="text-sm font-semibold text-slate-800">{rec.industry}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            3년 생존율 <b className="text-emerald-600">{rec.survivalRate3y}%</b>
            &nbsp;·&nbsp;창업비 {rec.startupCostMin.toLocaleString()}~{rec.startupCostMax.toLocaleString()}만원
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreRing score={rec.score} />
          <span className="text-slate-300 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-3 py-3 bg-white space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-indigo-50 px-2 py-1.5">
              <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">추천 점수</p>
              <p className="text-sm font-bold text-indigo-700">{rec.score}점</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
              <p className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wide">월매출 추정</p>
              <p className="text-sm font-bold text-emerald-700">{rec.avgMonthlyRevenue.toLocaleString()}만원</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-2 py-1.5">
              <p className="text-[9px] font-semibold text-amber-400 uppercase tracking-wide">손익분기</p>
              <p className="text-sm font-bold text-amber-700">{rec.paybackMonths}개월</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-emerald-600 mb-1">✓ 추천 이유</p>
            <ul className="space-y-0.5">
              {rec.reasons.map((r, i) => (
                <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                  <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>{r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-red-500 mb-1">⚠ 리스크</p>
            <ul className="space-y-0.5">
              {rec.risks.map((r, i) => (
                <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1">
                  <span className="text-red-300 flex-shrink-0 mt-0.5">•</span>{r}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
            <p className="text-[10px] font-semibold text-indigo-700 mb-0.5">AI 종합 의견</p>
            <p className="text-[11px] text-indigo-600 leading-relaxed">
              {dongName} 상권에서 <b>{rec.industry}</b> 업종은 3년 생존율 {rec.survivalRate3y}%로
              {rec.survivalRate3y >= 55 ? ' 서울 평균(51%) 대비 안정적입니다.' : ' 평균 수준의 생존율을 보입니다.'}
              &nbsp;초기 창업비 {rec.startupCostMin.toLocaleString()}만원부터 시작 가능하며,
              손익분기 도달까지 약 {rec.paybackMonths}개월이 예상됩니다.
              {rec.score >= 75 ? ' 해당 지역 상권 조건이 이 업종에 매우 적합합니다.' :
               rec.score >= 60 ? ' 입지 조건이 양호하나 경쟁 분석을 병행하세요.' :
               ' 추가 상권 분석 후 신중히 결정하세요.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, accent, good, spanFull }: {
  label: string; value: string; accent?: boolean; good?: boolean; spanFull?: boolean;
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

export default function VacancyModal({ vacancy, guCode, guName, onClose }: Props) {
  const stats = getMarketStats(guCode, vacancy.dongCode, 'ALL');
  const recs = getRecommendations(guCode, vacancy.dongCode, 'ALL', guName, vacancy.dongName);
  const [tab, setTab] = useState<'info' | 'ai'>('info');

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-75">공실 매물 · AI 창업 분석</p>
              <p className="text-base font-bold mt-0.5 truncate">{guName} · {vacancy.dongName}</p>
              <p className="text-[11px] opacity-60 mt-0.5">※ 데모 데이터 — 실제 매물과 다름</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-lg leading-none"
            >×</button>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mt-3">
            {([['info', '📋 공실 정보'], ['ai', '🤖 AI 창업 추천']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  tab === t ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 스크롤 가능한 바디 */}
        <div className="overflow-y-auto flex-1">
          {tab === 'info' ? (
            <div className="px-5 py-4 space-y-4">
              {/* 매물 정보 */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">매물 정보</p>
                <div className="grid grid-cols-2 gap-2">
                  <InfoCell label="층" value={`${vacancy.floor}층`} />
                  <InfoCell label="면적" value={`${vacancy.sqm}㎡`} />
                  <InfoCell label="월세" value={`${vacancy.rentMonthly}만원/월`} accent />
                  <InfoCell label="공실 기간" value={`${vacancy.emptyMonths}개월`} />
                  <InfoCell label="전 업종" value={vacancy.lastIndustry} spanFull />
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* 상권 지표 */}
              <div>
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

              {/* AI 추천 미리보기 */}
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                <p className="text-[11px] font-semibold text-indigo-700 mb-1">🤖 AI 창업 추천 TOP 3</p>
                <div className="flex flex-wrap gap-2">
                  {recs.map((r) => (
                    <div key={r.rank} className="flex items-center gap-1.5 rounded-full bg-white border border-indigo-200 px-2.5 py-1">
                      <span className="text-base">{INDUSTRY_EMOJI[r.industryCode] ?? '🏢'}</span>
                      <span className="text-xs font-semibold text-slate-700">{r.industry}</span>
                      <span className="text-[11px] font-bold text-indigo-600">{r.score}점</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setTab('ai')}
                  className="mt-2 text-[11px] text-indigo-600 underline"
                >
                  자세한 AI 분석 보기 →
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-[11px] font-semibold text-amber-700 mb-1">📍 {guName} {vacancy.dongName} 상권 분석</p>
                <p className="text-[11px] text-amber-600 leading-relaxed">
                  일평균 유동인구 <b>{Math.round(stats.floatingPop).toLocaleString()}명</b>,
                  공실률 <b>{stats.vacancyRate.toFixed(1)}%</b>,
                  임대시세 <b>{stats.rentPer33.toFixed(1)}만원/3.3㎡</b> 기준으로
                  다음 업종을 AI가 추천합니다. 아래 카드를 클릭하면 상세 분석을 확인하세요.
                </p>
              </div>

              {recs.map((rec) => (
                <RecommendCard key={rec.rank} rec={rec} dongName={vacancy.dongName} />
              ))}

              <p className="text-[10px] text-slate-400 pt-1">
                ※ AI 추천 점수는 유동인구·공실률·임대료·생존율 기반 알고리즘입니다. 실제 창업 결정 시 전문가 상담을 병행하세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
