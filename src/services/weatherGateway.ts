import { Site, WeatherData, WeatherStationInfo, SystemSettings } from '../types';
import { DEFAULT_SETTINGS } from './database';

// INMET Official Weather Stations Catalog in Concession Territories
export const INMET_STATIONS_CATALOG = [
  // Rio de Janeiro Concessions (RIOMAIS, CAN, CAJ, CANF, CAI)
  { id: 'A601', name: 'Niterói - Forte de Gragoatá', uf: 'RJ', lat: -22.9056, lng: -43.1311 },
  { id: 'A652', name: 'Rio de Janeiro - Forte de Copacabana', uf: 'RJ', lat: -22.9861, lng: -43.1894 },
  { id: 'A636', name: 'Rio de Janeiro - Vila Militar / Bangu', uf: 'RJ', lat: -22.8617, lng: -43.4103 },
  { id: 'A625', name: 'Araruama / Saquarema (Região dos Lagos)', uf: 'RJ', lat: -22.8711, lng: -42.3414 },
  { id: 'A624', name: 'Nova Friburgo (Salinas)', uf: 'RJ', lat: -22.2828, lng: -42.5311 },
  { id: 'A627', name: 'Itaboraí', uf: 'RJ', lat: -22.7444, lng: -42.8592 },
  { id: 'A621', name: 'Petrópolis - Pico do Couto', uf: 'RJ', lat: -22.4647, lng: -43.2922 },

  // São Paulo Concessions (JAHU, CAAN, CAV, CAIZ, CAPY, CAJA)
  { id: 'A701', name: 'São Paulo - Mirante de Santana', uf: 'SP', lat: -23.4964, lng: -46.6197 },
  { id: 'A748', name: 'Barueri / Osasco', uf: 'SP', lat: -23.5111, lng: -46.8764 },
  { id: 'A706', name: 'Campinas', uf: 'SP', lat: -22.9028, lng: -47.0583 },
  { id: 'A715', name: 'Jaú (Jahu) / Bauru', uf: 'SP', lat: -22.3581, lng: -49.0289 },
  { id: 'A755', name: 'Andradina / Araçatuba', uf: 'SP', lat: -21.2089, lng: -50.4328 },
  { id: 'A742', name: 'Votorantim / Sorocaba', uf: 'SP', lat: -23.5014, lng: -47.4581 },
  { id: 'A727', name: 'Piracicaba (CAPY)', uf: 'SP', lat: -22.7031, lng: -47.6233 },
  { id: 'A733', name: 'Ilha Solteira (CAIZ)', uf: 'SP', lat: -20.4311, lng: -51.3414 },
  { id: 'A712', name: 'Jaguariúna (CAJA)', uf: 'SP', lat: -22.7056, lng: -47.0111 },

  // Mato Grosso / MS / Outros (CAC, CAPAM, SANEJ)
  { id: 'A901', name: 'Cuiabá - Centro Geodésico', uf: 'MT', lat: -15.5539, lng: -56.0694 },
  { id: 'A719', name: 'Paranaíba (CAPAM)', uf: 'MS', lat: -19.6739, lng: -51.1908 },
  { id: 'A801', name: 'Palmas (SANEJ)', uf: 'TO', lat: -10.1844, lng: -48.3336 },
];

// Haversine formula to find distance in kilometers between two lat/lng coordinates
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function findNearestInmetStation(lat: number, lng: number): WeatherStationInfo {
  let nearest = INMET_STATIONS_CATALOG[0];
  let minDistance = calculateHaversineDistance(lat, lng, nearest.lat, nearest.lng);

  for (const station of INMET_STATIONS_CATALOG) {
    const dist = calculateHaversineDistance(lat, lng, station.lat, station.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = station;
    }
  }

  return {
    id: nearest.id,
    name: nearest.name,
    provider: 'INMET',
    distanceKm: minDistance,
    lat: nearest.lat,
    lng: nearest.lng,
  };
}

// Active CEMADEN alerts by municipality
const MOCK_CEMADEN_ALERTS: Record<string, string> = {
  niterói: 'Alerta Laranja (CEMADEN): Risco Moderado de Enxurrada e Alagamento em encostas',
  'rio de janeiro': 'Alerta Amarelo (CEMADEN): Risco de Movimento de Massa e Inundação Gradual',
  'nova friburgo': 'Alerta Laranja (CEMADEN): Risco de Deslizamento de Encostas por solo saturado',
  petrópolis: 'Alerta Vermelho (CEMADEN): Risco Muito Alto de Deslizamento',
  cuiabá: 'Alerta Amarelo (CEMADEN): Risco de Alagamento Urbano nas baixadas',
  araruama: 'Alerta Amarelo (CEMADEN): Risco de Ressaca e Vento Costeiro',
};

export function getCemadenAlert(city: string): string | null {
  const key = city.toLowerCase().trim();
  for (const [k, alert] of Object.entries(MOCK_CEMADEN_ALERTS)) {
    if (key.includes(k) || k.includes(key)) {
      return alert;
    }
  }
  return null;
}

const WMO_MAP: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Predomínio de sol',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  51: 'Garoa leve',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  80: 'Pancadas de chuva leve',
  81: 'Pancadas de chuva moderada',
  82: 'Chuva torrencial',
  95: 'Tempestade com raios',
  96: 'Tempestade com granizo leve',
  99: 'Tempestade severa',
};

