import {
  Asset,
  ChangeEvent,
  CollectionRun,
  HistoricalAlarm,
  IdentityReviewItem,
  Incident,
  Interface,
  NetworkLink,
  PredictiveWeatherAlarm,
  Site,
  SystemSettings,
  TopologySnapshot,
  User,
  ConcessionItem,
  UnitTypeItem,
  CategoryItem,
  ApiIntegrationItem,
} from '../types';

const STORAGE_KEY = 'redemap_database_v3';

export const DEFAULT_CONCESSIONS = [
  'RIOMAIS',
  'CAC',
  'CAP',
  'CAAN',
  'SAAL',
  'CAPAM',
  'CAV',
  'JAHU',
  'CAIZ',
  'CAN',
  'CAJ',
  'CANF',
  'SAAB',
  'CAI',
  'CAPY',
  'SANEJ',
  'CAJA',
];

export const DEFAULT_CONCESSIONS_DETAILS: ConcessionItem[] = [
  { code: 'RIOMAIS', name: 'Águas do Rio Mais (Zona Oeste)', state: 'RJ', description: 'Concessão de saneamento da Zona Oeste do Rio de Janeiro', active: true },
  { code: 'CAC', name: 'Águas de Cuiabá', state: 'MT', description: 'Capital do Mato Grosso, abrangendo ETAs Tijucal e Ribeirão do Lipa', active: true },
  { code: 'CAP', name: 'Águas de Primavera', state: 'MT', description: 'Primavera do Leste e polos agrícolas de MT', active: true },
  { code: 'CAAN', name: 'Águas de Andradina', state: 'SP', description: 'Noroeste Paulista e bacia hidrográfica do Tietê', active: true },
  { code: 'SAAL', name: 'Saneamento Ambiental de Alagoas', state: 'AL', description: 'Maceió e região metropolitana de Alagoas', active: true },
  { code: 'CAPAM', name: 'Águas de Paranaíba', state: 'MS', description: 'Mato Grosso do Sul e divisa interestadual', active: true },
  { code: 'CAV', name: 'Águas de Votorantim', state: 'SP', description: 'Região metropolitana de Sorocaba', active: true },
  { code: 'JAHU', name: 'Águas de Jahu (Jaú)', state: 'SP', description: 'Centro-Oeste Paulista e bacia do Rio Jaú', active: true },
  { code: 'CAIZ', name: 'Águas de Ilha Solteira', state: 'SP', description: 'Complexo hidrelétrico e saneamento de Ilha Solteira', active: true },
  { code: 'CAN', name: 'Águas de Niterói', state: 'RJ', description: 'Região metropolitana e orla da Baía de Guanabara', active: true },
  { code: 'CAJ', name: 'Águas de Juturnaíba (Região dos Lagos)', state: 'RJ', description: 'Araruama, Saquarema e Silva Jardim', active: true },
  { code: 'CANF', name: 'Águas de Nova Friburgo', state: 'RJ', description: 'Região serrana do Rio de Janeiro', active: true },
  { code: 'SAAB', name: 'Saneamento Ambiental de Barra do Garças', state: 'MT', description: 'Vale do Araguaia e leste matogrossense', active: true },
  { code: 'CAI', name: 'Águas de Itaboraí', state: 'RJ', description: 'Polo leste fluminense', active: true },
  { code: 'CAPY', name: 'Águas de Piracicaba', state: 'SP', description: 'Bacia PCJ e interior de São Paulo', active: true },
  { code: 'SANEJ', name: 'Saneamento do Tocantins (Saneatins)', state: 'TO', description: 'Palmas e municípios concedidos do Tocantins', active: true },
  { code: 'CAJA', name: 'Águas de Jaguariúna', state: 'SP', description: 'Circuito das Águas Paulista e RMC', active: true },
];

export const DEFAULT_UNIT_TYPES: UnitTypeItem[] = [
  { code: 'SEDE', name: 'SEDE Administrativa', description: 'Edifícios corporativos, escritórios de gestão e diretoria', criticality: 'high', icon: 'Building' },
  { code: 'LOJA', name: 'Loja de Atendimento', description: 'Agências de atendimento presencial ao cliente e faturamento', criticality: 'medium', icon: 'Store' },
  { code: 'OPERACIONAL', name: 'Unidade Operacional (ETA / ETE / Elevatória)', description: 'Estações de Tratamento de Água e Esgoto, Elevatórias, Reservatórios e Poços', criticality: 'critical', icon: 'Radio' },
  { code: 'TORRE_RADIO', name: 'Torre de Rádio & SCADA', description: 'Estruturas de elevação e repetidoras para telemetria de rádio e automação', criticality: 'critical', icon: 'Tower' },
  { code: 'CENTRO_DIST', name: 'Centro de Distribuição & Logística', description: 'Galpões de suprimentos, frota e almoxarifado de campo', criticality: 'medium', icon: 'Layers' },
];

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { code: 'router', name: 'Roteador WAN / Borda', description: 'Roteadores de terminação MPLS, BGP, SD-WAN e VPNs IPsec', color: 'cyan' },
  { code: 'switch', name: 'Switch de Distribuição / Acesso', description: 'Switches gerenciáveis L2/L3 com VLANs industriais e PoE', color: 'blue' },
  { code: 'firewall', name: 'Firewall & Segurança Perimetral', description: 'Next-Gen Firewall com VPN concentrada e inspeção de ameaças', color: 'rose' },
  { code: 'server', name: 'Servidor Físico & Virtual', description: 'Servidores de telemetria, banco de dados SCADA e controle', color: 'emerald' },
  { code: 'radio_link', name: 'Rádio Enlace & SCADA', description: 'Antenas e modems de telemetria e rádio ponto-a-ponto', color: 'amber' },
  { code: 'olt', name: 'OLT & Rede GPON', description: 'Concentrador óptico para rede interna de telemetria e agências', color: 'purple' },
  { code: 'access_point', name: 'Access Point Wi-Fi', description: 'Pontos de acesso corporativo e mobilidade em campo', color: 'indigo' },
  { code: 'dps_telecom', name: 'DPS & Proteção Elétrica / No-Break', description: 'Dispositivos de proteção contra surtos e sistemas de no-break', color: 'orange' },
  { code: 'other', name: 'Outros Equipamentos', description: 'Equipamentos auxiliares de rede e infraestrutura', color: 'slate' },
];

