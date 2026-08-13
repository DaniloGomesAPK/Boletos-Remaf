import React, { useRef } from 'react';
import { LayoutDashboard, FileSpreadsheet, Settings, Download, Upload, RefreshCw, Trash2, Moon, Sun, FileCode2 } from 'lucide-react';
import { UserMenu } from './UserMenu';

interface NavbarProps {
  activeTab: 'dashboard' | 'entries' | 'config';
  setActiveTab: (tab: 'dashboard' | 'entries' | 'config') => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onRestoreSampleData: () => void;
  onClearAllData: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onExportJSON,
  onImportJSON,
  onExportCSV,
  onRestoreSampleData,
  onClearAllData,
  onOpenAuthModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-30 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between py-1.5 gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded text-white shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight text-white leading-none">
                    Contas a Pagar
                  </h1>
                  <span className="bg-blue-900/80 text-blue-300 text-[10px] font-mono font-semibold px-1.5 py-0.25 rounded border border-blue-700/50">
                    High Density
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Gestão Financeira Integrada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserMenu onOpenAuthModal={onOpenAuthModal} />

              {/* Dark Mode Toggle on mobile */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="md:hidden p-1.5 text-slate-300 hover:text-white rounded bg-slate-800 border border-slate-700"
                title={darkMode ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded border border-slate-700/80 w-full md:w-auto justify-center">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTab === 'config'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>
          </nav>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onImportJSON}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={onExportCSV}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded shadow-2xs transition-colors"
              title="Exportar Tabela para CSV (Excel)"
            >
              <FileCode2 className="w-3 h-3" />
              <span className="hidden sm:inline">Exportar</span> CSV
            </button>

            <button
              onClick={onExportJSON}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded transition-colors"
              title="Exportar Backup dos Dados (JSON)"
            >
              <Download className="w-3 h-3 text-blue-400" />
              <span className="hidden lg:inline">Backup</span> JSON
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded transition-colors"
              title="Importar Arquivo JSON de Backup"
            >
              <Upload className="w-3 h-3 text-purple-400" />
              <span className="hidden lg:inline">Importar</span> JSON
            </button>

            <button
              onClick={onRestoreSampleData}
              className="flex items-center gap-1 px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold rounded transition-colors"
              title="Restaurar dados de exemplo pré-definidos"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden xl:inline">Exemplo</span>
            </button>

            <button
              onClick={onClearAllData}
              className="flex items-center gap-1 px-1.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-semibold rounded transition-colors"
              title="Limpar todos os lançamentos e configurações"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden md:flex p-1 text-slate-300 hover:text-white rounded bg-slate-800 border border-slate-700 transition-colors"
              title={darkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
