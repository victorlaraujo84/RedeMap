import React, { useState } from 'react';
import {
  MapPin,
  Search,
  X,
  Copy,
  Check,
  Building2,
  Navigation,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { convertCepToCoordinates, CepGeoResult } from '../services/cepGeoService';

interface CepConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseCoordinates?: (result: CepGeoResult) => void;
}

export const CepConverterModal: React.FC<CepConverterModalProps> = ({
  isOpen,
  onClose,
  onUseCoordinates,
}) => {
  const [cepInput, setCepInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CepGeoResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick preset CEPs from concession territories
  const PRESET_CEPS = [
    { label: 'Niterói (CAN)', cep: '24020-091' },
    { label: 'Rio de Janeiro / Bangu (RIOMAIS)', cep: '21820-005' },
    { label: 'Cuiabá (CAC)', cep: '78005-100' },
    { label: 'Jaú (JAHU)', cep: '17201-000' },
    { label: 'Nova Friburgo (CANF)', cep: '28610-000' },
    { label: 'Araruama (CAJ)', cep: '28970-000' },
  ];

  if (!isOpen) return null;

  const handleFormatCep = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    if (raw.length > 5) {
      return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }
    return raw;
  };

  const handleConvert = async (cepToTest?: string) => {
    const target = (cepToTest || cepInput).trim();
    if (!target) {
      setError('Por favor, informe um CEP válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const geo = await convertCepToCoordinates(target);
      setResult(geo);
    } catch (err) {
      setError((err as Error).message || 'Erro ao converter CEP.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCoords = () => {
    if (!result) return;
    const str = `${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`;
    navigator.clipboard.writeText(str);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm">
                Conversor de CEP para Latitude & Longitude
              </h2>
              <p className="text-[11px] text-slate-400">
                Geocodificação de endereços brasileiros para mapeamento de infraestrutura
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Quick presets */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Exemplos de CEPs em Concessões:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CEPS.map((p) => (
                <button
                  key={p.cep}
                  type="button"
                  onClick={() => {
                    setCepInput(p.cep);
                    handleConvert(p.cep);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] font-mono border border-slate-700 transition"
                >
                  {p.label}: {p.cep}
                </button>
              ))}
            </div>
          </div>

          {/* Input & Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConvert();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Informe o CEP (ex: 24020-091)"
                value={cepInput}
                onChange={(e) => setCepInput(handleFormatCep(e.target.value))}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition text-xs shadow-md"
            >
              {loading ? (
                <span className="animate-spin text-sm">⌛</span>
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Converter</span>
            </button>
          </form>

          {/* Error notice */}
          {error && (
            <div className="bg-rose-950/60 border border-rose-600/50 text-rose-200 p-3 rounded-lg text-xs flex items-center gap-2">
              <span className="text-rose-400 font-bold">✕</span>
              <span>{error}</span>
            </div>
          )}

          {/* Geocoding Result Card */}
          {result && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Coordenadas Geocodificadas</span>
                </span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono px-2 py-0.5 rounded border border-cyan-800">
                  Fonte: {result.source}
                </span>
              </div>

              {/* Coordinates highlight */}
              <div className="grid grid-cols-2 gap-3 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                    Latitude
                  </div>
                  <div className="font-mono text-sm font-extrabold text-cyan-400">
                    {result.lat.toFixed(6)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                    Longitude
                  </div>
                  <div className="font-mono text-sm font-extrabold text-cyan-400">
                    {result.lng.toFixed(6)}
                  </div>
                </div>
              </div>

              {/* Address details */}
              <div className="space-y-1 text-xs">
                <div className="text-slate-200">
                  <span className="text-slate-400 font-medium">Endereço: </span>
                  <strong>{result.street || 'Logradouro não informado'}</strong>
                </div>
                {result.neighborhood && (
                  <div className="text-slate-300">
                    <span className="text-slate-400 font-medium">Bairro: </span>
                    <span>{result.neighborhood}</span>
                  </div>
                )}
                <div className="text-slate-300">
                  <span className="text-slate-400 font-medium">Município / UF: </span>
                  <strong className="text-white">{result.city} - {result.state}</strong>
                </div>
                {result.suggestedConcession && (
                  <div className="text-purple-300 flex items-center gap-1.5 pt-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Concessão Provável: </span>
                    <strong className="font-mono font-bold">{result.suggestedConcession}</strong>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyCoords}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-3 rounded-lg border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Lat/Lng'}</span>
                </button>

                {onUseCoordinates && (
                  <button
                    type="button"
                    onClick={() => {
                      onUseCoordinates(result);
                      onClose();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-3 rounded-lg shadow-md transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Usar em Nova Localidade</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