export const DEFAULT_API_INTEGRATIONS: ApiIntegrationItem[] = [
  {
    id: 'api-osm-leaflet',
    name: 'OpenStreetMap & CartoDB Dark Matter (Mecanismo Alternativo)',
    providerType: 'custom',
    baseUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    endpointPath: '',
    authType: 'none',
    active: true,
    timeoutMs: 4000,
    description: 'Alternativa 100% gratuita ao Google Maps. Sem chave de API, sem custos e sem limite de requisições. Otimizado para NOC escuro.',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 38,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'api-inmet',
    name: 'INMET - Estações Oficiais (Precipitação, Vento, Umidade)',
    providerType: 'inmet',
    baseUrl: 'https://apitempo.inmet.gov.br',
    endpointPath: '/estacao/dados',
    authType: 'none',
    active: true,
    timeoutMs: 8000,
    pollingIntervalMin: 15,
    description: 'Rede oficial de estações meteorológicas automáticas e convencionais do Brasil (600+ estações).',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 142,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'api-open-meteo',
    name: 'Open-Meteo High-Resolution Forecast (Fallback Global)',
    providerType: 'open_meteo',
    baseUrl: 'https://api.open-meteo.com/v1/forecast',
    endpointPath: '',
    authType: 'none',
    active: true,
    timeoutMs: 5000,
    pollingIntervalMin: 30,
    description: 'Modelos numéricos de alta resolução por coordenada exata para previsão de chuva, rajadas e alertas.',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 89,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'api-cemaden',
    name: 'CEMADEN - Alertas Geo-Hidrológicos Municipais',
    providerType: 'cemaden',
    baseUrl: 'https://www.cemaden.gov.br',
    endpointPath: '/alertas',
    authType: 'none',
    active: true,
    timeoutMs: 7000,
    pollingIntervalMin: 10,
    description: 'Alertas de risco geo-hidrológico, alagamento, enxurrada e deslizamento para os municípios das concessões.',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 210,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'api-cptec',
    name: 'CPTEC / INPE - Previsão Meteorológica Nacional',
    providerType: 'cptec',
    baseUrl: 'http://servicos.cptec.inpe.br/XML',
    endpointPath: '/cidade/previsao.xml',
    authType: 'none',
    active: true,
    timeoutMs: 6000,
    pollingIntervalMin: 60,
    description: 'Previsões meteorológicas consolidadas e avisos especiais do INPE.',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 195,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'api-google-maps',
    name: 'Google Maps Platform (Maps JavaScript / Geocoding)',
    providerType: 'google_maps',
    baseUrl: 'https://maps.googleapis.com',
    authType: 'api_key',
    apiKey: '',
    active: true,
    timeoutMs: 5000,
    description: 'Visualização vetorial e híbrida com satélite via API Google Maps.',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 72,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'api-brasil-cep',
    name: 'BrasilAPI & ViaCEP - Conversor de CEP para Coordenadas',
    providerType: 'custom',
    baseUrl: 'https://brasilapi.com.br/api/cep/v2/',
    endpointPath: '',
    authType: 'none',
    active: true,
    timeoutMs: 4000,
    description: 'Serviço gratuito de geocodificação de CEPs brasileiros para preenchimento automático de Latitude e Longitude.',
    isBuiltIn: true,
    lastStatus: 'ok',
    lastLatencyMs: 65,
    lastTestedAt: '2026-11-10T12:00:00Z',
  },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  gustThresholdKmh: 60,
  rainHourThresholdMm: 10,
  rain24hAccumulatedMm: 30,
  tempHighThresholdC: 35,
  humidityLowThresholdPct: 20,
  weightCemadenInmetAlert: 0.9,
  weightGust: 0.6,
  weightRainHour: 0.5,
  weightRain24h: 0.4,
  weightTempHigh: 0.35,
  weightHumidityLow: 0.3,
  preferredProvider: 'Auto',
  enableInmet: true,
  enableCemaden: true,
  enableOpenMeteo: true,
  enableCptec: true,
  maxInmetDistanceKm: 50,
  concessionsList: DEFAULT_CONCESSIONS,
  concessions: DEFAULT_CONCESSIONS_DETAILS,
  unitTypesList: ['SEDE', 'LOJA', 'OPERACIONAL', 'TORRE_RADIO', 'CENTRO_DIST'],
  unitTypes: DEFAULT_UNIT_TYPES,
  categories: DEFAULT_CATEGORIES,
  apiIntegrations: DEFAULT_API_INTEGRATIONS,
  defaultMapEngine: 'leaflet',
  leafletTileLayer: 'carto_dark',
};

