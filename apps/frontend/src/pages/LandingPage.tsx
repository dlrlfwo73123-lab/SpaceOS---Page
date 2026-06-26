import { Link, useNavigate } from 'react-router-dom';
import { AnalysisModeCard } from '@/components/landing/AnalysisModeCard';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">SpaceOS Platform</p>
          <h1 className="text-3xl font-semibold">서울 상권분석 추천</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            지역을 기준으로 적합한 업종을 추천받거나, 업종을 기준으로 적합한 지역을 추천받을 수 있습니다.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <AnalysisModeCard
            icon="📍"
            title="지역 기반 업종 분석"
            description="구/동과 창업 조건을 입력하면 해당 지역에 적합한 업종을 추천합니다."
            onClick={() => navigate('/region')}
          />
          <AnalysisModeCard
            icon="🏪"
            title="업종 기반 지역 분석"
            description="업종과 창업 조건을 입력하면 해당 업종에 적합한 지역을 추천합니다."
            onClick={() => navigate('/industry')}
          />
        </section>

        <div className="flex items-center justify-center gap-4 text-center">
          <Link to="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            기존 상권분석 대시보드 보기 →
          </Link>
          <Link to="/pricing" className="text-sm font-semibold text-slate-400 hover:text-slate-600">
            요금제 보기 →
          </Link>
        </div>
      </div>
    </main>
  );
}
