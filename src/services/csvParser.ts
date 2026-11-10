import Papa from 'papaparse';
import { Asset, AssetCategory, Site, CsvImportReport } from '../types';
import { DatabaseService } from './database';

export interface CsvImportRow {
  hostname: string;
  tipo: string;
  operadora: string;
  localidade: string;
  ip?: string;
  modelo?: string;
  serial?: string;
}

export type { CsvImportReport };

const CITY_COORDINATES: Record<string, { lat: number; lng: number; state: string }> = {
  'sao paulo': { lat: -23.5505, lng: -46.6333, state: 'SP' },
  'são paulo': { lat: -23.5505, lng: -46.6333, state: 'SP' },
  'barueri': { lat: -23.4984, lng: -46.8512, state: 'SP' },
  'campinas': { lat: -22.8184, lng: -47.0647, state: 'SP' },
  'rio de janeiro': { lat: -22.9519, lng: -43.1873, state: 'RJ' },
  'brasilia': { lat: -15.7975, lng: -47.8919, state: 'DF' },
  'brasília': { lat: -15.7975, lng: -47.8919, state: 'DF' },
  'belo horizonte': { lat: -19.9386, lng: -43.9378, state: 'MG' },
  'curitiba': { lat: -25.4429, lng: -49.2825, state: 'PR' },
  'porto alegre': { lat: -30.0487, lng: -51.2287, state: 'RS' },
  'salvador': { lat: -13.0038, lng: -38.4614, state: 'BA' },
  'fortaleza': { lat: -3.7432, lng: -38.4556, state: 'CE' },
  'recife': { lat: -8.0476, lng: -34.877, state: 'PE' },
  'manaus': { lat: -3.1071, lng: -60.0152, state: 'AM' },
  'goiania': { lat: -16.6869, lng: -49.2648, state: 'GO' },
  'goiânia': { lat: -16.6869, lng: -49.2648, state: 'GO' },
  'belem': { lat: -1.4558, lng: -48.4902, state: 'PA' },
  'belém': { lat: -1.4558, lng: -48.4902, state: 'PA' },
  'vitoria': { lat: -20.3155, lng: -40.3128, state: 'ES' },
  'vitória': { lat: -20.3155, lng: -40.3128, state: 'ES' },
  'florianopolis': { lat: -27.5954, lng: -48.548, state: 'SC' },
  'florianópolis': { lat: -27.5954, lng: -48.548, state: 'SC' },
};

export function normalizeAssetCategory(tipoRaw: string): AssetCategory {
  const t = (tipoRaw || '').trim().toUpperCase();
  if (t.includes('ROUTER') || t.includes('ROTEADOR') || t === 'RT' || t === 'RTR') {
    return 'router';
  }
  if (t.includes('SWITCH') || t === 'SW' || t === 'SWT') {
    return 'switch';
  }
  if (t.includes('FIREWALL') || t === 'FW' || t.includes('SEGURANÇA')) {
    return 'firewall';
  }
  if (t.includes('SERVER') || t.includes('SERVIDOR') || t === 'SRV') {
    return 'server';
  }
  if (t.includes('AP') || t.includes('ACCESS') || t.includes('WIFI') || t.includes('WIRELESS')) {
    return 'access_point';
  }
  return 'other';
}