export interface DatabaseState {
  users: User[];
  sites: Site[];
  assets: Asset[];
  interfaces: Interface[];
  links: NetworkLink[];
  changeEvents: ChangeEvent[];
  identityReviewQueue: IdentityReviewItem[];
  snapshots: TopologySnapshot[];
  collectionRuns: CollectionRun[];
  historicalAlarms: HistoricalAlarm[];
  incidents: Incident[];
  predictiveAlarms: PredictiveWeatherAlarm[];
  settings: SystemSettings;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Carlos Mendes (Admin)',
    email: 'admin@redemap.io',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=carlos',
    createdAt: '2026-01-01T08:00:00Z',
    passwordHash: 'admin123',
  },
  {
    id: 'u-2',
    name: 'Juliana Rocha (Operações)',
    email: 'operador@redemap.io',
    role: 'operator',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=juliana',
    createdAt: '2026-01-10T09:30:00Z',
    passwordHash: 'operador123',
  },
  {
    id: 'u-3',
    name: 'Lucas Ferreira (Visualizador)',
    email: 'visitante@redemap.io',
    role: 'viewer',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=lucas',
    createdAt: '2026-02-01T14:15:00Z',
    passwordHash: 'visitante123',
  },
];

// Realistic Concession Sites for the Client
const DEFAULT_SITES: Site[] = [
  // Concessão CAN (Águas de Niterói)
  {
    id: 'site-can-sede',
    name: 'CAN - Sede Administrativa Niterói',
    slug: 'can-sede',
    concession: 'CAN',
    unitType: 'SEDE',
    address: 'Rua Coronel Gomes Machado, 118 - Centro',
    city: 'Niterói',
    state: 'RJ',
    lat: -22.8944,
    lng: -43.1231,
    timezone: 'America/Sao_Paulo',
    operators: ['Embratel', 'Vivo'],
    tags: ['CAN', 'SEDE', 'Core NOC'],
    status: 'operational',
    contactName: 'NOC Águas de Niterói',
    contactPhone: '+55 21 2613-9000',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'site-can-loja-icarai',
    name: 'CAN - Loja Atendimento Icaraí',
    slug: 'can-loja-icarai',
    concession: 'CAN',
    unitType: 'LOJA',
    address: 'Rua Gavião Peixoto, 144 - Icaraí',
    city: 'Niterói',
    state: 'RJ',
    lat: -22.9069,
    lng: -43.1114,
    timezone: 'America/Sao_Paulo',
    operators: ['Claro'],
    tags: ['CAN', 'LOJA', 'Comercial'],
    status: 'operational',
    contactName: 'Gerência Icaraí',
    contactPhone: '+55 21 2613-9020',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'site-can-eta-laranjal',
    name: 'CAN - ETA Laranjal (Operacional)',
    slug: 'can-eta-laranjal',
    concession: 'CAN',
    unitType: 'OPERACIONAL',
    address: 'Estrada do Laranjal, s/n - Laranjal',
    city: 'São Gonçalo',
    state: 'RJ',
    lat: -22.8122,
    lng: -43.0114,
    timezone: 'America/Sao_Paulo',
    operators: ['Cirion', 'Embratel'],
    tags: ['CAN', 'OPERACIONAL', 'ETA', 'SCADA Crítico'],
    status: 'operational',
    contactName: 'Supervisão ETA',
    contactPhone: '+55 21 2613-9500',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },

  // Concessão RIOMAIS (Rio+ Saneamento)
  {
    id: 'site-riomais-sede',
    name: 'RIOMAIS - Sede Campo Grande',
    slug: 'riomais-sede',
    concession: 'RIOMAIS',
    unitType: 'SEDE',
    address: 'Rua Viúva Dantas, 214 - Campo Grande',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -22.9031,
    lng: -43.5592,
    timezone: 'America/Sao_Paulo',
    operators: ['Vivo', 'Claro'],
    tags: ['RIOMAIS', 'SEDE', 'Zona Oeste'],
    status: 'operational',
    contactName: 'NOC RioMais',
    contactPhone: '+55 21 3400-1000',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'site-riomais-eta-guaratiba',
    name: 'RIOMAIS - ETA Guaratiba (Operacional)',
    slug: 'riomais-eta-guaratiba',
    concession: 'RIOMAIS',
    unitType: 'OPERACIONAL',
    address: 'Estrada da Ilha, 1500 - Guaratiba',
    city: 'Rio de Janeiro',
    state: 'RJ',
    lat: -23.0019,
    lng: -43.5819,
    timezone: 'America/Sao_Paulo',
    operators: ['Embratel'],
    tags: ['RIOMAIS', 'OPERACIONAL', 'ETA', 'Tratamento'],
    status: 'degraded',
    contactName: 'Operações Guaratiba',
    contactPhone: '+55 21 3400-1500',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },

  // Concessão CAC (Águas de Cuiabá)
  {
    id: 'site-cac-sede',
    name: 'CAC - Sede Administrativa Cuiabá',
    slug: 'cac-sede',
    concession: 'CAC',
    unitType: 'SEDE',
    address: 'Av. Archimedes Pereira Lima, 2100 - Bela Vista',
    city: 'Cuiabá',
    state: 'MT',
    lat: -15.5894,
    lng: -56.0681,
    timezone: 'America/Cuiaba',
    operators: ['Oi Soluções', 'Claro'],
    tags: ['CAC', 'SEDE', 'Centro-Oeste'],
    status: 'operational',
    contactName: 'NOC Cuiabá',
    contactPhone: '+55 65 3612-4000',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'site-cac-eta-tijucal',
    name: 'CAC - ETA Tijucal (Operacional)',
    slug: 'cac-eta-tijucal',
    concession: 'CAC',
    unitType: 'OPERACIONAL',
    address: 'Av. Espigão, s/n - Tijucal',
    city: 'Cuiabá',
    state: 'MT',
    lat: -15.6514,
    lng: -56.0319,
    timezone: 'America/Cuiaba',
    operators: ['Algar', 'Vivo'],
    tags: ['CAC', 'OPERACIONAL', 'ETA Tijucal', 'Captação'],
    status: 'operational',
    contactName: 'Planta Tijucal',
    contactPhone: '+55 65 3612-4500',
    createdAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },

  // Concessão JAHU (Águas de Jahu)
  {
    id: 'site-jahu-sede',
    name: 'JAHU - Sede Administrativa Jaú',
    slug: 'jahu-sede',
    concession: 'JAHU',
    unitType: 'SEDE',
    address: 'Rua Riachuelo, 810 - Centro',
    city: 'Jaú',
    state: 'SP',
    lat: -22.2961,
    lng: -48.5583,
    timezone: 'America/Sao_Paulo',
    operators: ['Algar', 'Vivo'],
    tags: ['JAHU', 'SEDE', 'Interior SP'],
    status: 'operational',
    contactName: 'NOC Jaú',
    contactPhone: '+55 14 3602-3000',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'site-jahu-operacional-eta',
    name: 'JAHU - ETA Rio Jaú (Operacional)',
    slug: 'jahu-operacional-eta',
    concession: 'JAHU',
    unitType: 'OPERACIONAL',
    address: 'Rodovia Comandante João Ribeiro de Barros, km 184',
    city: 'Jaú',
    state: 'SP',
    lat: -22.3114,
    lng: -48.5794,
    timezone: 'America/Sao_Paulo',
    operators: ['Vivo'],
    tags: ['JAHU', 'OPERACIONAL', 'ETA', 'Torre Rádio'],
    status: 'operational',
    contactName: 'Estação Jaú',
    contactPhone: '+55 14 3602-3200',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },

  // Concessão CANF (Águas de Nova Friburgo)
  {
    id: 'site-canf-sede',
    name: 'CANF - Sede Nova Friburgo',
    slug: 'canf-sede',
    concession: 'CANF',
    unitType: 'SEDE',
    address: 'Praça Dermeval Barbosa Moreira, 28 - Centro',
    city: 'Nova Friburgo',
    state: 'RJ',
    lat: -22.2819,
    lng: -42.5311,
    timezone: 'America/Sao_Paulo',
    operators: ['Claro', 'Embratel'],
    tags: ['CANF', 'SEDE', 'Região Serrana'],
    status: 'operational',
    contactName: 'NOC Friburgo',
    contactPhone: '+55 22 2525-8000',
    createdAt: '2026-01-12T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'site-canf-eta-debossan',
    name: 'CANF - ETA Debossan (Operacional)',
    slug: 'canf-eta-debossan',
    concession: 'CANF',
    unitType: 'OPERACIONAL',
    address: 'Estrada Mury-Debossan, km 3',
    city: 'Nova Friburgo',
    state: 'RJ',
    lat: -22.3211,
    lng: -42.5019,
    timezone: 'America/Sao_Paulo',
    operators: ['Embratel'],
    tags: ['CANF', 'OPERACIONAL', 'ETA Debossan', 'Serra'],
    status: 'operational',
    contactName: 'Planta Debossan',
    contactPhone: '+55 22 2525-8500',
    createdAt: '2026-01-12T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },

  // Concessão CAJ (Águas de Juturnaíba)
  {
    id: 'site-caj-sede',
    name: 'CAJ - Sede Araruama',
    slug: 'caj-sede',
    concession: 'CAJ',
    unitType: 'SEDE',
    address: 'Av. Amaral Peixoto, km 87 - Centro',
    city: 'Araruama',
    state: 'RJ',
    lat: -22.8711,
    lng: -42.3414,
    timezone: 'America/Sao_Paulo',
    operators: ['Vivo', 'Cirion'],
    tags: ['CAJ', 'SEDE', 'Região dos Lagos'],
    status: 'operational',
    contactName: 'NOC Juturnaíba',
    contactPhone: '+55 22 2665-9000',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
];

const DEFAULT_ASSETS: Asset[] = [
  // CAN Sede
  {
    id: 'ast-can-rt01',
    name: 'CAN-NIT-COR-01',
    siteId: 'site-can-sede',
    concession: 'CAN',
    unitType: 'SEDE',
    category: 'router',
    manufacturer: 'Cisco',
    model: 'ASR 1001-X',
    serial: 'FOC241091A',
    mgmtIp: '10.100.1.1',
    status: 'active',
    confidence: 1.0,
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Embratel', role: 'Borda Sede CAN' },
  },
  {
    id: 'ast-can-sw01',
    name: 'CAN-NIT-SW-01',
    siteId: 'site-can-sede',
    concession: 'CAN',
    unitType: 'SEDE',
    category: 'switch',
    manufacturer: 'Cisco',
    model: 'Catalyst 9300',
    serial: 'FCW240901B',
    mgmtIp: '10.100.1.10',
    status: 'active',
    confidence: 0.95,
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Vivo', role: 'Distribuição Sede' },
  },
  {
    id: 'ast-can-link-laranjal',
    name: 'LINK-CAN-LARANJAL',
    siteId: 'site-can-eta-laranjal',
    concession: 'CAN',
    unitType: 'OPERACIONAL',
    category: 'link',
    manufacturer: 'Circuito',
    model: '100 Mbps MPLS',
    serial: 'CKT-CAN-9912',
    mgmtIp: '10.100.2.1',
    status: 'active',
    confidence: 1.0,
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Cirion', circuitoId: 'CIR-NIT-ETA-01' },
  },

  // RIOMAIS
  {
    id: 'ast-rio-rt01',
    name: 'RIOMAIS-CG-COR-01',
    siteId: 'site-riomais-sede',
    concession: 'RIOMAIS',
    unitType: 'SEDE',
    category: 'router',
    manufacturer: 'Huawei',
    model: 'NetEngine AR6140',
    serial: 'HW-RIO-8819',
    mgmtIp: '10.101.1.1',
    status: 'active',
    confidence: 1.0,
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Vivo', role: 'Borda Sede RioMais' },
  },
  {
    id: 'ast-rio-link-guaratiba',
    name: 'LINK-RIOMAIS-GUARA',
    siteId: 'site-riomais-eta-guaratiba',
    concession: 'RIOMAIS',
    unitType: 'OPERACIONAL',
    category: 'link',
    manufacturer: 'Circuito',
    model: '50 Mbps Rádio Micro-ondas',
    serial: 'CKT-RIO-0182',
    mgmtIp: '10.101.3.1',
    status: 'active',
    confidence: 0.9,
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Embratel', circuitoId: 'EMB-GUA-01' },
  },

  // CAC Cuiabá
  {
    id: 'ast-cac-rt01',
    name: 'CAC-CBA-COR-01',
    siteId: 'site-cac-sede',
    concession: 'CAC',
    unitType: 'SEDE',
    category: 'router',
    manufacturer: 'Cisco',
    model: 'ASR 1002-HX',
    serial: 'FOC251099Z',
    mgmtIp: '10.102.1.1',
    status: 'active',
    confidence: 1.0,
    firstSeen: '2026-01-05T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Claro', role: 'Borda Cuiabá' },
  },
  {
    id: 'ast-cac-link-tijucal',
    name: 'LINK-CAC-TIJUCAL',
    siteId: 'site-cac-eta-tijucal',
    concession: 'CAC',
    unitType: 'OPERACIONAL',
    category: 'link',
    manufacturer: 'Circuito',
    model: '100 Mbps Óptico',
    serial: 'CKT-CAC-4410',
    mgmtIp: '10.102.2.1',
    status: 'active',
    confidence: 0.95,
    firstSeen: '2026-01-05T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Algar', circuitoId: 'ALG-TIJ-01' },
  },

  // JAHU Jaú
  {
    id: 'ast-jahu-rt01',
    name: 'JAHU-CEN-COR-01',
    siteId: 'site-jahu-sede',
    concession: 'JAHU',
    unitType: 'SEDE',
    category: 'router',
    manufacturer: 'Mikrotik',
    model: 'CCR2004-16G-2S+',
    serial: 'MKTIK-JAHU-01',
    mgmtIp: '10.103.1.1',
    status: 'active',
    confidence: 0.95,
    firstSeen: '2026-01-10T08:00:00Z',
    lastSeen: new Date().toISOString(),
    metadata: { operadora: 'Algar', role: 'Borda Jaú' },
  },
];

