import { SEOUL_GU } from '@/lib/seoul';

type Props = {
  guCode: string;
  value: string;
  onChange: (code: string) => void;
};

export function DongSelector({ guCode, value, onChange }: Props) {
  const gu = SEOUL_GU.find((g) => g.code === guCode) ?? SEOUL_GU[0];
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">동</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {gu.dongs.map((d) => (
          <option key={d.code} value={d.code}>{d.name}</option>
        ))}
      </select>
    </div>
  );
}
