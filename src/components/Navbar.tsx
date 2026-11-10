import React from 'react';
import {
  MapPin,
  Network,
  Building2,
  Server,
  Upload,
  Zap,
  History,
  Shield,
  User as UserIcon,
  LogOut,
  Bell,
  Download,
  RotateCcw,
  Activity,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { User, ChangeEvent } from '../types';

export type ActiveTab =
  | 'map'
  | 'topology'
  | 'sites'
  | 'correlation'
  | 'predictive'
  | 'inventory'
  | 'settings'
  | 'import'
  | 'discovery'
  | 'audit';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenCsvImporter: () => void;
  siteCount: number;
  assetCount: number;
  unacknowledgedEventsCount: number;
  criticalPredictiveCount?: number;
  onResetDatabase: () => void;
  onOpenCepConverter?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenCsvImporter,
  siteCount,
  assetCount,
  unacknowledgedEventsCount,
  criticalPredictiveCount,
  onResetDatabase,
  onOpenCepConverter,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none z-30">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('map')}>
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-md shadow-cyan-900/50">
            <Network className="w-5 h-5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-base tracking-tight text-white font-sans">
                Rede<span className="text-cyan-400">Map</span>
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono px-1 rounded">
                v2.4
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide mt-0.5">
              Mapeamento Dinâmico de Ativos
            </p>
          </div>
        </div>

        {/* Global Network Health Pills */}
        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-[11px]">
          <span className="bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/60">
            <strong className="text-cyan-400">{siteCount}</strong> Sites
          </span>
          <span className="bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/60">
            <strong className="text-emerald-400">{assetCount}</strong> Ativos
          </span>
          {unacknowledgedEventsCount > 0 && (
            <span
              onClick={() => onTabChange('audit')}
              className="cursor-pointer bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/80 hover:bg-amber-900 transition flex items-center gap-1"
            >
              <Bell className="w-3 h-3 text-amber-400" />
              <span>{unacknowledgedEventsCount} alertas</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs font-semibold overflow-x-auto max-w-4xl">
        <button
          onClick={() => onTabChange('map')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'map'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Google Maps & Clima</span>
        </button>

        <button
          onClick={() => onTabChange('topology')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'topology'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Topologia</span>
        </button>

        <button
          onClick={() => onTabChange('sites')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'sites'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Localidades</span>
        </button>

        {/* Historical Weather Correlation */}
        <button
          onClick={() => onTabChange('correlation')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'correlation'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Correlação Clima</span>
        </button>

        {/* Predictive Weather Alarms (Early Warning) */}
        <button
          onClick={() => onTabChange('predictive')}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'predictive'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Alertas Preditivos</span>
          {typeof criticalPredictiveCount === 'number' && criticalPredictiveCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
              {criticalPredictiveCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('inventory')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'inventory'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Inventário</span>
        </button>

        {/* Customization & APIs */}
        <button
          onClick={() => onTabChange('settings')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'settings'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Customização & APIs</span>
        </button>

        <button
          onClick={() => onOpenCsvImporter()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap text-cyan-300 hover:text-white hover:bg-cyan-950/60 border border-cyan-800/50 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Importar CSV</span>
        </button>

        <button
          onClick={() => onTabChange('discovery')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'discovery'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Coleta</span>
        </button>

        <button
          onClick={() => onTabChange('audit')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition ${
            activeTab === 'audit'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Auditoria</span>
        </button>
      </nav>

      {/* User Section & Database Tools */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetDatabase}
          title="Resetar Banco de Dados para padrões originais"
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {currentUser ? (
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl py-1 px-2.5">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-6 h-6 rounded-full border border-slate-600 object-cover"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-white leading-none">
                {currentUser.name.split(' ')[0]}
              </div>
              <div className="text-[9px] uppercase font-bold text-cyan-400 font-mono mt-0.5">
                {currentUser.role}
              </div>
            </div>

            <button
              onClick={onOpenAuth}
              title="Trocar de Conta / Autenticação"
              className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 ml-1 rounded hover:bg-slate-700 transition"
            >
              Trocar
            </button>

            <button
              onClick={onLogout}
              title="Sair"
              className="text-slate-400 hover:text-rose-400 p-1 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Fazer Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