const DEFAULT_LINKS: NetworkLink[] = [
  {
    id: 'lnk-can-sede-laranjal',
    aAssetId: 'ast-can-rt01',
    bAssetId: 'ast-can-link-laranjal',
    aAssetName: 'CAN-NIT-COR-01',
    bAssetName: 'LINK-CAN-LARANJAL',
    aSiteId: 'site-can-sede',
    bSiteId: 'site-can-eta-laranjal',
    concession: 'CAN',
    type: 'circuit',
    discoveryProtocol: 'manual',
    confidence: 1.0,
    status: 'up',
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    evidence: [{ protocol: 'manual', observedAt: '2026-01-01T08:00:00Z', confidence: 1.0, details: 'Enlace primário Sede <-> ETA Laranjal' }],
  },
  {
    id: 'lnk-rio-sede-guara',
    aAssetId: 'ast-rio-rt01',
    bAssetId: 'ast-rio-link-guaratiba',
    aAssetName: 'RIOMAIS-CG-COR-01',
    bAssetName: 'LINK-RIOMAIS-GUARA',
    aSiteId: 'site-riomais-sede',
    bSiteId: 'site-riomais-eta-guaratiba',
    concession: 'RIOMAIS',
    type: 'circuit',
    discoveryProtocol: 'manual',
    confidence: 0.9,
    status: 'up',
    firstSeen: '2026-01-01T08:00:00Z',
    lastSeen: new Date().toISOString(),
    evidence: [{ protocol: 'manual', observedAt: '2026-01-01T08:00:00Z', confidence: 0.9, details: 'Enlace Rádio Sede <-> ETA Guaratiba' }],
  },
  {
    id: 'lnk-cac-sede-tijucal',
    aAssetId: 'ast-cac-rt01',
    bAssetId: 'ast-cac-link-tijucal',
    aAssetName: 'CAC-CBA-COR-01',
    bAssetName: 'LINK-CAC-TIJUCAL',
    aSiteId: 'site-cac-sede',
    bSiteId: 'site-cac-eta-tijucal',
    concession: 'CAC',
    type: 'circuit',
    discoveryProtocol: 'manual',
    confidence: 0.95,
    status: 'up',
    firstSeen: '2026-01-05T08:00:00Z',
    lastSeen: new Date().toISOString(),
    evidence: [{ protocol: 'manual', observedAt: '2026-01-05T08:00:00Z', confidence: 0.95, details: 'Circuito Fibra Óptica Algar' }],
  },
];

