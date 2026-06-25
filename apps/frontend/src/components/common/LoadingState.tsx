export function LoadingState({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
      {label}
    </div>
  );
}
