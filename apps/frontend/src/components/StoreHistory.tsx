import React, { useState } from 'react';

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

type Recommendation = {
  rank: number;
  industry: string;
  industryCode: string;
  score: number;                // 0-100
  survivalRate3y: number;       // %
  avgMonthlyRevenue: number;    // 만원
  startupCostMin: number;       // 만원
  startupCostMax: number;
  paybackMonths: number;        // 예상 투자회수 기간
  reasons: string[];
  risks: string[];
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
// TODO: 실제 데이터는 GET /api/v1/buildings/{id}/history 에서 받아올 것
// ─────────────────────────────────────────────
const DUMMY_HISTORY: HistoryRow[] = [
  {
    date: '2025-11', storeName: '블루보틀 강남역삼점', floor: 1, sqm: 82,
    openDate: '2025-11-03', closeDate: null, opMonths: null,
    industry: '카페', industryCode: 'I56', event: '신규입점',
    rentMonthly: 680, closeReason: null,
  },
  {
    date: '2025-08', storeName: '미르헤어 역삼점', floor: 2, sqm: 55,
    openDate: '2024-01-15', closeDate: '2025-08-31', opMonths: 19,
    industry: '미용실', industryCode: 'S96', event: '폐업',
    rentMonthly: 420, closeReason: '임대료 인상(전년 대비 +22%) + 매출 감소. 인근 프랜차이즈 미용실 3곳 신규 진입으로 고객 이탈 심화.',
  },
  {
    date: '2025-04', storeName: 'GS25 역삼역점', floor: 3, sqm: 66,
    openDate: '2025-04-10', closeDate: null, opMonths: null,
    industry: '편의점', industryCode: 'G4711', event: '신규입점',
    rentMonthly: 510, closeReason: null,
  },
  {
    date: '2025-01', storeName: '서울의류 쇼룸', floor: 4, sqm: 78,
    openDate: '2022-06-01', closeDate: '2025-01-20', opMonths: 31,
    industry: '의류', industryCode: 'G47', event: '폐업',
    rentMonthly: 590, closeReason: '온라인 쇼핑몰 경쟁 심화로 오프라인 매출 40% 감소. 팬데믹 이후 회복 실패, 재고 부담 증가로 자진 폐업.',
  },
  {
    date: '2024-11', storeName: '한강순두부 강남점', floor: 5, sqm: 90,
    openDate: '2024-11-05', closeDate: null, opMonths: null,
    industry: '음식점', industryCode: 'F45', event: '신규입점',
    rentMonthly: 720, closeReason: null,
  },
  {
    date: '2024-08', storeName: '스킨이즈 에스테틱', floor: 2, sqm: 55,
    openDate: '2022-03-01', closeDate: '2024-08-15', opMonths: 29,
    industry: '피부관리', industryCode: 'S96', event: '폐업',
    rentMonthly: 380, closeReason: '원장 건강 악화로 인한 폐업. 영업 자체는 흑자 기조였으며 외부 요인에 의한 자진 종료.',
  },
  {
    date: '2024-05', storeName: '탑에듀 강남학원', floor: 4, sqm: 78,
    openDate: '2024-05-20', closeDate: null, opMonths: null,
    industry: '학원', industryCode: 'P85', event: '업종변경',
    rentMonthly: 530, closeReason: null,
  },
  {
    date: '2024-02', storeName: '청담식품 델리', floor: 5, sqm: 90,
    openDate: '2021-09-10', closeDate: '2024-02-28', opMonths: 29,
    industry: '음식점', industryCode: 'F45', event: '폐업',
    rentMonthly: 650, closeReason: '식자재 원가 상승(전년 대비 +34%), 배달 플랫폼 수수료(매출의 28%) 부담으로 수익성 악화. 매출은 유지됐으나 영업이익 적자 전환.',
  },
];

// ─────────────────────────────────────────────
// TODO: 실제 추천 데이터는 GET /api/v1/buildings/{id}/floors/{floor}/recommend 에서 받아올 것
// 현재는 구별 상권 특성 기반 더미 데이터
// ─────────────────────────────────────────────
const VACANT_FLOORS: VacantFloor[] = [
  {
    floor: 2, sqm: 55, rentMonthly: 420,
    lastIndustry: '미용실',
    lastCloseReason: '임대료 인상 + 경쟁 격화',
    recommendations: [
      {
        rank: 1, industry: '프리미엄 에스테틱', industryCode: 'S96',
        score: 93, survivalRate3y: 61.2, avgMonthlyRevenue: 2200,
        startupCostMin: 4500, startupCostMax: 7000, paybackMonths: 28,
        reasons: [
          '강남구 20~45세 여성 유동인구 일평균 54,000명 — 에스테틱 주요 고객층 집중',
          '반경 300m 에스테틱 공백 상권: 경쟁 업체 2곳 대비 55㎡ 이상 중형 규모 없음',
          '강남구 뷰티·관리업 3년 생존율 61.2% (서울 평균 50.8% 대비 +10.4%p)',
          '기존 미용실 인테리어(전용 세면대, 환기시스템) 일부 재활용 가능 → 초기 비용 약 15% 절감',
          '강남구 에스테틱 평균 객단가 9만원/회, 주 2회 방문 고객 확보 시 안정적 매출',
        ],
        risks: [
          '숙련 테라피스트 채용 어려움 — 강남 지역 인건비 높음 (월 350~450만원/인)',
          '초기 고가 기기 투자(레이저, 초음파 장비 등) 필수로 자금 소요 큼',
        ],
      },
      {
        rank: 2, industry: '1인 사진관·스튜디오', industryCode: 'R90',
        score: 87, survivalRate3y: 58.4, avgMonthlyRevenue: 1650,
        startupCostMin: 2800, startupCostMax: 4500, paybackMonths: 22,
        reasons: [
          '역삼동 20~30대 직장인 대상 프로필·증명사진 수요 급증 (2023년 이후 +180%)',
          '55㎡ 소형 공간에 최적화된 업종 — 1~2인 운영 가능, 고정비 낮음',
          '주변 대기업 오피스(삼성SDS, 구글코리아, 카카오 등) 밀집으로 프로필 촬영 수요 상시 발생',
          '평균 객단가 3.5~6만원, 회전율 높아 일 8~12팀 촬영 시 손익분기 달성',
        ],
        risks: [
          '계절·트렌드 변동에 민감한 업종 특성 (취업·입학 시즌 집중)',
          '대형 스튜디오 체인 진입 시 가격 경쟁 불가피',
        ],
      },
      {
        rank: 3, industry: '필라테스·요가 스튜디오', industryCode: 'R93',
        score: 81, survivalRate3y: 55.7, avgMonthlyRevenue: 1900,
        startupCostMin: 5500, startupCostMax: 9000, paybackMonths: 34,
        reasons: [
          '강남구 헬스·운동 관련 지출 전국 1위 (1인 월평균 18.4만원)',
          '소그룹(4~6인) 레슨 모델로 55㎡ 공간 효율적 활용 가능',
          '회원제 운영으로 안정적 월 매출 예측 가능',
        ],
        risks: [
          '강남구 필라테스 스튜디오 이미 포화 상태 — 차별화 필수 (전문 강사, 특화 프로그램)',
          '인테리어(방음, 바닥재, 거울) 초기 투자 비용 높음',
        ],
      },
    ],
  },
  {
    floor: 4, sqm: 78, rentMonthly: 590,
    lastIndustry: '의류',
    lastCloseReason: '온라인 경쟁 심화 + 재고 부담',
    recommendations: [
      {
        rank: 1, industry: '공유 오피스·스터디카페', industryCode: 'L68',
        score: 95, survivalRate3y: 63.8, avgMonthlyRevenue: 3100,
        startupCostMin: 6000, startupCostMax: 10000, paybackMonths: 26,
        reasons: [
          '역삼동 스타트업·프리랜서 밀집 — 반경 500m 내 1인 기업 등록 수 2,840개',
          '78㎡ 규모로 8~12인 독립 좌석 + 소회의실 2실 구성 최적 (강남 공유오피스 평균 수용률 91%)',
          '강남구 공유오피스 월 좌석당 임대가 35~50만원 — 10좌석 기준 월 매출 350~500만원',
          '비대면·하이브리드 근무 트렌드 지속으로 수요 구조적 증가',
          '4층 위치 특성상 소음·집중도 이점, 전용 엘리베이터 접근성 양호',
        ],
        risks: [
          '초기 인테리어(방음, 네트워크 인프라, 보안시스템) 투자 크고 회수 기간 김',
          '패스트파이브, 위워크 등 대형 체인 경쟁 압력',
        ],
      },
      {
        rank: 2, industry: '프리미엄 반찬가게·밀키트', industryCode: 'F47',
        score: 88, survivalRate3y: 59.1, avgMonthlyRevenue: 2400,
        startupCostMin: 3500, startupCostMax: 5500, paybackMonths: 20,
        reasons: [
          '역삼동 고소득 1인·맞벌이 가구 비율 68% — 간편 식품 프리미엄 수요 높음',
          '점심·저녁 직장인 동선 상 4층 테이크아웃 모델 유효 (엘리베이터 접근)',
          '강남구 가정간편식(HMR) 시장 전년 대비 23% 성장',
          '78㎡ 공간으로 소형 주방 + 전시 판매대 배치 가능',
        ],
        risks: [
          '식품위생법 허가, 냉장 설비 투자 필요',
          '배달 앱 의존 시 수수료 부담 (매출의 25~30%)',
        ],
      },
      {
        rank: 3, industry: 'IT·개발 교육 학원', industryCode: 'P85',
        score: 82, survivalRate3y: 56.3, avgMonthlyRevenue: 2700,
        startupCostMin: 4000, startupCostMax: 7000, paybackMonths: 30,
        reasons: [
          '역삼동 IT 종사자 집중 — 재교육·부업 코딩 수요 높음',
          '주 4회 소규모 클래스(8~12명) 운영으로 78㎡ 활용 효율적',
          '강남구 성인 교육 시장 월 평균 수강료 35만원 — 수강생 15명 시 손익분기',
        ],
        risks: [
          '유명 강사 확보 어려움 및 이탈 리스크',
          '온라인 코딩 플랫폼(인프런, 유데미 등)과 직접 경쟁',
        ],
      },
    ],
  },
];

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

type StoreHistoryProps = { buildingId?: string };

export default function StoreHistory({ buildingId }: StoreHistoryProps) {
  const [tab, setTab] = useState<FilterTab>('전체');
  const [streetViewOpen, setStreetViewOpen] = useState(false);

  const tabs: FilterTab[] = ['전체', '신규입점', '폐업', '업종변경'];
  const filtered = tab === '전체' ? DUMMY_HISTORY : DUMMY_HISTORY.filter((r) => r.event === tab);

  const openCount  = DUMMY_HISTORY.filter((r) => r.event === '신규입점').length;
  const closeCount = DUMMY_HISTORY.filter((r) => r.event === '폐업').length;
  const avgMonths  = Math.round(
    DUMMY_HISTORY.filter((r) => r.opMonths).reduce((a, r) => a + (r.opMonths ?? 0), 0) /
    DUMMY_HISTORY.filter((r) => r.opMonths).length
  );
  const avgRent = Math.round(
    DUMMY_HISTORY.filter((r) => r.rentMonthly).reduce((a, r) => a + (r.rentMonthly ?? 0), 0) /
    DUMMY_HISTORY.filter((r) => r.rentMonthly).length
  );

  return (
    <div className="space-y-5">

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
                          <span className="font-bold mr-1">폐업 원인:</span>
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
      {VACANT_FLOORS.map((v) => (
        <VacancyAnalysisPanel key={v.floor} vacant={v} />
      ))}

      {/* ── 거리뷰 섹션 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setStreetViewOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-base">🔭</span>거리뷰 (Naver 거리뷰)
          </span>
          <span className="text-xs text-slate-400">{streetViewOpen ? '▲ 닫기' : '▼ 열기'}</span>
        </button>
        {streetViewOpen && (
          <div className="border-t border-slate-100 px-5 py-6">
            {/* TODO: Naver Cloud Console 에서 Maps Panorama API 활성화 후 실제 Panorama 위젯으로 교체 */}
            <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
              <span className="text-3xl">🗺️</span>
              <p className="text-sm font-semibold text-slate-700">Naver 거리뷰 준비 중</p>
              <p className="max-w-xs text-center text-xs text-slate-400">
                Naver Cloud Console에서 Maps Panorama API를 활성화하면 건물 주변 360° 거리뷰가 표시됩니다.
              </p>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-mono text-slate-500">건물 ID: {buildingId}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