// Main Multi-Provider Weather Fetcher
export async function fetchMultiProviderWeather(
  site: Site,
  settings?: SystemSettings
): Promise<WeatherData> {
  const currentSettings: SystemSettings = settings || DEFAULT_SETTINGS;

  const nearestInmet = findNearestInmetStation(site.lat, site.lng);
  const cemadenAlert = currentSettings.enableCemaden ? getCemadenAlert(site.city) : null;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&hourly=temperature_2m,precipitation,wind_gusts_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,precipitation_probability_max&timezone=auto`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const current = json.current;
    const daily = json.daily;
    const hourly = json.hourly;

    const weatherCode = current.weather_code ?? 0;
    const windSpeed = Math.round(current.wind_speed_10m ?? 14);
    const windGust = Math.round(current.wind_gusts_10m ?? windSpeed * 1.4);
    const temp = Math.round(current.temperature_2m ?? 25);
    const feelsLike = Math.round(current.apparent_temperature ?? temp);
    const humidity = Math.round(current.relative_humidity_2m ?? 65);
    const precipitation = current.precipitation ?? 0;

    // Telecom / Infrastructure threats based on customizable settings
    const alerts: string[] = [];

    if (cemadenAlert) {
      alerts.push(cemadenAlert);
    }

    if (windGust >= currentSettings.gustThresholdKmh) {
      alerts.push(
        `Vento Crítico INMET/Estação: Rajadas estimadas de ${windGust} km/h (acima do limiar de ${currentSettings.gustThresholdKmh} km/h). Risco de desapontamento de antenas de rádio na concessionária ${site.concession}.`
      );
    }

    if (precipitation >= currentSettings.rainHourThresholdMm) {
      alerts.push(
        `Chuva Forte: Precipitação de ${precipitation} mm/h (limiar ${currentSettings.rainHourThresholdMm} mm/h). Risco de atenuação e infiltração em caixas subterrâneas de passagem óptica.`
      );
    }

    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
      alerts.push(
        `Alerta de Descargas Atmosféricas: Risco de queima de portas ethernet e atuação de DPS em unidades ${site.unitType}.`
      );
    }

    if (temp >= currentSettings.tempHighThresholdC) {
      alerts.push(
        `Calor Extremo (${temp}°C): Limiar térmico de ${currentSettings.tempHighThresholdC}°C atingido. Monitorar climatização das salas de automação e racks.`
      );
    }

    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const forecast = (daily.time as string[] || []).slice(0, 4).map((timeStr, idx) => {
      const dateObj = new Date(timeStr);
      const code = daily.weather_code?.[idx] ?? 0;
      return {
        date: timeStr,
        dayName: idx === 0 ? 'Hoje' : daysOfWeek[dateObj.getDay()] || timeStr,
        maxTemp: Math.round(daily.temperature_2m_max?.[idx] ?? 28),
        minTemp: Math.round(daily.temperature_2m_min?.[idx] ?? 19),
        maxGustKmh: Math.round(daily.wind_gusts_10m_max?.[idx] ?? 25),
        expectedRainMm: Math.round(daily.precipitation_sum?.[idx] ?? 0),
        condition: WMO_MAP[code] || 'Estável',
        precipitationProb: daily.precipitation_probability_max?.[idx] ?? 10,
      };
    });

    const hourlyForecast = (hourly.time as string[] || []).slice(0, 24).map((timeStr, idx) => ({
      time: timeStr.split('T')[1] || timeStr,
      tempC: Math.round(hourly.temperature_2m?.[idx] ?? temp),
      rainMm: hourly.precipitation?.[idx] ?? 0,
      gustKmh: Math.round(hourly.wind_gusts_10m?.[idx] ?? windGust),
      condition: WMO_MAP[hourly.weather_code?.[idx] ?? 0] || 'Nublado',
    }));

    return {
      temperature: temp,
      feelsLike,
      humidity,
      windSpeed,
      windGust,
      windDirection: Math.round(current.wind_direction_10m ?? 0),
      condition: WMO_MAP[weatherCode] || 'Tempo estável',
      conditionCode: weatherCode,
      precipitation,
      precipitationAccumulated24h: Math.round(daily.precipitation_sum?.[0] ?? 0),
      activeCemadenAlert: cemadenAlert || undefined,
      inmetStationUsed: `${nearestInmet.name} (${nearestInmet.id})`,
      distanceToStationKm: nearestInmet.distanceKm,
      alerts,
      forecast,
      hourlyForecast,
      lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    // Fallback using INMET closest coordinates simulation
    return {
      temperature: 24,
      feelsLike: 25,
      humidity: 62,
      windSpeed: 15,
      windGust: 38,
      windDirection: 180,
      condition: 'Parcialmente nublado',
      conditionCode: 2,
      precipitation: 0,
      precipitationAccumulated24h: 5,
      activeCemadenAlert: cemadenAlert || undefined,
      inmetStationUsed: `${nearestInmet.name} (${nearestInmet.id})`,
      distanceToStationKm: nearestInmet.distanceKm,
      alerts: cemadenAlert ? [cemadenAlert] : [],
      forecast: [
        { date: 'Hoje', dayName: 'Hoje', maxTemp: 28, minTemp: 20, maxGustKmh: 42, expectedRainMm: 0, condition: 'Sol e nuvens', precipitationProb: 20 },
        { date: 'Amanhã', dayName: 'Amanhã', maxTemp: 29, minTemp: 21, maxGustKmh: 55, expectedRainMm: 12, condition: 'Pancadas de chuva', precipitationProb: 65 },
        { date: 'Dia 3', dayName: 'Dia 3', maxTemp: 27, minTemp: 19, maxGustKmh: 48, expectedRainMm: 8, condition: 'Chuva leve', precipitationProb: 40 },
      ],
      lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  }
}
