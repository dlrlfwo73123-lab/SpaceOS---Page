import type { RecommendationItem } from '@/types/recommendation';

type Props = {
  item: RecommendationItem | null;
  onClose: () => void;
};

export function BuildingDetailDrawer({ item, onClose }: Props) {
  if (!item) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          선택 상세 · {item.guName} {item.dongName} · {item.industryName}
        </h3>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">닫기</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">종합 점수 {item.totalScore}점 · 3년 생존율 {item.survivalRate3y}%</p>
    </div>
  );
}
