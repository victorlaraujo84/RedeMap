import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Navigation,
  AlertCircle,
  History,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Server,
  Network,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Asset, NetworkLink, Site, TopologySnapshot } from '../types';

interface NetworkTopologyGraphProps {
  assets: Asset[];
  links: NetworkLink[];
  sites: Site[];
  snapshots: TopologySnapshot[];
  selectedSiteId?: string;
  onSelectAsset?: (asset: Asset) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const NetworkTopologyGraph: React.FC<NetworkTopologyGraphProps> = ({
  assets,
  links,
  sites,
  snapshots,
  selectedSiteId,
  onSelectAsset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Layout mode: 'site_cluster' | 'force' | 'hierarchical'
  const [layoutMode, setLayoutMode] = useState<'site_cluster' | 'force' | 'hierarchical'>('site_cluster');
  const [activeSiteFilter, setActiveSiteFilter] = useState<string>(selectedSiteId || 'all');
  const [concessionFilter, setConcessionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<Asset | null>(null);

  // Map site IDs to concession codes
  const siteConcessionMap = useMemo(() => {
    const map: Record<string, string> = {};
    sites.forEach((s) => {
      map[s.id] = s.concession || 'RIOMAIS';
    });
    return map;
  }, [sites]);

  // Pathfinder tool (BFS traceroute between two nodes)
  const [pathSourceId, setPathSourceId] = useState<string>('');
  const [pathTargetId, setPathTargetId] = useState<string>('');
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // Timeline slider
  const [snapshotIndex, setSnapshotIndex] = useState<number>(snapshots.length - 1);
  const activeSnapshot = snapshots[snapshotIndex] || null;

  // Node positions map
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Filter assets based on active site and search
  const visibleAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchSite = activeSiteFilter === 'all' || a.siteId === activeSiteFilter;
      const matchConcession = concessionFilter === 'all' || siteConcessionMap[a.siteId] === concessionFilter;
      const matchType = typeFilter === 'all' || a.category === typeFilter;
      const matchSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.mgmtIp.includes(searchQuery) ||
        a.model.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSite && matchConcession && matchType && matchSearch;
    });
  }, [assets, activeSiteFilter, concessionFilter, siteConcessionMap, typeFilter, searchQuery]);

  const visibleAssetIds = useMemo(() => new Set(visibleAssets.map((a) => a.id)), [visibleAssets]);

  // Filter links where both endpoints are visible
  const visibleLinks = useMemo(() => {
    return links.filter((l) => visibleAssetIds.has(l.aAssetId) && visibleAssetIds.has(l.bAssetId));
  }, [links, visibleAssetIds]);

  // Initial layout calculation
  useEffect(() => {
    const width = 1100;
    const height = 700;
    const newPositions: Record<string, { x: number; y: number }> = {};

    if (layoutMode === 'site_cluster') {
      // Group assets by site
      const siteGroups: Record<string, Asset[]> = {};
      visibleAssets.forEach((a) => {
        if (!siteGroups[a.siteId]) siteGroups[a.siteId] = [];
        siteGroups[a.siteId].push(a);
      });

      const siteIds = Object.keys(siteGroups);
      const cols = Math.ceil(Math.sqrt(siteIds.length)) || 1;

      siteIds.forEach((sId, sIdx) => {
        const col = sIdx % cols;
        const row = Math.floor(sIdx / cols);
        const clusterCenterX = 200 + col * 360;
        const clusterCenterY = 150 + row * 280;

        const group = siteGroups[sId];
        group.forEach((asset, aIdx) => {
          const angle = (aIdx / group.length) * 2 * Math.PI;
          const radius = group.length > 1 ? 80 : 0;
          newPositions[asset.id] = {
            x: clusterCenterX + Math.cos(angle) * radius,
            y: clusterCenterY + Math.sin(angle) * radius,
          };
        });
      });
    } else if (layoutMode === 'hierarchical') {
      // Hierarchy: Routers top, Switches mid, Servers/APs bottom
      const levels: Record<string, Asset[]> = {
        core: [],
        distribution: [],
        edge: [],
      };

      visibleAssets.forEach((a) => {
        if (a.category === 'router') levels.core.push(a);
        else if (a.category === 'switch' || a.category === 'firewall') levels.distribution.push(a);
        else levels.edge.push(a);
      });

      const rowY = { core: 120, distribution: 340, edge: 560 };

      Object.entries(levels).forEach(([lvl, list]) => {
        const y = rowY[lvl as keyof typeof rowY];
        const step = width / (list.length + 1);
        list.forEach((asset, idx) => {
          newPositions[asset.id] = {
            x: 80 + (idx + 1) * step,
            y,
          };
        });
      });
    } else {
      // Force / circular
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 260;

      visibleAssets.forEach((asset, idx) => {
        const angle = (idx / visibleAssets.length) * 2 * Math.PI;
        newPositions[asset.id] = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        };
      });
    }

    setPositions(newPositions);
  }, [visibleAssets, layoutMode]);

  // Spanning Tree / Loop Detection
  const detectedLoops = useMemo(() => {
    // Basic cycle detection in undirected graph
    const adj: Record<string, string[]> = {};
    visibleLinks.forEach((l) => {
      if (!adj[l.aAssetId]) adj[l.aAssetId] = [];
      if (!adj[l.bAssetId]) adj[l.bAssetId] = [];
      adj[l.aAssetId].push(l.bAssetId);
      adj[l.bAssetId].push(l.aAssetId);
    });

    const visited: Record<string, boolean> = {};
    const parent: Record<string, string | null> = {};
    let cycleFound = false;

    function dfs(u: string, p: string | null): boolean {
      visited[u] = true;
      parent[u] = p;

      for (const v of adj[u] || []) {
        if (!visited[v]) {
          if (dfs(v, u)) return true;
        } else if (v !== p) {
          return true; // cycle detected
        }
      }
      return false;
    }

    for (const node of visibleAssets) {
      if (!visited[node.id]) {
        if (dfs(node.id, null)) {
          cycleFound = true;
          break;
        }
      }
    }

    return cycleFound;
  }, [visibleAssets, visibleLinks]);

  // Pathfinder BFS calculation
  const calculatePath = () => {
    if (!pathSourceId || !pathTargetId || pathSourceId === pathTargetId) {
      setHighlightedPath([]);
      return;
    }

    const adj: Record<string, string[]> = {};
    visibleLinks.forEach((l) => {
      if (!adj[l.aAssetId]) adj[l.aAssetId] = [];
      if (!adj[l.bAssetId]) adj[l.bAssetId] = [];
      adj[l.aAssetId].push(l.bAssetId);
      adj[l.bAssetId].push(l.aAssetId);
    });

    const queue: string[] = [pathSourceId];
    const visited: Record<string, boolean> = { [pathSourceId]: true };
    const prev: Record<string, string | null> = { [pathSourceId]: null };

    let found = false;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === pathTargetId) {
        found = true;
        break;
      }
      for (const neighbor of adj[curr] || []) {
        if (!visited[neighbor]) {
          visited[neighbor] = true;
          prev[neighbor] = curr;
          queue.push(neighbor);
        }
      }
    }

    if (!found) {
      setHighlightedPath([]);
      return;
    }

    const path: string[] = [];
    let step: string | null = pathTargetId;
    while (step) {
      path.unshift(step);
      step = prev[step];
    }
    setHighlightedPath(path);
  };

  // Canvas pan / drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingNodeId) return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;
      const x = (e.clientX - container.left - pan.x) / zoom;
      const y = (e.clientY - container.top - pan.y) / zoom;
      setPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x, y },
      }));
      return;
    }

    if (!isDraggingCanvas) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  // Node category colors and icons
  const getNodeColor = (asset: Asset) => {
    if (asset.status === 'missing') return { fill: '#78350f', stroke: '#f59e0b', ring: 'ring-amber-500' };
    switch (asset.category) {
      case 'router':
        return { fill: '#083344', stroke: '#06b6d4', ring: 'ring-cyan-500' };
      case 'switch':
        return { fill: '#172554', stroke: '#3b82f6', ring: 'ring-blue-500' };
      case 'firewall':
        return { fill: '#450a0a', stroke: '#ef4444', ring: 'ring-rose-500' };
      case 'server':
        return { fill: '#14532d', stroke: '#10b981', ring: 'ring-emerald-500' };
      default:
        return { fill: '#1e293b', stroke: '#64748b', ring: 'ring-slate-500' };
    }
  };

  // Link stroke styling
  const getLinkStyle = (link: NetworkLink) => {
    const isPath =
      highlightedPath.length > 1 &&
      highlightedPath.some(
        (id, idx) =>
          idx < highlightedPath.length - 1 &&
          ((link.aAssetId === id && link.bAssetId === highlightedPath[idx + 1]) ||
            (link.bAssetId === id && link.aAssetId === highlightedPath[idx + 1]))
      );

    if (isPath) {
      return { stroke: '#eab308', strokeWidth: 4, strokeDasharray: undefined };
    }

    if (link.status === 'down') {
      return { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '4 4' };
    }

    const strokeWidth = Math.max(1.5, link.confidence * 3.5);
    switch (link.type) {
      case 'physical':
        return { stroke: '#10b981', strokeWidth, strokeDasharray: undefined };
      case 'l2':
        return { stroke: '#3b82f6', strokeWidth, strokeDasharray: undefined };
      case 'l3':
        return { stroke: '#a855f7', strokeWidth, strokeDasharray: undefined };
      case 'tunnel':
        return { stroke: '#f59e0b', strokeWidth, strokeDasharray: '6 3' };
      default:
        return { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '2 2' };
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Concession Filter */}
          <select
            value={concessionFilter}
            onChange={(e) => setConcessionFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="all">Todas Concessões</option>
            {Array.from(new Set(sites.map((s) => s.concession || 'RIOMAIS'))).map((c) => (
              <option key={c} value={c}>
                🏢 {c}
              </option>
            ))}
          </select>

          {/* Site Filter */}
          <select
            value={activeSiteFilter}
            onChange={(e) => setActiveSiteFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">🌐 Todos os Sites</option>
            {sites
              .filter((s) => concessionFilter === 'all' || (s.concession || 'RIOMAIS') === concessionFilter)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  📍 {s.name}
                </option>
              ))}
          </select>

          {/* Layout Mode */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setLayoutMode('site_cluster')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                layoutMode === 'site_cluster'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Site
            </button>
            <button
              onClick={() => setLayoutMode('hierarchical')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                layoutMode === 'hierarchical'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hierárquico
            </button>
            <button
              onClick={() => setLayoutMode('force')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                layoutMode === 'force'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Orgânico
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtro rápido por ativo/IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 w-48"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas Categorias</option>
            <option value="router">Roteadores</option>
            <option value="switch">Switches</option>
            <option value="firewall">Firewalls</option>
            <option value="server">Servidores</option>
          </select>
        </div>

        {/* Pathfinder Traceroute Tool */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          <Navigation className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[11px] font-semibold text-slate-300">Traceroute:</span>
          <select
            value={pathSourceId}
            onChange={(e) => setPathSourceId(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 max-w-[120px] truncate"
          >
            <option value="">Origem (A)</option>
            {visibleAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <select
            value={pathTargetId}
            onChange={(e) => setPathTargetId(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 max-w-[120px] truncate"
          >
            <option value="">Destino (B)</option>
            {visibleAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={calculatePath}
            disabled={!pathSourceId || !pathTargetId}
            className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-black text-xs font-bold px-2 py-1 rounded transition"
          >
            Traçar Rota
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="p-1.5 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1 text-slate-400">
            {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            className="p-1.5 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 100, y: 80 });
            }}
            className="p-1.5 text-slate-300 hover:text-white border-l border-slate-700"
            title="Resetar Visão"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loop Alert Banner */}
      {detectedLoops && (
        <div className="bg-amber-950/80 border-b border-amber-600/60 px-4 py-1.5 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Topologia com Anéis/Loops detectados:</strong> O Spanning-Tree Protocol (STP) ou OSPF/IS-IS está controlando redundância nos circuitos interconectados.
            </span>
          </div>
          <span className="text-[11px] bg-amber-900/60 px-2 py-0.5 rounded text-amber-200">
            Redundância Ativa
          </span>
        </div>
      )}

      {/* Main Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="flex-1 w-full h-[600px] min-h-[500px] bg-radial from-slate-900 to-slate-950 cursor-grab active:cursor-grabbing relative overflow-hidden select-none"
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            transform: `translate(${pan.x % 24}px, ${pan.y % 24}px)`,
          }}
        />

        <svg
          className="w-full h-full absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Defs for arrow markers and glow filters */}
          <defs>
            <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Links (Edges) */}
          {visibleLinks.map((link) => {
            const posA = positions[link.aAssetId];
            const posB = positions[link.bAssetId];
            if (!posA || !posB) return null;

            const style = getLinkStyle(link);
            const isPath =
              highlightedPath.length > 1 &&
              highlightedPath.some(
                (id, idx) =>
                  idx < highlightedPath.length - 1 &&
                  ((link.aAssetId === id && link.bAssetId === highlightedPath[idx + 1]) ||
                    (link.bAssetId === id && link.aAssetId === highlightedPath[idx + 1]))
              );

            return (
              <g key={link.id} className="group">
                <line
                  x1={posA.x}
                  y1={posA.y}
                  x2={posB.x}
                  y2={posB.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  strokeLinecap="round"
                  filter={isPath ? 'url(#glow-gold)' : undefined}
                  className="transition-all hover:stroke-white cursor-pointer"
                />

                {/* Link confidence badge / label */}
                <circle
                  cx={(posA.x + posB.x) / 2}
                  cy={(posA.y + posB.y) / 2}
                  r={8}
                  fill="#0f172a"
                  stroke={style.stroke}
                  strokeWidth={1.5}
                />
                <text
                  x={(posA.x + posB.x) / 2}
                  y={(posA.y + posB.y) / 2 + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {(link.confidence * 100).toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Nodes (Assets) */}
          {visibleAssets.map((asset) => {
            const pos = positions[asset.id];
            if (!pos) return null;

            const isSelected = selectedNode?.id === asset.id;
            const isPathNode = highlightedPath.includes(asset.id);
            const colors = getNodeColor(asset);

            return (
              <g
                key={asset.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingNodeId(asset.id);
                  setSelectedNode(asset);
                  if (onSelectAsset) onSelectAsset(asset);
                }}
                className="cursor-pointer group"
              >
                {/* Selection / Path highlight halo */}
                {(isSelected || isPathNode) && (
                  <circle
                    r={30}
                    fill="none"
                    stroke={isPathNode ? '#eab308' : '#38bdf8'}
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    className="animate-spin-slow"
                  />
                )}

                {/* Missing status pulse indicator */}
                {asset.status === 'missing' && (
                  <circle r={28} fill="#f59e0b" opacity={0.2} className="animate-ping" />
                )}

                {/* Main Node Shape */}
                <rect
                  x={-20}
                  y={-20}
                  width={40}
                  height={40}
                  rx={8}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={2}
                  className="transition-transform group-hover:scale-110 shadow-lg"
                />

                {/* Center Category Symbol */}
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {asset.category === 'router'
                    ? 'RT'
                    : asset.category === 'switch'
                    ? 'SW'
                    : asset.category === 'firewall'
                    ? 'FW'
                    : 'SRV'}
                </text>

                {/* Node Name Label */}
                <text
                  x={0}
                  y={32}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                  className="pointer-events-none drop-shadow"
                >
                  {asset.name}
                </text>

                {/* IP Label */}
                <text
                  x={0}
                  y={44}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {asset.mgmtIp}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 shadow-xl space-y-1.5 z-10">
          <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider mb-1">
            Tipos de Enlace
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-emerald-500 rounded" />
            <span>Físico (LLDP/CDP 95%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-blue-500 rounded" />
            <span>L2 (FDB/VLAN 80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-purple-500 rounded" />
            <span>L3 (Sub-rede / Rota 70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-amber-500 border-dashed rounded" />
            <span>Túnel / VPN (Manual)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-rose-500 border-dashed rounded" />
            <span>Down / Inoperante</span>
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 bottom-4 w-88 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl shadow-2xl p-4 overflow-y-auto z-20 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        selectedNode.status === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {selectedNode.status}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-mono">
                      {selectedNode.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-1">{selectedNode.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              {/* Attributes Table */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">IP de Gerência:</span>
                  <span className="font-mono text-cyan-400 font-semibold">{selectedNode.mgmtIp}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Fabricante / Modelo:</span>
                  <span className="text-slate-200">
                    {selectedNode.manufacturer} {selectedNode.model}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Número de Série:</span>
                  <span className="font-mono text-slate-300">{selectedNode.serial}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Localidade / Site:</span>
                  <span className="text-slate-200">
                    {sites.find((s) => s.id === selectedNode.siteId)?.name || 'Desconhecido'}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Confiança da Identidade:</span>
                  <span className="font-bold text-emerald-400">
                    {(selectedNode.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Última Descoberta:</span>
                  <span className="text-slate-300">
                    {new Date(selectedNode.lastSeen).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Connected Neighbors */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Vizinhos Conectados (Topologia)
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {links
                    .filter(
                      (l) => l.aAssetId === selectedNode.id || l.bAssetId === selectedNode.id
                    )
                    .map((link) => {
                      const peerName =
                        link.aAssetId === selectedNode.id ? link.bAssetName : link.aAssetName;
                      return (
                        <div
                          key={link.id}
                          className="bg-slate-800/80 p-2 rounded border border-slate-700/60 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-cyan-300">{peerName}</span>
                            <span
                              className={`text-[9px] uppercase font-bold px-1 rounded ${
                                link.status === 'up'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-rose-950 text-rose-400'
                              }`}
                            >
                              {link.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex justify-between">
                            <span>Tipo: {link.type.toUpperCase()} ({link.discoveryProtocol})</span>
                            <span className="text-emerald-400">
                              Confiança: {(link.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setPathSourceId(selectedNode.id);
                }}
                className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-500/40 text-xs font-semibold py-1.5 rounded transition text-center"
              >
                Definir Origem Rota
              </button>
              <button
                onClick={() => {
                  setPathTargetId(selectedNode.id);
                }}
                className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-500/40 text-xs font-semibold py-1.5 rounded transition text-center"
              >
                Definir Destino
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Timeline Snapshot Bar */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold">Linha do Tempo (Snapshots):</span>
          <span className="text-slate-400">
            {activeSnapshot?.trigger} —{' '}
            {activeSnapshot ? new Date(activeSnapshot.createdAt).toLocaleString('pt-BR') : ''}
          </span>
        </div>

        <div className="flex-1 max-w-md flex items-center gap-3">
          <span className="text-[10px] text-slate-400">Histórico</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, snapshots.length - 1)}
            value={snapshotIndex}
            onChange={(e) => setSnapshotIndex(Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
          <span className="text-[10px] text-cyan-400 font-bold">Ao Vivo</span>
        </div>

        <div className="text-[11px] text-slate-400">
          <span className="text-white font-bold">{visibleAssets.length}</span> ativos,{' '}
          <span className="text-white font-bold">{visibleLinks.length}</span> enlaces
        </div>
      </div>
    </div>
  );
};
