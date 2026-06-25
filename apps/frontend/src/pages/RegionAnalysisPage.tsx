import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GuSelector } from '@/components/selectors/GuSelector';
import { DongSelector } from '@/components/selectors/DongSelector';
import { BusinessConditionForm } from '@/components/selectors/BusinessConditionForm';
import { SEOUL_GU } from '@/lib/seoul';
import type { BusinessCondition } from '@/types/analysis';

const DEFAULT_CONDITION: BusinessCondition = { budgetMin: 3000, budgetMax: 8000, areaSqm: 50, priorExperience: false };

export default function RegionAnalysisPage() {
  const navigate = useNavigate();
  const [guCode, setGuCode] = useState(SEOUL_GU[0].code);
  const [dongCode, setDongCode] = useState(SEOUL_GU[0].dongs[0].code);
  const [condition, setCondition] = useState<BusinessCondition>(DEFAULT_CONDITION);

  function handleGuChange(code: string) {
    setGuCode(code);
    const gu = SEOUL_GU.find((g) => g.code === code) ?? SEOUL_GU[0];
    setDongCode(gu.dongs[0].code);
  }

  function handleSubmit() {
    navigate('/result', { state: { mode: 'region', input: { guCode, dongCode, condition } } });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <button onClick={() => navigate('/')} className="mb-2 text-xs font-semibold text-slate-400 hover:text-slate-600">← 처음으로</button>
          <h1 className="text-2xl font-semibold">지역 기반 업종 분석</h1>
          <p className="mt-2 text-sm text-slate-500">구/동을 선택하고 창업 조건을 입력하면 적합한 업종을 추천해 드립니다.</p>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-4">
            <GuSelector value={guCode} onChange={handleGuChange} />
            <DongSelector guCode={guCode} value={dongCode} onChange={setDongCode} />
          </div>
          <BusinessConditionForm value={condition} onChange={setCondition} />
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            업종 추천받기
          </button>
        </section>
      </div>
    </main>
  );
}
