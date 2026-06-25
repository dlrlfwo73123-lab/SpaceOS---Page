import type { BusinessCondition } from '@/types/analysis';

type Props = {
  value: BusinessCondition;
  onChange: (value: BusinessCondition) => void;
};

export function BusinessConditionForm({ value, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
        최소 예산 (만원)
        <input
          type="number"
          value={value.budgetMin}
          onChange={(e) => onChange({ ...value, budgetMin: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
        최대 예산 (만원)
        <input
          type="number"
          value={value.budgetMax}
          onChange={(e) => onChange({ ...value, budgetMax: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
        희망 면적 (㎡)
        <input
          type="number"
          value={value.areaSqm}
          onChange={(e) => onChange({ ...value, areaSqm: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </label>
      <label className="flex items-center gap-2 self-end pb-1.5 text-xs font-semibold text-slate-500">
        <input
          type="checkbox"
          checked={value.priorExperience}
          onChange={(e) => onChange({ ...value, priorExperience: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
        업종 운영 경험 있음
      </label>
    </div>
  );
}
