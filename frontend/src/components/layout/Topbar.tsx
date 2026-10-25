import type { PageKey } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Database, CheckCircle2, Calendar } from 'lucide-react';

const TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'UK Day-Ahead Decision Cockpit',
    subtitle: 'Evaluate latest Elexon wind forecasts available at D-1 auction gate closure',
  },
  accuracy: {
    title: 'Forecast Accuracy & Error Scorecard',
    subtitle: 'Quantitative evaluation (MAE, RMSE, Mean Bias & WAPE) across January 2026',
  },
  delivery: {
    title: 'Delivery Ledger & CSV Audit',
    subtitle: 'Half-hourly and hourly settlement intervals with forecast publication timestamps',
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
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between border-b border-slate-200 bg-white/95 px-8 py-4 backdrop-blur shadow-sm">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800">{meta.title}</h2>
        <p className="text-sm text-slate-500">{meta.subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-teal-600" />
          <span>January 2026 Dataset</span>
        </div>

        {isLiveBackend ? (
          <Badge variant="green">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            FastAPI Backend Live
          </Badge>
        ) : (
          <Badge variant="teal">
            <Database className="h-3.5 w-3.5 mr-1 text-teal-600" />
            Verified Elexon BMRS Cache
          </Badge>
        )}
      </div>
    </header>
  );
}
