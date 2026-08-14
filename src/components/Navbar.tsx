import React from 'react';
import { LayoutDashboard, FileSpreadsheet, Settings, LogOut, User as UserIcon, Cloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'dashboard' | 'entries' | 'config';
  setActiveTab: (tab: 'dashboard' | 'entries' | 'config') => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const { user, logoutUser } = useAuth();

  const handleSignOut = async () => {
    try {
      if (onLogout) {
        onLogout();
      }
      await logoutUser();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Top Header for Desktop & Mobile */}
      <header className="bg-slate-900 text-white shadow-sm sticky top-0 z-30 border-b border-slate-800 pt-safe">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-2 sm:py-2.5 gap-2">
            {/* Logo & Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <img
                src="/icons/icon_128x128.png"
                alt="Contas a Pagar"
                className="w-8 h-8 rounded-lg shadow-xs object-contain bg-slate-800 p-0.5 border border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-none truncate">
                  Contas a Pagar
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                  Gestão Financeira Integrada
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs (hidden on small mobile, visible sm+) */}
            <nav className="hidden sm:flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700/80">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'config'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurações</span>
              </button>
            </nav>

            {/* User Profile & Logout Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {user ? (
                <>
                  <div
                    className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-slate-800/80 rounded-md border border-slate-700 text-slate-300 text-xs"
                    title={`Conectado como ${user.email || 'Usuário'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {user.email ? user.email.charAt(0) : 'U'}
                    </div>
                    <span className="text-[11px] font-medium max-w-[110px] truncate text-slate-200">
                      {user.email ? user.email.split('@')[0] : 'Usuário'}
                    </span>
                    <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Voltar para a tela de Login"
                >
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* iOS & Mobile Bottom Tab Navigation Bar (fixed at screen bottom, native app feel) */}
      <nav
        aria-label="Navegação Mobile"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/90 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-3 shadow-lg"
      >
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/20 text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-blue-400' : ''}`} />
            <span className="text-[11px] leading-none">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] cursor-pointer ${
              activeTab === 'entries'
                ? 'bg-blue-600/20 text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 mb-0.5 ${activeTab === 'entries' ? 'text-blue-400' : ''}`} />
            <span className="text-[11px] leading-none">Lançamentos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] cursor-pointer ${
              activeTab === 'config'
                ? 'bg-blue-600/20 text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className={`w-5 h-5 mb-0.5 ${activeTab === 'config' ? 'text-blue-400' : ''}`} />
            <span className="text-[11px] leading-none">Ajustes</span>
          </button>
        </div>
      </nav>
    </>
  );
};