// Seed Historical Alarms matching modelo-alertas.csv schema
const DEFAULT_HISTORICAL_ALARMS: HistoricalAlarm[] = [
  {
    id: 'alarm-001',
    alarme: 'Queda de LINK-CAN-LARANJAL',
    dispositivo: 'LINK-CAN-LARANJAL',
    responsavel: 'noc-solor',
    horarioInicial: '01/10/2026 10:00:00',
    horarioFinal: '01/10/2026 11:00:00',
    duracaoMinutos: 60,
    tipo: 'LINK',
    operadora: 'Cirion',
    localidade: 'Niterói - ETA Laranjal',
    concession: 'CAN',
    unitType: 'OPERACIONAL',
    tipoDispositivo: 'Roteador',
    geradoPorTrap: 'Não',
    ticket: 'INC-1001',
    comentarios: '#JIRA:INC-1001# Queda total do link de telemetria durante vendaval e chuva forte.',
    correlation: {
      score: 0.85,
      classification: 'provavel',
      signals: [
        {
          name: 'Rajada de Vento > 60 km/h',
          weight: 0.6,
          triggered: true,
          evidence: 'Estação INMET A601 (Niterói) registrou rajada de 72.4 km/h às 09:48 (12 min antes do alarme).',
        },
        {
          name: 'Precipitação > 10 mm/h',
          weight: 0.5,
          triggered: true,
          evidence: 'Chuva torrencial de 18.2 mm/h registrada no pluviômetro local.',
        },
      ],
      summaryEvidence: 'Rajada de 72.4 km/h e precipitação de 18.2 mm/h na estação INMET Niterói a 8.2 km do site ETA Laranjal. Causa climática altamente provável.',
    },
  },
  {
    id: 'alarm-002',
    alarme: 'Interrupção Rádio Micro-ondas LINK-RIOMAIS-GUARA',
    dispositivo: 'LINK-RIOMAIS-GUARA',
    responsavel: 'noc-operacoes',
    horarioInicial: '15/10/2026 14:30:00',
    horarioFinal: '15/10/2026 16:00:00',
    duracaoMinutos: 90,
    tipo: 'LINK',
    operadora: 'Embratel',
    localidade: 'Rio de Janeiro - ETA Guaratiba',
    concession: 'RIOMAIS',
    unitType: 'OPERACIONAL',
    tipoDispositivo: 'Rádio Digital',
    geradoPorTrap: 'Sim',
    ticket: 'INC-1042',
    comentarios: 'Perda de sincronismo do enlace de rádio por desapontamento mecânico.',
    correlation: {
      score: 0.95,
      classification: 'provavel',
      signals: [
        {
          name: 'Alerta Vigente CEMADEN',
          weight: 0.9,
          triggered: true,
          evidence: 'Alerta Laranja emitido pelo CEMADEN para a Zona Oeste do Rio de Janeiro.',
        },
        {
          name: 'Rajada de Vento > 60 km/h',
          weight: 0.6,
          triggered: true,
          evidence: 'Estação INMET A636 (Vila Militar/Bangu) registrou rajadas de 68 km/h.',
        },
      ],
      summaryEvidence: 'Alerta CEMADEN ativo e rajadas de vento acima de 68 km/h provocaram atenuação severa e descalibração mecânica do enlace de rádio.',
    },
  },
  {
    id: 'alarm-003',
    alarme: 'Falha de Alimentação AC e Bateria ETE Tijucal',
    dispositivo: 'CAC-CBA-COR-01',
    responsavel: 'supervisao-eletrica',
    horarioInicial: '04/11/2026 18:15:00',
    horarioFinal: '04/11/2026 19:45:00',
    duracaoMinutos: 90,
    tipo: 'ROTEADOR',
    operadora: 'Claro',
    localidade: 'Cuiabá - ETA Tijucal',
    concession: 'CAC',
    unitType: 'OPERACIONAL',
    tipoDispositivo: 'Roteador',
    geradoPorTrap: 'Sim',
    ticket: 'INC-1088',
    comentarios: 'Queda de energia da concessionária local de energia com surto de tensão.',
    correlation: {
      score: 0.75,
      classification: 'provavel',
      signals: [
        {
          name: 'Precipitação > 10 mm/h',
          weight: 0.5,
          triggered: true,
          evidence: 'Tempestade com acumulado de 28 mm em 45 minutos registrada na estação A901.',
        },
        {
          name: 'Temperatura Crítica',
          weight: 0.35,
          triggered: true,
          evidence: 'Pico de temperatura pré-frontal de 39.2 °C no dia da ocorrência.',
        },
      ],
      summaryEvidence: 'Tempestade de verão severa com descargas atmosféricas registrada pela estação INMET Cuiabá provocou atuação de DPS e queda de energia na ETA Tijucal.',
    },
  },
];

