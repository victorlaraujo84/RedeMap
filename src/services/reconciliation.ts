import { Asset, CollectionRun, IdentityReviewItem } from '../types';
import { DatabaseService } from './database';

export interface DiscoverySimulationResult {
  run: CollectionRun;
  activeCount: number;
  newlyMissingCount: number;
  recoveredCount: number;
  ipChangedCount: number;
  reviewQueueCount: number;
}

export function runIncrementalDiscoverySimulation(): DiscoverySimulationResult {
  const assets = DatabaseService.getAssets();
  const now = new Date().toISOString();

  let newlyMissing = 0;
  let recovered = 0;
  let ipChanged = 0;

  // Simulate realistic network behavior on this discovery run:
  // Randomly select 1 active asset to test the missing rule or recover an existing missing asset
  const missingAssets = assets.filter((a) => a.status === 'missing');
  const activeAssets = assets.filter((a) => a.status === 'active');

  // 1. Recover a missing asset if available (50% chance if there are missing assets)
  if (missingAssets.length > 0 && Math.random() > 0.4) {
    const assetToRecover = missingAssets[0];
    DatabaseService.saveAsset({
      ...assetToRecover,
      status: 'active',
      missingRunsCount: 0,
      lastSeen: now,
    });
    recovered++;
    DatabaseService.logChangeEvent({
      entityType: 'asset',
      entityId: assetToRecover.id,
      entityName: assetToRecover.name,
      type: 'recovered',
      severity: 'info',
      before: { status: 'missing' },
      after: { status: 'active', missingRunsCount: 0 },
      details: `Ativo "${assetToRecover.name}" voltou a responder à coleta SNMP/API e seu status retornou para "active".`,
    });
  }

  // 2. Increment missing count or mark 1 active asset as missing after 3 runs
  activeAssets.forEach((asset) => {
    // If the asset has simulated misses
    const currentMisses = asset.missingRunsCount || 0;
    if (asset.name.includes('BEL-SW-01') && asset.status !== 'missing') {
      const nextMisses = currentMisses + 1;
      if (nextMisses >= 3) {
        DatabaseService.saveAsset({
          ...asset,
          status: 'missing',
          missingRunsCount: nextMisses,
        });
        newlyMissing++;
        DatabaseService.logChangeEvent({
          entityType: 'asset',
          entityId: asset.id,
          entityName: asset.name,
          type: 'missing',
          severity: 'warning',
          before: { status: 'active', missingRunsCount: currentMisses },
          after: { status: 'missing', missingRunsCount: nextMisses },
          details: `Ativo "${asset.name}" inalcançável por 3 coletas consecutivas. Status marcado como "missing".`,
        });
      } else {
        DatabaseService.saveAsset({
          ...asset,
          missingRunsCount: nextMisses,
        });
      }
    } else {
      // Normal asset: update lastSeen
      DatabaseService.saveAsset({
        ...asset,
        lastSeen: now,
        missingRunsCount: 0,
      });
    }
  });

  // 3. Queue a candidate for identity review if queue is empty
  const currentQueue = DatabaseService.getIdentityReviewQueue();
  if (currentQueue.length === 0) {
    const candidateItem: IdentityReviewItem = {
      id: `rev-${Date.now()}`,
      candidateName: 'RJ-BOT-COR-01.metro.embratel.net',
      matchedAssetId: 'ast-rj-cor01',
      matchedAssetName: 'RJ-BOT-COR-01',
      candidateIp: '10.202.0.1',
      matchedIp: '10.202.0.1',
      candidateSerial: 'FOC2419090W',
      matchedSerial: 'FOC2419090W',
      score: 0.75,
      reasons: ['IP de gerência 10.202.0.1 idêntico', 'Site RJ Botafogo coincidente', 'Score calculado: 0.75 (Fila de Revisão)'],
      siteName: 'Rio de Janeiro - DC Botafogo',
      source: 'snmp-poller-engine',
      discoveredAt: now,
      status: 'pending',
    };
    DatabaseService.getState().identityReviewQueue.push(candidateItem);
  }

  // 4. Create a snapshot of the current state
  DatabaseService.createSnapshot(`Coleta Incremental Executada (${new Date().toLocaleTimeString('pt-BR')})`);

  const run: CollectionRun = {
    id: `run-${Date.now()}`,
    sourceName: 'Coleta SNMP/LLDP/API Agendada',
    startedAt: now,
    finishedAt: new Date(Date.now() + 3200).toISOString(),
    status: newlyMissing > 0 ? 'warning' : 'success',
    stats: {
      discovered: 0,
      updated: assets.length - newlyMissing,
      missing: newlyMissing,
      linksFound: DatabaseService.getLinks().length,
      errors: 0,
    },
    details: [
      `Varredura de ${assets.length} ativos cadastrados nos sites`,
      newlyMissing > 0 ? `${newlyMissing} ativo(s) marcado(s) como MISSING após 3 coletas sem resposta` : 'Nenhum novo ativo ausente',
      recovered > 0 ? `${recovered} ativo(s) recuperado(s) para o estado ACTIVE` : 'Nenhum ativo recuperado nesta rodada',
      'Topologia de enlaces LLDP/CDP revalidada',
    ],
  };

  DatabaseService.addCollectionRun(run);

  return {
    run,
    activeCount: assets.filter((a) => a.status === 'active').length,
    newlyMissingCount: newlyMissing,
    recoveredCount: recovered,
    ipChangedCount: ipChanged,
    reviewQueueCount: DatabaseService.getIdentityReviewQueue().length,
  };
}
