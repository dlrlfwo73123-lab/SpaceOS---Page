import { useEffect, useMemo, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { getDistrictTrend, type DistrictTrendPoint } from '@/lib/api';

const Plot = createPlotlyComponent(Plotly);

const FALLBACK_TREND: DistrictTrendPoint[] = Array.from({ length: 13 }, (_, i) => {
  const month = new Date(2025, i, 1);
  return {
    month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`,
    vacancy_rate: Math.round((12 + Math.sin(i / 2) * 3) * 10) / 10,
    predicted: i === 12,
  };
});

type VacancyTrendChartProps = { guCode: string; guName: string };

export default function VacancyTrendChart({ guCode, guName }: VacancyTrendChartProps) {
  const [trend, setTrend] = useState<DistrictTrendPoint[]>(FALLBACK_TREND);

  useEffect(() => {
    getDistrictTrend(guCode)
      .then((data) => setTrend(data.length ? data : FALLBACK_TREND))
      .catch((err) => {
        console.warn('공실율 추이 로드 실패, fallback 사용', err);
        setTrend(FALLBACK_TREND);
      });
  }, [guCode]);

  const { observed, predicted } = useMemo(() => {
    const observedPoints = trend.filter((p) => !p.predicted);
    const lastObserved = observedPoints[observedPoints.length - 1];
    const predictedPoint = trend.find((p) => p.predicted);
    return {
      observed: observedPoints,
      predicted: lastObserved && predictedPoint ? [lastObserved, predictedPoint] : [],
    };
  }, [trend]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">공실율 추이 · {guName}</p>
        <span className="text-xs text-slate-400">최근 12개월 + 예측 1개월</span>
      </div>

      <Plot
        data={[
          {
            x: observed.map((p) => p.month),
            y: observed.map((p) => p.vacancy_rate),
            type: 'scatter',
            mode: 'lines+markers',
            name: '공실율',
            line: { color: '#4f46e5', width: 2 },
            marker: { color: '#4f46e5', size: 6 },
          },
          {
            x: predicted.map((p) => p.month),
            y: predicted.map((p) => p.vacancy_rate),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'AI 예측',
            line: { color: '#f59e0b', width: 2, dash: 'dot' },
            marker: { color: '#f59e0b', size: 7, symbol: 'diamond' },
          },
        ]}
        layout={{
          autosize: true,
          height: 280,
          margin: { l: 40, r: 16, t: 8, b: 32 },
          font: { family: 'inherit', size: 11, color: '#475569' },
          xaxis: { showgrid: false },
          yaxis: { ticksuffix: '%', showgrid: true, gridcolor: '#f1f5f9' },
          legend: { orientation: 'h', y: -0.2 },
          showlegend: true,
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
        useResizeHandler
      />
    </div>
  );
}
