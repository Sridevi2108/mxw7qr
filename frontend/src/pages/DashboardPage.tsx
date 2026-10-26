import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Zap, Gauge, TrendingUp, Clock, AlertTriangle, Info, Sliders, ShieldAlert } from 'lucide-react';
import { KPICard } from '@/components/ui/KPICard';
import { Card, CardHeader } from '@/components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useDayAheadForecast } from '@/hooks/useGeneration';
import { useForecastSummary } from '@/hooks/useForecastSummary';
import { formatMW, formatMWh, formatTime, formatPercent, formatDateTime } from '@/utils/metrics';
import type { Granularity } from '@/types';

const CUTOFF_PRESETS = [
  { label: '11:00 UTC (EPEX SPOT DA)', value: '11:00' },
  { label: '12:00 UTC (Nord Pool DA)', value: '12:00' },
  { label: '17:00 UTC (Evening Gate)', value: '17:00' },
  { label: '23:59 UTC (End of D-1)', value: '23:59' },
];

export function DashboardPage() {
  const [deliveryDate, setDeliveryDate] = useState('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState('11:00');
  const [granularity, setGranularity] = useState<Granularity>('hourly');

  // Illustrative Scenario State
  const [showScenario, setShowScenario] = useState(false);
  const [illustrativeDemand, setIllustrativeDemand] = useState(25000);
  const [contractedShare, setContractedShare] = useState(10);
  const [otherSupply, setOtherSupply] = useState(10000);
  const [safetyMargin, setSafetyMargin] = useState(5);

  const forecastResult = useDayAheadForecast(deliveryDate, cutoffTime, granularity);

  const isLoading = forecastResult.status === 'loading';
  const isError = forecastResult.status === 'error';
  const isEmpty = forecastResult.status === 'empty';

  const forecastData = forecastResult.status === 'success' ? forecastResult.data : null;
  const snapshots = forecastData ? forecastData.intervals : [];
  const summary = useForecastSummary(snapshots);

  // Latest publish timestamp found across the intervals
  const latestPublishTime = useMemo(() => {
    let latest = '';
    for (const s of snapshots) {
      if (s.forecastPublishTime && s.forecastPublishTime > latest) {
        latest = s.forecastPublishTime;
      }
    }
    return latest;
  }, [snapshots]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return snapshots.map((s) => {
      const timeLabel = formatTime(s.deliveryStart);
      const intervalLabel = s.settlementPeriod ? `SP ${s.settlementPeriod} (${timeLabel})` : timeLabel;

      // Illustrative scenario calculation
      const contractedWind = s.forecastMW !== null ? (s.forecastMW * (contractedShare / 100)) : 0;
      const totalFirmTarget = illustrativeDemand * (1 + safetyMargin / 100);
      const thermalGap = Math.max(0, Math.round(totalFirmTarget - (contractedWind + otherSupply)));

      return {
        time: intervalLabel,
        rawTime: s.deliveryStart,
        Forecast: s.forecastMW,
        Actual: s.actualMW,
        Error: s.errorMW,
        AbsError: s.absErrorMW,
        publishTime: s.forecastPublishTime,
        status: s.forecastStatus,
        // Scenario metrics
        IllustrativeThermalGap: thermalGap,
      };
    });
  }, [snapshots, illustrativeDemand, contractedShare, otherSupply, safetyMargin]);

  const peakForecast = summary.peakForecastMW;
  const metrics = forecastData ? forecastData.metrics : null;
  const missingForecastCount = snapshots.filter((s) => s.forecastMW === null).length;

  return (
    <div className="space-y-6">
      {/* Control Bar: Date Selector, Cutoff Time, Granularity */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Delivery Date (January 2026)
              </label>
              <input
                type="date"
                value={deliveryDate}
                min="2026-01-01"
                max="2026-01-31"
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium font-mono text-ink shadow-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                D-1 Decision Cutoff (UTC/GMT)
              </label>
              <select
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                {CUTOFF_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Resolution</label>
              <div className="flex rounded-lg border border-line bg-surface-warm p-0.5 text-xs font-medium text-ink-muted">
                <button
                  type="button"
                  onClick={() => setGranularity('hourly')}
                  className={`rounded-md px-3 py-1 transition ${
                    granularity === 'hourly' ? 'bg-white font-semibold text-brand shadow-sm border border-line/60' : 'hover:text-ink'
                  }`}
                >
                  Hourly (24 intervals)
                </button>
                <button
                  type="button"
                  onClick={() => setGranularity('half_hourly')}
                  className={`rounded-md px-3 py-1 transition ${
                    granularity === 'half_hourly' ? 'bg-white font-semibold text-brand shadow-sm border border-line/60' : 'hover:text-ink'
                  }`}
                >
                  Settlement Periods (48 SPs)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={showScenario ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setShowScenario(!showScenario)}
            >
              <Sliders className="h-4 w-4 mr-1.5" />
              {showScenario ? 'Hide Supply Scenario' : 'Illustrative Supply Scenario'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Gate Closure & Publication Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/[0.04] px-5 py-3 text-xs text-ink shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-brand">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            AUCTION GATE LOCK
          </div>
          <span className="text-line">|</span>
          <span className="text-ink-muted">
            Decision Cutoff: <strong className="font-mono text-ink">D-1 @ {cutoffTime} UTC</strong>
          </span>
          <span className="hidden sm:inline text-line">|</span>
          <span className="hidden sm:inline text-ink-subtle">Strict pre-gate forecast selection</span>
        </div>
        {latestPublishTime && (
          <div className="flex items-center gap-2 font-mono text-xs text-brand font-semibold">
            <span className="text-ink-muted font-sans text-[11px]">ACTIVE VINTAGE:</span>
            <span>{formatDateTime(latestPublishTime)} UTC</span>
          </div>
        )}
      </div>

      {/* Missing data warning if any */}
      {missingForecastCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Data Availability Notice:</strong> {missingForecastCount} interval(s) had no forecast published prior to the {cutoffTime} UTC cutoff.
            These intervals are left unfilled rather than silently substituting later forecasts.
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Day-Ahead Peak Forecast"
          value={formatMW(peakForecast)}
          icon={<Zap className="h-5 w-5" />}
          accent="teal"
          sublabel={summary.peakForecastTime ? `At ${formatTime(summary.peakForecastTime)} UTC` : 'Jan delivery'}
        />
        <KPICard
          label="Forecast Wind Energy"
          value={formatMWh(summary.totalForecastMWh)}
          icon={<Gauge className="h-5 w-5" />}
          accent="green"
          sublabel={`${snapshots.length} intervals for ${deliveryDate}`}
        />
        <KPICard
          label="Day Mean Error (Bias)"
          value={metrics && metrics.bias ? `${metrics.bias.value > 0 ? '+' : ''}${metrics.bias.value} MW` : '—'}
          icon={<TrendingUp className="h-5 w-5" />}
          accent={metrics && metrics.bias && metrics.bias.value > 0 ? 'amber' : 'green'}
          sublabel={
            metrics && metrics.bias
              ? metrics.bias.value > 0
                ? 'Over-forecasted (Shortfall Risk)'
                : 'Under-forecasted'
              : 'Awaiting actuals'
          }
        />
        <KPICard
          label="Matched Data Coverage"
          value={metrics ? `${metrics.coveragePct}%` : '—'}
          icon={<Clock className="h-5 w-5" />}
          accent={metrics && metrics.coveragePct >= 95 ? 'green' : 'amber'}
          sublabel={metrics ? `${metrics.sampleCount} of ${metrics.expectedIntervals ?? snapshots.length} intervals matched` : ''}
        />
      </div>

      {/* Main Chart: Forecast vs Actual Generation */}
      <Card>
        <CardHeader
          title={`Day-Ahead Wind Forecast vs Actuals — ${deliveryDate}`}
          subtitle={`National UK Wind Generation (MW) at ${cutoffTime} UTC Cutoff. Timezone: UTC/GMT.`}
          action={
            <div className="flex items-center gap-2">
              <Badge variant="brand">Day-Ahead Forecast</Badge>
              <Badge variant="neutral">Actual Generation</Badge>
              {showScenario && <Badge variant="amber">Illustrative Thermal Gap</Badge>}
            </div>
          }
        />
        <div className="px-2 py-6">
          {isLoading ? (
            <LoadingState label="Loading verified Elexon generation data…" />
          ) : isError ? (
            <ErrorState message={forecastResult.status === 'error' ? forecastResult.message : 'Unknown error'} />
          ) : isEmpty ? (
            <EmptyState hint="No generation records found for this date and cutoff." />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#148937" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#148937" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e4dd" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#5a5856', fontFamily: 'JetBrains Mono' }} interval={granularity === 'half_hourly' ? 3 : 1} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5a5856', fontFamily: 'JetBrains Mono' }}
                  label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft', fill: '#5a5856', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e6e4dd',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(43,42,42,0.08)',
                    fontFamily: 'Inter',
                  }}
                  formatter={(val, name) => [formatMW(Number(val)), name]}
                  labelFormatter={(lbl, items) => {
                    const itm = items && items[0] ? (items[0].payload as any) : null;
                    return (
                      <div className="mb-1 border-b border-line pb-1">
                        <div className="font-semibold text-ink">{lbl}</div>
                        {itm?.publishTime && (
                          <div className="text-[11px] text-brand">
                            Forecast Published: {formatDateTime(itm.publishTime)} UTC
                          </div>
                        )}
                        {itm?.AbsError !== undefined && itm.AbsError !== null && (
                          <div className="text-[11px] text-amber-700">
                            Error: {itm.Error > 0 ? `+${itm.Error}` : itm.Error} MW ({itm.Error > 0 ? 'Over-forecast' : 'Under-forecast'})
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="Forecast"
                  name="Day-Ahead Wind Forecast (MW)"
                  stroke="#148937"
                  strokeWidth={2.5}
                  fill="url(#forecastGrad)"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="Actual"
                  name="Actual Wind Generation (MW)"
                  stroke="#2b2a2a"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
                {showScenario && (
                  <Line
                    type="stepAfter"
                    dataKey="IllustrativeThermalGap"
                    name="Illustrative Thermal Procured (MW)"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Illustrative Supply Gap Scenario Section (Optional / Expandable) */}
      {showScenario && (
        <Card>
          <div className="flex items-center justify-between border-b border-line bg-surface-warm px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-4 w-4 text-brand" />
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Portfolio Dispatch & Thermal Hedging Simulation
                </h3>
                <p className="text-xs text-ink-muted">
                  Simulate net thermal dispatch requirement across portfolio wind allocations and reserve margins
                </p>
              </div>
            </div>
            <Badge variant="amber">Simulation Engine</Badge>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-semibold text-ink-muted">Illustrative Demand: <span className="font-mono text-ink font-bold">{formatMW(illustrativeDemand)}</span></label>
                <input
                  type="range"
                  min="15000"
                  max="40000"
                  step="1000"
                  value={illustrativeDemand}
                  onChange={(e) => setIllustrativeDemand(Number(e.target.value))}
                  className="mt-2 w-full accent-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted">Contracted Wind Share: <span className="font-mono text-ink font-bold">{contractedShare}%</span></label>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={contractedShare}
                  onChange={(e) => setContractedShare(Number(e.target.value))}
                  className="mt-2 w-full accent-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted">Other Base Supply: <span className="font-mono text-ink font-bold">{formatMW(otherSupply)}</span></label>
                <input
                  type="range"
                  min="5000"
                  max="20000"
                  step="500"
                  value={otherSupply}
                  onChange={(e) => setOtherSupply(Number(e.target.value))}
                  className="mt-2 w-full accent-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted">Safety Reserve Margin: <span className="font-mono text-ink font-bold">{safetyMargin}%</span></label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={safetyMargin}
                  onChange={(e) => setSafetyMargin(Number(e.target.value))}
                  className="mt-2 w-full accent-brand"
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-surface-warm border border-line p-4 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Procurement Formula:</span> Net Thermal Target ={' '}
              <code className="rounded bg-white border border-line px-1.5 py-0.5 font-mono text-ink text-[11px]">
                max(0, Demand × (1 + Reserve) - (Contracted Wind + Other Supply))
              </code>
            </div>
          </div>
        </Card>
      )}

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-ink-subtle px-1">
        <span>Verified Elexon BMRS Data (FUELHH actuals & WINDFOR forecasts). All timestamps in UTC/GMT.</span>
        <span>Resolution: {granularity === 'half_hourly' ? '30-minute settlement periods' : '1-hour intervals'}</span>
      </div>
    </div>
  );
}
