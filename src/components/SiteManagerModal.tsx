import React, { useState, useEffect } from 'react';
import { Building2, MapPin, X, Save, AlertTriangle, Radio, Search, CheckCircle2 } from 'lucide-react';
import { Site, SiteStatus, ConcessionCode, UnitType } from '../types';
import { DEFAULT_CONCESSIONS } from '../services/database';
import { convertCepToCoordinates } from '../services/cepGeoService';

interface SiteManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSite: (site: Partial<Site> & { name: string; city: string; state: string }) => void;
  initialSite?: Site | null;
  concessionsList?: string[];
  unitTypesList?: string[];
}

const COMMON_OPERATORS = [
  'Embratel',
  'Vivo',
  'Claro',
  'Cirion',
  'Algar',
  'Oi Soluções',
  'Telebras',
  'V.tal',
];

export const SiteManagerModal: React.FC<SiteManagerModalProps> = ({
  isOpen,
  onClose,
  onSaveSite,
  initialSite,
  concessionsList = DEFAULT_CONCESSIONS,
  unitTypesList = ['OPERACIONAL', 'SEDE', 'LOJA', 'TORRE_RADIO', 'CENTRO_DIST'],
}) => {
  const [name, setName] = useState('');
  const [concession, setConcession] = useState<ConcessionCode>('CAN');
  const [unitType, setUnitType] = useState<string>('OPERACIONAL');
  const [isCustomUnitType, setIsCustomUnitType] = useState(false);
  const [customUnitTypeName, setCustomUnitTypeName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('RJ');
  const [lat, setLat] = useState<number>(-22.8944);
  const [lng, setLng] = useState<number>(-43.1231);
  const [status, setStatus] = useState<SiteStatus>('operational');
  const [operators, setOperators] = useState<string[]>(['Embratel', 'Vivo']);
  const [customOperator, setCustomOperator] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // CEP converter state
  const [cepSearch, setCepSearch] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepSuccessMsg, setCepSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSite) {
      setName(initialSite.name);
      setConcession(initialSite.concession || 'CAN');
      setUnitType(initialSite.unitType || 'OPERACIONAL');
      setAddress(initialSite.address);
      setCity(initialSite.city);
      setState(initialSite.state);
      setLat(initialSite.lat);
      setLng(initialSite.lng);
      setStatus(initialSite.status);
      setOperators(initialSite.operators || []);
      setContactName(initialSite.contactName || '');
      setContactPhone(initialSite.contactPhone || '');
    } else {
      setName('');
      setConcession('CAN');
      setUnitType('OPERACIONAL');
      setAddress('');
      setCity('Niterói');
      setState('RJ');
      setLat(-22.8944);
      setLng(-43.1231);
      setStatus('operational');
      setOperators(['Embratel', 'Vivo']);
      setContactName('');
      setContactPhone('');
    }
    setError(null);
  }, [initialSite, isOpen]);

  if (!isOpen) return null;

  const toggleOperator = (op: string) => {
    if (operators.includes(op)) {
      setOperators(operators.filter((o) => o !== op));
    } else {
      setOperators([...operators, op]);
    }
  };

  const handleLookupCep = async () => {
    const clean = cepSearch.replace(/\D/g, '');
    if (clean.length !== 8) {
      setError('Por favor, digite um CEP válido com 8 dígitos.');
      return;
    }

    setCepLoading(true);
    setError(null);
    setCepSuccessMsg(null);

    try {
      const geo = await convertCepToCoordinates(clean);
      setLat(parseFloat(geo.lat.toFixed(6)));
      setLng(parseFloat(geo.lng.toFixed(6)));
      if (geo.city) setCity(geo.city);
      if (geo.state) setState(geo.state);
      if (geo.street || geo.neighborhood) {
        setAddress(
          `${geo.street ? geo.street + ', ' : ''}${geo.neighborhood ? geo.neighborhood + ', ' : ''}${geo.city} - ${geo.state}`
        );
      }
      if (geo.suggestedConcession && concessionsList.includes(geo.suggestedConcession)) {
        setConcession(geo.suggestedConcession);
      }
      if (!name) {
        setName(`${geo.suggestedConcession || concession} - ${geo.city}`);
      }

      setCepSuccessMsg(`Lat: ${geo.lat.toFixed(5)}, Lng: ${geo.lng.toFixed(5)} (${geo.city}/${geo.state})`);
      setTimeout(() => setCepSuccessMsg(null), 5000);
    } catch (err) {
      setError((err as Error).message || 'Erro ao consultar CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome da localidade é obrigatório.');
      return;
    }
    if (!city.trim() || !state.trim()) {
      setError('Cidade e UF são obrigatórios.');
      return;
    }

    const finalUnitType = isCustomUnitType
      ? customUnitTypeName.trim().toUpperCase() || 'OPERACIONAL'
      : unitType;

    onSaveSite({
      id: initialSite?.id,
      name: name.trim(),
      concession,
      unitType: finalUnitType,
      address: address.trim() || `${city.trim()} - ${state.trim()}`,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      lat: Number(lat),
      lng: Number(lng),
      status,
      operators,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
    });

    onClose();
  };

  const applyConcessionPreset = (conc: string, cityName: string, uf: string, pLat: number, pLng: number) => {
    setConcession(conc);
    setCity(cityName);
    setState(uf);
    setLat(pLat);
    setLng(pLng);
    if (!name) setName(`${conc} - Sede ${cityName}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-slate-100 text-base">
              {initialSite ? 'Editar Localidade da Concessão' : 'Cadastrar Localidade de Concessão'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-600/60 text-rose-200 text-xs p-3 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Presets das Concessões Principais */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Atalho por Concessão:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyConcessionPreset('CAN', 'Niterói', 'RJ', -22.8944, -43.1231)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono"
              >
                CAN (Niterói)
              </button>
              <button
                type="button"
                onClick={() => applyConcessionPreset('RIOMAIS', 'Rio de Janeiro', 'RJ', -22.9031, -43.5592)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono"
              >
                RIOMAIS (Rio/Zona Oeste)
              </button>
              <button
                type="button"
                onClick={() => applyConcessionPreset('CAC', 'Cuiabá', 'MT', -15.5894, -56.0681)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono"
              >
                CAC (Cuiabá)
              </button>
              <button
                type="button"
                onClick={() => applyConcessionPreset('JAHU', 'Jaú', 'SP', -22.2961, -48.5583)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono"
              >
                JAHU (Jaú)
              </button>
              <button
                type="button"
                onClick={() => applyConcessionPreset('CANF', 'Nova Friburgo', 'RJ', -22.2819, -42.5311)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono"
              >
                CANF (Nova Friburgo)
              </button>
              <button
                type="button"
                onClick={() => applyConcessionPreset('CAJ', 'Araruama', 'RJ', -22.8711, -42.3414)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 font-mono"
              >
                CAJ (Juturnaíba)
              </button>
            </div>
          </div>

          {/* Conversor de CEP para Latitude e Longitude */}
          <div className="bg-slate-950/70 border border-cyan-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Conversor de CEP para Latitude e Longitude:
              </label>
              <span className="text-[10px] text-slate-500 font-mono">BrasilAPI / ViaCEP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite o CEP (ex: 24020-000 ou 78005-000)"
                  value={cepSearch}
                  onChange={(e) => setCepSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupCep();
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleLookupCep}
                disabled={cepLoading}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
              >
                {cepLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Converter CEP</span>
                  </>
                )}
              </button>
            </div>
            {cepSuccessMsg && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{cepSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Concession & Unit Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Concessão *</label>
              <select
                value={concession}
                onChange={(e) => setConcession(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
              >
                {concessionsList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Tipo de Unidade / Localidade *
              </label>
              {!isCustomUnitType ? (
                <select
                  value={unitType}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomUnitType(true);
                    } else {
                      setUnitType(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-cyan-500"
                >
                  {unitTypesList.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Cadastrar Novo Tipo de Unidade...</option>
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ex: TORRE_RADIO, CENTRO_DIST"
                    value={customUnitTypeName}
                    onChange={(e) => setCustomUnitTypeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-amber-500 rounded-lg text-white font-mono uppercase text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomUnitType(false);
                      setCustomUnitTypeName('');
                    }}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs"
                    title="Voltar à lista"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Name & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">
                Nome da Localidade *
              </label>
              <input
                type="text"
                placeholder="Ex: CAN - ETA Laranjal Operacional"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Status Operacional</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SiteStatus)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="operational">🟢 Operacional</option>
                <option value="degraded">🟡 Degradado</option>
                <option value="critical">🔴 Falha Crítica</option>
                <option value="maintenance">🔵 Manutenção</option>
              </select>
            </div>
          </div>

          {/* Address, City, State, Lat, Lng */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Endereço Completo</label>
            <input
              type="text"
              placeholder="Rua, Número, Bairro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Cidade *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">UF *</label>
              <input
                type="text"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white uppercase font-mono"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                required
              />
            </div>
          </div>

          {/* Operators */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Operadoras e Provedores Conectados:
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_OPERATORS.map((op) => (
                <button
                  type="button"
                  key={op}
                  onClick={() => toggleOperator(op)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    operators.includes(op)
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-medium'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-lg shadow-cyan-900/30 transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Localidade</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
