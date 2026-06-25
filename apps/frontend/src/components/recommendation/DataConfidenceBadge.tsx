import { confidenceLabel } from '@/lib/formatters';

const COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-700',
};

export function DataConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR[level]}`}>
      데이터 신뢰도 {confidenceLabel(level)}
    </span>
  );
}
