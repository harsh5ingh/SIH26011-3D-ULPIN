import React from 'react';
import { Layers, ShieldCheck, Compass, FileText, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  currentTab: 'public' | 'officer' | 'scenarios';
  setCurrentTab: (tab: 'public' | 'officer' | 'scenarios') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top tricolor bar */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-white to-green-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('public')}>
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white shadow-md">
              <Layers className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">GeoVISTA</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">
                  SIH PS26011
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                3D ULPIN & Vertical Cadastre Mapping • MoRD / DoLR
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setCurrentTab('public')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'public'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Public Portal</span>
            </button>

            <button
              onClick={() => setCurrentTab('officer')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'officer'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Officer Portal</span>
            </button>

            <button
              onClick={() => setCurrentTab('scenarios')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'scenarios'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Demo Scenarios (8)</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
