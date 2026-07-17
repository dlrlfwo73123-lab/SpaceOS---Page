import React, { lazy, Suspense, useMemo, useState } from 'react';
import { NaverMap } from './components/NaverMap';
import StatsPanel from './components/StatsPanel';
import StoreHistory from './components/StoreHistory';
import StartupRecommendation from './components/StartupRecommendation';
import DataReliabilityPanel from './components/DataReliabilityPanel';
import VacancyModal from './components/VacancyModal';
import { SEOUL_GU, INDUSTRY_CODES } from './lib/seoul';
import { getVacancyMarkers, getRecommendations, type VacancyMarker } from './lib/marketData';
import { getAllDongCenters } from './lib/seoulBoundaries';

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

const BuildingTwin = lazy(() => import('./components/BuildingTwin'));

export default function App() {
  const [guCode, setGuCode] = useState('');
  const [dongCode, setDongCode] = useState('');
  const [industryCode, setIndustryCode] = useState('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [vacancyCoords, setVacancyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vacancyDetail, setVacancyDetail] = useState<{ vacancy: VacancyMarker; guCode: string; guName: string } | null>(null);
  // 3D 트윈용 — VacancyModal 닫아도 마지막 선택 공실 유지
  const [twinVacancyDetail, setTwinVacancyDetail] = useState<{ vacancy: VacancyMarker; guCode: string; guName: string } | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [storeHistoryModal, setStoreHistoryModal] = useState(false);
  const [dataReliabilityModal, setDataReliabilityModal] = useState(false);

  const selectedGu = SEOUL_GU.find((g) => g.code === guCode);
  const guDongs = useMemo(() => selectedGu?.dongs ?? [], [selectedGu]);

  // 선택 공실 주변 공실 (같은 구/동 내 다른 공실들) — twinVacancyDetail 기반으로 모달 닫아도 유지
  const nearbyVacancies = useMemo(() => {
    if (!twinVacancyDetail || !vacancyCoords) return [];
    const { guCode: vGuCode, vacancy } = twinVacancyDetail;
    const gu = SEOUL_GU.find((g) => g.code === vGuCode);
    if (!gu) return [];
    const centers = getAllDongCenters(gu.dongs, vGuCode);
    const markers = getVacancyMarkers(vGuCode, vacancy.dongCode, centers, 15);
    return markers
      .filter((m) => m.id !== vacancy.id)
      .map((m) => ({ id: m.id, lat: m.lat, lng: m.lng }));
  }, [vacancyDetail, vacancyCoords]);

  // AI 추천 업종 이름 — twinVacancyDetail 기반으로 모달 닫아도 유지
  const aiRecommendedIndustries = useMemo(() => {
    if (!twinVacancyDetail) return [];
    const { guCode: vGuCode, guName, vacancy } = twinVacancyDetail;
    const recs = getRecommendations(vGuCode, vacancy.dongCode, 'ALL', guName, vacancy.dongName);
    return recs.map((r) => r.industry);
  }, [vacancyDetail]);

  function handleGuChange(code: string) {
    setGuCode(code);
    setDongCode('');
    if (!code) {
      setSelectedBuildingId(null);
      setVacancyCoords(null);
    }
  }

  const guLabel = selectedGu?.name ?? '서울 전체';
  const dongLabel = selectedGu
    ? (selectedGu.dongs.find((d) => d.code === dongCode)?.name ?? '전체')
    : '';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-900">

      {/* 상단 헤더 바 */}
      <header className="flex flex-shrink-0 items-center justify-between gap-3 bg-slate-900/95 px-4 py-2.5 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">SpaceOS</p>
            <h1 className="text-sm font-bold text-white leading-tight">서울 상권분석</h1>
          </div>
          {/* 현재 선택 */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="rounded-full bg-indigo-600/80 px-2.5 py-0.5 font-semibold text-white">
              {guLabel}{dongLabel && dongLabel !== '전체' ? ` · ${dongLabel}` : ''}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{INDUSTRY_CODES.find((i) => i.code === industryCode)?.name ?? '전체'}</span>
          </div>
        </div>

        {/* 필터 (헤더 우측) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 구 선택 */}
          <select
            value={guCode}
            onChange={(e) => handleGuChange(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">서울 전체</option>
            {SEOUL_GU.map((g) => (
              <option key={g.code} value={g.code}>{g.name}</option>
            ))}
          </select>

          {/* 동 선택 */}
          <select
            value={dongCode}
            onChange={(e) => setDongCode(e.target.value)}
            disabled={!guCode}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-40"
          >
            <option value="">전체 동</option>
            {(selectedGu?.dongs ?? []).map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>

          {/* 업종 chip (간소화) */}
          <div className="flex flex-wrap gap-1">
            {INDUSTRY_CODES.slice(0, 5).map((ind) => (
              <button
                key={ind.code}
                onClick={() => setIndustryCode(ind.code)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  industryCode === ind.code
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {ind.name}
              </button>
            ))}
            {INDUSTRY_CODES.length > 5 && (
              <select
                value={INDUSTRY_CODES.slice(5).find(i => i.code === industryCode) ? industryCode : ''}
                onChange={(e) => e.target.value && setIndustryCode(e.target.value)}
                className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-[11px] text-slate-300"
              >
                <option value="">더보기…</option>
                {INDUSTRY_CODES.slice(5).map((ind) => (
                  <option key={ind.code} value={ind.code}>{ind.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 사이드 패널 토글 */}
          <button
            onClick={() => setSideOpen((v) => !v)}
            className="ml-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-600 transition-colors"
          >
            {sideOpen ? '지도 전체 ▶' : '◀ 상세분석'}
          </button>
        </div>
      </header>

      {/* 메인 영역: 지도 + (선택 시) 사이드 패널 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 지도 (항상 보임, 사이드 열릴 때 축소) */}
        <div className={`relative flex-1 transition-all duration-300 ${sideOpen ? 'hidden sm:flex' : 'flex'}`}>
          <div className="absolute inset-2 rounded-xl overflow-hidden">
            <NaverMap
              guCode={guCode}
              dongCode={dongCode}
              industryCode={industryCode}
              guDongs={guDongs}
              onSelectBuilding={setSelectedBuildingId}
              onSelectVacancy={(id, lat, lng, vGuCode, vDongCode, vData) => {
                setSelectedBuildingId(`vacancy-${id}`);
                setVacancyCoords({ lat, lng });
                if (vGuCode && vGuCode !== guCode) {
                  setGuCode(vGuCode);
                  setDongCode(vDongCode ?? '');
                } else if (vDongCode && vDongCode !== dongCode) {
                  setDongCode(vDongCode);
                }
                const gu = SEOUL_GU.find((g) => g.code === vGuCode);
                const detail = { vacancy: vData, guCode: vGuCode, guName: gu?.name ?? '' };
                setVacancyDetail(detail);
                setTwinVacancyDetail(detail);
                setSideOpen(true);
              }}
            />
          </div>

          {/* 지도 위 힌트 (공실 미선택 시) */}
          {!selectedBuildingId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white backdrop-blur-sm pointer-events-none">
              빨간 점 클릭 → 공실 매물 상세 · 3D 트윈 활성화
            </div>
          )}
        </div>

        {/* 사이드 패널 (상세 분석) */}
        {sideOpen && (
          <div className="w-full sm:w-[400px] flex-shrink-0 overflow-y-auto bg-slate-50 border-l border-slate-200 p-4 space-y-4">

            {/* 닫기 */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {selectedBuildingId ? '공실 매물 상세분석' : '서울 상권분석'}
              </h2>
              <button
                onClick={() => setSideOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* 통계 카드 */}
            <StatsPanel guCode={guCode || SEOUL_GU[0].code} dongCode={dongCode} industryCode={industryCode} />

            {/* 3D 디지털 트윈 */}
            {selectedBuildingId ? (
              <Suspense fallback={
                <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">
                  3D 트윈 불러오는 중…
                </div>
              }>
                <BuildingTwin
                  buildingId={selectedBuildingId}
                  lat={vacancyCoords?.lat}
                  lng={vacancyCoords?.lng}
                  nearbyVacancies={nearbyVacancies}
                  aiRecommendedIndustries={aiRecommendedIndustries}
                />
              </Suspense>
            ) : (
              <div className="flex h-24 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
                <div>
                  <p className="text-sm font-semibold text-slate-400">3D 디지털 트윈</p>
                  <p className="text-xs text-slate-300 mt-1">공실 매물 클릭 시 활성화</p>
                </div>
              </div>
            )}

            {/* 점포이력 / 데이터신뢰성 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setStoreHistoryModal(true)}
                disabled={!selectedBuildingId}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📋 점포이력 보기
              </button>
              <button
                onClick={() => setDataReliabilityModal(true)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                📊 데이터 신뢰성
              </button>
            </div>

            {/* 창업 지역 추천 */}
            <StartupRecommendation
              guCode={guCode}
              guName={guLabel}
              industryCode={industryCode}
              dongs={guDongs}
              onSelectDong={(code, gCode) => {
                if (gCode) { setGuCode(gCode); setDongCode(code); }
                else if (guCode) setDongCode(code);
              }}
            />
          </div>
        )}
      </div>

      {/* 공실 상세 모달 */}
      {vacancyDetail && (
        <VacancyModal
          vacancy={vacancyDetail.vacancy}
          guCode={vacancyDetail.guCode}
          guName={vacancyDetail.guName}
          onClose={() => setVacancyDetail(null)}
        />
      )}

      {/* 점포이력 모달 */}
      {storeHistoryModal && selectedBuildingId && (
        <SimpleModal title="점포이력" onClose={() => setStoreHistoryModal(false)}>
          <StoreHistory
            buildingId={selectedBuildingId}
            guCode={guCode || SEOUL_GU[0].code}
            dongCode={dongCode}
            industryCode={industryCode}
            guName={guLabel}
            dongName={dongLabel}
          />
        </SimpleModal>
      )}

      {/* 데이터 신뢰성 모달 */}
      {dataReliabilityModal && (
        <SimpleModal title="데이터 신뢰성 현황" onClose={() => setDataReliabilityModal(false)}>
          <DataReliabilityPanel />
        </SimpleModal>
      )}
    </div>
  );
}
