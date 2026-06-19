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
        <p className="mb-3 text-xs text-slate-400">최근 36개월 + AI 예측 1개월</p>

        <Plot
          data={[
            {
              x: observed.map((p) => p.month),
              y: observed.map((p) => p.value),
              type: 'scatter',
              mode: 'lines+markers',
              name: label,
              line: { color: '#4f46e5', width: 2 },
              marker: { color: '#4f46e5', size: 4 },
            },
            {
              x: last && predicted ? [last.month, predicted.month] : [],
              y: last && predicted ? [last.value, predicted.value] : [],
              type: 'scatter',
              mode: 'lines+markers',
              name: 'AI 예측',
              line: { color: '#f59e0b', width: 2, dash: 'dot' },
              marker: { color: '#f59e0b', size: 7, symbol: 'diamond' },
            },
          ]}
          layout={{
            autosize: true,
            height: 320,
            margin: { l: 50, r: 16, t: 8, b: 32 },
            font: { family: 'inherit', size: 11, color: '#475569' },
            xaxis: { showgrid: false, tickangle: -45, nticks: 12 },
            yaxis: { ticksuffix: ` ${unit}`, showgrid: true, gridcolor: '#f1f5f9' },
            legend: { orientation: 'h', y: -0.3 },
            showlegend: true,
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
