export type City = { id: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string };

function isCity(value: unknown): value is City {
  if (!value || typeof value !== 'object') return false;
  const city = value as Partial<City>;
  return typeof city.id === 'number' && typeof city.name === 'string'
    && typeof city.latitude === 'number' && Number.isFinite(city.latitude) && Math.abs(city.latitude) <= 90
    && typeof city.longitude === 'number' && Number.isFinite(city.longitude) && Math.abs(city.longitude) <= 180
    && (city.country === undefined || typeof city.country === 'string')
    && (city.admin1 === undefined || typeof city.admin1 === 'string');
}

export async function searchCities(query: string, signal: AbortSignal): Promise<City[]> {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=de&format=json`, { signal });
  if (!response.ok) throw new Error('Ortssuche nicht verfügbar');
  const data: { results?: unknown; error?: boolean } = await response.json();
  if (data.error || (data.results !== undefined && !Array.isArray(data.results))) throw new Error('Ungültige Suchantwort');
  return Array.isArray(data.results) ? data.results.filter(isCity) : [];
}
