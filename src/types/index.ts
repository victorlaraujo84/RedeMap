export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  createdAt: string;
  passwordHash?: string;
}

export type ConcessionCode =
  | 'RIOMAIS'
  | 'CAC'
  | 'CAP'
  | 'CAAN'
  | 'SAAL'
  | 'CAPAM'
  | 'CAV'
  | 'JAHU'
  | 'CAIZ'
  | 'CAN'
  | 'CAJ'
  | 'CANF'
  | 'SAAB'
  | 'CAI'
  | 'CAPY'
  | 'SANEJ'
  | 'CAJA'
  | string;

export type UnitType = 'SEDE' | 'LOJA' | 'OPERACIONAL' | string;

export type SiteStatus = 'operational' | 'degraded' | 'critical' | 'maintenance';

export interface WeatherStationInfo {
  id: string;
  name: string;
  provider: 'INMET' | 'Open-Meteo' | 'CEMADEN' | 'CPTEC';
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  concession: ConcessionCode;
  unitType: UnitType;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  timezone: string;
  operators: string[];
  tags: string[];
  status: SiteStatus;
  contactName?: string;
  contactPhone?: string;
  nearestStation?: WeatherStationInfo;
  createdAt: string;
  updatedAt: string;
}

export type AssetCategory =
  | 'router'
  | 'switch'
  | 'firewall'
  | 'server'
  | 'access_point'
  | 'storage'
  | 'link'
  | 'radio_link'
  | 'olt'
  | 'dps_telecom'
  | 'other'
  | string;

export type AssetStatus = 'active' | 'maintenance' | 'missing' | 'retired' | 'unknown';

export interface Asset {
  id: string;
  name: string;
  siteId: string;
  concession?: ConcessionCode;
  unitType?: UnitType;
  category: AssetCategory;
  manufacturer: string;
  model: string;
  serial: string;
  assetTag?: string;
  mgmtIp: string;
  status: AssetStatus;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  sourceId?: string;
  missingRunsCount?: number;
  metadata: {
    operadora?: string;
    osVersion?: string;
    firmware?: string;
    rackPosition?: string;
    role?: string;
    cpuModel?: string;
    sysDescr?: string;
    circuitoId?: string;
    [key: string]: unknown;
  };
}

export interface Interface {
  id: string;
  assetId: string;
  name: string;
  ifIndex?: number;
  type: string;
  mac: string;
  mtu: number;
  speed: string;
  operStatus: 'up' | 'down';
  adminStatus: 'up' | 'down';
  description: string;
  firstSeen: string;
  lastSeen: string;
}

export type LinkType = 'physical' | 'l2' | 'l3' | 'tunnel' | 'circuit' | 'unknown';
export type DiscoveryProtocol = 'lldp' | 'cdp' | 'fdb' | 'arp' | 'route' | 'manual';

export interface NetworkLink {
  id: string;
  aAssetId: string;
  bAssetId: string;
  aAssetName: string;
  bAssetName: string;
  aInterfaceId?: string;
  bInterfaceId?: string;
  aInterfaceName?: string;
  bInterfaceName?: string;
  aSiteId: string;
  bSiteId: string;
  concession?: ConcessionCode;
  type: LinkType;
  discoveryProtocol: DiscoveryProtocol;
  confidence: number;
  status: 'up' | 'down';
  firstSeen: string;
  lastSeen: string;
  evidence: Array<{
    protocol: string;
    observedAt: string;
    confidence: number;
    details: string;
  }>;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  condition: string;
  conditionCode: number;
  precipitation: number;
  precipitationAccumulated24h?: number;
  activeCemadenAlert?: string;
  inmetStationUsed?: string;
  distanceToStationKm?: number;
  alerts: string[];
  forecast: Array<{
    date: string;
    dayName: string;
    maxTemp: number;
    minTemp: number;
    maxGustKmh?: number;
    expectedRainMm?: number;
    condition: string;
    precipitationProb: number;
  }>;
  hourlyForecast?: Array<{
    time: string;
    tempC: number;
    rainMm: number;
    gustKmh: number;
    condition: string;
  }>;
  lastUpdated: string;
}

export interface ChangeEvent {
  id: string;
  entityType: 'asset' | 'link' | 'site' | 'identity' | 'weather_alert';
  entityId: string;
  entityName: string;
  type: 'created' | 'updated' | 'missing' | 'ip_changed' | 'link_down' | 'recovered' | 'merged';
  severity: 'info' | 'warning' | 'critical';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  detectedAt: string;
  acknowledged: boolean;
  runId?: string;
  details: string;
}

export interface TopologySnapshot {
  id: string;
  createdAt: string;
  trigger: string;
  nodeCount: number;
  edgeCount: number;
  siteCount: number;
  nodes: Asset[];
  links: NetworkLink[];
}

export interface IdentityReviewItem {
  id: string;
  candidateName: string;
  matchedAssetId: string;
  matchedAssetName: string;
  candidateIp: string;
  matchedIp: string;
  candidateSerial?: string;
  matchedSerial?: string;
  score: number;
  reasons: string[];
  siteName: string;
  source: string;
  discoveredAt: string;
  status: 'pending' | 'merged' | 'rejected';
}

