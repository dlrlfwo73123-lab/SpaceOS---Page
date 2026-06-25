import type { ScoreBreakdownItem } from '@/types/recommendation';

export function ScoreBreakdown({ items }: { items: ScoreBreakdownItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 text-slate-500">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.score}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right font-semibold text-slate-700">{item.score}</span>
        </div>
      ))}
    </div>
  );
}
