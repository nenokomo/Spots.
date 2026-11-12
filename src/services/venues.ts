import { getSupabase } from '../lib/supabase';
import type { Venue, VenueKind, VenueReportReason } from '../types/venues';
import { safeExternalUrl } from './eventAdapter';
import { testVenues } from './testEvents';

// Nur veröffentlichte Orte; RLS erlaubt ohnehin nichts anderes.
const projection = 'id,name,kind,street,house_number,postcode,city,latitude,longitude,website,opening_hours,source,source_ref';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds: VenueKind[] = ['club', 'live', 'eventlocation'];

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

export function mapVenueRow(value: unknown): Venue | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id, 36);
  const name = text(row.name, 200);
  const kind = kinds.find((item) => item === row.kind);
  const latitude = typeof row.latitude === 'number' && Math.abs(row.latitude) <= 90 ? row.latitude : null;
  const longitude = typeof row.longitude === 'number' && Math.abs(row.longitude) <= 180 ? row.longitude : null;
  if (!id || !uuidPattern.test(id) || !name || !kind || latitude === null || longitude === null) return null;
  return {
    id, name, kind,
    street: text(row.street, 200), houseNumber: text(row.house_number, 20), postcode: text(row.postcode, 10),
    city: text(row.city, 120), coordinate: { latitude, longitude },
    website: safeExternalUrl(row.website), openingHours: text(row.opening_hours, 255),
    sourceRef: text(row.source_ref, 40), source: row.source === 'redaktion' ? 'redaktion' : 'osm',
  };
}

// public.venues gibt es erst, wo SQL 21 eingespielt ist (Spots-Test). Fehlt die Tabelle, ist das kein Fehler.
function tableMissing(error: { code?: string; message?: string }) {
  return error.code === 'PGRST205' || error.code === '42P01'
    || (/venues/.test(error.message ?? '') && /(does not exist|could not find)/i.test(error.message ?? ''));
}

export async function fetchVenue(id: string, signal?: AbortSignal): Promise<Venue | null> {
  const local = testVenues().find((venue) => venue.id === id);
  if (local) return local;
  if (!uuidPattern.test(id)) return null;
  let query = getSupabase().from('venues').select(projection).eq('id', id).eq('is_published', true);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (tableMissing(error)) return null;
    throw new Error('Der Ort konnte nicht geladen werden. Bitte Internetverbindung prüfen.');
  }
  return data ? mapVenueRow(data) : null;
}

/** „Fehler melden“: nur fester Grund und kurzer Text, ohne Konto. */
export async function reportVenue(id: string, reason: VenueReportReason, note: string) {
  if (testVenues().some((venue) => venue.id === id)) throw new Error('Testorte können nicht gemeldet werden.');
  const { error } = await getSupabase().rpc('spots_report_venue', {
    p_venue_id: id, p_reason: reason, p_note: note.trim().slice(0, 500) || null,
  });
  if (error) throw new Error('Die Meldung konnte nicht gesendet werden. Bitte später erneut versuchen.');
}
