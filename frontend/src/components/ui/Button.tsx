import type { ReactNode } from 'react';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-brand text-white hover:bg-brand-hover border border-brand shadow-sm shadow-brand/15 active:translate-y-px',
    secondary:
      'bg-white text-ink border border-line hover:bg-surface-warm hover:border-line-muted shadow-[0_1px_2px_rgba(43,42,42,0.04)]',
    ghost: 'text-ink-muted hover:bg-surface-warm hover:text-ink',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
