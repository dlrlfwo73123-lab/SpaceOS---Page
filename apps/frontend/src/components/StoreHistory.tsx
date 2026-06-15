import { useState } from 'react';

// TODO: 실제 데이터는 GET /api/v1/buildings/{id}/history 에서 받아올 것
const DUMMY_HISTORY: HistoryRow[] = [
  { date: '2025-11', openDate: '2025-11-03', closeDate: null, opMonths: null, industry: '카페', industryCode: 'I56', event: '신규입점' },
  { date: '2025-08', openDate: '2024-01-15', closeDate: '2025-08-31', opMonths: 19, industry: '의류', industryCode: 'G47', event: '폐업' },
  { date: '2025-04', openDate: '2025-04-10', closeDate: null, opMonths: null, industry: '편의점', industryCode: 'G4711', event: '신규입점' },
  { date: '2025-01', openDate: '2022-06-01', closeDate: '2025-01-20', opMonths: 31, industry: '음식점', industryCode: 'F45', event: '폐업' },
  { date: '2024-11', openDate: '2024-11-05', closeDate: null, opMonths: null, industry: '약국', industryCode: 'Q86', event: '신규입점' },
  { date: '2024-08', openDate: '2023-03-01', closeDate: '2024-08-15', opMonths: 17, industry: '미용실', industryCode: 'S96', event: '폐업' },
  { date: '2024-05', openDate: '2024-05-20', closeDate: null, opMonths: null, industry: '학원', industryCode: 'P85', event: '신규입점' },
  { date: '2024-02', openDate: '2021-09-10', closeDate: '2024-02-28', opMonths: 29, industry: '소매업', industryCode: 'G47', event: '폐업' },
  { date: '2023-10', openDate: '2023-10-01', closeDate: null, opMonths: null, industry: '카페', industryCode: 'I56', event: '업종변경' },
  { date: '2023-07', openDate: '2020-03-15', closeDate: '2023-07-01', opMonths: 39, industry: '음식점', industryCode: 'F45', event: '폐업' },
];

type HistoryRow = {
  date: string;
  openDate: string;
  closeDate: string | null;
  opMonths: number | null;
  industry: string;
  industryCode: string;
  event: '신규입점' | '폐업' | '업종변경';
};

type FilterTab = '전체' | '신규입점' | '폐업' | '업종변경';

const EVENT_STYLE: Record<string, string> = {
  '신규입점': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  '폐업': 'bg-red-100 text-red-700 border border-red-200',
  '업종변경': 'bg-blue-100 text-blue-700 border border-blue-200',
};

const INDUSTRY_COLOR: Record<string, string> = {
  'I56': 'text-amber-700',
  'G47': 'text-violet-700',
  'G4711': 'text-cyan-700',
  'F45': 'text-orange-700',
  'Q86': 'text-green-700',
  'S96': 'text-pink-700',
  'P85': 'text-indigo-700',
};

type StoreHistoryProps = { buildingId?: string };

export default function StoreHistory({ buildingId }: StoreHistoryProps) {
  const [tab, setTab] = useState<FilterTab>('전체');
  const [streetViewOpen, setStreetViewOpen] = useState(false);

  const tabs: FilterTab[] = ['전체', '신규입점', '폐업', '업종변경'];
  const filtered = tab === '전체' ? DUMMY_HISTORY : DUMMY_HISTORY.filter((r) => r.event === tab);

  const openCount = DUMMY_HISTORY.filter((r) => r.event === '신규입점').length;
  const closeCount = DUMMY_HISTORY.filter((r) => r.event === '폐업').length;
  const avgOpMonths = Math.round(
    DUMMY_HISTORY.filter((r) => r.opMonths !== null).reduce((acc, r) => acc + (r.opMonths ?? 0), 0) /
    DUMMY_HISTORY.filter((r) => r.opMonths !== null).length
  );

  return (
    <div className="space-y-4">
      {/* 점포 이력 테이블 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* 헤더 */}
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">점포 이력</p>
              <p className="text-xs text-slate-400 mt-0.5">건물 ID: <span className="font-mono">{buildingId ?? '-'}</span></p>
            </div>
            {/* 요약 배지 */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                신규 {openCount}건
              </span>
              <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
                폐업 {closeCount}건
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                평균 영업 {avgOpMonths}개월
              </span>
              {/* TODO: 날짜 범위 필터 추가 */}
            </div>
          </div>

          {/* 탭 필터 */}
          <div className="mt-3 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  tab === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                <th className="px-4 py-2.5 text-left">날짜</th>
                <th className="px-4 py-2.5 text-left">업종</th>
                <th className="px-4 py-2.5 text-left">업종코드</th>
                <th className="px-4 py-2.5 text-left">이벤트</th>
                <th className="px-4 py-2.5 text-left">개업일</th>
                <th className="px-4 py-2.5 text-left">폐업일</th>
                <th className="px-4 py-2.5 text-right">영업기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.industry}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs font-semibold ${INDUSTRY_COLOR[row.industryCode] ?? 'text-slate-500'}`}>
                      {row.industryCode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EVENT_STYLE[row.event] ?? ''}`}>
                      {row.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.openDate}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.closeDate ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    {row.opMonths !== null ? `${row.opMonths}개월` : '영업 중'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 거리뷰 섹션 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setStreetViewOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-base">🔭</span>
            거리뷰 (Naver 거리뷰)
          </span>
          <span className="text-xs text-slate-400">{streetViewOpen ? '▲ 닫기' : '▼ 열기'}</span>
        </button>

        {streetViewOpen && (
          <div className="border-t border-slate-100 px-5 py-6">
            {/* TODO: Naver Cloud Console 에서 거리뷰 API 활성화 후 실제 Panorama 위젯으로 교체 */}
            {/* TODO: window.naver.maps.Panorama(el, { position: new naver.maps.LatLng(lat, lng) }) */}
            <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
              <span className="text-3xl">🗺️</span>
              <p className="text-sm font-semibold text-slate-700">Naver 거리뷰 준비 중</p>
              <p className="max-w-xs text-center text-xs text-slate-400">
                Naver Cloud Console에서 Maps Panorama API를 활성화하면
                건물 주변 360° 거리뷰가 이 영역에 표시됩니다.
              </p>
              <div className="mt-1 flex gap-2 text-xs text-slate-500">
                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono">건물 ID: {buildingId}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
