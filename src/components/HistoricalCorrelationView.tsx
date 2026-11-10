import React, { useState, useMemo } from 'react';
import {
  History,
  CloudRain,
  Wind,
  AlertTriangle,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Building2,
  Activity,
  Layers,
  RotateCcw
} from 'lucide-react';
import { HistoricalAlarm, Incident, ConcessionCode, UnitType, SystemSettings } from '../types';
import { parseAlertasCsv, parseIncidentesCsv, correlateAlarmWithWeather } from '../services/correlationEngine';
import { DatabaseService } from '../services/database';

interface HistoricalCorrelationViewProps {
  alarms: HistoricalAlarm[];
  incidents: Incident[];
  settings: SystemSettings;
  onRefreshData: () => void;
  canEdit: boolean;
}

export const HistoricalCorrelationView: React.FC<HistoricalCorrelationViewProps> = ({
  alarms,
  incidents,
  settings,
  onRefreshData,
  canEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'alarms' | 'incidents'>('alarms');
  const [search, setSearch] = useState('');
  const [selectedConcession, setSelectedConcession] = useState<string>('all');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('all');
  const [selectedCorrelation, setSelectedCorrelation] = useState<string>('all');
  const [expandedAlarmId, setExpandedAlarmId] = useState<string | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'alertas' | 'incidentes'>('alertas');
  const [csvText, setCsvText] = useState('');

  // Re-correlate all alarms if settings changed
  const correlatedAlarms = useMemo(() => {
    return alarms.map((alarm) => {
      const updatedCorr = correlateAlarmWithWeather(
        {
          alarme: alarm.alarme,
          dispositivo: alarm.dispositivo,
          horarioInicial: alarm.horarioInicial,
          localidade: alarm.localidade,
          comentarios: alarm.comentarios,
        },
        settings
      );
      return {
        ...alarm,
        correlation: updatedCorr,
      };
    });
  }, [alarms, settings]);

  const filteredAlarms = useMemo(() => {
    return correlatedAlarms.filter((item) => {
      const matchSearch =
        item.alarme.toLowerCase().includes(search.toLowerCase()) ||
        item.dispositivo.toLowerCase().includes(search.toLowerCase()) ||
        item.localidade.toLowerCase().includes(search.toLowerCase()) ||
        item.ticket.toLowerCase().includes(search.toLowerCase());

      const matchConcession =
        selectedConcession === 'all' || item.concession === selectedConcession;
      const matchUnit =
        selectedUnitType === 'all' || item.unitType === selectedUnitType;
      const matchCorr =
        selectedCorrelation === 'all' ||
        item.correlation?.classification === selectedCorrelation;

      return matchSearch && matchConcession && matchUnit && matchCorr;
    });
  }, [correlatedAlarms, search, selectedConcession, selectedUnitType, selectedCorrelation]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleExecuteUpload = () => {
    if (!csvText.trim()) return;

    if (uploadType === 'alertas') {
      const parsedAlarms = parseAlertasCsv(csvText, settings);
      DatabaseService.addHistoricalAlarms(parsedAlarms);
    } else {
      const parsedIncidents = parseIncidentesCsv(csvText, settings);
      DatabaseService.addIncidents(parsedIncidents);
    }

    setIsUploadOpen(false);
    setCsvText('');
    onRefreshData();
  };

  // Metrics summary
  const probableCount = correlatedAlarms.filter(
    (a) => a.correlation?.classification === 'provavel'
  ).length;
  const possibleCount = correlatedAlarms.filter(
    (a) => a.correlation?.classification === 'possivel'
  ).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" />
            <span>Avaliação Histórica de Alarmes em Dias com Eventos Climáticos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Correlação entre ocorrências de rede (modelo-alertas/incidentes) e registros de estações INMET, alertas CEMADEN e chuva/vento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => {
                setCsvText('');
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-lg shadow-cyan-950/40 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV de Alarmes/Incidentes</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
            Total Ocorrências Avaliadas
          </div>
          <div className="text-2xl font-bold text-white font-mono">{correlatedAlarms.length}</div>
        </div>

        <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">
            Causa Climática Provável (≥ 0.70)
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {probableCount}
            <span className="text-xs text-slate-400 ml-1 font-sans">
              ({((probableCount / (correlatedAlarms.length || 1)) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-800/40 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">
            Causa Climática Possível (0.40–0.69)
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {possibleCount}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-cyan-400 mb-1">
            Concessões com Ocorrências
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {new Set(correlatedAlarms.map((a) => a.concession)).size}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por alarme, dispositivo, ticket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Concession Filter */}
          <select
            value={selectedConcession}
            onChange={(e) => setSelectedConcession(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-semibold"
          >
            <option value="all">Todas as Concessões ({settings.concessionsList.length})</option>
            {settings.concessionsList.map((c) => (
              <option key={c} value={c}>
                Concessão {c}
              </option>
            ))}
          </select>

          {/* Unit Type Filter */}
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

          {/* Correlation filter */}
          <select
            value={selectedCorrelation}
            onChange={(e) => setSelectedCorrelation(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Vereditos</option>
            <option value="provavel">🟢 Provável (≥ 0.70)</option>
            <option value="possivel">🟡 Possível (0.40 - 0.69)</option>
            <option value="improvavel">⚪ Improvável (&lt; 0.40)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Exibindo <strong className="text-cyan-400">{filteredAlarms.length}</strong> alarmes
        </div>
      </div>

      {/* Alarms Correlation List */}
      <div className="space-y-3">
        {filteredAlarms.map((item) => {
          const isExpanded = expandedAlarmId === item.id;
          const score = item.correlation?.score ?? 0;
          const classification = item.correlation?.classification ?? 'improvavel';

          let scoreBadge = 'bg-slate-800 text-slate-400 border-slate-700';
          let borderAccent = 'border-slate-800';
          if (classification === 'provavel') {
            scoreBadge = 'bg-emerald-950 text-emerald-300 border-emerald-700/80';
            borderAccent = 'border-emerald-800/40 hover:border-emerald-700';
          } else if (classification === 'possivel') {
            scoreBadge = 'bg-amber-950 text-amber-300 border-amber-700/80';
            borderAccent = 'border-amber-800/40 hover:border-amber-700';
          }

          return (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-xl overflow-hidden transition shadow ${borderAccent}`}
            >
              <div
                onClick={() => setExpandedAlarmId(isExpanded ? null : item.id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">{item.alarme}</span>
                    <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded font-mono font-bold">
                      {item.concession}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        item.unitType === 'OPERACIONAL'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : item.unitType === 'SEDE'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.unitType}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • {item.localidade} • {item.dispositivo}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                    <span>Início: <strong className="text-slate-300">{item.horarioInicial}</strong></span>
                    <span>Duração: <strong className="text-slate-300">{item.duracaoMinutos} min</strong></span>
                    <span>Operadora: <strong className="text-slate-300">{item.operadora}</strong></span>
                    {item.ticket && (
                      <span className="text-cyan-400 font-mono font-semibold">
                        Ticket {item.ticket}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Correlação Climática</div>
                    <div
                      className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${scoreBadge}`}
                    >
                      Score: {(score * 100).toFixed(0)}% ({classification.toUpperCase()})
                    </div>
                  </div>

                  <div className="text-slate-400 p-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Correlation Breakdown & Evidences */}
              {isExpanded && (
                <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 text-cyan-400" />
                      <span>Evidências Meteorológicas no Momento da Ocorrência:</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                      {item.correlation?.summaryEvidence}
                    </p>
                  </div>

                  {/* Signals List */}
                  {item.correlation?.signals && item.correlation.signals.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                        Sinais Acionados na Matriz de Pesos:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {item.correlation.signals.map((sig, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-white">{sig.name}</span>
                              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                                Peso: +{sig.weight.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{sig.evidence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments from Ticket / NOC */}
                  {item.comentarios && (
                    <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <strong>Comentários do Ticket / NOC:</strong> {item.comentarios}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredAlarms.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            Nenhum alarme encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Upload Modal for modelo-alertas / modelo-incidentes */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">
                  Importar CSV Histórico (Alertas / Incidentes)
                </h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUploadType('alertas')}
                  className={`flex-1 py-2 rounded-lg font-semibold border transition ${
                    uploadType === 'alertas'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Modelo Alertas (Quedas de Link)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('incidentes')}
                  className={`flex-1 py-2 rounded-lg font-semibold border transition ${
                    uploadType === 'incidentes'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Modelo Incidentes (JIRA/Tickets)
                </button>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Selecione o arquivo CSV ({uploadType === 'alertas' ? 'modelo-alertas.csv' : 'modelo-incidentes.csv'}):
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Ou cole o conteúdo CSV abaixo:
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`"Alarme";"Dispositivo";"Responsável";"Horário Inicial";"Localidade"\n"Queda de link";"LINK-CAN-01";"noc";"01/10/2026 10:00:00";"Niterói"`}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUpload}
                  disabled={!csvText.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-lg transition"
                >
                  Processar e Correlacionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
