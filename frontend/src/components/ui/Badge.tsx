import type { ReactNode } from 'react';

export function Badge({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: 'neutral' | 'teal' | 'green' | 'amber' | 'red' | 'demo';
}) {
  const map: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    teal: 'bg-teal-50 text-teal-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
    demo: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${map[variant]}`}>
      {children}
    </span>
  );
}
