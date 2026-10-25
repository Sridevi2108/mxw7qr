import type {
  AccuracyMetrics,
  AccuracyRangeData,
  DailyTrendPoint,
  DayAheadForecastData,
  GenerationSnapshot,
  Granularity,
  IllustrativeScenarioParams,
} from '@/types';
import verifiedDataset from '@/data/january_2026_verified.json';
import { calcAccuracyMetrics } from '@/utils/metrics';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

let isBackendLive = false;

// Check backend connectivity once
async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET', signal: AbortSignal.timeout(1200) });
    isBackendLive = res.ok;
    return isBackendLive;
  } catch {
    isBackendLive = false;
    return false;
  }
}

checkBackendHealth();

function mapRawInterval(r: any): GenerationSnapshot {
  return {
    settlementDate: r.delivery_start ? r.delivery_start.slice(0, 10) : (r.settlementDate ?? ''),
    settlementPeriod: r.settlement_period ?? (r.settlementPeriod ?? undefined),
    settlementPeriods: r.settlement_periods ?? (r.settlementPeriods ?? undefined),
    intervalHour: r.interval_hour ?? (r.intervalHour ?? undefined),
    deliveryStart: r.delivery_start ?? r.deliveryStart,
    deliveryEnd: r.delivery_end ?? r.deliveryEnd,
    forecastMW: r.forecast_mw ?? (r.forecastMW !== undefined ? r.forecastMW : null),
    forecastPublishTime: r.forecast_publish_time ?? r.forecastPublishTime ?? null,
    forecastStatus: r.forecast_status ?? r.forecastStatus ?? 'available',
    actualMW: r.actual_mw ?? (r.actualMW !== undefined ? r.actualMW : null),
    errorMW: r.error_mw ?? (r.errorMW !== undefined ? r.errorMW : null),
    absErrorMW: r.abs_error_mw ?? (r.absErrorMW !== undefined ? r.absErrorMW : null),
    pctError: r.pct_error ?? (r.pctError !== undefined ? r.pctError : null),
  };
}

export async function fetchDayAheadForecast(
  date: string = '2026-01-15',
  cutoffTime: string = '11:00',
  granularity: Granularity = 'hourly'
): Promise<DayAheadForecastData> {
  // 1. Try remote FastAPI backend
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/forecast/day-ahead?delivery_date=${encodeURIComponent(
        date
      )}&cutoff_time=${encodeURIComponent(cutoffTime)}&granularity=${encodeURIComponent(granularity)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      isBackendLive = true;
      return {
        deliveryDate: data.delivery_date,
        granularity: data.granularity,
        decisionCutoff: {
          cutoffTime: data.decision_cutoff.cutoff_time,
          daysPrior: data.decision_cutoff.days_prior,
          cutoffDatetimeIso: data.decision_cutoff.cutoff_datetime_iso,
          timezone: data.decision_cutoff.timezone,
          documentation: data.decision_cutoff.documentation,
        },
        coverage: {
          totalIntervals: data.coverage.total_intervals,
          matchedIntervals: data.coverage.matched_intervals,
          missingForecasts: data.coverage.missing_forecasts,
          missingActuals: data.coverage.missing_actuals,
          coveragePct: data.coverage.coverage_pct,
        },
        intervals: data.intervals.map(mapRawInterval),
        metrics: {
          mae: data.metrics.mae,
          rmse: data.metrics.rmse,
          bias: data.metrics.bias,
          wape: data.metrics.wape,
          sampleCount: data.metrics.sample_count,
          expectedIntervals: data.metrics.expected_intervals,
          coveragePct: data.metrics.coverage_pct,
          biasSignConvention: data.metrics.bias_sign_convention,
          status: data.metrics.status,
        },
      };
    }
  } catch {
    isBackendLive = false;
  }

  // 2. Fallback to pre-compiled verified January 2026 dataset
  const daySummary = verifiedDataset.daily.find((d: any) => d.date === date) ?? verifiedDataset.daily[14]; // default Jan 15
  const rawIntervals = granularity === 'half_hourly' ? daySummary.settlement_periods : daySummary.hourly;
  const intervals = rawIntervals.map(mapRawInterval);
  const calculatedMetrics = calcAccuracyMetrics(intervals, granularity === 'half_hourly' ? 48 : 24);

  return {
    deliveryDate: daySummary.date,
    granularity,
    decisionCutoff: {
      cutoffTime,
      daysPrior: 1,
      cutoffDatetimeIso: `${daySummary.date}T${cutoffTime}:00Z`,
      timezone: 'UTC/GMT',
      documentation: `Evaluated with Day-Ahead decision cutoff at ${cutoffTime} UTC on Day D-1 (Verified Elexon BMRS dataset).`,
    },
    coverage: {
      totalIntervals: intervals.length,
      matchedIntervals: intervals.filter((i) => i.actualMW !== null && i.forecastMW !== null).length,
      missingForecasts: intervals.filter((i) => i.forecastMW === null).length,
      missingActuals: intervals.filter((i) => i.actualMW === null).length,
      coveragePct: Math.round(
        (intervals.filter((i) => i.actualMW !== null && i.forecastMW !== null).length / intervals.length) * 100
      ),
    },
    intervals,
    metrics: calculatedMetrics ?? {
      mae: null,
      rmse: null,
      bias: null,
      wape: null,
      sampleCount: 0,
      coveragePct: 0,
      biasSignConvention: 'Forecast - Actual (>0 Over-forecast, <0 Under-forecast)',
      status: 'insufficient_data',
    },
  };
}

