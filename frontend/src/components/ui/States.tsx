import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <Spinner className="h-8 w-8 text-teal-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <span className="text-2xl">!</span>
      </div>
      <p className="text-sm font-semibold text-slate-700">Something went wrong</p>
      <p className="max-w-md text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function EmptyState({ title = 'No data available', hint }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <span className="text-2xl">∅</span>
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-md text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
