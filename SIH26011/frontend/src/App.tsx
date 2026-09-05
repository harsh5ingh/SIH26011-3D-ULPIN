import React from 'react';
import { GeoVistaProvider, useGeoVista } from './context/GeoVistaContext';
import { Navbar } from './components/Navbar';
import { PublicPortal } from './pages/PublicPortal';
import { OfficerPortal } from './pages/OfficerPortal';
import { ScenariosPage } from './pages/ScenariosPage';

const AppContent: React.FC = () => {
  const { currentTab, setCurrentTab } = useGeoVista();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 pb-12">
        {/* Persistent Views (Goal 2 & 6): Keep DOM and state preserved across tab switches */}
        <div style={{ display: currentTab === 'public' ? 'block' : 'none' }}>
          <PublicPortal />
        </div>
        <div style={{ display: currentTab === 'officer' ? 'block' : 'none' }}>
          <OfficerPortal />
        </div>
        <div style={{ display: currentTab === 'scenarios' ? 'block' : 'none' }}>
          <ScenariosPage />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>GeoVISTA</strong> • Smart India Hackathon 2026 Prototype (PS26011)
          </span>
          <span className="text-[11px] text-slate-400">
            Ministry of Rural Development • Department of Land Resources (DoLR)
          </span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <GeoVistaProvider>
      <AppContent />
    </GeoVistaProvider>
  );
};

export default App;
