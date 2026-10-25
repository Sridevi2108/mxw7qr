import { useState, useEffect } from 'react';
import type { PageKey } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardPage } from '@/pages/DashboardPage';
import { AccuracyPage } from '@/pages/AccuracyPage';
import { DeliveryPage } from '@/pages/DeliveryPage';
import { isUsingLiveBackend } from '@/services/api';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [isLive, setIsLive] = useState(isUsingLiveBackend());

  useEffect(() => {
    const timer = setInterval(() => {
      setIsLive(isUsingLiveBackend());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar active={page} onSelect={setPage} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar page={page} isLiveBackend={isLive} />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'accuracy' && <AccuracyPage />}
          {page === 'delivery' && <DeliveryPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
