import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Search,
  CloudRain,
  Wind,
  Server,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  Clock,
  Layers,
  Store,
  Radio,
  Building
} from 'lucide-react';
import { Site, Asset, WeatherData, ConcessionCode, UnitType } from '../types';
import { fetchSiteWeather } from '../services/weather';

const ALL_CONCESSIONS: ConcessionCode[] = [
  'RIOMAIS', 'CAC', 'CAP', 'CAAN', 'SAAL', 'CAPAM', 'CAV', 'JAHU',
  'CAIZ', 'CAN', 'CAJ', 'CANF', 'SAAB', 'CAI', 'CAPY', 'SANEJ', 'CAJA'
];

interface SitesViewProps {
  sites: Site[];
  assets: Asset[];
  onOpenSiteModal: (site?: Site) => void;
  onDeleteSite: (id: string) => void;
  onNavigateToMap: (site: Site) => void;
  onNavigateToTopology: (siteId: string) => void;
  canEdit: boolean;
}

export const SitesView: React.FC<SitesViewProps> = ({
  sites,
  assets,
  onOpenSiteModal,
  onDeleteSite,
  onNavigateToMap,
  onNavigateToTopology,
  canEdit,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedConcession, setSelectedConcession] = useState<string>('all');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('all');
  const [siteWeathers, setSiteWeathers] = useState<Record<string, WeatherData>>({});

  // Count assets per site
  const assetCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      counts[a.siteId] = (counts[a.siteId] || 0) + 1;
    });
    return counts;
  }, [assets]);

  // Load weather for visible sites
  useEffect(() => {
    let isMounted = true;
    sites.forEach(async (site) => {
      try {
        const weather = await fetchSiteWeather(site.lat, site.lng, site.name);
        if (isMounted) {
          setSiteWeathers((prev) => ({ ...prev, [site.id]: weather }));
        }
      } catch {
        // ignore
      }
    });
    return () => {
      isMounted = false;
    };
  }, [sites]);

  const filteredSites = sites.filter((site) => {
    const matchSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.city.toLowerCase().includes(search.toLowerCase()) ||
      site.state.toLowerCase().includes(search.toLowerCase()) ||
      (site.concession && site.concession.toLowerCase().includes(search.toLowerCase())) ||
      site.operators.some((o) => o.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = selectedStatus === 'all' || site.status === selectedStatus;
    const matchConcession = selectedConcession === 'all' || site.concession === selectedConcession;
    const matchUnitType = selectedUnitType === 'all' || site.unitType === selectedUnitType;
    return matchSearch && matchStatus && matchConcession && matchUnitType;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            <span>Gerenciador de Localidades e Sites</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Locais físicos de rede persistidos no banco de dados com geolocalização e telemetria meteorológica.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => onOpenSiteModal()}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-cyan-950/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Nova Localidade</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou operadora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Concession filter */}
          <select
            value={selectedConcession}
            onChange={(e) => setSelectedConcession(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas Concessões ({ALL_CONCESSIONS.length})</option>
            {ALL_CONCESSIONS.map((c) => (
              <option key={c} value={c}>Concessão {c}</option>
            ))}
          </select>

          {/* Unit Type filter */}
          <select
            value={selectedUnitType}
            onChange={(e) => setSelectedUnitType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Tipos de Unidade</option>
            <option value="SEDE">🏢 SEDE (Administrativa)</option>
            <option value="LOJA">🏪 LOJA (Atendimento)</option>
            <option value="OPERACIONAL">🏭 OPERACIONAL (ETA/ETE/Torres)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Status</option>
            <option value="operational">🟢 Operacional</option>
            <option value="degraded">🟡 Degradado</option>
            <option value="critical">🔴 Falha Crítica</option>
            <option value="maintenance">🔵 Manutenção</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Exibindo <strong className="text-cyan-400">{filteredSites.length}</strong> de <strong className="text-slate-300">{sites.length}</strong> localidades
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site) => {
          const count = assetCounts[site.id] || 0;
          const weather = siteWeathers[site.id];

          const unitType = site.unitType || 'OPERACIONAL';
          const concession = site.concession || 'RIOMAIS';

          return (
            <div
              key={site.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-lg flex flex-col justify-between transition-all"
            >
              <div>
                {/* Concession & Unit Type Bar */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                      {concession}
                    </span>
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        unitType === 'OPERACIONAL'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-800/80'
                          : unitType === 'SEDE'
                          ? 'bg-purple-950/70 text-purple-300 border-purple-800/80'
                          : 'bg-blue-950/70 text-blue-300 border-blue-800/80'
                      }`}
                    >
                      {unitType === 'OPERACIONAL' && <Radio className="w-3 h-3 text-amber-400" />}
                      {unitType === 'SEDE' && <Building className="w-3 h-3 text-purple-400" />}
                      {unitType === 'LOJA' && <Store className="w-3 h-3 text-blue-400" />}
                      <span>{unitType}</span>
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      site.status === 'operational'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : site.status === 'degraded'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : site.status === 'critical'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : 'bg-sky-950 text-sky-400 border-sky-800'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                {/* Title & Location */}
                <div className="mb-2">
                  <h3 className="font-bold text-white text-sm hover:text-cyan-400 transition cursor-pointer"
                      onClick={() => onNavigateToMap(site)}>
                    {site.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{site.city}, {site.state}</span>
                  </p>
                </div>

                {/* Street address */}
                <p className="text-[11px] text-slate-400 mb-3 truncate">
                  {site.address}
                </p>

                {/* Weather Snippet */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 mb-3 flex items-center justify-between">
                  {weather ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {weather.temperature}°C • {weather.condition}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Sensação {weather.feelsLike}°C
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-400 flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{weather.windSpeed} km/h</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      Consultando meteorologia...
                    </div>
                  )}
                </div>

                {/* Telecom Alerts if present */}
                {weather?.alerts && weather.alerts.length > 0 && (
                  <div className="bg-amber-950/40 border border-amber-700/50 text-amber-200 text-[10px] p-2 rounded mb-3 flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{weather.alerts[0]}</span>
                  </div>
                )}

                {/* Operators */}
                <div className="mb-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Operadoras Conectadas
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {site.operators.map((op) => (
                      <span
                        key={op}
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                      >
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom stats and action buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    <strong className="text-white font-bold">{count}</strong> ativos
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onNavigateToMap(site)}
                    title="Visualizar no Google Maps"
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onNavigateToTopology(site.id)}
                    title="Abrir Topologia deste Site"
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  {canEdit && (
                    <>
                      <button
                        onClick={() => onOpenSiteModal(site)}
                        title="Editar Localidade"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Deseja realmente remover a localidade "${site.name}"?`)) {
                            onDeleteSite(site.id);
                          }
                        }}
                        title="Excluir Localidade"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
