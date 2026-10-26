import type { ReactNode } from 'react';

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: ReactNode;
  variant?: 'neutral' | 'teal' | 'green' | 'amber' | 'red' | 'brand';
  className?: string;
}) {
  const map: Record<string, string> = {
    neutral: 'bg-surface-warm text-ink-muted border border-line',
    teal: 'bg-brand/10 text-brand border border-brand/20',
    brand: 'bg-brand/10 text-brand border border-brand/25',
    green: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    red: 'bg-red-50 text-red-700 border border-red-200/80',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-medium tracking-tight ${map[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