export async function fetchAccuracyRange(
  start: string = '2026-01-01',
  end: string = '2026-01-31',
  cutoffTime: string = '11:00'
): Promise<AccuracyRangeData> {
  // 1. Try remote FastAPI backend
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/accuracy?start=${encodeURIComponent(start)}&end=${encodeURIComponent(
        end
      )}&cutoff_time=${encodeURIComponent(cutoffTime)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      isBackendLive = true;
      return {
        startDate: data.start_date,
        endDate: data.end_date,
        decisionCutoff: {
          cutoffTime: data.decision_cutoff.cutoff_time,
          daysPrior: data.decision_cutoff.days_prior,
          cutoffDatetimeIso: data.decision_cutoff.cutoff_datetime_iso,
          timezone: data.decision_cutoff.timezone,
          documentation: data.decision_cutoff.documentation,
        },
        overallMetrics: {
          mae: data.overall_metrics.mae,
          rmse: data.overall_metrics.rmse,
          bias: data.overall_metrics.bias,
          wape: data.overall_metrics.wape,
          sampleCount: data.overall_metrics.sample_count,
          expectedIntervals: data.overall_metrics.expected_intervals,
          coveragePct: data.overall_metrics.coverage_pct,
          biasSignConvention: data.overall_metrics.bias_sign_convention,
          status: data.overall_metrics.status,
        },
        dailyTrends: data.daily_trends.map((t: any) => ({
          date: t.date,
          mae: t.mae,
          rmse: t.rmse,
          bias: t.bias,
          wape: t.wape,
          sampleCount: t.sample_count,
          coveragePct: t.coverage_pct,
        })),
      };
    }
  } catch {
    isBackendLive = false;
  }

  // 2. Fallback to verified local January 2026 dataset
  const filteredDays = verifiedDataset.daily.filter((d: any) => d.date >= start && d.date <= end);
  const allIntervals: GenerationSnapshot[] = [];
  const dailyTrends: DailyTrendPoint[] = [];

  for (const day of filteredDays) {
    const dayIntervals = day.hourly.map(mapRawInterval);
    allIntervals.push(...dayIntervals);
    const dayMetrics = calcAccuracyMetrics(dayIntervals, 24);
    dailyTrends.push({
      date: day.date,
      mae: dayMetrics?.mae?.value ?? null,
      rmse: dayMetrics?.rmse?.value ?? null,
      bias: dayMetrics?.bias?.value ?? null,
      wape: dayMetrics?.wape?.value ?? null,
      sampleCount: dayMetrics?.sampleCount ?? 0,
      coveragePct: dayMetrics?.coveragePct ?? 0,
    });
  }

  const expectedTotal = filteredDays.length * 24;
  const overallMetrics = calcAccuracyMetrics(allIntervals, expectedTotal);

  return {
    startDate: start,
    endDate: end,
    decisionCutoff: {
      cutoffTime,
      daysPrior: 1,
      cutoffDatetimeIso: `${end}T${cutoffTime}:00Z`,
      timezone: 'UTC/GMT',
      documentation: `Evaluated with Day-Ahead decision cutoff at ${cutoffTime} UTC on Day D-1 (Verified Elexon BMRS dataset).`,
    },
    overallMetrics: overallMetrics ?? {
      mae: null,
      rmse: null,
      bias: null,
      wape: null,
      sampleCount: 0,
      coveragePct: 0,
      biasSignConvention: 'Forecast - Actual (>0 Over-forecast, <0 Under-forecast)',
      status: 'insufficient_data',
    },
    dailyTrends,
  };
}

export async function fetchDeliveryIntervals(
  date: string = '2026-01-15',
  cutoffTime: string = '11:00',
  granularity: Granularity = 'half_hourly'
): Promise<GenerationSnapshot[]> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/delivery?date=${encodeURIComponent(date)}&cutoff_time=${encodeURIComponent(
        cutoffTime
      )}&granularity=${encodeURIComponent(granularity)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      isBackendLive = true;
      return (data.intervals as any[]).map(mapRawInterval);
    }
  } catch {
    isBackendLive = false;
  }

  // Fallback to verified local dataset
  const daySummary = verifiedDataset.daily.find((d: any) => d.date === date) ?? verifiedDataset.daily[14];
  const rawIntervals = granularity === 'half_hourly' ? daySummary.settlement_periods : daySummary.hourly;
  return rawIntervals.map(mapRawInterval);
}

export function isUsingLiveBackend(): boolean {
  return isBackendLive;
}
