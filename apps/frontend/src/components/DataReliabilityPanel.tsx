import { useState } from 'react';

type ReliabilityLevel = 'high' | 'medium' | 'low' | 'demo';

type MetricInfo = {
  name: string;
  level: ReliabilityLevel;
  pct: number;           // 신뢰도 % (0~100)
  source: string;
  url: string;
  updateCycle: string;
  note: string;
  improvePath?: string;  // 신뢰도 향상 방법
};

const METRICS: MetricInfo[] = [
  {
    name: '인구밀도',
    level: 'high',
    pct: 88,
    source: '행정안전부 주민등록 인구통계',
    url: 'https://jumin.mois.go.kr',
    updateCycle: '월별',
    note: '주민등록 인구 ÷ 행정구역 면적(㎢). 구별 수치는 공식 통계 기반으로 오차 최소. 동 단위는 구 평균 비례 추정 적용.',
    improvePath: '행정안전부 주민등록 인구 오픈 API(jumin.mois.go.kr) 연동 시 동 단위 실시간 인구밀도 100% 정확도 달성 가능.',
  },
  {
    name: '유동인구',
    level: 'medium',
    pct: 62,
    source: '서울 열린데이터광장 "서울시 생활인구"',
    url: 'https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do',
    updateCycle: '시간별 / 일별',
    note: '현재 사이트는 공공데이터 구별 평균을 보정한 합성값 사용. 실제 API는 KT 통신 데이터 기반 500m×500m 격자 단위 생활인구 제공.',
    improvePath: '서울 열린데이터광장 생활인구 API 연동 (data.seoul.go.kr, 무료·인증 필요) → 격자 단위 시간대별 실제 유동인구 조회 가능. 예상 신뢰도 85%.',
  },
  {
    name: '공실률',
    level: 'medium',
    pct: 55,
    source: '한국부동산원 "상업용부동산 임대동향조사"',
    url: 'https://www.reb.or.kr/r-one/statistics/statisticsViewer.do',
    updateCycle: '분기별',
    note: '한국부동산원은 명동·강남·홍대 등 서울 주요 상권만 표본 조사. 동 단위 전수 조사 아님. 현재 사이트는 구 평균에서 동 단위로 분산 추정.',
    improvePath: '① 한국부동산원 R-ONE API 구 단위 공실률 활용 (pct 70%) ② 건축물대장 + 임대차계약신고 DB 결합 시 동 단위 실측 공실률 산출 가능 (pct 82%).',
  },
  {
    name: '임대시세 (3.3㎡)',
    level: 'medium',
    pct: 58,
    source: '서울시 상권분석서비스 + 토지이음 공시지가',
    url: 'https://golmok.seoul.go.kr',
    updateCycle: '분기별 / 연도별',
    note: '서울시 상권분석서비스(골목상권)는 업종별 임대료 통계를 제공하나 대형 상권 위주 표본. 현재 사이트는 공시지가 기반 추정값 보정 합성 사용.',
    improvePath: '서울시 상권분석서비스 오픈 API (golmok.seoul.go.kr) 직접 연동 시 동 단위 업종별 실제 임대료 데이터 활용 가능. 예상 신뢰도 75%.',
  },
  {
    name: '업종별 생존율 / 폐업률',
    level: 'low',
    pct: 32,
    source: '소상공인시장진흥공단 "상가업소 DB"',
    url: 'https://www.data.go.kr/data/15083033/fileData.do',
    updateCycle: '분기별',
    note: '현재 사이트는 전국 평균 폐업률을 서울 구별로 보정한 합성값. 지역 특성·경기 변동·계절성을 반영하지 않아 정확도 낮음.',
    improvePath: `신뢰도 향상 4단계:
① 소상공인시장진흥공단 상가업소 DB API 연동 (data.go.kr 무료) → 구별 업종 폐업 건수 실측 → 예상 pct 60%
② 국세청 사업자 등록·폐업 현황 (e-나라지표, 구 단위) 병행 → pct 68%
③ 서울시 상권분석서비스 골목상권 API — 동별 업종 신규·폐업 건수 제공 → pct 75%
④ 통계청 사업체 생멸통계 (sgis.kostat.go.kr, 동 단위) 연간 활용 → pct 82%`,
  },
  {
    name: '공실 매물 위치',
    level: 'demo',
    pct: 10,
    source: '네이버 부동산 / 서울 건축물대장 (미연동)',
    url: 'https://land.naver.com',
    updateCycle: '실시간 (미연동)',
    note: '현재 지도의 빨간 점은 시드 기반 합성 위치. 실제 공실 좌표가 아님.',
    improvePath: `실제 공실 위치 확보 경로:
① 네이버 부동산 API — 비공개 파트너십 필요 (난이도 높음)
② 국토교통부 건축물대장 + 임대차 계약신고 데이터 결합 (data.go.kr) → 임대 공백 기간 추정 가능
③ 서울 열린데이터광장 상업시설 현황 API → 폐업 신고 주소 기반 공실 추정`,
  },
  {
    name: '창업 추천 점수',
    level: 'demo',
    pct: 15,
    source: '내부 알고리즘 (유동인구·공실률·임대료 가중합산)',
    url: '',
    updateCycle: 'N/A',
    note: '유동인구(30%) + 저공실률(40%) + 저임대료(30%) 3개 지표 단순 합산. 경쟁업체 수·배후인구 특성·접근성·계절성 미반영.',
    improvePath: `점수 신뢰도 향상 방법:
① 경쟁 업체 수(소상공인시장진흥공단 DB) 반영 → 포화도 패널티 추가
② 배후 주거 인구 (주민등록 인구) · 직장인 인구 (통신 데이터) 세분화
③ 업종별 가중치 차별화 (음식점 vs 편의점 vs 학원 입지 요건 상이)
④ 근거리 대형 앵커 시설 (지하철역·대형마트) 거리 점수 반영`,
  },
];

