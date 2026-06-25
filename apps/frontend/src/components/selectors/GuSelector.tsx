import { SEOUL_GU } from '@/lib/seoul';

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export function GuSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">구</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {SEOUL_GU.map((g) => (
          <option key={g.code} value={g.code}>{g.name}</option>
        ))}
      </select>
    </div>
  );
}
