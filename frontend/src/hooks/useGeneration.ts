import { useEffect, useState } from 'react';
import type {
  AccuracyRangeData,
  ApiResult,
  DayAheadForecastData,
  GenerationSnapshot,
  Granularity,
} from '@/types';
import { fetchAccuracyRange, fetchDayAheadForecast, fetchDeliveryIntervals } from '@/services/api';

export function useDayAheadForecast(
  date: string = '2026-01-15',
  cutoffTime: string = '11:00',
  granularity: Granularity = 'hourly'
) {
  const [state, setState] = useState<ApiResult<DayAheadForecastData>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    fetchDayAheadForecast(date, cutoffTime, granularity)
      .then((data) => {
        if (!active) return;
        setState(data.intervals.length === 0 ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((err: Error) => {
        if (!active) return;
        setState({ status: 'error', message: err.message || 'Failed to load day-ahead forecast' });
      });

    return () => {
      active = false;
    };
  }, [date, cutoffTime, granularity]);

  return state;
}

export function useAccuracyRange(
  start: string = '2026-01-01',
  end: string = '2026-01-31',
  cutoffTime: string = '11:00'
) {
  const [state, setState] = useState<ApiResult<AccuracyRangeData>>({ status: 'loading' });

  useEffect(() => {
    if (!start || !end) return;
    let active = true;
    setState({ status: 'loading' });

    fetchAccuracyRange(start, end, cutoffTime)
      .then((data) => {
        if (!active) return;
        setState(data.dailyTrends.length === 0 ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((err: Error) => {
        if (!active) return;
        setState({ status: 'error', message: err.message || 'Failed to calculate accuracy metrics' });
      });

    return () => {
      active = false;
    };
  }, [start, end, cutoffTime]);

  return state;
}

export function useDeliveryIntervals(
  date: string = '2026-01-15',
  cutoffTime: string = '11:00',
  granularity: Granularity = 'half_hourly'
) {
  const [state, setState] = useState<ApiResult<GenerationSnapshot[]>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    fetchDeliveryIntervals(date, cutoffTime, granularity)
      .then((data) => {
        if (!active) return;
        setState(data.length === 0 ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((err: Error) => {
        if (!active) return;
        setState({ status: 'error', message: err.message || 'Failed to load delivery intervals' });
      });

    return () => {
      active = false;
    };
  }, [date, cutoffTime, granularity]);

  return state;
}
