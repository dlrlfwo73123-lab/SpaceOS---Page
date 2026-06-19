import { useState } from 'react';
import BuildingTwin from './components/BuildingTwin';
import { DistrictMap } from './components/DistrictMap';
import HistoryTimeline from './components/HistoryTimeline';
import { NaverMap } from './components/NaverMap';
import StatsPanel from './components/StatsPanel';
import StoreHistory from './components/StoreHistory';
import { SEOUL_GU, INDUSTRY_CODES } from './lib/seoul';

export default function App() {
  const [guCode, setGuCode] = useState(SEOUL_GU[0].code);         // 강남구
  const [dongCode, setDongCode] = useState(SEOUL_GU[0].dongs[0].code);
  const [industryCode, setIndustryCode] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('demo-building');

  const selectedGu = SEOUL_GU.find((g) => g.code === guCode) ?? SEOUL_GU[0];

  function handleGuChange(code: string) {
    setGuCode(code);
    const gu = SEOUL_GU.find((g) => g.code === code) ?? SEOUL_GU[0];
    setDongCode(gu.dongs[0].code); // 구 바꾸면 첫 번째 동으로 리셋
  }

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

        {/* 필터 바 — 구 → 동 cascade + 업종 */}
        <section className="flex flex-wrap items-start gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

          {/* 구 선택 */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">구</label>
            <select
              value={guCode}
              onChange={(e) => handleGuChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {SEOUL_GU.map((g) => (
                <option key={g.code} value={g.code}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* 동 선택 — 선택된 구의 동만 표시 */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">동</label>
            <select
              value={dongCode}
              onChange={(e) => setDongCode(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {selectedGu.dongs.map((d) => (
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
            {selectedGu.name} · {selectedGu.dongs.find((d) => d.code === dongCode)?.name ?? '-'}
          </span>
          <span>·</span>
          <span>{INDUSTRY_CODES.find((i) => i.code === industryCode)?.name ?? '전체'}</span>
        </div>

        {/* 통계 카드 — 구/동/업종별 10대 지표, 클릭 시 3년 추이 그래프 */}
        <StatsPanel guCode={guCode} dongCode={dongCode} industryCode={industryCode} />

        {/* 지도 + 3D 트윈 */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold">
              네이버 지도 · {selectedGu.name}
            </p>
            <NaverMap guCode={guCode} onSelectBuilding={setSelectedBuildingId} />
          </div>
          <BuildingTwin buildingId={selectedBuildingId} />
        </section>

        {/* 상권 공실 히트맵 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold">상권 공실 히트맵</p>
          <DistrictMap onSelectBuilding={setSelectedBuildingId} />
        </section>

        {/* 공실 히스토리 타임라인 */}
        <HistoryTimeline buildingId={selectedBuildingId} />

        {/* 점포 이력 + 창업 업종 추천 — 구/동/업종 필터에 따라 변경 */}
        <StoreHistory
          buildingId={selectedBuildingId}
          guCode={guCode}
          dongCode={dongCode}
          industryCode={industryCode}
          guName={selectedGu.name}
          dongName={selectedGu.dongs.find((d) => d.code === dongCode)?.name ?? ''}
        />

      </div>
    </main>
  );
}