const LEVEL_STYLE: Record<ReliabilityLevel, { label: string; bar: string; text: string; bg: string; border: string }> = {
  high:   { label: '높음', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  medium: { label: '중간', bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',  border: 'border-amber-200' },
  low:    { label: '낮음', bar: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50',    border: 'border-red-200' },
  demo:   { label: '데모', bar: 'bg-slate-400',   text: 'text-slate-500',   bg: 'bg-slate-50',  border: 'border-slate-200' },
};

function PctBar({ pct, level }: { pct: number; level: ReliabilityLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${s.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-8 text-right ${s.text}`}>{pct}%</span>
    </div>
  );
}

function MetricRow({ m }: { m: MetricInfo }) {
  const [open, setOpen] = useState(false);
  const s = LEVEL_STYLE[m.level];
  return (
    <div className={`rounded-xl border ${s.bg} ${s.border} overflow-hidden`}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition-all"
        onClick={() => setOpen((v) => !v)}
      >
        {/* 지표명 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{m.name}</p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{m.source}</p>
        </div>

        {/* 신뢰도 % 바 + 등급 + 갱신주기 */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.text} ${s.bg} ${s.border}`}>
              {s.label}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">{m.updateCycle}</span>
          </div>
          <PctBar pct={m.pct} level={m.level} />
        </div>

        <span className="text-slate-300 text-xs ml-1 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={`border-t ${s.border} px-4 py-3 space-y-3`}>
          <p className="text-[12px] text-slate-600 leading-relaxed">{m.note}</p>

          {m.improvePath && (
            <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
              <p className="text-[11px] font-semibold text-indigo-700 mb-1">신뢰도 향상 방법</p>
              <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">{m.improvePath}</p>
            </div>
          )}

          {m.url && (
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 underline hover:text-indigo-800"
            >
              데이터 출처 바로가기 ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataReliabilityPanel() {
  const [open, setOpen] = useState(false);

  const avgPct = Math.round(METRICS.reduce((s, m) => s + m.pct, 0) / METRICS.length);
  const counts = METRICS.reduce((acc, m) => {
    acc[m.level] = (acc[m.level] ?? 0) + 1;
    return acc;
  }, {} as Record<ReliabilityLevel, number>);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-800">데이터 신뢰성 현황</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">각 지표의 출처·신뢰도(%)·향상 방법을 확인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 전체 평균 % */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <span className="text-[11px] text-slate-400">전체 평균</span>
            <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-400" style={{ width: `${avgPct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-indigo-600">{avgPct}%</span>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">높음 {counts.high ?? 0}</span>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">중간 {counts.medium ?? 0}</span>
          <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">낮음 {counts.low ?? 0}</span>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">데모 {counts.demo ?? 0}</span>
          <span className="text-slate-400 text-sm ml-2">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-2">
          {/* 등급 기준 안내 */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-3">
            <p className="text-[12px] text-blue-700 font-semibold mb-1">신뢰도 % 산정 기준</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-blue-600">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span><span><b>높음</b> 80~100%: 정부 공식 통계·API 직접 연동</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span><span><b>중간</b> 50~79%: 구 단위 공공데이터 → 동 단위 추정</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span><span><b>낮음</b> 20~49%: 전국 평균에서 보정, 추정 오차 큼</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"></span><span><b>데모</b> 0~19%: 시드 기반 합성, 패턴만 유사</span></div>
            </div>
          </div>

          {METRICS.map((m) => <MetricRow key={m.name} m={m} />)}

          <p className="text-[10px] text-slate-400 pt-1">
            실제 서비스 전환 시 공공데이터포털(data.go.kr) · 서울 열린데이터광장(data.seoul.go.kr) · 서울시 상권분석서비스(golmok.seoul.go.kr) API 연동이 필요합니다.
          </p>
        </div>
      )}
    </section>
  );
}