export function parseInventoryCsv(csvText: string): CsvImportReport {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const errors: string[] = [];
  const rows: CsvImportRow[] = [];

  result.data.forEach((row, index) => {
    // Check known header variations
    const hostname = row['hostname'] || row['host'] || row['nome'] || row['ativo'] || '';
    const tipo = row['tipo'] || row['type'] || row['categoria'] || '';
    const operadora = row['operadora'] || row['carrier'] || row['provedor'] || '';
    const localidade = row['localidade'] || row['site'] || row['cidade'] || row['local'] || '';
    const ip = row['ip'] || row['mgmt_ip'] || row['ip_gerencia'] || '';
    const modelo = row['modelo'] || row['model'] || '';
    const serial = row['serial'] || row['numero_serie'] || '';

    if (!hostname || !localidade) {
      errors.push(`Linha ${index + 2}: Hostname e Localidade são obrigatórios.`);
      return;
    }

    rows.push({
      hostname: hostname.trim(),
      tipo: tipo.trim(),
      operadora: operadora.trim(),
      localidade: localidade.trim(),
      ip: ip.trim(),
      modelo: modelo.trim(),
      serial: serial.trim(),
    });
  });

  const existingSites = DatabaseService.getSites();
  const existingAssets = DatabaseService.getAssets();

  let createdSitesCount = 0;
  let createdAssetsCount = 0;
  let updatedAssetsCount = 0;
  let unchangedAssetsCount = 0;
  const processedAssets: Asset[] = [];

  // 1. Process Sites
  const siteMap = new Map<string, Site>();
  existingSites.forEach((s) => {
    siteMap.set(s.name.toLowerCase(), s);
    siteMap.set(s.city.toLowerCase(), s);
    siteMap.set(s.slug.toLowerCase(), s);
  });

  // 2. Process rows
  rows.forEach((row) => {
    const locLower = row.localidade.toLowerCase();
    let site = siteMap.get(locLower);

    if (!site) {
      // Find coordinates from our geocoding dictionary
      let matchedCoord = CITY_COORDINATES[locLower];
      if (!matchedCoord) {
        // partial match
        const foundKey = Object.keys(CITY_COORDINATES).find((k) => locLower.includes(k) || k.includes(locLower));
        if (foundKey) {
          matchedCoord = CITY_COORDINATES[foundKey];
        } else {
          // Default to random spread around central Brazil if completely unknown
          matchedCoord = {
            lat: -15.78 + (Math.random() - 0.5) * 4,
            lng: -47.92 + (Math.random() - 0.5) * 4,
            state: 'BR',
          };
        }
      }

      site = DatabaseService.saveSite({
        name: row.localidade,
        city: row.localidade.split('-')[0]?.trim() || row.localidade,
        state: matchedCoord.state,
        lat: matchedCoord.lat,
        lng: matchedCoord.lng,
        operators: row.operadora ? [row.operadora] : ['Operadora Local'],
        tags: ['Descoberta CSV'],
      });

      siteMap.set(locLower, site);
      siteMap.set(site.name.toLowerCase(), site);
      createdSitesCount++;
    } else {
      // Append carrier if not present
      if (row.operadora && !site.operators.includes(row.operadora)) {
        site.operators.push(row.operadora);
        DatabaseService.saveSite(site);
      }
    }

    // 3. Process Asset (Idempotent: Match by Name or Serial)
    const existingAsset = existingAssets.find(
      (a) =>
        a.name.toLowerCase() === row.hostname.toLowerCase() ||
        (row.serial && a.serial && a.serial.toLowerCase() === row.serial.toLowerCase())
    );

    const category = normalizeAssetCategory(row.tipo);

    if (existingAsset) {
      // Check if anything changed
      const operadoraChanged = row.operadora && existingAsset.metadata.operadora !== row.operadora;
      const siteChanged = existingAsset.siteId !== site.id;
      const ipChanged = row.ip && existingAsset.mgmtIp !== row.ip;

      if (operadoraChanged || siteChanged || ipChanged) {
        const updated = DatabaseService.saveAsset({
          ...existingAsset,
          siteId: site.id,
          mgmtIp: row.ip || existingAsset.mgmtIp,
          metadata: {
            ...existingAsset.metadata,
            operadora: row.operadora || existingAsset.metadata.operadora,
            modeloOriginal: row.modelo || existingAsset.metadata.modeloOriginal,
          },
        });
        updatedAssetsCount++;
        processedAssets.push(updated);
      } else {
        unchangedAssetsCount++;
        processedAssets.push(existingAsset);
      }
    } else {
      // Create new asset
      const newAsset = DatabaseService.saveAsset({
        name: row.hostname,
        siteId: site.id,
        category,
        model: row.modelo || (category === 'router' ? 'ASR 9000' : 'Catalyst 9300'),
        serial: row.serial || `SER-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        mgmtIp: row.ip || `10.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
        metadata: {
          operadora: row.operadora,
          origem: 'Importação CSV Localidades',
          tipoDeclarado: row.tipo,
        },
      });
      createdAssetsCount++;
      processedAssets.push(newAsset);
    }
  });

  // Log summary collection run
  DatabaseService.addCollectionRun({
    id: `run-csv-${Date.now()}`,
    sourceName: 'Importador de Inventário CSV',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: errors.length > 0 ? 'warning' : 'success',
    stats: {
      discovered: createdAssetsCount,
      updated: updatedAssetsCount,
      missing: 0,
      linksFound: 0,
      errors: errors.length,
    },
    details: [
      `Total de linhas no arquivo: ${rows.length}`,
      `Novos ativos cadastrados: ${createdAssetsCount}`,
      `Ativos atualizados: ${updatedAssetsCount}`,
      `Ativos inalterados (idempotência preservada): ${unchangedAssetsCount}`,
      `Novos sites/localidades gerados: ${createdSitesCount}`,
    ],
  });

  return {
    totalRows: rows.length,
    createdAssets: createdAssetsCount,
    updatedAssets: updatedAssetsCount,
    unchangedAssets: unchangedAssetsCount,
    createdSites: createdSitesCount,
    errors,
    processedAssets,
  };
}

