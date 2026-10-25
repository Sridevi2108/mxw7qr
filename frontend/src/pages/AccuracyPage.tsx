import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { Target, TrendingUp, TrendingDown, Scale, Percent, Info, Clock, AlertCircle } from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';
import { Card, CardHeader } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAccuracyRange } from '@/hooks/useGeneration';
import { formatMW, formatPercent } from '@/utils/metrics';

const CUTOFF_PRESETS = [
  { label: '11:00 UTC (EPEX SPOT DA)', value: '11:00' },
  { label: '12:00 UTC (Nord Pool DA)', value: '12:00' },
  { label: '17:00 UTC (Evening Gate)', value: '17:00' },
  { label: '23:59 UTC (End of D-1)', value: '23:59' },
];

export function AccuracyPage() {
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-01-31');
  const [cutoffTime, setCutoffTime] = useState('11:00');

  const accuracyResult = useAccuracyRange(start, end, cutoffTime);
  const isLoading = accuracyResult.status === 'loading';
  const isError = accuracyResult.status === 'error';
  const isEmpty = accuracyResult.status === 'empty';

  const data = accuracyResult.status === 'success' ? accuracyResult.data : null;
  const metrics = data ? data.overallMetrics : null;
  const dailyTrends = data ? data.dailyTrends : [];

  const chartData = dailyTrends.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    MAE: d.mae,
    Bias: d.bias,
    RMSE: d.rmse,
    WAPE: d.wape,
    coverage: d.coveragePct,
  }));

  const setPresetRange = (presetStart: string, presetEnd: string) => {
    setStart(presetStart);
    setEnd(presetEnd);
  };

  return (
    <div className="space-y-6">
      {/* Date & Cutoff Filters */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Evaluation Window Start</label>
              <input
                type="date"
                value={start}
                min="2026-01-01"
                max={end}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Evaluation Window End</label>
              <input
                type="date"
                value={end}
                min={start}
                max="2026-01-31"
                onChange={(e) => setEnd(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">D-1 Cutoff Time (UTC)</label>
              <select
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                {CUTOFF_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={start === '2026-01-01' && end === '2026-01-31' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPresetRange('2026-01-01', '2026-01-31')}
            >
              Full Month (31 Days)
            </Button>
            <Button
              variant={start === '2026-01-01' && end === '2026-01-07' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPresetRange('2026-01-01', '2026-01-07')}
            >
              First 7 Days
            </Button>
            <Button
              variant={start === '2026-01-15' && end === '2026-01-21' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPresetRange('2026-01-15', '2026-01-21')}
            >
              Mid Month (15–21)
            </Button>
            <Button
              variant={start === '2026-01-25' && end === '2026-01-31' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPresetRange('2026-01-25', '2026-01-31')}
            >
              Last 7 Days
            </Button>
          </div>
        </div>
      </Card>

      {/* Domain Callout: Bias Sign Convention & Utility Risk Impact */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
        <div className="flex items-start gap-2.5">
          <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-blue-950">
              Quantitative Error Evaluation & Directional Bias Convention
            </h4>
            <p className="text-blue-800 leading-relaxed">
              <strong>Sign Convention:</strong> Mean Bias = <code className="rounded bg-blue-200/80 px-1 py-0.5 text-blue-950">Mean(Forecast - Actual)</code>.
              A <strong>Positive Bias (&gt; 0)</strong> indicates the Day-Ahead forecast systematically over-predicted wind generation.
              For a UK utility, over-forecasting means under-contracting thermal energy in the day-ahead auction, exposing the procurement desk to costly system imbalance cashout charges (SBP).
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Calculating quantitative accuracy metrics across January 2026…" />
      ) : isError ? (
        <ErrorState message={accuracyResult.status === 'error' ? accuracyResult.message : 'Failed to load accuracy metrics'} />
      ) : isEmpty || !metrics ? (
        <EmptyState title="No matched data" hint="Select a date range with verified Elexon observations." />
      ) : (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="MAE (Mean Absolute Error)"
              value={formatMW(metrics.mae?.value)}
              icon={<Target className="h-5 w-5" />}
              accent="teal"
              sublabel="Average magnitude of deviation (MW)"
            />
            <KPICard
              label="RMSE (Root Mean Square Error)"
              value={formatMW(metrics.rmse?.value)}
              icon={<TrendingUp className="h-5 w-5" />}
              accent="amber"
              sublabel="Heavily penalises large forecast busts"
            />
            <KPICard
              label="Mean Directional Bias"
              value={metrics.bias ? `${metrics.bias.value && metrics.bias.value > 0 ? '+' : ''}${metrics.bias.value} MW` : '—'}
              icon={<Scale className="h-5 w-5" />}
              accent={metrics.bias?.direction === 'over' ? 'amber' : 'green'}
              sublabel={
                metrics.bias?.direction === 'over'
                  ? 'Over-forecasting (Procurement Shortfall Risk)'
                  : 'Under-forecasting'
              }
            />
            <KPICard
              label="WAPE (Weighted % Error)"
              value={formatPercent(metrics.wape?.value)}
              icon={<Percent className="h-5 w-5" />}
              accent="teal"
              sublabel={`Evaluated over ${metrics.sampleCount} valid matched intervals`}
            />
          </div>

          {/* Daily Accuracy Progression Chart */}
          <Card>
            <CardHeader
              title={`Daily Accuracy Trends (${start} to ${end})`}
              subtitle={`MAE and Mean Bias progression across January 2026 at ${cutoffTime} UTC Day-Ahead Cutoff.`}
              action={
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="teal">■ MAE (MW)</Badge>
                  <Badge variant="amber">■ Directional Bias (MW)</Badge>
                </div>
              }
            />
            <div className="px-2 py-6">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 12 }}
                    formatter={(val, name) => [formatMW(Number(val)), name]}
                  />
                  <Legend />
                  <Bar dataKey="MAE" name="Mean Absolute Error (MW)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="Bias"
                    name="Mean Bias (MW)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Metric Documentation Table */}
          <Card>
            <CardHeader
              title="Mathematical Formula & Metric Methodology"
              subtitle="Formulas implemented according to wholesale electricity market forecasting standards"
            />
            <div className="divide-y divide-slate-100">
              <MetricDefinitionRow
                name="Mean Absolute Error (MAE)"
                formula="MAE = (1 / N) × Σ |Forecast - Actual|"
                value={formatMW(metrics.mae?.value)}
                description="Measures the average unweighted magnitude of errors without considering direction. Used for baseline accuracy benchmarking."
              />
              <MetricDefinitionRow
                name="Root Mean Square Error (RMSE)"
                formula="RMSE = √ [ (1 / N) × Σ (Forecast - Actual)² ]"
                value={formatMW(metrics.rmse?.value)}
                description="Squares errors before averaging, giving disproportionate weight to large forecast busts that create emergency thermal dispatch costs."
              />
              <MetricDefinitionRow
                name="Mean Bias Error"
                formula="Bias = (1 / N) × Σ (Forecast - Actual)"
                value={metrics.bias ? `${metrics.bias.value && metrics.bias.value > 0 ? '+' : ''}${metrics.bias.value} MW` : '—'}
                badge={metrics.bias?.direction === 'over' ? 'Systematic Over-forecast' : 'Under-forecast'}
                description="Reveals whether National Grid ESO forecasts systematically over- or under-estimate wind generation. Critical for sizing safety thermal reserves."
              />
              <MetricDefinitionRow
                name="Weighted Absolute Percentage Error (WAPE)"
                formula="WAPE = [ Σ |Forecast - Actual| / Σ Actual ] × 100"
                value={formatPercent(metrics.wape?.value)}
                description="Normalises absolute error against total actual generation. Prevents distortion from low generation intervals (unlike MAPE, which divides by zero)."
              />
              <MetricDefinitionRow
                name="Data Sample & Coverage"
                formula="Coverage = (Matched Intervals / Total Expected) × 100"
                value={`${metrics.sampleCount} intervals (${metrics.coveragePct}%)`}
                description="Guarantees that metrics are computed strictly from genuine matched pairs without fabricating missing intervals."
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricDefinitionRow({
  name,
  formula,
  value,
  description,
  badge,
}: {
  name: string;
  formula: string;
  value: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800">{name}</span>
          {badge && <Badge variant="amber">{badge}</Badge>}
        </div>
        <code className="text-xs text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-mono block sm:inline">
          {formula}
        </code>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-base font-bold text-slate-800">{value}</span>
      </div>
    </div>
  );
}
