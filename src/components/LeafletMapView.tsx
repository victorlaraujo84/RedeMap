import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
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
  Gauge,
  CheckCircle2,
  MapPin,
  Flame,
  Globe
} from 'lucide-react';
import { Site, Asset, NetworkLink, WeatherData, SystemSettings, ConcessionCode } from '../types';
import { fetchMultiProviderWeather } from '../services/weatherGateway';

interface LeafletMapViewProps {
  sites: Site[];
  assets: Asset[];
  links: NetworkLink[];
  settings?: SystemSettings;
  onSelectSite?: (site: Site) => void;
  onOpenSiteManager?: (site?: Site) => void;
  onOpenTopologyForSite?: (siteId: string) => void;
  onSwitchToGoogleMaps?: () => void;
  canEdit: boolean;
}

type TileSourceKey = 'carto_dark' | 'osm_standard' | 'carto_light' | 'esri_satellite';

interface TileSourceConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const TILE_SOURCES: Record<TileSourceKey, TileSourceConfig> = {
  carto_dark: {
    name: 'CartoDB Dark Matter (NOC Escuro)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  osm_standard: {
    name: 'OpenStreetMap Padrão (Livre)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  carto_light: {
    name: 'CartoDB Positron (Claro)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  esri_satellite: {
    name: 'Esri World Imagery (Satélite)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
};

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  sites,
  assets,
  links,
  settings,
  onSelectSite,
  onOpenSiteManager,
  onOpenTopologyForSite,
  onSwitchToGoogleMaps,
  canEdit,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const linksLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteWeather, setSiteWeather] = useState<Record<string, WeatherData>>({});
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [concessionFilter, setConcessionFilter] = useState<string>('all');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [showBackboneMesh, setShowBackboneMesh] = useState(true);
  const [tileLayerKey, setTileLayerKey] = useState<TileSourceKey>(
    (settings?.leafletTileLayer as TileSourceKey) || 'carto_dark'
  );

  // Fetch weather when a site is selected
  useEffect(() => {
    if (!selectedSite) return;
    let isMounted = true;
    const loadWeather = async () => {
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
        console.error('Weather load error in Leaflet view:', err);
      } finally {
        if (isMounted) setLoadingWeather(false);
      }
    };
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [selectedSite, settings]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      if (concessionFilter !== 'all' && site.concession !== concessionFilter) return false;
      if (unitTypeFilter !== 'all' && (site.unitType || 'OPERACIONAL') !== unitTypeFilter) return false;
      if (statusFilter !== 'all' && site.status !== statusFilter) return false;
      if (operatorFilter !== 'all' && !(site.operators || []).includes(operatorFilter)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(query);
        const matchesCity = site.city.toLowerCase().includes(query);
        const matchesConcession = (site.concession || '').toLowerCase().includes(query);
        const matchesUnitType = (site.unitType || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesConcession && !matchesUnitType) return false;
      }
      return true;
    });
  }, [sites, concessionFilter, unitTypeFilter, statusFilter, operatorFilter, searchQuery]);

  // Available concessions & unit types for filters
  const availableConcessions = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => {
      if (s.concession) set.add(s.concession);
    });
    return Array.from(set).sort();
  }, [sites]);

  const availableUnitTypes = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => {
      set.add(s.unitType || 'OPERACIONAL');
    });
    return Array.from(set).sort();
  }, [sites]);

  const availableOperators = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => {
      (s.operators || []).forEach((op) => set.add(op));
    });
    return Array.from(set).sort();
  }, [sites]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on Southeast/Central Brazil (covering Rio, SP, MT, MS, AL, TO)
    const map = L.map(mapContainerRef.current, {
      center: [-22.5, -43.8],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    const tileCfg = TILE_SOURCES[tileLayerKey];
    const tileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom,
      subdomains: 'abcd',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const linksLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersLayer;
    linksLayerRef.current = linksLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when user switches
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileCfg = TILE_SOURCES[tileLayerKey];
    const newTileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom,
      subdomains: 'abcd',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [tileLayerKey]);

  // Render Markers and Links
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !linksLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    linksLayerRef.current.clearLayers();

    // Site lookup map
    const siteMap = new Map<string, Site>();
    sites.forEach((s) => siteMap.set(s.id, s));

    // 1. Render Backbone Links if enabled
    if (showBackboneMesh) {
      links.forEach((link) => {
        const siteA = siteMap.get(link.aSiteId);
        const siteB = siteMap.get(link.bSiteId);
        if (!siteA || !siteB) return;

        const isDown = link.status === 'down';
        const isSelectedLink =
          selectedSite && (link.aSiteId === selectedSite.id || link.bSiteId === selectedSite.id);

        const latlngs: [number, number][] = [
          [siteA.lat, siteA.lng],
          [siteB.lat, siteB.lng],
        ];

        const polyline = L.polyline(latlngs, {
          color: isDown ? '#f43f5e' : isSelectedLink ? '#38bdf8' : '#0284c7',
          weight: isSelectedLink ? 3.5 : 2,
          opacity: isSelectedLink ? 0.95 : 0.6,
          dashArray: isDown ? '6, 6' : undefined,
        });

        polyline.bindTooltip(
          `<div class="text-[11px] font-sans font-semibold text-slate-100 p-1">
            <strong>${link.aAssetName} &harr; ${link.bAssetName}</strong><br/>
            Tipo: ${link.type.toUpperCase()} | Status: <span class="${isDown ? 'text-rose-400' : 'text-emerald-400'}">${link.status.toUpperCase()}</span>
          </div>`,
          { sticky: true }
        );

        linksLayerRef.current?.addLayer(polyline);
      });
    }

    // 2. Render Site Markers
    filteredSites.forEach((site) => {
      const isSelected = selectedSite?.id === site.id;
      const statusColor =
        site.status === 'operational'
          ? '#10b981'
          : site.status === 'degraded'
          ? '#f59e0b'
          : site.status === 'critical'
          ? '#f43f5e'
          : '#8b5cf6';

      const unitBadge = site.unitType ? site.unitType.substring(0, 4) : 'OPER';

      // Custom HTML Marker Pin
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            ${
              site.status === 'critical'
                ? `<span style="position: absolute; top: -4px; width: 34px; height: 34px; border-radius: 50%; background: ${statusColor}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
                : ''
            }
            <div style="
              width: ${isSelected ? '36px' : '30px'};
              height: ${isSelected ? '36px' : '30px'};
              border-radius: 50%;
              background: #090d16;
              border: ${isSelected ? '3px solid #38bdf8' : `2px solid ${statusColor}`};
              box-shadow: 0 4px 14px rgba(0,0,0,0.8), 0 0 ${isSelected ? '16px #38bdf8' : '8px ' + statusColor};
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${statusColor};
              font-size: 11px;
              font-weight: 800;
              transition: transform 0.15s ease-in-out;
            ">
              <span style="font-size: 10px; font-family: monospace;">${site.concession || 'CAN'}</span>
            </div>
            <div style="
              margin-top: 2px;
              background: rgba(15, 23, 42, 0.9);
              border: 1px solid #334155;
              border-radius: 4px;
              padding: 1px 4px;
              font-size: 9px;
              font-weight: 600;
              color: #cbd5e1;
              white-space: nowrap;
              pointer-events: none;
            ">
              ${unitBadge}
            </div>
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 22],
      });

      const marker = L.marker([site.lat, site.lng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedSite(site);
        if (onSelectSite) onSelectSite(site);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredSites, links, selectedSite, showBackboneMesh, sites, onSelectSite]);

  // Fit bounds when filter changes
  const handleFitAllSites = () => {
    if (!mapInstanceRef.current || filteredSites.length === 0) return;
    const group = L.featureGroup(
      filteredSites.map((s) => L.marker([s.lat, s.lng]))
    );
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15));
  };

  const selectedSiteAssets = useMemo(() => {
    if (!selectedSite) return [];
    return assets.filter((a) => a.siteId === selectedSite.id);
  }, [selectedSite, assets]);

  const selectedSiteLinks = useMemo(() => {
    if (!selectedSite) return [];
    return links.filter(
      (l) => l.aSiteId === selectedSite.id || l.bSiteId === selectedSite.id
    );
  }, [selectedSite, links]);

  const currentWeather = selectedSite ? siteWeather[selectedSite.id] : null;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Filter Group */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-2xl">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar localidade ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 md:w-56"
            />
          </div>

          {/* Concession Filter */}
          <select
            value={concessionFilter}
            onChange={(e) => setConcessionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono font-bold focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Concessões ({sites.length})</option>
            {availableConcessions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Unit Type Filter */}
          <select
            value={unitTypeFilter}
            onChange={(e) => setUnitTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Tipos de Unidade (Todos)</option>
            {availableUnitTypes.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Status</option>
            <option value="operational">Operacional</option>
            <option value="degraded">Degradado</option>
            <option value="critical">Crítico</option>
            <option value="maintenance">Manutenção</option>
          </select>

          {/* Backbone Toggle */}
          <button
            type="button"
            onClick={() => setShowBackboneMesh(!showBackboneMesh)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showBackboneMesh
                ? 'bg-cyan-950/60 border-cyan-600/60 text-cyan-300'
                : 'bg-slate-950/60 border-slate-700 text-slate-400'
            }`}
            title="Exibir ou ocultar enlaces do Backbone"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Backbone ({links.length})</span>
          </button>
        </div>

        {/* Right Action & Engine Switcher Group */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 shadow-2xl">
          {/* Tile Layer Selector */}
          <select
            value={tileLayerKey}
            onChange={(e) => setTileLayerKey(e.target.value as TileSourceKey)}
            className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-cyan-300 font-medium focus:outline-none focus:border-cyan-500"
            title="Alternar camada de mapa livre"
          >
            {Object.entries(TILE_SOURCES).map(([k, cfg]) => (
              <option key={k} value={k}>
                {cfg.name}
              </option>
            ))}
          </select>

          {/* Fit All Sites */}
          <button
            type="button"
            onClick={handleFitAllSites}
            className="p-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white"
            title="Ajustar zoom para abranger todas as localidades"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Alternar para Google Maps Switcher */}
          {onSwitchToGoogleMaps && (
            <button
              type="button"
              onClick={onSwitchToGoogleMaps}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
              title="Alternar para visualização Google Maps"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Maps</span>
            </button>
          )}

          {/* Cadastrar Nova Localidade */}
          {canEdit && onOpenSiteManager && (
            <button
              type="button"
              onClick={() => onOpenSiteManager()}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Localidade</span>
            </button>
          )}
        </div>
      </div>

      {/* Alternative Engine Badge Indicator */}
      <div className="absolute top-16 left-4 z-[999] pointer-events-none">
        <div className="inline-flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 text-cyan-200 text-[11px] px-3 py-1 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            <strong>OpenStreetMap & CartoDB Dark Matter:</strong> Alternativa 100% gratuita sem chave de API e sem cotas
          </span>
        </div>
      </div>

      {/* Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Slide-in Telemetry Drawer for Selected Site */}
      {selectedSite && (
        <div className="absolute top-20 right-4 z-[1001] w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7rem)] bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-y-auto p-4 space-y-4 animate-in fade-in slide-in-from-right duration-200 text-xs">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[10px] rounded">
                  {selectedSite.concession || 'CAN'}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded font-semibold uppercase">
                  {selectedSite.unitType || 'OPERACIONAL'}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                    selectedSite.status === 'operational'
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-600/40'
                      : selectedSite.status === 'degraded'
                      ? 'bg-amber-950/70 text-amber-400 border border-amber-600/40'
                      : selectedSite.status === 'critical'
                      ? 'bg-rose-950/70 text-rose-400 border border-rose-600/40'
                      : 'bg-purple-950/70 text-purple-400 border border-purple-600/40'
                  }`}
                >
                  {selectedSite.status}
                </span>
              </div>
              <h3 className="text-slate-100 font-bold text-sm">{selectedSite.name}</h3>
              <p className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                {selectedSite.city} - {selectedSite.state}
              </p>
            </div>
            <button
              onClick={() => setSelectedSite(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              &times;
            </button>
          </div>

          {/* Coordinates & Address */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1 font-mono text-[11px]">
            <div className="text-slate-400">
              Coordenadas: <span className="text-cyan-300">{selectedSite.lat.toFixed(5)}, {selectedSite.lng.toFixed(5)}</span>
            </div>
            {selectedSite.address && (
              <div className="text-slate-400 truncate">
                Endereço: <span className="text-slate-200">{selectedSite.address}</span>
              </div>
            )}
            {selectedSite.operators && selectedSite.operators.length > 0 && (
              <div className="text-slate-400">
                Operadoras: <span className="text-slate-200">{selectedSite.operators.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Weather Telemetry Box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                Telemetria Meteorológica
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentWeather ? `${currentWeather.provider} (${currentWeather.stationName || 'NOC'})` : 'Carregando...'}
              </span>
            </div>

            {loadingWeather ? (
              <div className="flex items-center justify-center py-4 text-slate-500 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Consultando INMET & Open-Meteo...</span>
              </div>
            ) : currentWeather ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Chuva Horária / 24h</span>
                    <span className="text-cyan-300 font-bold font-mono">
                      {currentWeather.rainHourMm.toFixed(1)} mm/h
                    </span>
                    <span className="text-slate-500 text-[10px] block">
                      Acumulado: {currentWeather.rain24hMm.toFixed(1)} mm
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Rajada de Vento</span>
                    <span
                      className={`font-bold font-mono ${
                        currentWeather.windGustKmh > 50 ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {currentWeather.windGustKmh.toFixed(1)} km/h
                    </span>
                    <span className="text-slate-500 text-[10px] block">
                      Contínuo: {currentWeather.windSpeedKmh.toFixed(1)} km/h
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Temperatura</span>
                    <span className="text-slate-200 font-bold font-mono">
                      {currentWeather.temperatureC.toFixed(1)} °C
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Umidade Relativa</span>
                    <span className="text-slate-200 font-bold font-mono">
                      {currentWeather.humidityPct.toFixed(0)} %
                    </span>
                  </div>
                </div>

                {/* Weather Alert Banner if present */}
                {currentWeather.alerts && currentWeather.alerts.length > 0 && (
                  <div className="bg-rose-950/70 border border-rose-600/50 rounded-lg p-2 text-rose-200 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Alerta Ativo ({currentWeather.alerts[0].source}):</span>
                    </div>
                    <p className="text-[10px] leading-tight text-rose-300">
                      {currentWeather.alerts[0].description}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">Nenhuma telemetria climática disponível para este ponto.</p>
            )}
          </div>

          {/* Quick Metrics (Ativos & Enlaces) */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px]">Ativos Instalados</span>
              <span className="text-slate-100 font-bold text-sm font-mono">
                {selectedSiteAssets.length}
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
              <span className="text-slate-400 block text-[10px]">Enlaces Conectados</span>
              <span className="text-cyan-400 font-bold text-sm font-mono">
                {selectedSiteLinks.length}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 pt-1">
            {onOpenTopologyForSite && (
              <button
                type="button"
                onClick={() => onOpenTopologyForSite(selectedSite.id)}
                className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 transition-colors"
              >
                <Layers className="w-4 h-4" />
                <span>Visualizar Topologia de Rede deste Site</span>
              </button>
            )}

            {canEdit && onOpenSiteManager && (
              <button
                type="button"
                onClick={() => onOpenSiteManager(selectedSite)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Editar Informações desta Localidade</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Summary Pill */}
      <div className="absolute bottom-3 left-4 z-[999] pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-4 text-[11px] text-slate-300">
          <span>
            Exibindo <strong className="text-white font-mono">{filteredSites.length}</strong> de{' '}
            <strong className="text-white font-mono">{sites.length}</strong> localidades
          </span>
          <span className="text-slate-600">&bull;</span>
          <span>
            <strong className="text-cyan-400 font-mono">{links.length}</strong> enlaces WAN
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Mecanismo: OpenStreetMap / Leaflet</span>
          </span>
        </div>
      </div>
    </div>
  );
};
