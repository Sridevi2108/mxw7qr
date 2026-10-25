import type { PageKey } from '@/types';
import { LayoutDashboard, Target, Clock, Wind } from 'lucide-react';

const NAV: { key: PageKey; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'National wind generation overview' },
  { key: 'accuracy', label: 'Accuracy Analytics', icon: Target, desc: 'Forecast error metrics' },
  { key: 'delivery', label: 'Delivery Periods', icon: Clock, desc: 'Hourly interval explorer' },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: PageKey;
  onSelect: (key: PageKey) => void;
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
          <Wind className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">WindWise</h1>
          <p className="text-xs text-slate-500">Energy Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                isActive
                  ? 'bg-teal-500/10 text-white ring-1 ring-teal-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="truncate text-xs text-slate-500">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-500">UK Procurement</p>
        <p className="mt-0.5">BMRS / Wind Forecast</p>
      </div>
    </aside>
  );
}
