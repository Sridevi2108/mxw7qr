import { useState } from 'react';
import { Download, Calendar, Info } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { useDeliveryIntervals } from '@/hooks/useGeneration';
import { formatMW, formatTime, formatDateTime, toCSV, downloadCSV } from '@/utils/metrics';
import type { Granularity } from '@/types';

const CUTOFF_PRESETS = [
  { label: '11:00 UTC (EPEX SPOT DA)', value: '11:00' },
  { label: '12:00 UTC (Nord Pool DA)', value: '12:00' },
  { label: '17:00 UTC (Evening Gate)', value: '17:00' },
  { label: '23:59 UTC (End of D-1)', value: '23:59' },
];

export function DeliveryPage() {
  const [date, setDate] = useState('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState('11:00');
  const [granularity, setGranularity] = useState<Granularity>('half_hourly');

  const genState = useDeliveryIntervals(date, cutoffTime, granularity);
  const snapshots = genState.status === 'success' ? genState.data : [];

  const isLoading = genState.status === 'loading';
  const isError = genState.status === 'error';
  const isEmpty = genState.status === 'empty';

  const handleExport = () => {
    const csv = toCSV(snapshots);
    downloadCSV(`windwise_delivery_${date}_${granularity}_cutoff_${cutoffTime.replace(':', '')}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Delivery Date (January 2026)</label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 shadow-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  min="2026-01-01"
                  max="2026-01-31"
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm font-medium text-slate-700 outline-none"
                />
              </div>
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

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Granularity</label>
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setGranularity('half_hourly')}
                  className={`rounded-md px-3 py-1 transition ${
                    granularity === 'half_hourly' ? 'bg-white font-semibold text-teal-700 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  Settlement Periods (48 SPs)
                </button>
                <button
                  type="button"
                  onClick={() => setGranularity('hourly')}
                  className={`rounded-md px-3 py-1 transition ${
                    granularity === 'hourly' ? 'bg-white font-semibold text-teal-700 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  Hourly (24 intervals)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" onClick={handleExport} disabled={snapshots.length === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV Audit
            </Button>
          </div>
        </div>
      </Card>

      {/* Interval Table */}
      <Card>
        <CardHeader
          title={`Delivery Interval Ledger — ${date}`}
          subtitle={`All intervals in UTC/GMT. Evaluated against ${cutoffTime} UTC D-1 Day-Ahead Cutoff.`}
          action={
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{snapshots.length} intervals</span>
              <span>·</span>
              <span>{snapshots.filter((s) => s.actualMW !== null && s.forecastMW !== null).length} matched</span>
            </div>
          }
        />
        {isLoading ? (
          <LoadingState label="Loading delivery interval data…" />
        ) : isError ? (
          <ErrorState message={genState.status === 'error' ? genState.message : ''} />
        ) : isEmpty ? (
          <EmptyState hint="No delivery intervals found for this date." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Interval</th>
                  <th className="px-4 py-3">Start (UTC)</th>
                  <th className="px-4 py-3">End (UTC)</th>
                  <th className="px-4 py-3 text-right">Forecast (MW)</th>
                  <th className="px-4 py-3">Published Vintage (UTC)</th>
                  <th className="px-4 py-3 text-right">Actual (MW)</th>
                  <th className="px-4 py-3 text-right">Error (MW)</th>
                  <th className="px-4 py-3 text-right">Abs Error (MW)</th>
                  <th className="px-4 py-3 text-right">Error (%)</th>
                  <th className="px-4 py-3 text-center">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {snapshots.map((r, idx) => {
                  const label = r.settlementPeriod ? `SP ${r.settlementPeriod}` : `Hour ${r.intervalHour ?? idx}`;
                  const isOver = r.errorMW !== null && r.errorMW !== undefined && r.errorMW > 0;
                  const isUnder = r.errorMW !== null && r.errorMW !== undefined && r.errorMW < 0;

                  return (
                    <tr key={idx} className="transition hover:bg-slate-50/80 font-sans">
                      <td className="px-4 py-2.5 font-bold text-slate-700">{label}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatTime(r.deliveryStart)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatTime(r.deliveryEnd)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-teal-700">
                        {r.forecastMW !== null ? formatMW(r.forecastMW) : <span className="text-amber-500 font-sans italic text-[11px]">Unpublished</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                        {r.forecastPublishTime ? formatDateTime(r.forecastPublishTime) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                        {r.actualMW !== null ? formatMW(r.actualMW) : '—'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-semibold ${
                          r.errorMW === null || r.errorMW === undefined
                            ? 'text-slate-300'
                            : isOver
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {r.errorMW !== null && r.errorMW !== undefined
                          ? `${r.errorMW > 0 ? '+' : ''}${formatMW(r.errorMW)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {r.absErrorMW !== null && r.absErrorMW !== undefined ? formatMW(r.absErrorMW) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {r.pctError !== null && r.pctError !== undefined ? `${r.pctError > 0 ? '+' : ''}${r.pctError}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.forecastMW === null ? (
                          <Badge variant="amber">Missing FC</Badge>
                        ) : r.actualMW === null ? (
                          <Badge variant="amber">Awaiting Act</Badge>
                        ) : isOver ? (
                          <Badge variant="amber">Over-forecast</Badge>
                        ) : isUnder ? (
                          <Badge variant="green">Under-forecast</Badge>
                        ) : (
                          <Badge variant="teal">Exact Match</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="px-1 text-xs text-slate-400">
        Certified settlement stream: Elexon BMRS FUELHH & WINDFOR • Timestamps in UTC/GMT
      </p>
    </div>
  );
}
