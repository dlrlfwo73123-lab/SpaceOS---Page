import { lazy, Suspense, useState } from 'react';
import { NaverMap } from './components/NaverMap';
import StatsPanel from './components/StatsPanel';
import StoreHistory from './components/StoreHistory';
import { SEOUL_GU, INDUSTRY_CODES } from './lib/seoul';

const BuildingTwin = lazy(() => import('./components/BuildingTwin'));

export default function App() {
  const [guCode, setGuCode] = useState('');          // '' = 서울 전체
  const [dongCode, setDongCode] = useState('');      // '' = 전체 동
  const [industryCode, setIndustryCode] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('demo-building');

  const selectedGu = SEOUL_GU.find((g) => g.code === guCode);

  function handleGuChange(code: string) {
    setGuCode(code);
    setDongCode(''); // 구 바꾸면 동 전체로 리셋
  }

  const guLabel = selectedGu?.name ?? '서울 전체';
  const dongLabel = selectedGu
    ? (selectedGu.dongs.find((d) => d.code === dongCode)?.name ?? '전체')
    : '';

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* 헤더 */}
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            SpaceOS Platform
          </p>
          <h1 className="text-3xl font-semibold">서울 상권분석 현황</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            서울 25개 자치구 · 동별 필터로 공실 현황을 확인하고,
            건물을 선택하면 3D 디지털 트윈과 점포 이력을 볼 수 있습니다.
          </p>
        </header>

        {/* 필터 바 */}
        <section className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

          {/* 구 선택 */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">구</label>
            <select
              value={guCode}
              onChange={(e) => handleGuChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">서울 전체</option>
              {SEOUL_GU.map((g) => (
                <option key={g.code} value={g.code}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* 동 선택 — 선택된 구의 동만 표시, 구 미선택 시 비활성 */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">동</label>
            <select
              value={dongCode}
              onChange={(e) => setDongCode(e.target.value)}
              disabled={!guCode}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40"
            >
              <option value="">전체</option>
              {(selectedGu?.dongs ?? []).map((d) => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 업종 chip */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">업종</label>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRY_CODES.map((ind) => (
                <button
                  key={ind.code}
                  onClick={() => setIndustryCode(ind.code)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    industryCode === ind.code
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ind.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 선택된 지역 요약 */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 font-semibold">
            {guLabel}{dongLabel ? ` · ${dongLabel}` : ''}
          </span>
          <span>·</span>
          <span>{INDUSTRY_CODES.find((i) => i.code === industryCode)?.name ?? '전체'}</span>
        </div>

        {/* 통계 카드 */}
        <StatsPanel guCode={guCode || SEOUL_GU[0].code} dongCode={dongCode} industryCode={industryCode} />

        {/* 지도 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold">네이버 지도 · {guLabel}</p>
          <NaverMap
            guCode={guCode}
            dongCode={dongCode}
            industryCode={industryCode}
            guDongs={selectedGu?.dongs ?? []}
            onSelectBuilding={setSelectedBuildingId}
          />
        </section>

        {/* 3D 디지털 트윈 */}
        <Suspense fallback={<div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">3D 트윈 불러오는 중…</div>}>
          <BuildingTwin buildingId={selectedBuildingId} />
        </Suspense>

        {/* 점포 이력 */}
        <StoreHistory
          buildingId={selectedBuildingId}
          guCode={guCode || SEOUL_GU[0].code}
          dongCode={dongCode}
          industryCode={industryCode}
          guName={guLabel}
          dongName={dongLabel}
        />

      </div>
    </main>
  );
}
