import React from 'react';
import { LayoutDashboard, FileSpreadsheet, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'entries' | 'config';
  setActiveTab: (tab: 'dashboard' | 'entries' | 'config') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-30 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between py-2.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <img
              src="/icons/icon_128x128.png"
              alt="Contas a Pagar"
              className="w-8 h-8 rounded-lg shadow-xs object-contain bg-slate-800 p-0.5 border border-slate-700"
            />
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">
                Contas a Pagar
              </h1>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Gestão Financeira Integrada
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('entries')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'entries'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Lançamentos</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'config'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
