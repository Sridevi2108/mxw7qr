import type { GenerationSnapshot } from '@/types';

const HOURLY_PERIODS = 24;

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildDaySnapshots(date: Date, seedOffset: number): GenerationSnapshot[] {
  const rand = seededRandom(seedOffset + date.getDate() * 1000 + (date.getMonth() + 1));
  const baseWind = 4500 + rand() * 3000;
  const snapshots: GenerationSnapshot[] = [];

  for (let period = 1; period <= HOURLY_PERIODS; period++) {
    const hour = period - 1;
    const diurnalFactor = 0.7 + 0.45 * Math.sin(((hour - 4) / 24) * Math.PI * 2);
    const noise = 1 + (rand() - 0.5) * 0.18;
    const forecastMW = Math.max(200, Math.round(baseWind * diurnalFactor * noise));

    const actualNoise = 1 + (rand() - 0.5) * 0.25 + (rand() - 0.5) * 0.08;
    const biasDrift = 1 + 0.04 * Math.sin(seedOffset / 3);
    const actualMW = Math.max(150, Math.round(forecastMW * actualNoise * biasDrift));

    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);

    const isToday = isSameDay(date, new Date());
    const now = new Date();
    const actualValue = isToday && start > now ? null : actualMW;

    snapshots.push({
      settlementDate: formatDate(date),
      settlementPeriod: period,
      deliveryStart: start.toISOString(),
      deliveryEnd: end.toISOString(),
      forecastMW,
      actualMW: actualValue,
    });
  }
  return snapshots;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

const DAY_CACHE = new Map<string, GenerationSnapshot[]>();

export function getMockSnapshotsForDate(date: string): GenerationSnapshot[] {
  if (DAY_CACHE.has(date)) return DAY_CACHE.get(date)!;
  const d = new Date(date + 'T00:00:00');
  const seedOffset = d.getFullYear();
  const snaps = buildDaySnapshots(d, seedOffset);
  DAY_CACHE.set(date, snaps);
  return snaps;
}

export function getMockSnapshotsForRange(start: string, end: string): GenerationSnapshot[] {
  const out: GenerationSnapshot[] = [];
  let cur = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  let guard = 0;
  while (cur <= endD && guard < 120) {
    out.push(...getMockSnapshotsForDate(formatDate(cur)));
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export function getMockTodaySnapshots(): GenerationSnapshot[] {
  return getMockSnapshotsForDate(formatDate(new Date()));
}

export const MOCK_LAST_UPDATED = new Date().toISOString();

export const DEMO_DISCLAIMER =
  'DEMO DATA — Mock wind generation values generated for illustration. Not real Elexon or National Grid ESO results.';
