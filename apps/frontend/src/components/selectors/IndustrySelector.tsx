import { INDUSTRY_CODES } from '@/lib/seoul';

type Props = {
  value: string;
  onChange: (code: string) => void;
  includeAll?: boolean;
};

export function IndustrySelector({ value, onChange, includeAll = false }: Props) {
  const options = includeAll ? INDUSTRY_CODES : INDUSTRY_CODES.filter((i) => i.code !== 'ALL');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">업종</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((ind) => (
          <button
            key={ind.code}
            onClick={() => onChange(ind.code)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              value === ind.code ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ind.name}
          </button>
        ))}
      </div>
    </div>
  );
}
