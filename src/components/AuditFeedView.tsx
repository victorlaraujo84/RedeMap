import React, { useState } from 'react';
import {
  History,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Check,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ChangeEvent } from '../types';
import { DatabaseService } from '../services/database';

interface AuditFeedViewProps {
  changeEvents: ChangeEvent[];
  onRefreshData: () => void;
  canEdit: boolean;
}

export const AuditFeedView: React.FC<AuditFeedViewProps> = ({
  changeEvents,
  onRefreshData,
  canEdit,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredEvents = changeEvents.filter((event) => {
    const matchSev = severityFilter === 'all' || event.severity === severityFilter;
    const matchType = typeFilter === 'all' || event.entityType === typeFilter;
    return matchSev && matchType;
  });

  const handleAcknowledge = (id: string) => {
    DatabaseService.acknowledgeEvent(id);
    onRefreshData();
  };

  const handleAcknowledgeAll = () => {
    DatabaseService.acknowledgeAllEvents();
    onRefreshData();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" />
            <span>Feed de Mudanças e Auditoria (Change Log)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro append-only de alterações de topologia, mudanças de IP, enlaces inoperantes e ativos ausentes.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleAcknowledgeAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Reconhecer Todos os Alertas</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Severidades</option>
            <option value="critical">🔴 Crítico</option>
            <option value="warning">🟡 Alerta / Atenção</option>
            <option value="info">🔵 Informativo</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Tipos de Entidade</option>
            <option value="asset">Ativos (Assets)</option>
            <option value="link">Enlaces (Links)</option>
            <option value="site">Localidades (Sites)</option>
            <option value="identity">Identidades Reconciliadas</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Exibindo <strong className="text-cyan-400">{filteredEvents.length}</strong> eventos
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-3">
        {filteredEvents.map((event) => {
          let sevColor = 'bg-blue-950/70 border-blue-700/60 text-blue-300';
          let icon = <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;

          if (event.severity === 'warning') {
            sevColor = 'bg-amber-950/60 border-amber-700/60 text-amber-300';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
          } else if (event.severity === 'critical') {
            sevColor = 'bg-rose-950/60 border-rose-700/60 text-rose-300';
            icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={event.id}
              className={`border rounded-xl p-4 transition ${sevColor} ${
                event.acknowledged ? 'opacity-70 bg-slate-900/40 border-slate-800' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {icon}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-xs">{event.entityName}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {event.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(event.detectedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 mb-2 leading-relaxed">{event.details}</p>

                    {/* Before / After Diff */}
                    {(event.before || event.after) && (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono flex items-center gap-3 text-slate-300">
                        {event.before && (
                          <div className="text-rose-400">
                            Antes: {JSON.stringify(event.before)}
                          </div>
                        )}
                        {event.before && event.after && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        {event.after && (
                          <div className="text-emerald-400">
                            Depois: {JSON.stringify(event.after)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {canEdit && !event.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(event.id)}
                    className="shrink-0 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Reconhecer</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            Nenhum evento registrado com os filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
};
