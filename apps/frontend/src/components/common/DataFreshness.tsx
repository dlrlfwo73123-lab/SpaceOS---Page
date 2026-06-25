export function DataFreshness({ generatedAt }: { generatedAt: string }) {
  const date = new Date(generatedAt);
  const label = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 기준`;
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
      데이터 {label} (더미 데이터)
    </span>
  );
}
