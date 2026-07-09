import { useState } from 'react';

type ReliabilityLevel = 'high' | 'medium' | 'low' | 'demo';

type MetricInfo = {
  name: string;
  level: ReliabilityLevel;
  source: string;
  url: string;
  updateCycle: string;
  note: string;
};

const METRICS: MetricInfo[] = [
  {
    name: '유동인구',
    level: 'medium',
    source: '서울 열린데이터광장 "서울시 생활인구"',
    url: 'https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do',
    updateCycle: '시간별 / 일별',
    note: '현재 사이트는 구별 기준치를 공공데이터로 보정한 합성값 사용. 실제 API 연동 시 정확도 향상 가능.',
  },
  {
    name: '공실률',
    level: 'medium',
    source: '한국부동산원 "상업용부동산 임대동향조사"',
    url: 'https://www.reb.or.kr/r-one/statistics/statisticsViewer.do',
    updateCycle: '분기별',
    note: '한국부동산원은 서울 주요 상권(명동·강남·홍대 등) 공실률만 조사. 동 단위 세부 공실률은 해당 자료로 산출 불가 — 현재 사이트는 구별 평균에서 동 단위로 분산 추정.',
  },
  {
    name: '임대시세 (3.3㎡)',
    level: 'medium',
    source: '서울시 상권분석서비스 + 토지이음 공시지가',
    url: 'https://golmok.seoul.go.kr',
    updateCycle: '분기별 / 연도별',
    note: '서울시 상권분석서비스(골목상권)는 업종별 임대료 통계를 제공하나 동 단위 세분화 한계 있음. 토지이음 개별공시지가 기반 추정값 병행 사용 권장.',
  },
  {
    name: '인구밀도',
    level: 'high',
    source: '행정안전부 주민등록 인구통계',
    url: 'https://jumin.mois.go.kr',
    updateCycle: '월별',
    note: '주민등록 인구 ÷ 행정구역 면적(㎢). 행정안전부 공개 자료를 기반으로 구별 수치는 높은 신뢰도. 동 단위는 구 평균에서 추정.',
  },
  {
    name: '업종별 생존율 / 폐업률',
    level: 'low',
    source: '소상공인시장진흥공단 "상가업소 DB"',
    url: 'https://www.data.go.kr/data/15083033/fileData.do',
    updateCycle: '분기별',
    note: '소상공인시장진흥공단이 제공하는 상가업소 DB는 전국 규모이며 API 인증 필요. 현재 사이트는 업종별 전국 평균 폐업률을 서울 구별로 보정한 합성값 사용.',
  },
  {
    name: '공실 매물 위치',
    level: 'demo',
    source: '네이버 부동산 / 서울 건축물대장 (미연동)',
    url: 'https://land.naver.com',
    updateCycle: '실시간 (미연동)',
    note: '현재 지도의 빨간 점(공실 매물)은 시드 기반 합성 데이터입니다. 실제 연동을 위해서는 네이버 부동산 API(비공개) 또는 건축물대장 + 임대차계약신고 데이터가 필요합니다.',
  },
  {
    name: '창업 추천 점수',
    level: 'demo',
    source: '내부 알고리즘 (유동인구·공실률·임대료 가중합산)',
    url: '',
    updateCycle: 'N/A',
    note: '유동인구 30% + 저공실률 40% + 저임대료 30% 가중 합산. 실제 창업 성공 요인(경쟁업체 수, 배후인구 특성, 접근성 등)을 반영하지 않으므로 참고 목적으로만 사용.',
  },
];

const LEVEL_STYLE: Record<ReliabilityLevel, { label: string; bar: string; text: string; bg: string }> = {
  high:   { label: '높음', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  medium: { label: '중간', bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  low:    { label: '낮음', bar: 'bg-red-400',     text: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  demo:   { label: '데모', bar: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
};

const LEVEL_WIDTH: Record<ReliabilityLevel, string> = {
  high: 'w-full', medium: 'w-2/3', low: 'w-1/3', demo: 'w-1/6',
};

function MetricRow({ m }: { m: MetricInfo }) {
  const [open, setOpen] = useState(false);
  const s = LEVEL_STYLE[m.level];
  return (
    <div className={`rounded-xl border ${s.bg} overflow-hidden`}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{m.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{m.source}</p>
        </div>
        <div className="w-24 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${s.text}`}>{s.label}</span>
            <span className="text-[10px] text-slate-400">{m.updateCycle}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className={`h-full rounded-full ${s.bar} ${LEVEL_WIDTH[m.level]}`} />
          </div>
        </div>
        <span className="text-slate-300 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200/60 px-4 py-3 space-y-2">
          <p className="text-[12px] text-slate-600">{m.note}</p>
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
          <p className="text-[11px] text-slate-400 mt-0.5">각 지표의 데이터 출처와 신뢰도를 확인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">높음 {counts.high ?? 0}</span>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">중간 {counts.medium ?? 0}</span>
          <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">낮음 {counts.low ?? 0}</span>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">데모 {counts.demo ?? 0}</span>
          <span className="text-slate-400 text-sm ml-2">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-2">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-3">
            <p className="text-[12px] text-blue-700 font-semibold mb-1">신뢰도 등급 기준</p>
            <ul className="text-[11px] text-blue-600 space-y-0.5">
              <li><b>높음</b>: 정부·공공기관 공식 API 또는 정기 통계 기반, 오차 범위 작음</li>
              <li><b>중간</b>: 공공데이터를 구 단위로 집계 후 동 단위로 추정, 추정 오차 존재</li>
              <li><b>낮음</b>: 전국 평균에서 보정, 지역 특성 반영 제한적</li>
              <li><b>데모</b>: 시드 기반 합성 데이터 — 패턴은 유사하나 실제 수치 아님</li>
            </ul>
          </div>
          {METRICS.map((m) => <MetricRow key={m.name} m={m} />)}
          <p className="text-[10px] text-slate-400 pt-1">
            실제 서비스 전환 시 공공데이터포털(data.go.kr), 서울 열린데이터광장(data.seoul.go.kr), 서울시 상권분석서비스(golmok.seoul.go.kr) API 연동이 필요합니다.
          </p>
        </div>
      )}
    </section>
  );
}
