import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndustrySelector } from '@/components/selectors/IndustrySelector';
import { BusinessConditionForm } from '@/components/selectors/BusinessConditionForm';
import { INDUSTRY_CODES } from '@/lib/seoul';
import type { BusinessCondition } from '@/types/analysis';

const DEFAULT_CONDITION: BusinessCondition = { budgetMin: 3000, budgetMax: 8000, areaSqm: 50, priorExperience: false };

export default function IndustryAnalysisPage() {
  const navigate = useNavigate();
  const [industryCode, setIndustryCode] = useState(INDUSTRY_CODES[1].code);
  const [condition, setCondition] = useState<BusinessCondition>(DEFAULT_CONDITION);

  function handleSubmit() {
    navigate('/result', { state: { mode: 'industry', input: { industryCode, condition } } });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <button onClick={() => navigate('/')} className="mb-2 text-xs font-semibold text-slate-400 hover:text-slate-600">← 처음으로</button>
          <h1 className="text-2xl font-semibold">업종 기반 지역 분석</h1>
          <p className="mt-2 text-sm text-slate-500">업종을 선택하고 창업 조건을 입력하면 적합한 지역을 추천해 드립니다.</p>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndustrySelector value={industryCode} onChange={setIndustryCode} />
          <BusinessConditionForm value={condition} onChange={setCondition} />
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            지역 추천받기
          </button>
        </section>
      </div>
    </main>
  );
}
