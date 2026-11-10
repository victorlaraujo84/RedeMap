import React, { useState } from 'react';
import {
  Server,
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  Edit2,
  Eye,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Building2
} from 'lucide-react';
import { Asset, AssetCategory, AssetStatus, Site, CategoryItem } from '../types';
import { exportInventoryToCsv } from '../services/csvParser';
import { DEFAULT_CATEGORIES } from '../services/database';

interface AssetInventoryViewProps {
  assets: Asset[];
  sites: Site[];
  categories?: CategoryItem[];
  onSaveAsset: (asset: Partial<Asset> & { name: string; siteId: string; category: AssetCategory }) => void;
  onDeleteAsset: (id: string) => void;
  canEdit: boolean;
}

export const AssetInventoryView: React.FC<AssetInventoryViewProps> = ({
  assets,
  sites,
  categories = DEFAULT_CATEGORIES,
  onSaveAsset,
  onDeleteAsset,
  canEdit,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [inspectingAsset, setInspectingAsset] = useState<Asset | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSiteId, setFormSiteId] = useState(sites[0]?.id || '');
  const [formCategory, setFormCategory] = useState<AssetCategory>('router');
  const [formManufacturer, setFormManufacturer] = useState('Cisco');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formOperadora, setFormOperadora] = useState('Vivo');

  const siteMap = React.useMemo(() => {
    const map: Record<string, Site> = {};
    sites.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [sites]);

  const filteredAssets = assets.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.mgmtIp.includes(search) ||
      a.serial.toLowerCase().includes(search.toLowerCase()) ||
      a.model.toLowerCase().includes(search.toLowerCase()) ||
      (a.metadata.operadora && String(a.metadata.operadora).toLowerCase().includes(search.toLowerCase()));

    const matchSite = selectedSite === 'all' || a.siteId === selectedSite;
    const matchCat = selectedCategory === 'all' || a.category === selectedCategory;
    const matchStatus = selectedStatus === 'all' || a.status === selectedStatus;

    return matchSearch && matchSite && matchCat && matchStatus;
  });

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setFormName('');
    setFormSiteId(sites[0]?.id || '');
    setFormCategory('router');
    setFormManufacturer('Cisco');
    setFormModel('ASR 9000');
    setFormSerial(`SER-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setFormIp(`10.200.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}`);
    setFormOperadora('Vivo');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormSiteId(asset.siteId);
    setFormCategory(asset.category);
    setFormManufacturer(asset.manufacturer);
    setFormModel(asset.model);
    setFormSerial(asset.serial);
    setFormIp(asset.mgmtIp);
    setFormOperadora((asset.metadata.operadora as string) || 'Vivo');
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSiteId) return;

    onSaveAsset({
      id: editingAsset?.id,
      name: formName.trim(),
      siteId: formSiteId,
      category: formCategory,
      manufacturer: formManufacturer,
      model: formModel.trim() || 'Desconhecido',
      serial: formSerial.trim() || `SN-${Date.now()}`,
      mgmtIp: formIp.trim() || '10.0.0.1',
      metadata: {
        operadora: formOperadora,
      },
    });

    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    const csvContent = exportInventoryToCsv(filteredAssets, sites);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `redemap_inventario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-cyan-400" />
            <span>Inventário de Ativos de Rede Observados</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Roteadores, switches, firewalls e servidores reconciliados no banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Exportar CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-lg shadow-cyan-950/40 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Ativo</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por hostname, IP, modelo, serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white w-64 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-semibold"
          >
            <option value="all">Todas as Categorias ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">🟢 Ativo (Active)</option>
            <option value="missing">🟡 Ausente (Missing)</option>
            <option value="maintenance">🔵 Manutenção</option>
            <option value="retired">⚪ Desativado</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Listando <strong className="text-cyan-400">{filteredAssets.length}</strong> de{' '}
          {assets.length} ativos
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Hostname / Ativo</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Localidade (Site)</th>
                <th className="py-3 px-4">IP Gerência</th>
                <th className="py-3 px-4">Modelo / Fabricante</th>
                <th className="py-3 px-4">Operadora</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Confiança</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAssets.map((asset) => {
                const site = siteMap[asset.siteId];

                return (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            asset.status === 'active'
                              ? 'bg-emerald-400'
                              : asset.status === 'missing'
                              ? 'bg-amber-400'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span>{asset.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 uppercase font-mono text-[11px] text-slate-300">
                      {asset.category}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {site?.name || 'Local não encontrado'}
                    </td>

                    <td className="py-3 px-4 font-mono text-cyan-400 font-semibold">
                      {asset.mgmtIp}
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      {asset.manufacturer} {asset.model}
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[10px]">
                        {(asset.metadata.operadora as string) || site?.operators[0] || 'Própria'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                          asset.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : asset.status === 'missing'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {(asset.confidence * 100).toFixed(0)}%
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setInspectingAsset(asset)}
                          title="Inspecionar Detalhes"
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(asset)}
                              title="Editar Ativo"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Remover o ativo "${asset.name}" do inventário?`)) {
                                  onDeleteAsset(asset.id);
                                }
                              }}
                              title="Excluir Ativo"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhum ativo encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Inspection Modal */}
      {inspectingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs uppercase font-mono text-cyan-400 font-bold">
                  {inspectingAsset.category}
                </span>
                <h3 className="text-lg font-bold text-white">{inspectingAsset.name}</h3>
              </div>
              <button
                onClick={() => setInspectingAsset(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Localidade:</span>
                <span className="text-white font-medium">
                  {siteMap[inspectingAsset.siteId]?.name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">IP de Gerência:</span>
                <span className="font-mono text-cyan-400">{inspectingAsset.mgmtIp}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Fabricante / Modelo:</span>
                <span className="text-slate-200">
                  {inspectingAsset.manufacturer} {inspectingAsset.model}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Número de Série:</span>
                <span className="font-mono text-slate-300">{inspectingAsset.serial}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Status Observado:</span>
                <span className="uppercase font-bold text-emerald-400">
                  {inspectingAsset.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Primeira Descoberta:</span>
                <span className="text-slate-300">
                  {new Date(inspectingAsset.firstSeen).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Última Coleta:</span>
                <span className="text-slate-300">
                  {new Date(inspectingAsset.lastSeen).toLocaleString('pt-BR')}
                </span>
              </div>
              {inspectingAsset.metadata && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Metadados Observados:</span>
                  <pre className="bg-slate-950 p-2.5 rounded text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(inspectingAsset.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectingAsset(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-lg transition text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5">
            <h3 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800">
              {editingAsset ? 'Editar Ativo' : 'Cadastrar Novo Ativo no Inventário'}
            </h3>

            <form onSubmit={handleSaveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Hostname *</label>
                <input
                  type="text"
                  placeholder="Ex: SP-BAR-COR-03"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Localidade (Site) *</label>
                  <select
                    value={formSiteId}
                    onChange={(e) => setFormSiteId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Categoria *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AssetCategory)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Fabricante</label>
                  <input
                    type="text"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Modelo</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">IP de Gerência</label>
                  <input
                    type="text"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Operadora</label>
                  <input
                    type="text"
                    value={formOperadora}
                    onChange={(e) => setFormOperadora(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Número de Série</label>
                <input
                  type="text"
                  value={formSerial}
                  onChange={(e) => setFormSerial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
