import { useMemo } from 'react';
import type { GenerationSnapshot } from '@/types';

export function useForecastSummary(snapshots: GenerationSnapshot[]) {
  return useMemo(() => {
    const validForecasts = snapshots.filter((s) => s.forecastMW !== null && !Number.isNaN(s.forecastMW));
    const forecastValues = validForecasts.map((s) => s.forecastMW as number);

    const validActuals = snapshots.filter((s) => s.actualMW !== null && !Number.isNaN(s.actualMW));
    const actualValues = validActuals.map((s) => s.actualMW as number);

    const totalForecastMWh = forecastValues.reduce((a, b) => a + b, 0);
    const totalActualMWh = actualValues.length > 0 ? actualValues.reduce((a, b) => a + b, 0) : null;

    let peakForecastMW = 0;
    let peakForecastTime = '';
    for (const s of validForecasts) {
      if ((s.forecastMW as number) > peakForecastMW) {
        peakForecastMW = s.forecastMW as number;
        peakForecastTime = s.deliveryStart;
      }
    }

    let peakActualMW: number | null = null;
    let peakActualTime: string | null = null;
    for (const s of validActuals) {
      if ((s.actualMW as number) > (peakActualMW ?? -Infinity)) {
        peakActualMW = s.actualMW as number;
        peakActualTime = s.deliveryStart;
      }
    }

    const minForecastMW = forecastValues.length > 0 ? Math.min(...forecastValues) : 0;
    const coveragePercent = snapshots.length > 0 ? (validActuals.length / snapshots.length) * 100 : 0;

    return {
      totalForecastMWh,
      totalActualMWh,
      peakForecastMW,
      peakForecastTime,
      peakActualMW,
      peakActualTime,
      minForecastMW,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      hasActuals: validActuals.length > 0,
      validForecastCount: validForecasts.length,
      missingForecastCount: snapshots.length - validForecasts.length,
    };
  }, [snapshots]);
}