export function exportInventoryToCsv(assets: Asset[], sites: Site[]): string {
  const siteMap = new Map<string, Site>();
  sites.forEach((s) => siteMap.set(s.id, s));

  const exportData = assets.map((a) => {
    const site = siteMap.get(a.siteId);
    return {
      Hostname: a.name,
      TIPO: a.category.toUpperCase(),
      Operadora: a.metadata.operadora || site?.operators[0] || 'Própria',
      Localidade: site?.name || 'Local Não Atribuído',
      IP_Gerencia: a.mgmtIp,
      Fabricante: a.manufacturer,
      Modelo: a.model,
      Serial: a.serial,
      Status: a.status,
      Ultima_Coleta: a.lastSeen,
    };
  });

  return Papa.unparse(exportData, { delimiter: ';' });
}

export const SAMPLE_CSV_DATA = `Hostname;TIPO;Operadora;Localidade;IP;Modelo;Serial
SP-BAR-COR-03;ROUTER;Cirion;São Paulo - DC Barueri;10.200.0.3;ASR 9904;FOC2419099A
RJ-BOT-SW-01;SWITCH;Embratel;Rio de Janeiro - DC Botafogo;10.202.1.15;CloudEngine 6865;HW-RJ-CE01
BSB-SUL-FW-01;FIREWALL;Telebras;Brasília - Central Asa Sul;10.203.254.1;FortiGate 3000F;FG3K-BSB-01
SSA-PIT-SW-01;SWITCH;Claro;Salvador - POP Pituba;10.207.1.10;Catalyst 9300;FCW-SSA-01
FOR-FUT-COR-02;ROUTER;EllaLink;Fortaleza - Submarine Landing Station;10.208.0.2;NCS 5508;FOC8819002B
GOI-CEN-COR-01;ROUTER;Claro;Goiânia;10.210.0.1;ASR 1002-HX;FOC-GOI-01
BEL-DOC-COR-01;ROUTER;V.tal;Belém;10.211.0.1;NetEngine 8000;HW-BEL-01
VIX-PRA-COR-01;ROUTER;Vivo;Vitória;10.212.0.1;ASR 9001;FOC-VIX-01
FLN-CEN-COR-01;ROUTER;Claro;Florianópolis;10.213.0.1;MX480;JN-FLN-01`;
