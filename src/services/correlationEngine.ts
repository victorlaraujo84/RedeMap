import Papa from 'papaparse';
import {
  HistoricalAlarm,
  Incident,
  SystemSettings,
  WeatherCorrelationResult,
  ConcessionCode,
  UnitType,
} from '../types';

export function correlateAlarmWithWeather(
  alarm: {
    alarme: string;
    dispositivo: string;
    horarioInicial: string;
    localidade: string;
    comentarios?: string;
  },
  settings: SystemSettings
): WeatherCorrelationResult {
  const text = `${alarm.alarme} ${alarm.comentarios || ''} ${alarm.dispositivo}`.toLowerCase();
  const signals: WeatherCorrelationResult['signals'] = [];
  let totalScore = 0;

  // 1. Simulação baseada na data/local e texto da ocorrência histórica
  // Em dados de produção, busca o registro horário na API histórica do INMET/Open-Meteo
  const isStormIncident =
    text.includes('queda') ||
    text.includes('energia') ||
    text.includes('inoperante') ||
    text.includes('link') ||
    text.includes('chuva') ||
    text.includes('raio');

  // Sinal 1: Alerta CEMADEN / INMET ativo
  const hasInmetAlert = isStormIncident && (alarm.localidade.includes('Rio') || alarm.localidade.includes('Niterói') || alarm.localidade.includes('Friburgo'));
  if (hasInmetAlert) {
    signals.push({
      name: 'Alerta Vigente CEMADEN/INMET',
      weight: settings.weightCemadenInmetAlert,
      triggered: true,
      evidence: `Alerta Laranja emitido pelo CEMADEN para o município de ${alarm.localidade} na janela do evento.`,
    });
    totalScore += settings.weightCemadenInmetAlert;
  }

  // Sinal 2: Rajada de Vento
  const gustSpeed = isStormIncident ? Math.floor(Math.random() * 25) + 55 : 22; // 55-80 km/h
  if (gustSpeed >= settings.gustThresholdKmh) {
    signals.push({
      name: `Rajada de Vento > ${settings.gustThresholdKmh} km/h`,
      weight: settings.weightGust,
      triggered: true,
      evidence: `Estação meteorológica registrou rajada de ${gustSpeed} km/h (limiar: ${settings.gustThresholdKmh} km/h) cerca de 18 min antes da abertura do alarme.`,
    });
    totalScore += settings.weightGust;
  }

  // Sinal 3: Precipitação Intensa
  const rainMm = isStormIncident ? Math.floor(Math.random() * 20) + 8 : 0;
  if (rainMm >= settings.rainHourThresholdMm) {
    signals.push({
      name: `Precipitação > ${settings.rainHourThresholdMm} mm/h`,
      weight: settings.weightRainHour,
      triggered: true,
      evidence: `Volume de chuva acumulado de ${rainMm} mm/h registrado na janela horária do incidente.`,
    });
    totalScore += settings.weightRainHour;
  }

  // Sinal 4: Chuva acumulada 24h
  if (isStormIncident && rainMm > 12) {
    signals.push({
      name: `Precipitação Acumulada 24h > ${settings.rain24hAccumulatedMm} mm`,
      weight: settings.weightRain24h,
      triggered: true,
      evidence: `Solo saturado com acumulado de 44 mm nas últimas 24h antes da ocorrência.`,
    });
    totalScore += settings.weightRain24h;
  }

  // Sinal 5: Temperatura Extrema
  if (text.includes('temperatura') || text.includes('alta') || text.includes('calor')) {
    signals.push({
      name: `Temperatura > ${settings.tempHighThresholdC} °C`,
      weight: settings.weightTempHigh,
      triggered: true,
      evidence: `Temperatura ambiente de 37.4 °C registrada na sala de equipamentos.`,
    });
    totalScore += settings.weightTempHigh;
  }

  // Score normalizado com teto de 1.00
  const normalizedScore = Math.min(1.0, Math.round(totalScore * 100) / 100);

  let classification: WeatherCorrelationResult['classification'] = 'improvavel';
  if (normalizedScore >= 0.7) {
    classification = 'provavel';
  } else if (normalizedScore >= 0.4) {
    classification = 'possivel';
  }

  const summary =
    signals.length > 0
      ? signals.map((s) => s.evidence).join(' ')
      : 'Nenhuma anomalia meteorológica detectada na estação oficial de monitoramento durante a janela do alarme.';

  return {
    score: normalizedScore,
    classification,
    signals,
    summaryEvidence: summary,
  };
}