const DEFAULT_INCIDENTS: Incident[] = [
  {
    chave: 'INC-1001',
    idItem: '10001',
    resumo: 'Queda de LINK-CAN-LARANJAL durante vendaval em Niterói',
    tipoItem: 'Incidente',
    status: 'Fechado',
    responsavel: 'Equipe Telecom Niterói',
    criado: '01/10/2026 10:05:00',
    atualizado: '01/10/2026 11:10:00',
    resolvido: '01/10/2026 11:10:00',
    motivoAlarme: 'Rompimento de fibra aérea causado por queda de árvore após rajada de 72 km/h',
    concession: 'CAN',
    localidade: 'Niterói - ETA Laranjal',
  },
  {
    chave: 'INC-1042',
    idItem: '10042',
    resumo: 'Desalinhamento de antena de rádio ETA Guaratiba',
    tipoItem: 'Incidente',
    status: 'Fechado',
    responsavel: 'Equipe de Campo RioMais',
    criado: '15/10/2026 14:35:00',
    atualizado: '15/10/2026 16:15:00',
    resolvido: '15/10/2026 16:15:00',
    motivoAlarme: 'Rajada de vento de 68 km/h deslocou suporte parabólico da torre',
    concession: 'RIOMAIS',
    localidade: 'Rio de Janeiro - ETA Guaratiba',
  },
];

