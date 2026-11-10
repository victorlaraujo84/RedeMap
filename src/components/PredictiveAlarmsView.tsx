import React, { useState } from 'react';
import {
  AlertTriangle,
  CloudLightning,
  Wind,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Server,
  Zap,
  Play,
  Check,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import { PredictiveWeatherAlarm, ConcessionCode, UnitType, SystemSettings, Site, WeatherData } from '../types';
import { generatePredictiveAlarms } from '../services/predictiveEngine';
import { DatabaseService } from '../services/database';

interface PredictiveAlarmsViewProps {
  predictiveAlarms: PredictiveWeatherAlarm[];
  sites: Site[];
  weatherMap: Record<string, WeatherData>;
  settings: SystemSettings;
  onRefreshData: () => void;
  canEdit: boolean;
}

export const PredictiveAlarmsView: React.FC<PredictiveAlarmsViewProps> = ({
  predictiveAlarms,
  sites,
  weatherMap,
  settings,
  onRefreshData,
  canEdit,
}) => {
  const [search, setSearch] = useState('');
  const [selectedConcession, setSelectedConcession] = useState<string>('all');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);

  // Generate / refresh predictive alarms from current weather forecast
  const handleRunPredictiveScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const generated = generatePredictiveAlarms(sites, weatherMap, settings);
      DatabaseService.setPredictiveAlarms(generated);
      setIsScanning(false);
      onRefreshData();
    }, 400);
  };

  const handleAcknowledge = (id: string) => {
    DatabaseService.acknowledgePredictiveAlarm(id);
    onRefreshData();
  };

  const filteredAlarms = predictiveAlarms.filter((alarm) => {
    const matchSearch =
      alarm.siteName.toLowerCase().includes(search.toLowerCase()) ||
      alarm.concession.toLowerCase().includes(search.toLowerCase());
    const matchConcession =
      selectedConcession === 'all' || alarm.concession === selectedConcession;
    const matchUnit =
      selectedUnitType === 'all' || alarm.unitType === selectedUnitType;
    const matchSev =
      selectedSeverity === 'all' || alarm.severity === selectedSeverity;

    return matchSearch && matchConcession && matchUnit && matchSev;
  });

  const criticalCount = predictiveAlarms.filter((a) => a.severity === 'critical').length;
  const operationalRiskCount = predictiveAlarms.filter((a) => a.unitType === 'OPERACIONAL').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CloudLightning className="w-6 h-6 text-yellow-400" />
            <span>Radar de Alarmes Preditivos por Previsão Climática (Early Warning)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Geração antecipada de alertas operacionais nas próximas 24h a 72h com base na previsão do tempo e limiares customizados.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleRunPredictiveScan}
            disabled={isScanning}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-amber-950/40 transition"
          >
            <Zap className={`w-4 h-4 fill-current ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Varrendo Previsão 72h...' : 'Recalcular Risco Preditivo Agora'}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
            Total Alarmes Preditivos Ativos
          </div>
          <div className="text-2xl font-bold text-white font-mono">{predictiveAlarms.length}</div>
        </div>

        <div className="bg-slate-900 border border-rose-800/40 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">
            Risco Crítico Iminente (≥ 75%)
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{criticalCount}</div>
        </div>

        <div className="bg-slate-900 border border-purple-800/40 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-purple-400 mb-1">
            Unidades Operacionais em Risco (ETAs/ETEs)
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {operationalRiskCount}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-cyan-400 mb-1">
            Janela de Antecedência
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">24h a 72h</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por localidade ou concessão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedConcession}
            onChange={(e) => setSelectedConcession(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-semibold"
          >
            <option value="all">Todas as Concessões</option>
            {settings.concessionsList.map((c) => (
              <option key={c} value={c}>
                Concessão {c}
              </option>
            ))}
          </select>

          <select
            value={selectedUnitType}
            onChange={(e) => setSelectedUnitType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Tipos de Unidade</option>
            <option value="OPERACIONAL">OPERACIONAL (ETAs, ETEs, Elevatórias)</option>
            <option value="SEDE">SEDE (Central/Administrativo)</option>
            <option value="LOJA">LOJA (Comercial/Atendimento)</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Severidades</option>
            <option value="critical">🔴 Crítico (Risco Alto)</option>
            <option value="warning">🟡 Alerta (Risco Moderado)</option>
            <option value="info">🔵 Preventivo</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Listando <strong className="text-yellow-400">{filteredAlarms.length}</strong> alertas preventivos
        </div>
      </div>

      {/* Alarms Feed */}
      <div className="space-y-4">
        {filteredAlarms.map((alarm) => {
          let sevColor = 'border-slate-800 bg-slate-900';
          let badgeColor = 'bg-blue-950 text-blue-300 border-blue-700';

          if (alarm.severity === 'critical') {
            sevColor = 'border-rose-700/60 bg-rose-950/20';
            badgeColor = 'bg-rose-950 text-rose-300 border-rose-700';
          } else if (alarm.severity === 'warning') {
            sevColor = 'border-amber-700/60 bg-amber-950/20';
            badgeColor = 'bg-amber-950 text-amber-300 border-amber-700';
          }

          return (
            <div
              key={alarm.id}
              className={`border rounded-2xl p-5 transition shadow-lg ${sevColor} ${
                alarm.status === 'acknowledged' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-base font-bold text-white">{alarm.siteName}</span>
                    <span className="text-xs font-mono font-bold bg-slate-800 text-cyan-300 px-2 py-0.5 rounded">
                      {alarm.concession}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        alarm.unitType === 'OPERACIONAL'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : alarm.unitType === 'SEDE'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {alarm.unitType}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColor}`}
                    >
                      {alarm.severity.toUpperCase()} • Risco {alarm.riskScore}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Janela de Previsão de Impacto: <strong className="text-white">{alarm.forecastWindow}</strong></span>
                    <span>• Condição: <strong className="text-slate-200">{alarm.condition}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && alarm.status !== 'acknowledged' && (
                    <button
                      onClick={() => handleAcknowledge(alarm.id)}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reconhecer Alarme</span>
                    </button>
                  )}
                  {alarm.status === 'acknowledged' && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reconhecido</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Gatilhos Detectados */}
              <div className="mb-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Fatores Críticos Detectados na Previsão:
                </div>
                <div className="flex flex-wrap gap-2">
                  {alarm.triggerReasons.map((reason, rIdx) => (
                    <div
                      key={rIdx}
                      className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-amber-200 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist de Mitigação Preventiva */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="text-[11px] font-bold text-emerald-400 uppercase mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ações Preventivas Recomendadas para a Concessionária (NOC & Campo):</span>
                </div>
                <div className="space-y-1.5">
                  {alarm.recommendedMitigations.map((action, aIdx) => (
                    <div key={aIdx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {filteredAlarms.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl p-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="text-white font-bold text-sm">Sem Alarmes Preditivos no Momento</div>
            <p className="text-slate-400 mt-1 max-w-md mx-auto">
              Nenhuma condição meteorológica nas próximas 72 horas ultrapassa os limiares de risco configurados para as unidades das concessões.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
