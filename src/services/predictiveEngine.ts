import {
  PredictiveWeatherAlarm,
  Site,
  SystemSettings,
  WeatherData,
} from '../types';

export function generatePredictiveAlarms(
  sites: Site[],
  weatherMap: Record<string, WeatherData>,
  settings: SystemSettings
): PredictiveWeatherAlarm[] {
  const alarms: PredictiveWeatherAlarm[] = [];

  sites.forEach((site) => {
    const weather = weatherMap[site.id];
    if (!weather) return;

    const reasons: string[] = [];
    const mitigations: string[] = [];
    let riskPoints = 0;

    // 1. Vento e Rajadas Futuras
    const maxGust = weather.forecast?.reduce((max, f) => Math.max(max, f.maxGustKmh || 0), weather.windGust || 0) || 0;
    if (maxGust >= settings.gustThresholdKmh) {
      riskPoints += 40;
      reasons.push(
        `Previsão de rajadas de até ${maxGust} km/h (limiar ${settings.gustThresholdKmh} km/h)`
      );
      mitigations.push(
        'Inspecionar alinhamento mecânico de antenas de rádio enlace e cabos de estaiamento da torre'
      );
    }

    // 2. Chuva e Precipitação Prevista
    const maxRainExpected = weather.forecast?.reduce((max, f) => Math.max(max, f.expectedRainMm || 0), 0) || 0;
    if (maxRainExpected >= settings.rain24hAccumulatedMm || weather.precipitation >= settings.rainHourThresholdMm) {
      riskPoints += 35;
      reasons.push(
        `Previsão de chuva acumulada de ${maxRainExpected} mm nas próximas 24h a 48h`
      );
      mitigations.push(
        'Vistoriar poços de visita subterrâneos e caixas de emenda óptica contra inundação'
      );
    }

    // 3. Alerta CEMADEN ativo para o município
    if (weather.activeCemadenAlert) {
      riskPoints += 30;
      reasons.push(`Alerta ativo no CEMADEN: ${weather.activeCemadenAlert}`);
      mitigations.push('Colocar equipes de campo do NOC em regime de sobreaviso prioritário');
    }

    // 4. Se a unidade for OPERACIONAL (ETA/ETE/Elevatória), o impacto em saneamento é crítico
    if (site.unitType === 'OPERACIONAL' && riskPoints > 0) {
      riskPoints += 15;
      mitigations.push(
        'Verificar nível de combustível do gerador a diesel e autonomia dos nobreaks da automação/SCADA da ETA/ETE'
      );
      mitigations.push(
        'Validar teste de chaveamento automático para link de contingência (4G/Satélite)'
      );
    } else if (site.unitType === 'SEDE' && riskPoints > 0) {
      mitigations.push('Verificar links do Datacenter/Sede e conexões VPN das filiais');
    }

    if (riskPoints >= 40) {
      const riskScore = Math.min(100, riskPoints);
      let severity: PredictiveWeatherAlarm['severity'] = 'info';
      if (riskScore >= 75) severity = 'critical';
      else if (riskScore >= 50) severity = 'warning';

      const forecastWindow =
        weather.forecast && weather.forecast[1]
          ? `Próximas 24h a 48h (${weather.forecast[1].dayName})`
          : 'Próximas 12h a 24h';

      alarms.push({
        id: `pred-alarm-${site.id}-${Date.now().toString(36)}`,
        siteId: site.id,
        siteName: site.name,
        concession: site.concession,
        unitType: site.unitType,
        severity,
        forecastWindow,
        condition: weather.condition,
        expectedGustKmh: maxGust,
        expectedRainMm: maxRainExpected,
        riskScore,
        triggerReasons: reasons,
        recommendedMitigations: mitigations,
        detectedAt: new Date().toISOString(),
        status: 'active',
      });
    }
  });

  return alarms.sort((a, b) => b.riskScore - a.riskScore);
}
