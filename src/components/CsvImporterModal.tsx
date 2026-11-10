import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, RefreshCw, X, Play, FileSpreadsheet } from 'lucide-react';
import { parseInventoryCsv, SAMPLE_CSV_DATA, CsvImportReport } from '../services/csvParser';

interface CsvImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (report: CsvImportReport) => void;
}

export const CsvImporterModal: React.FC<CsvImporterModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<CsvImportReport | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setReport(null);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setCsvContent(SAMPLE_CSV_DATA);
    setReport(null);
  };

  const handleRunImport = () => {
    if (!csvContent.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      const result = parseInventoryCsv(csvContent);
      setReport(result);
      setIsProcessing(false);
      onImportComplete(result);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="font-bold text-white text-base">
                Importador de Inventário por Localidade (CSV/XLSX)
              </h2>
              <p className="text-[11px] text-slate-400">
                Padrão de contrato oficial: <code className="text-cyan-300 font-mono">Hostname; TIPO; Operadora; Localidade</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!report ? (
            <>
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-5 text-center transition bg-slate-950/40">
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium mb-1">
                  Arraste seu arquivo CSV ou clique para selecionar
                </p>
                <p className="text-[10px] text-slate-500 mb-3">
                  Formatos suportados: CSV, TXT delimitado por ponto e vírgula ou vírgula
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-file-input"
                />
                <div className="flex items-center justify-center gap-2">
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg border border-slate-700 transition"
                  >
                    Selecionar Arquivo
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    Carregar Dados de Exemplo
                  </button>
                </div>
              </div>

              {/* Paste or Edit Textarea */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Ou cole o conteúdo CSV diretamente aqui:
                </label>
                <textarea
                  rows={8}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`Hostname;TIPO;Operadora;Localidade\nSP-DC01-RTR01;ROUTER;Cirion;São Paulo - DC Barueri\nRJ-POP01-SW01;SWITCH;Embratel;Rio de Janeiro - DC Botafogo`}
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-500">
                  A importação é 100% idempotente: reprocessar o mesmo arquivo não duplica ativos.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRunImport}
                    disabled={!csvContent.trim() || isProcessing}
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Executar Ingestão</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Result Report */
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                <h3 className="font-bold text-white text-base">Ingestão Concluída com Sucesso!</h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Os ativos foram reconciliados e salvos no banco de dados.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-center">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Total Linhas</div>
                  <div className="text-lg font-bold text-white">{report.totalRows}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Novos Ativos</div>
                  <div className="text-lg font-bold text-emerald-400">+{report.createdAssets}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Atualizados</div>
                  <div className="text-lg font-bold text-cyan-400">{report.updatedAssets}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Inalterados</div>
                  <div className="text-lg font-bold text-slate-300">{report.unchangedAssets}</div>
                </div>
              </div>

              {report.createdSites > 0 && (
                <div className="bg-cyan-950/40 border border-cyan-800/60 p-3 rounded-lg text-xs text-cyan-300">
                  ℹ️ <strong>{report.createdSites}</strong> novas localidades foram criadas automaticamente com coordenadas geocodificadas para o mapa.
                </div>
              )}

              {report.errors.length > 0 && (
                <div className="bg-rose-950/60 border border-rose-700/60 p-3 rounded-lg text-xs text-rose-300 space-y-1">
                  <div className="font-bold">Avisos e Erros encontrados:</div>
                  {report.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setReport(null)}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Importar Outro Arquivo
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg"
                >
                  Concluir e Ver no Mapa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
