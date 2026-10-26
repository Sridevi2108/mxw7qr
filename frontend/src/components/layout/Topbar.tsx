import type { PageKey } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Database, CheckCircle2, Calendar } from 'lucide-react';

const TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Day-Ahead Decision Cockpit',
    subtitle: 'Renewable dispatch intelligence & auction gate evaluation',
  },
  accuracy: {
    title: 'Forecast Accuracy & Variance Analytics',
    subtitle: 'Systematic error monitoring & risk metrics across January 2026',
  },
  delivery: {
    title: 'Delivery Ledger & Audit Trail',
    subtitle: 'Granular settlement intervals & certified publication vintages',
  },
};

export function Topbar({
  page,
  isLiveBackend,
}: {
  page: PageKey;
  isLiveBackend: boolean;
}) {
  const meta = TITLES[page];
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between border-b border-line bg-white/90 px-8 py-3.5 backdrop-blur-md">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">{meta.title}</h2>
        <p className="text-xs text-ink-muted">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface-warm px-2.5 py-1 text-xs font-medium text-ink-muted">
          <Calendar className="h-3.5 w-3.5 text-brand" />
          <span className="font-mono">January 2026</span>
        </div>

        {isLiveBackend ? (
          <Badge variant="brand">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-brand" />
            FastAPI Live
          </Badge>
        ) : (
          <Badge variant="teal">
            <Database className="h-3.5 w-3.5 mr-1 text-brand" />
            BMRS Cache
          </Badge>
        )}
      </div>
    </header>
  );
}
