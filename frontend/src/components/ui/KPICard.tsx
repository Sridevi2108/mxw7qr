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
  accent?: 'teal' | 'green' | 'amber' | 'slate' | 'red';
  trend?: { direction: 'up' | 'down' | 'flat'; text: string };
  sublabel?: string;
}) {
  const accentMap: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-500',
    red: 'bg-red-50 text-red-600',
  };

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
      ? 'text-red-500'
      : 'text-slate-400';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentMap[accent]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.text}
          </div>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-slate-400">{unit}</span>}
      </p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}
