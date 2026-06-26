import { useNavigate } from 'react-router-dom';
import { PRICING_HYPOTHESIS_V1 } from '@/lib/pricing';

function formatPrice(won: number | null) {
  if (won === null) return '문의';
  if (won === 0) return '무료';
  return `₩${won.toLocaleString()}/월`;
}

export default function PricingPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <button onClick={() => navigate('/')} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
          ← 처음으로
        </button>

        <div>
          <h1 className="text-2xl font-bold">요금제 (검토용 가설안)</h1>
          <p className="mt-1 text-sm text-slate-500">
            아래 요금제는 <span className="font-mono text-xs">PRICING_HYPOTHESIS_V1</span> — 내부 검토를 위한 가설안이며
            확정된 가격이 아닙니다. 실제 결제 연동 전까지 모든 결제 버튼은 비활성화되어 있습니다.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRICING_HYPOTHESIS_V1.map((tier) => (
            <div key={tier.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">{tier.name}</h2>
              <p className="mt-1 text-2xl font-bold text-indigo-600">{formatPrice(tier.monthlyPriceWon)}</p>
              <p className="mt-2 text-xs text-slate-500">{tier.description}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-xs text-slate-600">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-emerald-500">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled
                title="결제 연동 준비 중"
                className="mt-4 cursor-not-allowed rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                결제 연동 준비 중
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
