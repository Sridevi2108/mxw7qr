export type ISODate = string;

export type DecisionCutoff = {
  cutoffTime: string;
  daysPrior: number;
  cutoffDatetimeIso: string;
  timezone: string;
  documentation: string;
};

export type CoverageStats = {
  totalIntervals: number;
  matchedIntervals: number;
  missingForecasts: number;
  missingActuals: number;
  coveragePct: number;
};

export type MetricResult = {
  value: number | null;
  unit: string;
  description: string;
  direction?: 'over' | 'under' | 'neutral';
};

export type AccuracyMetrics = {
  mae: MetricResult | null;
  rmse: MetricResult | null;
  bias: MetricResult | null;
  wape: MetricResult | null;
  sampleCount: number;
  expectedIntervals?: number;
  coveragePct: number;
  biasSignConvention: string;
  status: string;
};

export type DeliveryPoint = {
  deliveryStart: ISODate;
  deliveryEnd: ISODate;
  forecastMW: number | null;
  actualMW: number | null;
};

export type GenerationSnapshot = {
  settlementDate: ISODate;
  settlementPeriod?: number;
  settlementPeriods?: number[];
  intervalHour?: number;
  deliveryStart: ISODate;
  deliveryEnd: ISODate;
  forecastMW: number | null;
  forecastPublishTime?: string | null;
  forecastStatus?: string;
  actualMW: number | null;
  errorMW?: number | null;
  absErrorMW?: number | null;
  pctError?: number | null;
};

export type DayAheadForecastData = {
  deliveryDate: ISODate;
  granularity: 'hourly' | 'half_hourly';
  decisionCutoff: DecisionCutoff;
  coverage: CoverageStats;
  intervals: GenerationSnapshot[];
  metrics: AccuracyMetrics;
};

export type DailyTrendPoint = {
  date: ISODate;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  wape: number | null;
  sampleCount: number;
  coveragePct: number;
};

export type AccuracyRangeData = {
  startDate: ISODate;
  endDate: ISODate;
  decisionCutoff: DecisionCutoff;
  overallMetrics: AccuracyMetrics;
  dailyTrends: DailyTrendPoint[];
};

export type ForecastSummary = {
  date: ISODate;
  totalForecastMWh: number;
  totalActualMWh: number | null;
  peakForecastMW: number;
  peakActualMW: number | null;
  peakForecastTime: ISODate;
  peakActualTime: ISODate | null;
  minForecastMW: number;
  coveragePercent: number;
  hasActuals: boolean;
};

export type DateRange = {
  start: ISODate;
  end: ISODate;
};

export type ApiResult<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }
  | { status: 'empty' };

export type PageKey = 'dashboard' | 'accuracy' | 'delivery';

export type Granularity = 'hourly' | 'half_hourly';

export type IllustrativeScenarioParams = {
  demandMW: number;
  windSharePct: number;
  otherSupplyMW: number;
  safetyMarginPct: number;
};
