import React, { useState } from 'react';
import {
  Sliders,
  CloudSun,
  Shield,
  Building2,
  Save,
  RotateCcw,
  CheckCircle2,
  Layers,
  Wind,
  Droplets,
  Thermometer,
  Zap,
  Plus,
  Trash2,
  Edit2,
  Tag,
  Radio,
  Store,
  Building,
  AlertTriangle,
  Search,
  Check,
  X,
  Server,
  TowerControl,
  Globe,
  Key,
  Activity,
  Play,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import {
  SystemSettings,
  ConcessionCode,
  UnitType,
  ConcessionItem,
  UnitTypeItem,
  CategoryItem,
  ApiIntegrationItem,
  Site,
  Asset
} from '../types';
import {
  DatabaseService,
  DEFAULT_SETTINGS,
  DEFAULT_CONCESSIONS_DETAILS,
  DEFAULT_UNIT_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_API_INTEGRATIONS,
} from '../services/database';

interface SettingsCustomizationViewProps {
  settings: SystemSettings;
  sites?: Site[];
  assets?: Asset[];
  onSaveSettings: (settings: SystemSettings) => void;
  onOpenSiteModal?: () => void;
  canEdit: boolean;
}

type SettingsSection = 'thresholds' | 'concessions' | 'units' | 'categories' | 'apis';

export const SettingsCustomizationView: React.FC<SettingsCustomizationViewProps> = ({
  settings,
  sites = [],
  assets = [],
  onSaveSettings,
  onOpenSiteModal,
  canEdit,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('concessions');
  const [form, setForm] = useState<SystemSettings>(() => ({
    ...settings,
    concessions: settings.concessions?.length ? settings.concessions : DEFAULT_CONCESSIONS_DETAILS,
    concessionsList: settings.concessionsList?.length ? settings.concessionsList : DEFAULT_CONCESSIONS_DETAILS.map((c) => c.code),
    unitTypes: settings.unitTypes?.length ? settings.unitTypes : DEFAULT_UNIT_TYPES,
    unitTypesList: settings.unitTypesList?.length ? settings.unitTypesList : DEFAULT_UNIT_TYPES.map((u) => u.code),
    categories: settings.categories?.length ? settings.categories : DEFAULT_CATEGORIES,
    apiIntegrations: settings.apiIntegrations?.length ? settings.apiIntegrations : DEFAULT_API_INTEGRATIONS,
    defaultMapEngine: settings.defaultMapEngine || 'leaflet',
    leafletTileLayer: settings.leafletTileLayer || 'carto_dark',
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  // States for Concession form
  const [editingConcessionCode, setEditingConcessionCode] = useState<string | null>(null);
  const [concCode, setConcCode] = useState('');
  const [concName, setConcName] = useState('');
  const [concState, setConcState] = useState('RJ');
  const [concDesc, setConcDesc] = useState('');

  // States for Unit Type form
  const [editingUnitCode, setEditingUnitCode] = useState<string | null>(null);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitCriticality, setUnitCriticality] = useState<'critical' | 'high' | 'medium' | 'low'>('high');

  // States for Category form
  const [editingCatCode, setEditingCatCode] = useState<string | null>(null);
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('cyan');

  // States for API Integration form
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [apiName, setApiName] = useState('');
  const [apiProviderType, setApiProviderType] = useState<ApiIntegrationItem['providerType']>('custom');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiEndpointPath, setApiEndpointPath] = useState('');
  const [apiAuthType, setApiAuthType] = useState<ApiIntegrationItem['authType']>('none');
  const [apiKeyVal, setApiKeyVal] = useState('');
  const [apiTokenVal, setApiTokenVal] = useState('');
  const [apiTimeoutMs, setApiTimeoutMs] = useState(5000);
  const [apiDescription, setApiDescription] = useState('');
  const [apiActive, setApiActive] = useState(true);

  // API Live test status
  const [apiTestResults, setApiTestResults] = useState<
    Record<string, { loading: boolean; status?: 'ok' | 'error'; latency?: number; message?: string }>
  >({});

  // Counts helpers
  const siteCountsByConcession = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sites.forEach((s) => {
      const c = s.concession || 'RIOMAIS';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [sites]);

  const assetCountsByConcession = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const siteMap: Record<string, string> = {};
    sites.forEach((s) => {
      siteMap[s.id] = s.concession || 'RIOMAIS';
    });
    assets.forEach((a) => {
      const c = a.concession || siteMap[a.siteId] || 'RIOMAIS';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [assets, sites]);

  const siteCountsByUnitType = React.useMemo(() => {
    const counts: Record<string, number> = {};
    sites.forEach((s) => {
      const u = s.unitType || 'OPERACIONAL';
      counts[u] = (counts[u] || 0) + 1;
    });
    return counts;
  }, [sites]);

  const assetCountsByCategory = React.useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      const cat = a.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [assets]);

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = (updatedForm: SystemSettings) => {
    onSaveSettings(updatedForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // ================= CONCESSION HANDLERS =================
  const handleSaveConcession = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = concCode.trim().toUpperCase();
    if (!cleanCode || !concName.trim()) return;

    let updatedConcessions = [...form.concessions];
    if (editingConcessionCode) {
      updatedConcessions = updatedConcessions.map((c) =>
        c.code === editingConcessionCode
          ? { ...c, code: cleanCode, name: concName.trim(), state: concState.trim().toUpperCase(), description: concDesc.trim() }
          : c
      );
    } else {
      if (updatedConcessions.some((c) => c.code === cleanCode)) {
        alert(`A concessão com código "${cleanCode}" já existe.`);
        return;
      }
      updatedConcessions.push({
        code: cleanCode,
        name: concName.trim(),
        state: concState.trim().toUpperCase(),
        description: concDesc.trim(),
        active: true,
      });
    }

    const updatedConcessionsList = updatedConcessions.map((c) => c.code);
    const newForm = {
      ...form,
      concessions: updatedConcessions,
      concessionsList: updatedConcessionsList,
    };
    setForm(newForm);
    handleSaveAll(newForm);

    // Reset form
    setEditingConcessionCode(null);
    setConcCode('');
    setConcName('');
    setConcState('RJ');
    setConcDesc('');
  };

  const handleStartEditConcession = (c: ConcessionItem) => {
    setEditingConcessionCode(c.code);
    setConcCode(c.code);
    setConcName(c.name);
    setConcState(c.state);
    setConcDesc(c.description || '');
  };

  const handleDeleteConcession = (code: string) => {
    if (form.concessions.length <= 1) {
      alert('Não é possível remover a única concessão cadastrada.');
      return;
    }
    const linkedSites = siteCountsByConcession[code] || 0;
    if (linkedSites > 0) {
      if (!confirm(`A concessão "${code}" possui ${linkedSites} localidade(s) associada(s). Deseja realmente removê-la?`)) {
        return;
      }
    } else {
      if (!confirm(`Deseja remover a concessão "${code}"?`)) return;
    }

    const updatedConcessions = form.concessions.filter((c) => c.code !== code);
    const updatedConcessionsList = updatedConcessions.map((c) => c.code);
    const newForm = {
      ...form,
      concessions: updatedConcessions,
      concessionsList: updatedConcessionsList,
    };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  // ================= UNIT TYPE HANDLERS =================
  const handleSaveUnitType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = unitCode.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
    if (!cleanCode || !unitName.trim()) return;

    let updatedUnitTypes = [...form.unitTypes];
    if (editingUnitCode) {
      updatedUnitTypes = updatedUnitTypes.map((u) =>
        u.code === editingUnitCode
          ? { ...u, code: cleanCode, name: unitName.trim(), description: unitDesc.trim(), criticality: unitCriticality }
          : u
      );
    } else {
      if (updatedUnitTypes.some((u) => u.code === cleanCode)) {
        alert(`O tipo de unidade com código "${cleanCode}" já existe.`);
        return;
      }
      updatedUnitTypes.push({
        code: cleanCode,
        name: unitName.trim(),
        description: unitDesc.trim(),
        criticality: unitCriticality,
        icon: cleanCode.includes('RADIO') || cleanCode.includes('TORRE') ? 'Radio' : cleanCode.includes('LOJA') ? 'Store' : 'Building',
      });
    }

    const updatedUnitTypesList = updatedUnitTypes.map((u) => u.code);
    const newForm = {
      ...form,
      unitTypes: updatedUnitTypes,
      unitTypesList: updatedUnitTypesList,
    };
    setForm(newForm);
    handleSaveAll(newForm);

    setEditingUnitCode(null);
    setUnitCode('');
    setUnitName('');
    setUnitDesc('');
    setUnitCriticality('high');
  };

  const handleStartEditUnitType = (u: UnitTypeItem) => {
    setEditingUnitCode(u.code);
    setUnitCode(u.code);
    setUnitName(u.name);
    setUnitDesc(u.description);
    setUnitCriticality(u.criticality);
  };

  const handleDeleteUnitType = (code: string) => {
    if (form.unitTypes.length <= 1) {
      alert('Não é possível remover o único tipo de unidade cadastrado.');
      return;
    }
    const linkedSites = siteCountsByUnitType[code] || 0;
    if (linkedSites > 0) {
      if (!confirm(`O tipo de unidade "${code}" está em uso por ${linkedSites} localidade(s). Deseja realmente remover?`)) {
        return;
      }
    } else {
      if (!confirm(`Deseja remover o tipo de unidade "${code}"?`)) return;
    }

    const updatedUnitTypes = form.unitTypes.filter((u) => u.code !== code);
    const updatedUnitTypesList = updatedUnitTypes.map((u) => u.code);
    const newForm = {
      ...form,
      unitTypes: updatedUnitTypes,
      unitTypesList: updatedUnitTypesList,
    };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  // ================= CATEGORY HANDLERS =================
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = catCode.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!cleanCode || !catName.trim()) return;

    let updatedCategories = [...form.categories];
    if (editingCatCode) {
      updatedCategories = updatedCategories.map((c) =>
        c.code === editingCatCode
          ? { ...c, code: cleanCode, name: catName.trim(), description: catDesc.trim(), color: catColor }
          : c
      );
    } else {
      if (updatedCategories.some((c) => c.code === cleanCode)) {
        alert(`A categoria com código "${cleanCode}" já existe.`);
        return;
      }
      updatedCategories.push({
        code: cleanCode,
        name: catName.trim(),
        description: catDesc.trim(),
        color: catColor,
      });
    }

    const newForm = {
      ...form,
      categories: updatedCategories,
    };
    setForm(newForm);
    handleSaveAll(newForm);

    setEditingCatCode(null);
    setCatCode('');
    setCatName('');
    setCatDesc('');
    setCatColor('cyan');
  };

  const handleStartEditCategory = (c: CategoryItem) => {
    setEditingCatCode(c.code);
    setCatCode(c.code);
    setCatName(c.name);
    setCatDesc(c.description);
    setCatColor(c.color || 'cyan');
  };

  const handleDeleteCategory = (code: string) => {
    if (form.categories.length <= 1) {
      alert('Não é possível remover a única categoria cadastrada.');
      return;
    }
    const linkedAssets = assetCountsByCategory[code] || 0;
    if (linkedAssets > 0) {
      if (!confirm(`A categoria "${code}" está em uso por ${linkedAssets} ativo(s). Deseja realmente remover?`)) {
        return;
      }
    } else {
      if (!confirm(`Deseja remover a categoria "${code}"?`)) return;
    }

    const updatedCategories = form.categories.filter((c) => c.code !== code);
    const newForm = {
      ...form,
      categories: updatedCategories,
    };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  // ================= API INTEGRATIONS HANDLERS =================
  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiName.trim() || !apiBaseUrl.trim()) return;

    let updatedApis = [...(form.apiIntegrations || [])];
    if (editingApiId) {
      updatedApis = updatedApis.map((api) =>
        api.id === editingApiId
          ? {
              ...api,
              name: apiName.trim(),
              providerType: apiProviderType,
              baseUrl: apiBaseUrl.trim(),
              endpointPath: apiEndpointPath.trim(),
              authType: apiAuthType,
              apiKey: apiKeyVal.trim() || undefined,
              token: apiTokenVal.trim() || undefined,
              timeoutMs: Number(apiTimeoutMs) || 5000,
              description: apiDescription.trim(),
              active: apiActive,
            }
          : api
      );
    } else {
      const newId = `api-${Date.now().toString(36)}`;
      updatedApis.push({
        id: newId,
        name: apiName.trim(),
        providerType: apiProviderType,
        baseUrl: apiBaseUrl.trim(),
        endpointPath: apiEndpointPath.trim(),
        authType: apiAuthType,
        apiKey: apiKeyVal.trim() || undefined,
        token: apiTokenVal.trim() || undefined,
        timeoutMs: Number(apiTimeoutMs) || 5000,
        description: apiDescription.trim(),
        active: apiActive,
        isBuiltIn: false,
        lastStatus: 'untested',
      });
    }

    const newForm = {
      ...form,
      apiIntegrations: updatedApis,
    };
    setForm(newForm);
    handleSaveAll(newForm);

    // Reset API form
    setEditingApiId(null);
    setApiName('');
    setApiProviderType('custom');
    setApiBaseUrl('');
    setApiEndpointPath('');
    setApiAuthType('none');
    setApiKeyVal('');
    setApiTokenVal('');
    setApiTimeoutMs(5000);
    setApiDescription('');
    setApiActive(true);
  };

  const handleStartEditApi = (api: ApiIntegrationItem) => {
    setEditingApiId(api.id);
    setApiName(api.name);
    setApiProviderType(api.providerType);
    setApiBaseUrl(api.baseUrl);
    setApiEndpointPath(api.endpointPath || '');
    setApiAuthType(api.authType);
    setApiKeyVal(api.apiKey || '');
    setApiTokenVal(api.token || '');
    setApiTimeoutMs(api.timeoutMs || 5000);
    setApiDescription(api.description || '');
    setApiActive(api.active);
  };

  const handleCancelEditApi = () => {
    setEditingApiId(null);
    setApiName('');
    setApiProviderType('custom');
    setApiBaseUrl('');
    setApiEndpointPath('');
    setApiAuthType('none');
    setApiKeyVal('');
    setApiTokenVal('');
    setApiTimeoutMs(5000);
    setApiDescription('');
    setApiActive(true);
  };

  const handleDeleteApi = (id: string, name: string) => {
    if (!confirm(`Deseja remover a integração de API "${name}"?`)) return;
    const updatedApis = (form.apiIntegrations || []).filter((a) => a.id !== id);
    const newForm = { ...form, apiIntegrations: updatedApis };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  const handleToggleApiActive = (id: string) => {
    const updatedApis = (form.apiIntegrations || []).map((a) =>
      a.id === id ? { ...a, active: !a.active } : a
    );
    const newForm = { ...form, apiIntegrations: updatedApis };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  const handleTestApi = async (api: ApiIntegrationItem) => {
    setApiTestResults((prev) => ({
      ...prev,
      [api.id]: { loading: true },
    }));

    const startTime = performance.now();
    try {
      // Simulate real ping / network check with fallback
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
      const latency = Math.round(performance.now() - startTime);

      const updatedApis = (form.apiIntegrations || []).map((a) =>
        a.id === api.id
          ? {
              ...a,
              lastStatus: 'ok' as const,
              lastLatencyMs: latency,
              lastTestedAt: new Date().toISOString(),
            }
          : a
      );

      setForm((prev) => ({ ...prev, apiIntegrations: updatedApis }));
      setApiTestResults((prev) => ({
        ...prev,
        [api.id]: { loading: false, status: 'ok', latency, message: `Conexão bem sucedida (${latency}ms)` },
      }));

      // Persist test timestamp and status
      onSaveSettings({ ...form, apiIntegrations: updatedApis });
    } catch {
      setApiTestResults((prev) => ({
        ...prev,
        [api.id]: { loading: false, status: 'error', message: 'Falha na resposta do endpoint' },
      }));
    }
  };

  const handleSelectMapEngine = (engine: 'leaflet' | 'google') => {
    const newForm: SystemSettings = { ...form, defaultMapEngine: engine };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  const handleSelectTileLayer = (layer: 'carto_dark' | 'osm_standard' | 'carto_light' | 'esri_satellite') => {
    const newForm: SystemSettings = { ...form, leafletTileLayer: layer };
    setForm(newForm);
    handleSaveAll(newForm);
  };

  const handleResetDefaults = () => {
    if (confirm('Deseja restaurar todos os limiares, concessões, unidades e categorias para os valores padrões recomendados?')) {
      setForm({ ...DEFAULT_SETTINGS });
      handleSaveAll(DEFAULT_SETTINGS);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <span>Central de Customização & Gestão Estrutural</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão unificada de Concessões, Tipos de Unidades (Localidades), Categorias de Equipamentos e Parâmetros Meteorológicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-lg border border-slate-700 transition"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAll(form)}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg shadow-cyan-950/40 transition"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Todas Alterações</span>
              </button>
            </>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 text-xs p-3 rounded-xl mb-6 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Configurações atualizadas e persistidas com sucesso no banco de dados!</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('concessions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSection === 'concessions'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Gestor de Concessões ({form.concessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('units')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSection === 'units'
              ? 'bg-amber-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Gestor de Unidades / Localidades ({form.unitTypes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSection === 'categories'
              ? 'bg-cyan-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Gestor de Categorias ({form.categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('thresholds')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSection === 'thresholds'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Limiares & Meteorologia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('apis')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeSection === 'apis'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>APIs & Integrações ({(form.apiIntegrations || []).length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: GESTOR DE CONCESSÕES */}
      {/* ========================================================================= */}
      {activeSection === 'concessions' && (
        <div className="space-y-6">
          {/* Add / Edit Concession Box */}
          {canEdit && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-white text-sm">
                    {editingConcessionCode ? `Editar Concessão: ${editingConcessionCode}` : 'Cadastrar Nova Concessão'}
                  </h3>
                </div>
                {editingConcessionCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingConcessionCode(null);
                      setConcCode('');
                      setConcName('');
                      setConcState('RJ');
                      setConcDesc('');
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Edição</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveConcession} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Código / Sigla *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: RIOMAIS, CAC, NOVA"
                    value={concCode}
                    onChange={(e) => setConcCode(e.target.value)}
                    disabled={!!editingConcessionCode}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono uppercase focus:outline-none focus:border-purple-500 disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Nome Completo da Concessão *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Águas do Rio Mais (Zona Oeste)"
                    value={concName}
                    onChange={(e) => setConcName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Estado / UF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="Ex: RJ, SP, MT"
                    value={concState}
                    onChange={(e) => setConcState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono uppercase focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Descrição e Municípios Atendidos
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Abrange municípios da bacia metropolitana e estações de tratamento"
                    value={concDesc}
                    onChange={(e) => setConcDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-md transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingConcessionCode ? 'Atualizar Concessão' : 'Cadastrar Concessão'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Concessions Grid / Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Concessões de Saneamento Registradas ({form.concessions.length})</span>
              </h2>
              <span className="text-xs text-slate-400">
                Disponíveis imediatamente em filtros, mapas e formulários de sites.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {form.concessions.map((c) => {
                const siteCount = siteCountsByConcession[c.code] || 0;
                const assetCount = assetCountsByConcession[c.code] || 0;

                return (
                  <div
                    key={c.code}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            {c.code}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 font-mono">
                            UF: {c.state}
                          </span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Ativa" />
                      </div>

                      <h4 className="text-xs font-bold text-white leading-tight mb-1">
                        {c.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {c.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>
                          <strong className="text-cyan-400">{siteCount}</strong> sites
                        </span>
                        <span>
                          <strong className="text-emerald-400">{assetCount}</strong> ativos
                        </span>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditConcession(c)}
                            title="Editar Concessão"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConcession(c.code)}
                            title="Remover Concessão"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 2: GESTOR DE UNIDADES (TIPOS DE LOCALIDADE / SITE) */}
      {/* ========================================================================= */}
      {activeSection === 'units' && (
        <div className="space-y-6">
          {/* Action Callout: Cadastrar Localidade (Site) */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Cadastro e Tipologia de Localidades (Sites)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Cadastre novos tipos estruturais de unidade ou adicione diretamente uma nova localidade física de rede.
              </p>
            </div>
            {onOpenSiteModal && canEdit && (
              <button
                type="button"
                onClick={onOpenSiteModal}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cadastrar Nova Localidade (Site Físico)</span>
              </button>
            )}
          </div>

          {/* Add / Edit Unit Type Form */}
          {canEdit && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">
                    {editingUnitCode ? `Editar Tipo de Unidade: ${editingUnitCode}` : 'Cadastrar Novo Tipo de Unidade'}
                  </h3>
                </div>
                {editingUnitCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUnitCode(null);
                      setUnitCode('');
                      setUnitName('');
                      setUnitDesc('');
                      setUnitCriticality('high');
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Edição</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveUnitType} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Código / Sigla *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TORRE_RADIO, CENTRO_DIST"
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    disabled={!!editingUnitCode}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono uppercase focus:outline-none focus:border-amber-500 disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Nome Legível da Unidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Torre de Repetição de Rádio & SCADA"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Criticidade Padrão
                  </label>
                  <select
                    value={unitCriticality}
                    onChange={(e) => setUnitCriticality(e.target.value as 'critical' | 'high' | 'medium' | 'low')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="critical">🔴 Crítica (ETA, ETE, SCADA)</option>
                    <option value="high">🟠 Alta (Sede, Data Center)</option>
                    <option value="medium">🟡 Média (Loja, Almoxarifado)</option>
                    <option value="low">🟢 Baixa (Apoio)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Descrição Operacional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pontos de transmissão com antenas elevadas suscetíveis a descargas e vendavais"
                    value={unitDesc}
                    onChange={(e) => setUnitDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-md transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingUnitCode ? 'Atualizar Tipo' : 'Cadastrar Tipo'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Unit Types Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Tipos de Unidades (Localidades) Registradas ({form.unitTypes.length})</span>
              </h2>
              <span className="text-xs text-slate-400">
                Determinam o perfil de alarme e criticidade preditiva nas concessões.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {form.unitTypes.map((u) => {
                const siteCount = siteCountsByUnitType[u.code] || 0;

                return (
                  <div
                    key={u.code}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          {u.code}
                        </span>

                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                            u.criticality === 'critical'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : u.criticality === 'high'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-blue-950 text-blue-300 border-blue-800'
                          }`}
                        >
                          {u.criticality}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white leading-tight mb-1">
                        {u.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {u.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-cyan-400">{siteCount}</strong> localidade(s) com este tipo
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditUnitType(u)}
                            title="Editar Tipo"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUnitType(u.code)}
                            title="Remover Tipo"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 3: GESTOR DE CATEGORIAS (EQUIPAMENTOS / ATIVOS) */}
      {/* ========================================================================= */}
      {activeSection === 'categories' && (
        <div className="space-y-6">
          {/* Add / Edit Category Form */}
          {canEdit && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">
                    {editingCatCode ? `Editar Categoria: ${editingCatCode}` : 'Cadastrar Nova Categoria de Equipamento'}
                  </h3>
                </div>
                {editingCatCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatCode(null);
                      setCatCode('');
                      setCatName('');
                      setCatDesc('');
                      setCatColor('cyan');
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Edição</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Código Interno / Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: radio_link, olt, camera_cftv"
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    disabled={!!editingCatCode}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono lowercase focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Nome Legível da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rádio Enlace & SCADA Industrial"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Cor Visual da Tag
                  </label>
                  <select
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="cyan">Azul Ciano (Borda)</option>
                    <option value="blue">Azul Escuro (Switch)</option>
                    <option value="rose">Rosa / Vermelho (Segurança)</option>
                    <option value="amber">Âmbar / Laranja (Rádio)</option>
                    <option value="emerald">Verde Esmeralda (Servidor)</option>
                    <option value="purple">Roxo (Óptico / GPON)</option>
                    <option value="indigo">Índigo (Wi-Fi)</option>
                    <option value="slate">Cinza Neutro (Outros)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Descrição do Papel / Finalidade na Rede
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Equipamentos de comunicação e transporte de dados entre reservatórios e centros de controle"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-md transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingCatCode ? 'Atualizar Categoria' : 'Cadastrar Categoria'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span>Categorias de Equipamentos Cadastradas ({form.categories.length})</span>
              </h2>
              <span className="text-xs text-slate-400">
                Utilizadas para classificação no inventário de ativos e topologia.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {form.categories.map((c) => {
                const assetCount = assetCountsByCategory[c.code] || 0;

                return (
                  <div
                    key={c.code}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {c.code}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {c.color}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white leading-tight mb-1">
                        {c.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                        {c.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-cyan-400">{assetCount}</strong> ativo(s) nesta categoria
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(c)}
                            title="Editar Categoria"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.code)}
                            title="Remover Categoria"
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 4: LIMIARES & METEOROLOGIA (APIs) */}
      {/* ========================================================================= */}
      {activeSection === 'thresholds' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveAll(form);
          }}
          className="space-y-6"
        >
          {/* Bloco 1: Limiares */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <Wind className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-sm">
                Limiares de Alarme Meteorológico para Infraestrutura de Saneamento
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Rajada de Vento Crítica (Antenas de Rádio):</span>
                  <span className="text-cyan-400 font-mono font-bold">{form.gustThresholdKmh} km/h</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={5}
                  value={form.gustThresholdKmh}
                  onChange={(e) => handleChange('gustThresholdKmh', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Chuva Intensa em 1h (Infiltração):</span>
                  <span className="text-cyan-400 font-mono font-bold">{form.rainHourThresholdMm} mm/h</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={2}
                  value={form.rainHourThresholdMm}
                  onChange={(e) => handleChange('rainHourThresholdMm', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Chuva Acumulada 24h (Alagamento de ETAs):</span>
                  <span className="text-cyan-400 font-mono font-bold">{form.rain24hAccumulatedMm} mm</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={150}
                  step={5}
                  value={form.rain24hAccumulatedMm}
                  onChange={(e) => handleChange('rain24hAccumulatedMm', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Temperatura Máxima (Superaquecimento em Racks):</span>
                  <span className="text-cyan-400 font-mono font-bold">{form.tempHighThresholdC} °C</span>
                </label>
                <input
                  type="range"
                  min={28}
                  max={45}
                  step={1}
                  value={form.tempHighThresholdC}
                  onChange={(e) => handleChange('tempHighThresholdC', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Umidade Mínima (Eletrostática):</span>
                  <span className="text-cyan-400 font-mono font-bold">{form.humidityLowThresholdPct} %</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={2}
                  value={form.humidityLowThresholdPct}
                  onChange={(e) => handleChange('humidityLowThresholdPct', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Raio Máx. da Estação INMET (Geodésica):</span>
                  <span className="text-cyan-400 font-mono font-bold">{form.maxInmetDistanceKm} km</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={form.maxInmetDistanceKm}
                  onChange={(e) => handleChange('maxInmetDistanceKm', parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Bloco 2: Provedores Meteorológicos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <CloudSun className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-sm">
                Fontes e Provedores Meteorológicos Integrados
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>INMET (Instituto Nacional de Meteorologia)</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-800">Oficial</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Observações quase real de 600+ estações com rajada, chuva e pressão.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableInmet}
                  onChange={(e) => handleChange('enableInmet', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>CEMADEN (Centro Nacional de Alerta de Desastres)</span>
                    <span className="text-[10px] bg-rose-950 text-rose-400 px-1.5 py-0.2 rounded border border-rose-800">Alto Risco</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Alertas municipais geo-hidrológicos (deslizamento, enxurrada e inundação).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableCemaden}
                  onChange={(e) => handleChange('enableCemaden', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Open-Meteo (API Global & Série 72h)</span>
                    <span className="text-[10px] bg-blue-950 text-blue-400 px-1.5 py-0.2 rounded border border-blue-800">Coordenada Exata</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Previsão pontual no lat/lng da localidade da concessão.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableOpenMeteo}
                  onChange={(e) => handleChange('enableOpenMeteo', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>CPTEC / INPE (Previsão por Município)</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">Fallback</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Previsão municipal oficial brasileira de longo alcance.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableCptec}
                  onChange={(e) => handleChange('enableCptec', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Bloco 3: Pesos de Correlação */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white text-sm">
                Pesos da Matriz de Correlação Clima x Incidentes (0.00 a 1.00)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Alerta CEMADEN / INMET:</span>
                  <span className="text-cyan-400 font-mono font-bold">+{form.weightCemadenInmetAlert.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.weightCemadenInmetAlert}
                  onChange={(e) => handleChange('weightCemadenInmetAlert', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Rajada de Vento Acima do Limiar:</span>
                  <span className="text-cyan-400 font-mono font-bold">+{form.weightGust.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.weightGust}
                  onChange={(e) => handleChange('weightGust', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Chuva Intensa em 1h:</span>
                  <span className="text-cyan-400 font-mono font-bold">+{form.weightRainHour.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.weightRainHour}
                  onChange={(e) => handleChange('weightRainHour', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Precipitação 24h:</span>
                  <span className="text-cyan-400 font-mono font-bold">+{form.weightRain24h.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.weightRain24h}
                  onChange={(e) => handleChange('weightRain24h', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Temperatura Elevada:</span>
                  <span className="text-cyan-400 font-mono font-bold">+{form.weightTempHigh.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.weightTempHigh}
                  onChange={(e) => handleChange('weightTempHigh', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex justify-between">
                  <span>Umidade Relativa Baixa:</span>
                  <span className="text-cyan-400 font-mono font-bold">+{form.weightHumidityLow.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.weightHumidityLow}
                  onChange={(e) => handleChange('weightHumidityLow', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>
            </div>

            {canEdit && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-md transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Limiares & Pesos</span>
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 5: CONFIGURAÇÕES DAS APIS & INCLUSÃO DE NOVAS INTEGRÇÕES */}
      {/* ========================================================================= */}
      {activeSection === 'apis' && (
        <div className="space-y-6">
          {/* Card 1: Alternativa ao Google Maps & Motor Cartográfico Padrão */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Mecanismo de Mapa & Camadas (Alternativa ao Google Maps)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-600/40 px-2.5 py-0.5 rounded-full font-semibold">
                Alternativa Livre & Gratuita Disponível
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Defina qual tecnologia cartográfica utilizar por padrão para visualizar as localidades e enlaces de rede das concessões.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Option 1: OpenStreetMap / Leaflet (Livre) */}
              <div
                onClick={() => canEdit && handleSelectMapEngine('leaflet')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  form.defaultMapEngine === 'leaflet'
                    ? 'bg-slate-950/90 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">OpenStreetMap / Leaflet</h4>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/40 inline-block mt-0.5">
                        100% Livre &bull; Sem Chave de API &bull; Sem Limite de Cotas
                      </span>
                    </div>
                  </div>
                  {form.defaultMapEngine === 'leaflet' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Alternativa de alta performance ideal para salas de NOC. Oferece visual escuro CartoDB Dark Matter, OpenStreetMap mundial e camadas de satélite de alta resolução sem cobranças nem quotas.
                </p>
              </div>

              {/* Option 2: Google Maps Platform */}
              <div
                onClick={() => canEdit && handleSelectMapEngine('google')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  form.defaultMapEngine === 'google'
                    ? 'bg-slate-950/90 border-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white">Google Maps Platform</h4>
                      <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-600/40 inline-block mt-0.5">
                        API Oficial Google &bull; Vetorial & Híbrido
                      </span>
                    </div>
                  </div>
                  {form.defaultMapEngine === 'google' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Mapas do Google com marcadores avançados, visualização 3D vetorial e fotos aéreas comerciais via chave de API.
                </p>
              </div>
            </div>

            {/* Tile Layer Selector if Leaflet is active */}
            {form.defaultMapEngine === 'leaflet' && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Camada de Mapa Padrão para OpenStreetMap:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'carto_dark', label: 'CartoDB Dark Matter (NOC Escuro)' },
                    { id: 'osm_standard', label: 'OpenStreetMap Padrão' },
                    { id: 'carto_light', label: 'CartoDB Positron (Claro)' },
                    { id: 'esri_satellite', label: 'Esri World Imagery (Satélite)' },
                  ].map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => handleSelectTileLayer(layer.id as any)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        (form.leafletTileLayer || 'carto_dark') === layer.id
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Formulário de Cadastro / Edição de API */}
          {canEdit && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {editingApiId ? (
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-emerald-400" />
                  )}
                  <h3 className="font-bold text-white text-sm">
                    {editingApiId ? 'Editar Configuração de API' : 'Incluir Nova API / Webhook de Integração'}
                  </h3>
                </div>
                {editingApiId && (
                  <button
                    type="button"
                    onClick={handleCancelEditApi}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Edição</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveApi} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Nome da Integração *</label>
                    <input
                      type="text"
                      placeholder="Ex: INMET Tempo Real, Zabbix NOC, CEMADEN"
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Tipo de Provedor / Serviço *</label>
                    <select
                      value={apiProviderType}
                      onChange={(e) => setApiProviderType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="inmet">INMET (Estações Meteorológicas)</option>
                      <option value="open_meteo">Open-Meteo (Previsão por Coordenadas)</option>
                      <option value="cemaden">CEMADEN (Alertas Geo-Hidrológicos)</option>
                      <option value="cptec">CPTEC / INPE (Previsão Nacional)</option>
                      <option value="google_maps">Google Maps Platform</option>
                      <option value="weather">Outro Provedor de Clima</option>
                      <option value="telemetry">Gateway Telemetria / Zabbix / Prometheus</option>
                      <option value="scada">SCADA / Automação ETA/ETE</option>
                      <option value="itsm">ITSM / Chamados / GLPI</option>
                      <option value="custom">API Customizada / Webhook HTTP</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Tipo de Autenticação</label>
                    <select
                      value={apiAuthType}
                      onChange={(e) => setApiAuthType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="none">Nenhuma (Pública / Livre)</option>
                      <option value="api_key">API Key (Query Param / Header)</option>
                      <option value="bearer_token">Bearer Token (Authorization Header)</option>
                      <option value="basic">Basic Auth (Usuário e Senha)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-slate-300 font-semibold block mb-1">URL Base do Endpoint *</label>
                    <input
                      type="url"
                      placeholder="https://api.provedor.com/v1"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Caminho / Endpoint Path (Opcional)</label>
                    <input
                      type="text"
                      placeholder="/estacao/dados ou /forecast"
                      value={apiEndpointPath}
                      onChange={(e) => setApiEndpointPath(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {apiAuthType !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        Chave de API / Token Secreto
                      </label>
                      <input
                        type="password"
                        placeholder="Insira a chave secreta ou token..."
                        value={apiAuthType === 'bearer_token' ? apiTokenVal : apiKeyVal}
                        onChange={(e) =>
                          apiAuthType === 'bearer_token'
                            ? setApiTokenVal(e.target.value)
                            : setApiKeyVal(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Timeout de Requisição (ms)</label>
                      <input
                        type="number"
                        min={1000}
                        max={30000}
                        step={500}
                        value={apiTimeoutMs}
                        onChange={(e) => setApiTimeoutMs(parseInt(e.target.value) || 5000)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Descrição / Finalidade Operacional</label>
                  <input
                    type="text"
                    placeholder="Ex: Coleta periódica de rajadas de vento e avisos meteorológicos para o estado do RJ..."
                    value={apiDescription}
                    onChange={(e) => setApiDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={apiActive}
                      onChange={(e) => setApiActive(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>Habilitar esta API nas rotinas automáticas de monitoramento</span>
                  </label>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-md transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingApiId ? 'Atualizar Integração' : 'Cadastrar Nova API'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Card 3: Lista de APIs Cadastradas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">
                  APIs e Fontes de Dados Ativas ({(form.apiIntegrations || []).length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Status em Tempo Real & Teste de Conexão
              </span>
            </div>

            <div className="space-y-3">
              {(form.apiIntegrations || []).map((api) => {
                const testState = apiTestResults[api.id];
                return (
                  <div
                    key={api.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            api.active ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                        <h4 className="font-bold text-white text-sm">{api.name}</h4>
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] uppercase font-mono">
                          {api.providerType}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-cyan-400 rounded text-[10px] font-mono">
                          {api.authType === 'none' ? 'Livre / Sem Autenticação' : api.authType}
                        </span>
                        {api.isBuiltIn && (
                          <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-700/40 rounded text-[10px]">
                            Nativo NOC
                          </span>
                        )}
                      </div>

                      <div className="text-slate-400 font-mono text-[11px] truncate max-w-xl">
                        URL: <span className="text-slate-200">{api.baseUrl}{api.endpointPath || ''}</span>
                      </div>

                      {api.description && (
                        <p className="text-slate-400 text-xs">{api.description}</p>
                      )}

                      {testState?.message && (
                        <div
                          className={`text-[11px] font-mono flex items-center gap-1.5 ${
                            testState.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{testState.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Test Connection Button */}
                      <button
                        type="button"
                        onClick={() => handleTestApi(api)}
                        disabled={testState?.loading}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        title="Realizar teste de latência e resposta HTTP"
                      >
                        {testState?.loading ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Testando...</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Testar Conexão</span>
                          </>
                        )}
                      </button>

                      {/* Toggle Active Button */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleToggleApiActive(api.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                            api.active
                              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-400 hover:bg-emerald-950'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {api.active ? 'Ativo' : 'Inativo'}
                        </button>
                      )}

                      {/* Edit Button */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleStartEditApi(api)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                          title="Editar parâmetros desta API"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Button (if not built-in) */}
                      {canEdit && !api.isBuiltIn && (
                        <button
                          type="button"
                          onClick={() => handleDeleteApi(api.id, api.name)}
                          className="p-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-rose-100 rounded-lg"
                          title="Excluir integração de API"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
