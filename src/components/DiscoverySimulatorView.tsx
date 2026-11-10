import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  Split,
  GitMerge,
  Server,
  Zap,
  HelpCircle
} from 'lucide-react';
import { CollectionRun, IdentityReviewItem } from '../types';
import { runIncrementalDiscoverySimulation } from '../services/reconciliation';
import { DatabaseService } from '../services/database';

interface DiscoverySimulatorViewProps {
  collectionRuns: CollectionRun[];
  reviewQueue: IdentityReviewItem[];
  onRefreshData: () => void;
  canEdit: boolean;
}

export const DiscoverySimulatorView: React.FC<DiscoverySimulatorViewProps> = ({
  collectionRuns,
  reviewQueue,
  onRefreshData,
  canEdit,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const handleTriggerRun = () => {
    setIsRunning(true);
    setLastMessage(null);

    setTimeout(() => {
      const result = runIncrementalDiscoverySimulation();
      setIsRunning(false);
      setLastMessage(
        `Coleta finalizada! ${result.activeCount} ativos ativos observados. ${
          result.newlyMissingCount > 0 ? `${result.newlyMissingCount} ativos viraram MISSING.` : ''
        } ${result.recoveredCount > 0 ? `${result.recoveredCount} ativos recuperados para ACTIVE.` : ''}`
      );
      onRefreshData();
    }, 600);
  };

  const handleResolveReview = (id: string, action: 'merge' | 'reject') => {
    DatabaseService.resolveIdentityReview(id, action);
    onRefreshData();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <span>Motor de Descoberta Ativa e Reconciliação de Identidade</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reconciliação determinística multi-camada com score de confiança e ciclo de vida de ativos.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleTriggerRun}
            disabled={isRunning}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-lg shadow-cyan-900/30 transition"
          >
            <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executando Varredura SNMP/LLDP...' : 'Disparar Coleta Incremental Agora'}</span>
          </button>
        )}
      </div>

      {lastMessage && (
        <div className="bg-cyan-950/70 border border-cyan-600/70 text-cyan-200 text-xs p-3 rounded-xl mb-6 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{lastMessage}</span>
        </div>
      )}

      {/* Architecture Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Regra de Identidade e Reconciliação</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Algoritmo em camadas: Serial+Modelo (1.00) e MAC (0.95) vinculam automaticamente. IP+Site (0.75) e similaridade textual vão para a <strong>fila de revisão manual</strong>.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
            <Clock className="w-4 h-4" />
            <span>Regra dos 3 Ciclos de Ausência</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Nenhum ativo é deletado automaticamente. Se não responder em <strong>3 coletas consecutivas</strong>, seu status muda para <code>missing</code> com notificação de auditoria.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
            <Layers className="w-4 h-4" />
            <span>Regra de Ouro (Estado Observado)</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Nunca mistura dados voláteis de CPU/tráfego com o inventário. O RedeMap armazena apenas identidade durável, relações topológicas e histórico de evidências.
          </p>
        </div>
      </div>

      {/* Identity Review Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-white text-sm">
              Fila de Revisão Manual de Identidades Ambíguas
            </h2>
          </div>
          <span className="text-xs bg-yellow-950 text-yellow-300 px-2 py-0.5 rounded border border-yellow-800 font-semibold">
            {reviewQueue.length} itens pendentes
          </span>
        </div>

        {reviewQueue.length > 0 ? (
          <div className="space-y-3">
            {reviewQueue.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{item.candidateName}</span>
                    <span className="text-[10px] text-slate-400">↔</span>
                    <span className="text-xs font-bold text-cyan-300">{item.matchedAssetName}</span>
                    <span className="text-[10px] bg-yellow-950 text-yellow-400 border border-yellow-800 px-1.5 py-0.2 rounded font-mono">
                      Score: {(item.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Localidade: <strong>{item.siteName}</strong> • IP: <code>{item.candidateIp}</code>
                  </p>

                  <div className="text-[11px] text-slate-300">
                    Evidências: {item.reasons.join(' • ')}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResolveReview(item.id, 'merge')}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Mesclar Ativo (Merge)</span>
                    </button>
                    <button
                      onClick={() => handleResolveReview(item.id, 'reject')}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition"
                    >
                      <Split className="w-3.5 h-3.5" />
                      <span>Separar (Novo Ativo)</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            Nenhuma divergência ou colisão de identidade pendente na fila de revisão.
          </div>
        )}
      </div>

      {/* Collection Runs History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h2 className="font-bold text-white text-sm mb-3 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Histórico de Execuções de Coleta (Collection Runs)</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Fonte / Job</th>
                <th className="py-2.5 px-3">Início</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Atualizados</th>
                <th className="py-2.5 px-3">Ausentes (Missing)</th>
                <th className="py-2.5 px-3">Enlaces Encontrados</th>
                <th className="py-2.5 px-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {collectionRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-semibold text-white">{run.sourceName}</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(run.startedAt).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                        run.status === 'success'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{run.stats.updated}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{run.stats.missing}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-bold">{run.stats.linksFound}</td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                    {run.details.join('; ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
