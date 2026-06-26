import { useDataSources } from '@/hooks/useDataSources';

export function DataSourcePanel() {
  const { sources, freshness, loading, error } = useDataSources();

  if (loading) return null;
  if (error) return null;
  if (sources.length === 0) return null;

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold text-slate-700">
        데이터 출처 안내 ({sources.filter((s) => s.status === 'mock').length}/{sources.length}개 항목이 데모 데이터)
      </summary>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => {
          const fresh = freshness.find((f) => f.sourceId === source.id);
          return (
            <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div>
                <p className="font-medium text-slate-800">{source.label}</p>
                <p className="text-xs text-slate-400">예정 출처: {source.intendedSource} · 갱신 주기: {source.refreshCadence}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  source.status === 'mock'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {source.status === 'mock' ? '데모 데이터' : '실데이터'}
              </span>
              {fresh && !fresh.asOf && (
                <span className="text-[11px] text-slate-400">갱신 시각 정보 없음</span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