function getInitialState(): DatabaseState {
  if (typeof window === 'undefined') {
    return {
      users: DEFAULT_USERS,
      sites: DEFAULT_SITES,
      assets: DEFAULT_ASSETS,
      interfaces: [],
      links: DEFAULT_LINKS,
      changeEvents: [],
      identityReviewQueue: [],
      snapshots: [],
      collectionRuns: [],
      historicalAlarms: DEFAULT_HISTORICAL_ALARMS,
      incidents: DEFAULT_INCIDENTS,
      predictiveAlarms: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sites) && parsed.sites.length > 0) {
        return {
          ...parsed,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
            concessions:
              parsed.settings?.concessions && parsed.settings.concessions.length > 0
                ? parsed.settings.concessions
                : DEFAULT_CONCESSIONS_DETAILS,
            concessionsList:
              parsed.settings?.concessionsList && parsed.settings.concessionsList.length > 0
                ? parsed.settings.concessionsList
                : DEFAULT_CONCESSIONS,
            unitTypes:
              parsed.settings?.unitTypes && parsed.settings.unitTypes.length > 0
                ? parsed.settings.unitTypes
                : DEFAULT_UNIT_TYPES,
            unitTypesList:
              parsed.settings?.unitTypesList && parsed.settings.unitTypesList.length > 0
                ? parsed.settings.unitTypesList
                : DEFAULT_SETTINGS.unitTypesList,
            categories:
              parsed.settings?.categories && parsed.settings.categories.length > 0
                ? parsed.settings.categories
                : DEFAULT_CATEGORIES,
            apiIntegrations:
              parsed.settings?.apiIntegrations && parsed.settings.apiIntegrations.length > 0
                ? parsed.settings.apiIntegrations
                : DEFAULT_API_INTEGRATIONS,
            defaultMapEngine: parsed.settings?.defaultMapEngine || 'leaflet',
            leafletTileLayer: parsed.settings?.leafletTileLayer || 'carto_dark',
          },
          historicalAlarms: parsed.historicalAlarms || DEFAULT_HISTORICAL_ALARMS,
          incidents: parsed.incidents || DEFAULT_INCIDENTS,
          predictiveAlarms: parsed.predictiveAlarms || [],
        };
      }
    }
  } catch (err) {
    console.error('Failed to parse database from localStorage:', err);
  }

  const initial: DatabaseState = {
    users: DEFAULT_USERS,
    sites: DEFAULT_SITES,
    assets: DEFAULT_ASSETS,
    interfaces: [],
    links: DEFAULT_LINKS,
    changeEvents: [
      {
        id: 'evt-init-01',
        entityType: 'weather_alert',
        entityId: 'alert-cemaden-niteroi',
        entityName: 'Alerta CEMADEN Niterói (CAN)',
        type: 'created',
        severity: 'warning',
        before: null,
        after: { nivel: 'Laranja', municipio: 'Niterói' },
        detectedAt: new Date().toISOString(),
        acknowledged: false,
        details: 'Alerta Laranja emitido pelo CEMADEN para Niterói. Monitorando unidades operacionais da concessão CAN.',
      },
    ],
    identityReviewQueue: [],
    snapshots: [
      {
        id: 'snp-init-2026',
        createdAt: '2026-01-01T00:00:00Z',
        trigger: 'Snapshot Inicial das Concessões',
        nodeCount: DEFAULT_ASSETS.length,
        edgeCount: DEFAULT_LINKS.length,
        siteCount: DEFAULT_SITES.length,
        nodes: DEFAULT_ASSETS,
        links: DEFAULT_LINKS,
      },
    ],
    collectionRuns: [],
    historicalAlarms: DEFAULT_HISTORICAL_ALARMS,
    incidents: DEFAULT_INCIDENTS,
    predictiveAlarms: [],
    settings: DEFAULT_SETTINGS,
  };

  saveState(initial);
  return initial;
}

function saveState(state: DatabaseState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
  }
}

let db = getInitialState();

