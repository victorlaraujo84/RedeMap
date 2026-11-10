import React, { useEffect, useState, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import {
  Server,
  CloudRain,
  Wind,
  Droplets,
  AlertTriangle,
  Building2,
  Shield,
  Layers,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Radio,
  Store,
  Building,
  Compass,
  Gauge
} from 'lucide-react';
import { Site, Asset, NetworkLink, WeatherData, SystemSettings, ConcessionCode, UnitType } from '../types';
import { fetchMultiProviderWeather } from '../services/weatherGateway';

const ALL_CONCESSIONS: ConcessionCode[] = [
  'RIOMAIS', 'CAC', 'CAP', 'CAAN', 'SAAL', 'CAPAM', 'CAV', 'JAHU',
  'CAIZ', 'CAN', 'CAJ', 'CANF', 'SAAB', 'CAI', 'CAPY', 'SANEJ', 'CAJA'
];

interface GoogleMapsViewProps {
  sites: Site[];
  assets: Asset[];
  links: NetworkLink[];
  settings?: SystemSettings;
  onSelectSite?: (site: Site) => void;
  onOpenSiteManager?: (site?: Site) => void;
  onOpenTopologyForSite?: (siteId: string) => void;
  onSwitchToLeaflet?: () => void;
  canEdit: boolean;
}

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  sites,
  assets,
  links,
  settings,
  onSelectSite,
  onOpenSiteManager,
  onOpenTopologyForSite,
  onSwitchToLeaflet,
  canEdit,
}) => {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteWeather, setSiteWeather] = useState<Record<string, WeatherData>>({});
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [concessionFilter, setConcessionFilter] = useState<string>('all');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [showBackboneMesh, setShowBackboneMesh] = useState(true);

  // Google Maps API Key from runtime or environment
  const mapsApiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  // Listen for Google Maps quota events per governance checklist
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Fetch multi-provider weather for selected site or active sites
  useEffect(() => {
    if (!selectedSite) return;
    let isMounted = true;
    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        const data = await fetchMultiProviderWeather(selectedSite, settings);
        if (isMounted) {
          setSiteWeather((prev) => ({
            ...prev,
            [selectedSite.id]: data,
          }));
        }
      } catch (err) {
        console.error('Weather load error:', err);
      } finally {
        if (isMounted) setLoadingWeather(false);
      }
    };
    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, [selectedSite, settings]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (site.concession && site.concession.toLowerCase().includes(searchQuery.toLowerCase())) ||
        site.operators.some((op) => op.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
      const matchesConcession = concessionFilter === 'all' || site.concession === concessionFilter;
      const matchesUnitType = unitTypeFilter === 'all' || site.unitType === unitTypeFilter;
      const matchesOperator = operatorFilter === 'all' || site.operators.includes(operatorFilter);

      return matchesSearch && matchesStatus && matchesConcession && matchesUnitType && matchesOperator;
    });
  }, [sites, searchQuery, statusFilter, concessionFilter, unitTypeFilter, operatorFilter]);

  // Unique operators for filter
  const allOperators = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => s.operators.forEach((op) => set.add(op)));
    return Array.from(set);
  }, [sites]);

  // Asset counts per site
  const siteAssetCount = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      counts[a.siteId] = (counts[a.siteId] || 0) + 1;
    });
    return counts;
  }, [assets]);

  // Inter-site backbone links
  const backboneLinks = useMemo(() => {
    const siteMap: Record<string, Site> = {};
    sites.forEach((s) => {
      siteMap[s.id] = s;
    });

    return links
      .filter((l) => l.aSiteId && l.bSiteId && l.aSiteId !== l.bSiteId)
      .map((l) => ({
        link: l,
        siteA: siteMap[l.aSiteId],
        siteB: siteMap[l.bSiteId],
      }))
      .filter((item) => item.siteA && item.siteB);
  }, [links, sites]);

  const activeWeather = selectedSite ? siteWeather[selectedSite.id] : null;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Quota Exceeded Sticky Notice (Google Maps Governance Requirement) */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Filter and Action Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por localidade, cidade, operadora..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 w-56"
            />
          </div>

          {/* Concession filter */}
          <select
            value={concessionFilter}
            onChange={(e) => setConcessionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">Todas Concessões ({ALL_CONCESSIONS.length})</option>
            {ALL_CONCESSIONS.map((c) => (
              <option key={c} value={c}>Concessão {c}</option>
            ))}
          </select>

          {/* Unit Type filter */}
          <select
            value={unitTypeFilter}
            onChange={(e) => setUnitTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="SEDE">🏢 SEDE</option>
            <option value="LOJA">🏪 LOJA</option>
            <option value="OPERACIONAL">🏭 OPERACIONAL</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Status</option>
            <option value="operational">🟢 Operacional</option>
            <option value="degraded">🟡 Degradado</option>
            <option value="critical">🔴 Falha Crítica</option>
            <option value="maintenance">🔵 Manutenção</option>
          </select>

          {/* Operator filter */}
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Operadoras</option>
            {allOperators.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>

          {/* Toggle Backbone Mesh */}
          <button
            onClick={() => setShowBackboneMesh(!showBackboneMesh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
              showBackboneMesh
                ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Exibir malha de enlaces inter-site"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Malha WAN ({backboneLinks.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400 hidden lg:block">
            Exibindo <span className="font-semibold text-cyan-400">{filteredSites.length}</span> de{' '}
            {sites.length} sites
          </div>
          {onSwitchToLeaflet && (
            <button
              onClick={onSwitchToLeaflet}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              title="Alternar para OpenStreetMap / Leaflet (Livre, sem necessidade de chave de API)"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>OpenStreetMap (Livre)</span>
            </button>
          )}
          {canEdit && onOpenSiteManager && (
            <button
              onClick={() => onOpenSiteManager()}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Local</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Map Body with Side Panel */}
      <div className="flex-1 relative w-full h-[600px] min-h-[500px]">
        <APIProvider apiKey={mapsApiKey}>
          <Map
            defaultCenter={{ lat: -15.78, lng: -47.92 }}
            defaultZoom={4.5}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {/* Render AdvancedMarkers for each site */}
            {filteredSites.map((site) => {
              const count = siteAssetCount[site.id] || 0;
              const isSelected = selectedSite?.id === site.id;
              const unitType = site.unitType || 'OPERACIONAL';

              // Color based on status
              let bgColor = 'bg-emerald-500 border-emerald-300';
              let ringColor = 'ring-emerald-400/40';
              if (site.status === 'degraded') {
                bgColor = 'bg-amber-500 border-amber-300';
                ringColor = 'ring-amber-400/40';
              } else if (site.status === 'critical') {
                bgColor = 'bg-rose-600 border-rose-300';
                ringColor = 'ring-rose-500/50';
              } else if (site.status === 'maintenance') {
                bgColor = 'bg-sky-500 border-sky-300';
                ringColor = 'ring-sky-400/40';
              }

              return (
                <AdvancedMarker
                  key={site.id}
                  position={{ lat: site.lat, lng: site.lng }}
                  onClick={() => {
                    setSelectedSite(site);
                    if (onSelectSite) onSelectSite(site);
                  }}
                  title={`${site.name} [${site.concession || 'RIOMAIS'}] (${count} ativos)`}
                >
                  <div className="relative group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110">
                    {/* Glowing beacon for critical sites */}
                    {site.status === 'critical' && (
                      <div className="absolute -inset-2 rounded-full bg-rose-500 animate-ping opacity-60" />
                    )}

                    <div
                      className={`relative flex items-center justify-center min-w-8 h-8 px-2 rounded-full border-2 shadow-lg text-white font-bold text-xs ${bgColor} ${
                        isSelected ? 'ring-4 ' + ringColor : ''
                      }`}
                    >
                      {unitType === 'OPERACIONAL' && <Radio className="w-3.5 h-3.5 mr-1" />}
                      {unitType === 'SEDE' && <Building className="w-3.5 h-3.5 mr-1" />}
                      {unitType === 'LOJA' && <Store className="w-3.5 h-3.5 mr-1" />}
                      <span>{count}</span>
                    </div>

                    {/* Site Name Label Tooltip */}
                    <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-slate-200 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-700 shadow pointer-events-none flex items-center gap-1">
                      <span className="text-cyan-400 font-mono text-[9px]">{site.concession || 'RIOMAIS'}</span>
                      <span>·</span>
                      <span>{site.city}</span>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for selected site */}
            {selectedSite && (
              <InfoWindow
                position={{ lat: selectedSite.lat, lng: selectedSite.lng }}
                onCloseClick={() => setSelectedSite(null)}
              >
                <div className="text-slate-900 p-1 max-w-xs font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-2">
                    <div>
                      <span className="font-bold text-sm text-slate-900 leading-tight block">
                        {selectedSite.name}
                      </span>
                      <span className="text-[10px] text-cyan-700 font-mono font-bold">
                        {selectedSite.concession || 'RIOMAIS'} • {selectedSite.unitType || 'OPERACIONAL'}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        selectedSite.status === 'operational'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedSite.status === 'degraded'
                          ? 'bg-amber-100 text-amber-800'
                          : selectedSite.status === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {selectedSite.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-2">{selectedSite.address}</p>

                  <div className="text-xs text-slate-700 mb-2 flex items-center justify-between">
                    <span>Ativos instalados:</span>
                    <span className="font-bold text-slate-900">
                      {siteAssetCount[selectedSite.id] || 0}
                    </span>
                  </div>

                  {/* Operators */}
                  <div className="mb-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Operadoras conectadas
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedSite.operators.map((op) => (
                        <span
                          key={op}
                          className="text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-medium"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-200 flex gap-2">
                    {onOpenTopologyForSite && (
                      <button
                        onClick={() => onOpenTopologyForSite(selectedSite.id)}
                        className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-semibold py-1 px-2 rounded text-center transition"
                      >
                        Ver Topologia
                      </button>
                    )}
                    {canEdit && onOpenSiteManager && (
                      <button
                        onClick={() => onOpenSiteManager(selectedSite)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold py-1 px-2 rounded transition"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Selected Site Slide-over Drawer / Meteorology Inspector */}
        {selectedSite && (
          <div className="absolute top-3 right-3 bottom-3 w-88 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl shadow-2xl p-4 overflow-y-auto flex flex-col justify-between z-20">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        selectedSite.status === 'operational'
                          ? 'bg-emerald-400'
                          : selectedSite.status === 'degraded'
                          ? 'bg-amber-400'
                          : selectedSite.status === 'critical'
                          ? 'bg-rose-400'
                          : 'bg-sky-400'
                      }`}
                    />
                    <h3 className="font-bold text-sm text-slate-100">{selectedSite.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="font-mono text-cyan-400 font-bold">{selectedSite.concession || 'RIOMAIS'}</span>
                    <span>·</span>
                    <span className="text-slate-300">{selectedSite.unitType || 'OPERACIONAL'}</span>
                    <span>·</span>
                    <span>{selectedSite.city}, {selectedSite.state}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              {/* Meteorology Section (Multi-Provider Integration) */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                    <CloudRain className="w-4 h-4" />
                    <span>Telemetria Meteorológica</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {loadingWeather ? 'Consultando APIs...' : activeWeather?.lastUpdated}
                  </span>
                </div>

                {activeWeather ? (
                  <div className="space-y-3">
                    {/* INMET Station Info */}
                    {activeWeather.inmetStationUsed && (
                      <div className="bg-slate-900/80 border border-cyan-900/50 rounded p-2 text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5" />
                            <span>{activeWeather.inmetStationUsed}</span>
                          </span>
                          {typeof activeWeather.distanceToStationKm === 'number' && (
                            <span className="text-slate-400 font-normal">
                              {activeWeather.distanceToStationKm.toFixed(1)} km do site
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-slate-800 text-[10px]">
                          <div>
                            <span className="text-slate-400">Rajada Máx Estimada: </span>
                            <strong className="text-amber-400 font-mono">
                              {activeWeather.windGust ?? activeWeather.windSpeed} km/h
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Chuva 24h: </span>
                            <strong className="text-cyan-400 font-mono">
                              {activeWeather.precipitationAccumulated24h ?? 0} mm
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Condition summary */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {activeWeather.temperature}°C
                        </div>
                        <div className="text-xs text-slate-300">
                          {activeWeather.condition} (Sensação {activeWeather.feelsLike}°C)
                        </div>
                      </div>
                      <div className="text-right text-xs space-y-1 text-slate-300">
                        <div className="flex items-center justify-end gap-1">
                          <Wind className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{activeWeather.windSpeed} km/h</span>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Droplets className="w-3.5 h-3.5 text-blue-400" />
                          <span>{activeWeather.humidity}% umidade</span>
                        </div>
                      </div>
                    </div>

                    {/* CEMADEN Geo-Hydrological Municipal Alert */}
                    {activeWeather.activeCemadenAlert && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Alerta Municipal CEMADEN (Geo-hidrológico)</span>
                        </div>
                        <div className="text-xs bg-rose-950/60 border border-rose-600/50 text-rose-200 p-2 rounded leading-tight">
                          <div className="font-bold text-[11px] uppercase">Risco Hidrológico / Deslizamento</div>
                          <div className="text-[10px] text-rose-300 mt-0.5">{activeWeather.activeCemadenAlert}</div>
                        </div>
                      </div>
                    )}

                    {/* Meteorological Threats for Telecom Infrastructure */}
                    {activeWeather.alerts && activeWeather.alerts.length > 0 ? (
                      <div className="space-y-1.5">
                        {activeWeather.alerts.map((alert, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-1.5 text-xs bg-amber-950/60 border border-amber-600/50 text-amber-200 p-2 rounded"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="leading-tight text-[11px]">{alert}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !activeWeather.activeCemadenAlert && (
                        <div className="text-[11px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 p-1.5 rounded text-center">
                          ✓ Condições meteorológicas favoráveis no momento
                        </div>
                      )
                    )}

                    {/* 3-day forecast preview */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                        Previsão Open-Meteo (72h)
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        {activeWeather.forecast.slice(1, 4).map((f, i) => (
                          <div key={i} className="bg-slate-900/60 p-1.5 rounded border border-slate-700/50">
                            <div className="text-[10px] text-slate-400 font-bold">{f.dayName}</div>
                            <div className="text-xs font-bold text-slate-200">
                              {f.maxTemp}° / {f.minTemp}°
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">{f.condition}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-cyan-400" />
                    Carregando dados INMET & Open-Meteo...
                  </div>
                )}
              </div>

              {/* Assets in this Site */}
              <div className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2 pb-1 border-b border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>Ativos no Local</span>
                  </div>
                  <span className="text-cyan-400 font-bold">
                    {siteAssetCount[selectedSite.id] || 0}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {assets
                    .filter((a) => a.siteId === selectedSite.id)
                    .map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between text-xs bg-slate-900/60 p-1.5 rounded border border-slate-800"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{asset.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {asset.model} • {asset.mgmtIp}
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            asset.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {asset.status}
                        </span>
                      </div>
                    ))}
                  {(!siteAssetCount[selectedSite.id] || siteAssetCount[selectedSite.id] === 0) && (
                    <div className="text-xs text-slate-400 py-2 text-center">
                      Nenhum ativo cadastrado neste local ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {onOpenTopologyForSite && (
                <button
                  onClick={() => onOpenTopologyForSite(selectedSite.id)}
                  className="w-full flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 rounded-lg transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Explorar Topologia Deste Site</span>
                </button>
              )}
              {canEdit && onOpenSiteManager && (
                <button
                  onClick={() => onOpenSiteManager(selectedSite)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-1.5 rounded-lg border border-slate-700 transition"
                >
                  Editar Dados da Localidade
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