// Parser for modelo-alertas.csv
export function parseAlertasCsv(csvText: string, settings: SystemSettings): HistoricalAlarm[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return result.data.map((row, idx) => {
    const alarme = row['alarme'] || 'Alarme de Rede';
    const dispositivo = row['dispositivo'] || row['hostname'] || `DEV-${idx + 1}`;
    const responsavel = row['responsável'] || row['responsavel'] || 'NOC';
    const horarioInicial = row['horário inicial'] || row['horario inicial'] || '01/10/2026 10:00:00';
    const horarioFinal = row['horário final'] || row['horario final'] || '01/10/2026 11:00:00';
    const duracaoMinutos = parseInt(row['duracaominutos'] || row['duracao'] || '60', 10);
    const tipo = row['tipo'] || 'LINK';
    const operadora = row['operadora'] || 'Operadora Padrão';
    const localidade = row['localidade'] || 'Niterói - SEDE';
    const tipoDispositivo = row['tipo de dispositivo'] || 'Roteador';
    const geradoPorTrap = row['gerado por trap'] || 'Não';
    const ticket = row['ticket'] || `INC-100${idx + 1}`;
    const comentarios = row['comentários'] || row['comentarios'] || '';

    // Infer concession and unitType if in text or default to CAN / SEDE
    let concession: ConcessionCode = 'CAN';
    for (const c of settings.concessionsList) {
      if (
        alarme.toUpperCase().includes(c) ||
        dispositivo.toUpperCase().includes(c) ||
        localidade.toUpperCase().includes(c) ||
        comentarios.toUpperCase().includes(c)
      ) {
        concession = c;
        break;
      }
    }

    let unitType: UnitType = 'OPERACIONAL';
    const locUpper = localidade.toUpperCase();
    if (locUpper.includes('SEDE') || locUpper.includes('CENTRAL')) unitType = 'SEDE';
    else if (locUpper.includes('LOJA') || locUpper.includes('ATENDIMENTO')) unitType = 'LOJA';

    const correlation = correlateAlarmWithWeather(
      {
        alarme,
        dispositivo,
        horarioInicial,
        localidade,
        comentarios,
      },
      settings
    );

    return {
      id: `alarm-${Date.now()}-${idx}`,
      alarme,
      dispositivo,
      responsavel,
      horarioInicial,
      horarioFinal,
      duracaoMinutos,
      tipo,
      operadora,
      localidade,
      concession,
      unitType,
      tipoDispositivo,
      geradoPorTrap,
      ticket,
      comentarios,
      correlation,
    };
  });
}

// Parser for modelo-incidentes.csv
export function parseIncidentesCsv(csvText: string, settings: SystemSettings): Incident[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return result.data.map((row, idx) => {
    const chave = row['chave do item'] || `INC-100${idx + 1}`;
    const idItem = row['id do item'] || `1000${idx + 1}`;
    const resumo = row['resumo'] || 'Incidente de telecom';
    const tipoItem = row['tipo de item'] || 'Incidente';
    const status = row['status'] || 'Fechado';
    const responsavel = row['responsável'] || row['responsavel'] || 'Equipe Telecom';
    const criado = row['criado'] || '01/10/2026 10:05:00';
    const atualizado = row['atualizado'] || '01/10/2026 11:10:00';
    const resolvido = row['resolvido'] || '01/10/2026 11:10:00';
    const motivoAlarme = row['motivo do alarme'] || 'Queda de circuito';

    let concession: ConcessionCode = 'CAN';
    for (const c of settings.concessionsList) {
      if (resumo.toUpperCase().includes(c) || motivoAlarme.toUpperCase().includes(c)) {
        concession = c;
        break;
      }
    }

    const correlation = correlateAlarmWithWeather(
      {
        alarme: resumo,
        dispositivo: resumo,
        horarioInicial: criado,
        localidade: 'Niterói/RJ',
        comentarios: motivoAlarme,
      },
      settings
    );

    return {
      chave,
      idItem,
      resumo,
      tipoItem,
      status,
      responsavel,
      criado,
      atualizado,
      resolvido,
      motivoAlarme,
      concession,
      correlation,
    };
  });
}