export const DatabaseService = {
  getState(): DatabaseState {
    return db;
  },

  resetToDefaults(): DatabaseState {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    db = getInitialState();
    return db;
  },

  // SETTINGS & CUSTOMIZATION
  getSettings(): SystemSettings {
    return db.settings || DEFAULT_SETTINGS;
  },

  saveSettings(newSettings: Partial<SystemSettings>): SystemSettings {
    db.settings = {
      ...db.settings,
      ...newSettings,
    };
    saveState(db);
    return db.settings;
  },

  // USERS
  getUsers(): User[] {
    return db.users;
  },

  findUserByEmail(email: string): User | undefined {
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  addUser(user: User): User {
    db.users.push(user);
    saveState(db);
    return user;
  },

  // SITES
  getSites(): Site[] {
    return db.sites;
  },

  getSiteById(id: string): Site | undefined {
    return db.sites.find((s) => s.id === id);
  },

  saveSite(site: Partial<Site> & { name: string; city: string; state: string }): Site {
    const existingIndex = site.id ? db.sites.findIndex((s) => s.id === site.id) : -1;
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = db.sites[existingIndex];
      const updated: Site = {
        ...existing,
        ...site,
        updatedAt: now,
      };
      db.sites[existingIndex] = updated;
      saveState(db);
      return updated;
    } else {
      const id = site.id || `site-${Date.now()}`;
      const slug = site.slug || site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newSite: Site = {
        id,
        name: site.name,
        slug,
        concession: site.concession || 'CAN',
        unitType: site.unitType || 'OPERACIONAL',
        address: site.address || `${site.city}, ${site.state}`,
        city: site.city,
        state: site.state,
        lat: site.lat ?? -22.9056,
        lng: site.lng ?? -43.1311,
        timezone: site.timezone || 'America/Sao_Paulo',
        operators: site.operators || ['Embratel', 'Vivo'],
        tags: site.tags || [site.concession || 'CAN', site.unitType || 'OPERACIONAL'],
        status: site.status || 'operational',
        contactName: site.contactName || '',
        contactPhone: site.contactPhone || '',
        createdAt: now,
        updatedAt: now,
      };

      db.sites.push(newSite);
      saveState(db);
      return newSite;
    }
  },

  deleteSite(id: string): boolean {
    const existing = db.sites.find((s) => s.id === id);
    if (!existing) return false;
    db.sites = db.sites.filter((s) => s.id !== id);
    saveState(db);
    return true;
  },

  // ASSETS
  getAssets(): Asset[] {
    return db.assets;
  },

  saveAsset(asset: Partial<Asset> & { name: string; siteId: string; category: Asset['category'] }): Asset {
    const existingIndex = asset.id ? db.assets.findIndex((a) => a.id === asset.id) : -1;
    const now = new Date().toISOString();
    const site = db.sites.find((s) => s.id === asset.siteId);

    if (existingIndex >= 0) {
      const existing = db.assets[existingIndex];
      const updated: Asset = {
        ...existing,
        ...asset,
        concession: asset.concession || site?.concession || existing.concession,
        unitType: asset.unitType || site?.unitType || existing.unitType,
        lastSeen: now,
      };
      db.assets[existingIndex] = updated;
      saveState(db);
      return updated;
    } else {
      const id = asset.id || `ast-${Date.now()}`;
      const newAsset: Asset = {
        id,
        name: asset.name,
        siteId: asset.siteId,
        concession: asset.concession || site?.concession || 'CAN',
        unitType: asset.unitType || site?.unitType || 'OPERACIONAL',
        category: asset.category,
        manufacturer: asset.manufacturer || 'Cisco',
        model: asset.model || 'ASR 1000',
        serial: asset.serial || `SER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        mgmtIp: asset.mgmtIp || '10.100.1.1',
        status: asset.status || 'active',
        confidence: asset.confidence ?? 1.0,
        firstSeen: now,
        lastSeen: now,
        metadata: asset.metadata || {},
      };
      db.assets.push(newAsset);
      saveState(db);
      return newAsset;
    }
  },

  deleteAsset(id: string): boolean {
    db.assets = db.assets.filter((a) => a.id !== id);
    db.links = db.links.filter((l) => l.aAssetId !== id && l.bAssetId !== id);
    saveState(db);
    return true;
  },

  // LINKS
  getLinks(): NetworkLink[] {
    return db.links;
  },

  // HISTORICAL ALARMS
  getHistoricalAlarms(): HistoricalAlarm[] {
    return db.historicalAlarms || [];
  },

  addHistoricalAlarms(alarms: HistoricalAlarm[]): void {
    db.historicalAlarms = [...alarms, ...(db.historicalAlarms || [])];
    saveState(db);
  },

  // INCIDENTS
  getIncidents(): Incident[] {
    return db.incidents || [];
  },

  addIncidents(incidents: Incident[]): void {
    db.incidents = [...incidents, ...(db.incidents || [])];
    saveState(db);
  },

  // PREDICTIVE ALARMS
  getPredictiveAlarms(): PredictiveWeatherAlarm[] {
    return db.predictiveAlarms || [];
  },

  setPredictiveAlarms(alarms: PredictiveWeatherAlarm[]): void {
    db.predictiveAlarms = alarms;
    saveState(db);
  },

  acknowledgePredictiveAlarm(id: string): void {
    const alarm = db.predictiveAlarms.find((a) => a.id === id);
    if (alarm) {
      alarm.status = 'acknowledged';
      saveState(db);
    }
  },

  // CHANGE LOG
  getChangeEvents(): ChangeEvent[] {
    return db.changeEvents;
  },

  logChangeEvent(event: Omit<ChangeEvent, 'id' | 'detectedAt' | 'acknowledged'>): ChangeEvent {
    const newEvent: ChangeEvent = {
      ...event,
      id: `evt-${Date.now()}`,
      detectedAt: new Date().toISOString(),
      acknowledged: false,
    };
    db.changeEvents.unshift(newEvent);
    saveState(db);
    return newEvent;
  },

  acknowledgeEvent(id: string): void {
    const event = db.changeEvents.find((e) => e.id === id);
    if (event) {
      event.acknowledged = true;
      saveState(db);
    }
  },

  acknowledgeAllEvents(): void {
    db.changeEvents.forEach((e) => {
      e.acknowledged = true;
    });
    saveState(db);
  },

  // RECONCILIATION QUEUE
  getIdentityReviewQueue(): IdentityReviewItem[] {
    return db.identityReviewQueue;
  },

  resolveIdentityReview(id: string, action: 'merge' | 'reject'): void {
    db.identityReviewQueue = db.identityReviewQueue.filter((i) => i.id !== id);
    saveState(db);
  },

  // SNAPSHOTS
  getSnapshots(): TopologySnapshot[] {
    return db.snapshots;
  },

  createSnapshot(trigger: string): TopologySnapshot {
    const snapshot: TopologySnapshot = {
      id: `snp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      trigger,
      nodeCount: db.assets.length,
      edgeCount: db.links.length,
      siteCount: db.sites.length,
      nodes: JSON.parse(JSON.stringify(db.assets)),
      links: JSON.parse(JSON.stringify(db.links)),
    };
    db.snapshots.push(snapshot);
    saveState(db);
    return snapshot;
  },

  // COLLECTION RUNS
  getCollectionRuns(): CollectionRun[] {
    return db.collectionRuns;
  },

  addCollectionRun(run: CollectionRun): void {
    db.collectionRuns.unshift(run);
    saveState(db);
  },
};
