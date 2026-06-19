import { useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import { type TrendPoint } from '@/lib/marketData';

const Plot = createPlotlyComponent(Plotly);

type MetricTrendChartProps = {
  points: TrendPoint[];
  label: string;
  unit: string;
  onClose: () => void;
};

export default function MetricTrendChart({ points, label, unit, onClose }: MetricTrendChartProps) {
  const observed = points.filter((p) => !p.predicted);
  const last = observed[observed.length - 1];
  const predicted = points.find((p) => p.predicted);
  const [selected, setSelected] = useState<TrendPoint | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">{label} · 3년 추이</p>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-xs text-slate-400 hover:bg-slate-100">✕ 닫기</button>
        </div>
        <p className="mb-3 text-xs text-slate-400">오늘 기준 3년 전부터 분기별 + 다음 달 AI 예측 1개월</p>

        <Plot
          data={[
            {
              x: observed.map((p) => p.month),
              y: observed.map((p) => p.value),
              type: 'scatter',
              mode: 'lines+markers',
              name: label,
              line: { color: '#4f46e5', width: 2 },
              marker: { color: '#4f46e5', size: 6 },
            },
            {
              x: last && predicted ? [last.month, predicted.month] : [],
              y: last && predicted ? [last.value, predicted.value] : [],
              type: 'scatter',
              mode: 'lines+markers',
              name: 'AI 예측',
              line: { color: '#f59e0b', width: 2, dash: 'dot' },
              marker: { color: '#f59e0b', size: 8, symbol: 'diamond' },
            },
            ...(selected ? [{
              x: [selected.month],
              y: [selected.value],
              type: 'scatter' as const,
              mode: 'markers' as const,
              name: '선택값',
              marker: { color: '#16a34a', size: 14, symbol: 'circle-open', line: { width: 3, color: '#16a34a' } },
              showlegend: false,
              hoverinfo: 'skip' as const,
            }] : []),
          ]}
          layout={{
            autosize: true,
            height: 320,
            margin: { l: 50, r: 16, t: 8, b: 32 },
            font: { family: 'inherit', size: 11, color: '#475569' },
            xaxis: { showgrid: false, tickangle: -45, nticks: 13 },
            yaxis: { ticksuffix: ` ${unit}`, showgrid: true, gridcolor: '#f1f5f9' },
            legend: { orientation: 'h', y: -0.3 },
            showlegend: true,
            annotations: selected ? [{
              x: selected.month,
              y: selected.value,
              text: `${selected.value.toLocaleString()} ${unit}`,
              showarrow: true,
              arrowhead: 4,
              ax: 0,
              ay: -30,
              font: { color: '#16a34a', size: 12 },
              bgcolor: '#f0fdf4',
              bordercolor: '#16a34a',
              borderwidth: 1,
            }] : [],
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
          useResizeHandler
        />

        <p className="mt-3 mb-1 text-[11px] font-bold text-slate-400">분기 값 클릭 시 그래프에 표시</p>
        <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-100">
          <div className="grid grid-cols-4 gap-1 p-2 sm:grid-cols-6">
            {points.map((p) => (
              <button
                key={p.month}
                onClick={() => setSelected(p)}
                className={`rounded px-1.5 py-1 text-[11px] font-medium transition-colors ${
                  selected?.month === p.month
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400'
                    : p.predicted
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'bg-slate-50 text-slate-600 hover:bg-indigo-50'
                }`}
              >
                <span className="block text-[10px] text-slate-400">{p.month}</span>
                {p.value.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
