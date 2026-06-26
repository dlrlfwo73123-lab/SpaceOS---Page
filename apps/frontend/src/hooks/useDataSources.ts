import { useEffect, useState } from 'react';
import { fetchDataFreshness, fetchDataSources } from '@/lib/api';
import type { DataFreshnessInfo, DataSourceInfo } from '@/lib/api';

export function useDataSources() {
  const [sources, setSources] = useState<DataSourceInfo[]>([]);
  const [freshness, setFreshness] = useState<DataFreshnessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDataSources(), fetchDataFreshness()])
      .then(([s, f]) => {
        if (cancelled) return;
        setSources(s);
        setFreshness(f);
      })
      .catch(() => { if (!cancelled) setError('데이터 출처 정보를 불러오지 못했습니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { sources, freshness, loading, error };
}
