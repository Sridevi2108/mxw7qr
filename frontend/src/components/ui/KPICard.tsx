import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function KPICard({
  label,
  value,
  unit,
  icon,
  accent = 'teal',
  trend,
  sublabel,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  accent?: 'teal' | 'green' | 'amber' | 'slate' | 'red' | 'brand';
  trend?: { direction: 'up' | 'down' | 'flat'; text: string };
  sublabel?: string;
}) {
  const accentMap: Record<string, string> = {
    teal: 'bg-brand/10 text-brand border border-brand/20',
    brand: 'bg-brand/10 text-brand border border-brand/20',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    slate: 'bg-surface-warm text-ink-muted border border-line',
    red: 'bg-red-50 text-red-600 border border-red-200/60',
  };

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-700'
      : trend?.direction === 'down'
      ? 'text-red-600'
      : 'text-ink-subtle';

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(43,42,42,0.04)] transition hover:border-line-muted hover:shadow-[0_4px_12px_rgba(43,42,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentMap[accent]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium font-mono ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.text}
          </div>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5 font-mono">
        <span className="text-2xl font-bold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-xs font-medium text-ink-muted">{unit}</span>}
      </div>
      {sublabel && <p className="mt-2 text-xs text-ink-subtle">{sublabel}</p>}
    </div>
  );
}
