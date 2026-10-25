import type { AccuracyMetrics, GenerationSnapshot } from '@/types';

export function calcAccuracyMetrics(
  snapshots: GenerationSnapshot[],
  expectedIntervals?: number
): AccuracyMetrics | null {
  const paired = snapshots.filter(
    (s) => s.actualMW !== null && s.forecastMW !== null && !Number.isNaN(s.actualMW) && !Number.isNaN(s.forecastMW)
  );
  if (paired.length === 0) return null;

  let absErrorSum = 0;
  let squaredErrorSum = 0;
  let signedErrorSum = 0;
  let actualSum = 0;

  for (const s of paired) {
    const err = (s.forecastMW as number) - (s.actualMW as number);
    absErrorSum += Math.abs(err);
    squaredErrorSum += err * err;
    signedErrorSum += err;
    actualSum += s.actualMW as number;
  }

  const n = paired.length;
  const mae = absErrorSum / n;
  const rmse = Math.sqrt(squaredErrorSum / n);
  const bias = signedErrorSum / n;
  const wape = actualSum > 0 ? (absErrorSum / actualSum) * 100 : null;
  const coveragePct = expectedIntervals && expectedIntervals > 0 ? (n / expectedIntervals) * 100 : 100;

  return {
    mae: {
      value: Math.round(mae * 100) / 100,
      unit: 'MW',
      description: 'Mean Absolute Error — average magnitude of forecast deviation.',
    },
    rmse: {
      value: Math.round(rmse * 100) / 100,
      unit: 'MW',
      description: 'Root Mean Square Error — penalises large forecasting errors.',
    },
    bias: {
      value: Math.round(bias * 100) / 100,
      unit: 'MW',
      direction: bias > 0 ? 'over' : bias < 0 ? 'under' : 'neutral',
      description:
        'Mean Bias [Forecast - Actual]. Positive = systematic over-forecasting; Negative = systematic under-forecasting.',
    },
    wape: {
      value: wape !== null ? Math.round(wape * 100) / 100 : null,
      unit: '%',
      description: 'Weighted Absolute Percentage Error — total absolute error divided by total actual generation.',
    },
    sampleCount: n,
    expectedIntervals,
    coveragePct: Math.round(Math.min(100, coveragePct) * 10) / 10,
    biasSignConvention: 'Forecast - Actual (>0 Over-forecast, <0 Under-forecast)',
    status: 'valid',
  };
}

export function formatMW(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toLocaleString('en-GB', { maximumFractionDigits: digits })} MW`;
}

export function formatMWh(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toLocaleString('en-GB', { maximumFractionDigits: digits })} MWh`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toLocaleString('en-GB', { maximumFractionDigits: digits })}%`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function toCSV(rows: GenerationSnapshot[]): string {
  const header =
    'interval,delivery_start_utc,delivery_end_utc,forecast_mw,forecast_published_utc,actual_mw,error_mw,abs_error_mw,pct_error';
  const lines = rows.map((r) => {
    const intervalLabel = r.settlementPeriod ? `SP ${r.settlementPeriod}` : `Hour ${r.intervalHour ?? ''}`;
    return [
      intervalLabel,
      r.deliveryStart,
      r.deliveryEnd,
      r.forecastMW ?? '',
      r.forecastPublishTime ?? '',
      r.actualMW ?? '',
      r.errorMW ?? '',
      r.absErrorMW ?? '',
      r.pctError ?? '',
    ].join(',');
  });
  return [header, ...lines].join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
