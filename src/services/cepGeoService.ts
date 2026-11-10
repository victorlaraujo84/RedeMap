/**
 * CEP to Latitude/Longitude Geocoding Service for Brazilian Concession Territories
 * Uses BrasilAPI / ViaCEP combined with Nominatim geocoding & Concession Municipality Centroids
 */

export interface CepGeoResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  source: 'brasil_api' | 'viacep_nominatim' | 'centroid_database' | 'fallback';
  suggestedConcession?: string;
  formattedAddress: string;
}

// Well-known coordinates for Concession Hubs & Municipalities
const MUNICIPALITY_CENTROIDS: Record<string, { lat: number; lng: number; concession: string }> = {
  // Rio de Janeiro Concessions
  'NITEROI-RJ': { lat: -22.8859, lng: -43.1153, concession: 'CAN' },
  'RIO DE JANEIRO-RJ': { lat: -22.9068, lng: -43.1729, concession: 'RIOMAIS' },
  'CAMPO GRANDE-RJ': { lat: -22.9031, lng: -43.5592, concession: 'RIOMAIS' },
  'SANTA CRUZ-RJ': { lat: -22.9197, lng: -43.6853, concession: 'RIOMAIS' },
  'BANGU-RJ': { lat: -22.8756, lng: -43.4658, concession: 'RIOMAIS' },
  'NOVA FRIBURGO-RJ': { lat: -22.2819, lng: -42.5311, concession: 'CANF' },
  'ARARUAMA-RJ': { lat: -22.8711, lng: -42.3414, concession: 'CAJ' },
  'SAQUAREMA-RJ': { lat: -22.9328, lng: -42.5103, concession: 'CAJ' },
  'SILVA JARDIM-RJ': { lat: -22.6514, lng: -42.3922, concession: 'CAJ' },
  'ITABORAI-RJ': { lat: -22.7444, lng: -42.8592, concession: 'CAI' },
  'PETROPOLIS-RJ': { lat: -22.5056, lng: -43.1789, concession: 'CANF' },

  // São Paulo Concessions
  'JAU-SP': { lat: -22.2961, lng: -48.5583, concession: 'JAHU' },
  'JAHU-SP': { lat: -22.2961, lng: -48.5583, concession: 'JAHU' },
  'VOTORANTIM-SP': { lat: -23.5414, lng: -47.4381, concession: 'CAV' },
  'SOROCABA-SP': { lat: -23.5015, lng: -47.4581, concession: 'CAV' },
  'PIRACICABA-SP': { lat: -22.7253, lng: -47.6492, concession: 'CAPY' },
  'ANDRADINA-SP': { lat: -20.8961, lng: -51.3794, concession: 'CAAN' },
  'ILHA SOLTEIRA-SP': { lat: -20.4311, lng: -51.3414, concession: 'CAIZ' },
  'JAGUARIUNA-SP': { lat: -22.7056, lng: -47.0111, concession: 'CAJA' },
  'CAMPINAS-SP': { lat: -22.9056, lng: -47.0608, concession: 'CAJA' },
  'SAO PAULO-SP': { lat: -23.5505, lng: -46.6333, concession: 'SEDE' },

  // Mato Grosso / MS / Tocantins / Alagoas
  'CUIABA-MT': { lat: -15.5894, lng: -56.0681, concession: 'CAC' },
  'VARZEA GRANDE-MT': { lat: -15.6467, lng: -56.1325, concession: 'CAC' },
  'PRIMAVERA DO LESTE-MT': { lat: -15.5589, lng: -54.2961, concession: 'CAP' },
  'BARRA DO GARCAS-MT': { lat: -15.8956, lng: -52.2567, concession: 'SAAB' },
  'PARANAIBA-MS': { lat: -19.6739, lng: -51.1908, concession: 'CAPAM' },
  'MACEIO-AL': { lat: -9.6658, lng: -35.7353, concession: 'SAAL' },
  'PALMAS-TO': { lat: -10.1844, lng: -48.3336, concession: 'SANEJ' },
};

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export async function convertCepToCoordinates(rawCep: string): Promise<CepGeoResult> {
  const cleanCep = rawCep.replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    throw new Error('CEP inválido. O CEP deve conter exatamente 8 dígitos numéricos.');
  }

  // 1. Try BrasilAPI v2 (returns lat/lng directly if in database)
  try {
    const brasilApiUrl = `https://brasilapi.com.br/api/cep/v2/${cleanCep}`;
    const res = await fetch(brasilApiUrl, { headers: { Accept: 'application/json' } });

    if (res.ok) {
      const data = await res.json();
      const city = data.city || '';
      const state = data.state || '';
      const street = data.street || '';
      const neighborhood = data.neighborhood || '';

      const normKey = `${normalizeString(city)}-${normalizeString(state)}`;
      const preset = MUNICIPALITY_CENTROIDS[normKey];

      // Check if coordinates exist in BrasilAPI v2
      if (
        data.location &&
        data.location.coordinates &&
        typeof data.location.coordinates.longitude === 'string' &&
        typeof data.location.coordinates.latitude === 'string'
      ) {
        const lat = parseFloat(data.location.coordinates.latitude);
        const lng = parseFloat(data.location.coordinates.longitude);

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          return {
            cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
            street,
            neighborhood,
            city,
            state,
            lat,
            lng,
            source: 'brasil_api',
            suggestedConcession: preset?.concession,
            formattedAddress: `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ', ' : ''}${city} - ${state}, ${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
          };
        }
      }

      // If coordinates not in BrasilAPI, try geocoding with OpenStreetMap Nominatim
      try {
        const query = encodeURIComponent(`${street ? street + ', ' : ''}${city}, ${state}, Brasil`);
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
          { headers: { 'User-Agent': 'RedeMap-Saneamento/2.0' } }
        );

        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData) && nomData.length > 0) {
            const lat = parseFloat(nomData[0].lat);
            const lng = parseFloat(nomData[0].lon);
            return {
              cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
              street,
              neighborhood,
              city,
              state,
              lat,
              lng,
              source: 'viacep_nominatim',
              suggestedConcession: preset?.concession,
              formattedAddress: `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ', ' : ''}${city} - ${state}, ${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
            };
          }
        }
      } catch {
        // fallback
      }

      // If centroid exists for city
      if (preset) {
        return {
          cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
          street,
          neighborhood,
          city,
          state,
          lat: preset.lat,
          lng: preset.lng,
          source: 'centroid_database',
          suggestedConcession: preset.concession,
          formattedAddress: `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ', ' : ''}${city} - ${state}, ${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
        };
      }
    }
  } catch {
    // try ViaCEP
  }

  // 2. Try ViaCEP
  try {
    const viaCepUrl = `https://viacep.com.br/ws/${cleanCep}/json/`;
    const res = await fetch(viaCepUrl);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        const city = data.localidade || '';
        const state = data.uf || '';
        const street = data.logradouro || '';
        const neighborhood = data.bairro || '';

        const normKey = `${normalizeString(city)}-${normalizeString(state)}`;
        const preset = MUNICIPALITY_CENTROIDS[normKey];

        // Try geocoding city + street
        try {
          const query = encodeURIComponent(`${street ? street + ', ' : ''}${city}, ${state}, Brasil`);
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
            { headers: { 'User-Agent': 'RedeMap-Saneamento/2.0' } }
          );

          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0) {
              return {
                cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
                street,
                neighborhood,
                city,
                state,
                lat: parseFloat(nomData[0].lat),
                lng: parseFloat(nomData[0].lon),
                source: 'viacep_nominatim',
                suggestedConcession: preset?.concession,
                formattedAddress: `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ', ' : ''}${city} - ${state}`,
              };
            }
          }
        } catch {
          // ignore
        }

        if (preset) {
          return {
            cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
            street,
            neighborhood,
            city,
            state,
            lat: preset.lat,
            lng: preset.lng,
            source: 'centroid_database',
            suggestedConcession: preset.concession,
            formattedAddress: `${street ? street + ', ' : ''}${neighborhood ? neighborhood + ', ' : ''}${city} - ${state}`,
          };
        }
      }
    }
  } catch {
    // fallback
  }

  // 3. Fallback based on CEP range estimation (Rio / SP / MT)
  const prefix = parseInt(cleanCep.slice(0, 2), 10);
  let estLat = -22.9056;
  let estLng = -43.1231;
  let estCity = 'Niterói';
  let estState = 'RJ';
  let estConc = 'CAN';

  if (prefix >= 20 && prefix <= 28) {
    // Rio de Janeiro
    estLat = -22.9068;
    estLng = -43.1729;
    estCity = 'Rio de Janeiro';
    estState = 'RJ';
    estConc = 'RIOMAIS';
  } else if (prefix >= 1 && prefix <= 19) {
    // São Paulo
    estLat = -23.5505;
    estLng = -46.6333;
    estCity = 'São Paulo';
    estState = 'SP';
    estConc = 'CAV';
  } else if (prefix >= 78) {
    // Mato Grosso
    estLat = -15.5894;
    estLng = -56.0681;
    estCity = 'Cuiabá';
    estState = 'MT';
    estConc = 'CAC';
  }

  return {
    cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
    street: '',
    neighborhood: '',
    city: estCity,
    state: estState,
    lat: estLat,
    lng: estLng,
    source: 'fallback',
    suggestedConcession: estConc,
    formattedAddress: `${estCity} - ${estState}, CEP ${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
  };
}
