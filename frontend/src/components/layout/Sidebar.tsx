import type { PageKey } from '@/types';
import { LayoutDashboard, Target, Clock, Wind, Activity } from 'lucide-react';

const NAV: { key: PageKey; label: string; icon: typeof LayoutDashboard; desc: string }[] = [
  { key: 'dashboard', label: 'Decision Cockpit', icon: LayoutDashboard, desc: 'Day-Ahead wind overview' },
  { key: 'accuracy', label: 'Forecast Variance', icon: Target, desc: 'Error benchmarks & bias' },
  { key: 'delivery', label: 'Delivery Ledger', icon: Clock, desc: '48-period audit trail' },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: PageKey;
  onSelect: (key: PageKey) => void;
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink-dark text-slate-300 border-r border-white/5">
      {/* Brand Header — REint style */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white shadow-md shadow-brand/20">
          <Wind className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold tracking-tight text-white">WindWise</h1>
            <span className="h-1.5 w-1.5 rounded-full bg-brand"></span>
          </div>
          <p className="text-[11px] font-medium text-slate-400">Grid Decision Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-left transition duration-150 ${
                isActive
                  ? 'bg-brand/15 text-white border border-brand/30 shadow-sm'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 transition ${
                  isActive ? 'text-brand' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {item.label}
                </p>
                <p className="truncate text-[11px] text-slate-500">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info Pill */}
      <div className="p-4 border-t border-white/5">
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
            <Activity className="h-3 w-3" />
            <span>UK Power Market</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
            Elexon BMRS Verified Datasets
          </p>
        </div>
      </div>
    </aside>
  );
}
