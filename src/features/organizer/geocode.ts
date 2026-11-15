// Adresse → Kartenposition über OpenStreetMap Nominatim (strukturierte Suche, nur Deutschland).
// Nur beim Speichern eines Club-Events, nie beim Tippen (Nutzungsregeln von Nominatim: höchstens eine Anfrage pro Sekunde,
// kein Autocomplete). Daten © OpenStreetMap-Mitwirkende (ODbL). Die Adresse geht dabei an den Nominatim-Dienst.

export type EventAddress = { street: string; houseNumber: string; postcode: string; city: string };
export type GeocodeResult = { latitude: number; longitude: number; label: string };

const endpoint = 'https://nominatim.openstreetmap.org/search';
/** Grob Deutschland: schützt vor Treffern im Ausland bei Tippfehlern. */
const germany = { minLat: 47.2, maxLat: 55.1, minLon: 5.8, maxLon: 15.1 };

export function geocodeUrl(address: EventAddress): string {
  const params = new URLSearchParams({
    street: `${address.houseNumber.trim()} ${address.street.trim()}`.trim(),
    postalcode: address.postcode.trim(),
    city: address.city.trim(),
    countrycodes: 'de',
    format: 'jsonv2',
    limit: '1',
    'accept-language': 'de',
  });
  return `${endpoint}?${params.toString()}`;
}

/** null = Adresse nicht gefunden. Wirft nur bei Netzwerk- oder Dienstfehlern. */
export async function geocodeAddress(address: EventAddress, request: typeof fetch = fetch): Promise<GeocodeResult | null> {
  const response = await request(geocodeUrl(address), { headers: { Accept: 'application/json', 'User-Agent': 'Spots-App (Veranstalter-Bereich)' } });
  if (!response.ok) throw new Error('Die Adresse konnte gerade nicht gesucht werden. Bitte später erneut versuchen.');
  const rows: unknown = await response.json();
  const first = Array.isArray(rows) ? rows[0] as { lat?: string; lon?: string; display_name?: string } | undefined : undefined;
  const latitude = Number(first?.lat), longitude = Number(first?.lon);
  if (!first || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < germany.minLat || latitude > germany.maxLat || longitude < germany.minLon || longitude > germany.maxLon) return null;
  return { latitude, longitude, label: String(first.display_name ?? '') };
}