export interface CollectionRun {
  id: string;
  sourceName: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'warning' | 'failed';
  stats: {
    discovered: number;
    updated: number;
    missing: number;
    linksFound: number;
    errors: number;
  };
  details: string[];
}

export interface CsvImportReport {
  totalRows: number;
  createdAssets: number;
  updatedAssets: number;
  unchangedAssets: number;
  createdSites: number;
  errors: string[];
  processedAssets: Asset[];
}

// ==================== CORRELAÇÃO CLIMÁTICA HISTÓRICA E ALARMES ====================

export interface WeatherCorrelationResult {
  score: number; // 0.00 to 1.00
  classification: 'provavel' | 'possivel' | 'improvavel';
  signals: Array<{
    name: string;
    weight: number;
    triggered: boolean;
    evidence: string;
  }>;
  summaryEvidence: string;
}

export interface HistoricalAlarm {
  id: string;
  alarme: string;
  dispositivo: string;
  responsavel: string;
  horarioInicial: string;
  horarioFinal: string;
  duracaoMinutos: number;
  tipo: string;
  operadora: string;
  localidade: string;
  concession: ConcessionCode;
  unitType: UnitType;
  tipoDispositivo: string;
  geradoPorTrap: string;
  ticket: string;
  comentarios: string;
  correlation?: WeatherCorrelationResult;
}

export interface Incident {
  chave: string;
  idItem: string;
  resumo: string;
  tipoItem: string;
  status: string;
  responsavel: string;
  criado: string;
  atualizado: string;
  resolvido: string;
  motivoAlarme: string;
  concession?: ConcessionCode;
  localidade?: string;
  correlation?: WeatherCorrelationResult;
}

export interface PredictiveWeatherAlarm {
  id: string;
  siteId: string;
  siteName: string;
  concession: ConcessionCode;
  unitType: UnitType;
  severity: 'critical' | 'warning' | 'info';
  forecastWindow: string; // e.g. "Próximas 12h", "Amanhã 14:00 - 18:00"
  condition: string;
  expectedGustKmh: number;
  expectedRainMm: number;
  riskScore: number; // 0 to 100%
  triggerReasons: string[];
  recommendedMitigations: string[];
  detectedAt: string;
  status: 'active' | 'mitigated' | 'acknowledged';
}

export interface ConcessionItem {
  code: string;
  name: string;
  state: string;
  description?: string;
  active?: boolean;
}

export interface UnitTypeItem {
  code: string;
  name: string;
  description: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  icon?: string;
}

export interface CategoryItem {
  code: string;
  name: string;
  description: string;
  color?: string;
}

export interface ApiIntegrationItem {
  id: string;
  name: string;
  providerType: 'inmet' | 'open_meteo' | 'cemaden' | 'cptec' | 'google_maps' | 'weather' | 'telemetry' | 'scada' | 'itsm' | 'custom';
  baseUrl: string;
  endpointPath?: string;
  authType: 'none' | 'api_key' | 'bearer_token' | 'basic';
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
  customHeaders?: string;
  active: boolean;
  timeoutMs: number;
  pollingIntervalMin?: number;
  description: string;
  isBuiltIn?: boolean;
  lastTestedAt?: string;
  lastStatus?: 'ok' | 'error' | 'untested';
  lastLatencyMs?: number;
}

export interface SystemSettings {
  // Limiares de Alarme Meteorológico
  gustThresholdKmh: number; // Default: 60 km/h
  rainHourThresholdMm: number; // Default: 10 mm/h
  rain24hAccumulatedMm: number; // Default: 30 mm
  tempHighThresholdC: number; // Default: 35 °C
  humidityLowThresholdPct: number; // Default: 20 %

  // Pesos da Matriz de Correlação (Somam com teto de 1.0)
  weightCemadenInmetAlert: number; // Default: 0.90
  weightGust: number; // Default: 0.60
  weightRainHour: number; // Default: 0.50
  weightRain24h: number; // Default: 0.40
  weightTempHigh: number; // Default: 0.35
  weightHumidityLow: number; // Default: 0.30

  // Provedores Meteorológicos
  preferredProvider: 'INMET' | 'Open-Meteo' | 'Auto';
  enableInmet: boolean;
  enableCemaden: boolean;
  enableOpenMeteo: boolean;
  enableCptec: boolean;
  inmetApiToken?: string;
  maxInmetDistanceKm: number; // Default: 50 km

  // Concessões, Unidades e Categorias Customizáveis
  concessionsList: string[];
  concessions: ConcessionItem[];
  unitTypesList: UnitType[];
  unitTypes: UnitTypeItem[];
  categories: CategoryItem[];

  // APIs e Integrações (Configurações e Novas APIs)
  apiIntegrations: ApiIntegrationItem[];

  // Configuração do Mecanismo de Mapa (Alternativa ao Google Maps)
  defaultMapEngine?: 'leaflet' | 'google';
  leafletTileLayer?: 'carto_dark' | 'osm_standard' | 'carto_light' | 'esri_satellite';
}
