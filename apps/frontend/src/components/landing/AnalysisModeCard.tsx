type Props = {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
};

export function AnalysisModeCard({ title, description, icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-colors hover:border-indigo-300 hover:shadow-md"
    >
      <span className="text-3xl">{icon}</span>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
      <span className="mt-1 text-sm font-semibold text-indigo-600">시작하기 →</span>
    </button>
  );
}
