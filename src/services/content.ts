import { accountClientError, getAccountClient } from '../features/accounts/client';
import { getSupabase } from '../lib/supabase';
import { safeExternalUrl } from './eventAdapter';
import { LOCAL_TEST_ID_PREFIX } from './savedEventsSync';

/** Client mit der Sitzung des angemeldeten Kontos; ohne Anmeldung eine verständliche Meldung. */
async function signedInClient(message: string) {
  if (accountClientError) throw new Error(message);
  const client = getAccountClient();
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error(message);
  return client;
}

/** Zum Lesen: mit Sitzung, wenn angemeldet; sonst der öffentliche Client. */
async function readClient() {
  if (accountClientError) return getSupabase();
  const client = getAccountClient();
  const { data } = await client.auth.getSession().catch(() => ({ data: { session: null } }));
  return data.session ? client : getSupabase();
}

// Nach einem neuen Shot laden offene Eventseiten ihre Shots neu.
const snapListeners = new Set<(eventId: string) => void>();
export function onSnapsChanged(listener: (eventId: string) => void) {
  snapListeners.add(listener);
  return () => { snapListeners.delete(listener); };
}

const shotTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

/**
 * Postet einen Shot (Foto) zu einem laufenden Event (SQL 17/30): Datei in den privaten Bucket live-snaps
 * (Ordner = eigenes Konto), dann die Zeile. Sofort sichtbar; Melden und Moderation greifen danach.
 */
export async function postShot(eventId: string, image: { uri: string; mimeType?: string | null }): Promise<void> {
  if (!uuid.test(eventId) || eventId.toLowerCase().startsWith(LOCAL_TEST_ID_PREFIX)) throw new Error('Für Test-Events können keine Shots gepostet werden.');
  const client = await signedInClient('Zum Posten bitte zuerst anmelden.');
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Zum Posten bitte zuerst anmelden.');
  const mimeType = image.mimeType && shotTypes[image.mimeType] ? image.mimeType : 'image/jpeg';
  const body = await fetch(image.uri).then((response) => response.arrayBuffer());
  if (body.byteLength > 20 * 1024 * 1024) throw new Error('Das Foto ist zu groß (höchstens 20 MB).');
  const path = `${user.id}/${Date.now().toString(36)}-${Math.floor(Math.random() * 36 ** 6).toString(36)}.${shotTypes[mimeType]}`;
  const bucket = client.storage.from(SNAP_BUCKET);
  const uploaded = await bucket.upload(path, body, { contentType: mimeType, upsert: false });
  if (uploaded.error) throw new Error('Der Shot konnte nicht hochgeladen werden. Bitte erneut versuchen.');
  const { error } = await client.from('live_snaps').insert({ event_id: eventId, media_type: 'image', storage_path: path });
  if (error) {
    await bucket.remove([path]).catch(() => {});
    if (error.message?.includes('limit')) throw new Error('Du hast gerade sehr viele Shots gepostet. Bitte später erneut versuchen.');
    if (error.code === '42501') throw new Error('Shots gehen nur, während das Event läuft.');
    throw new Error('Der Shot konnte nicht gespeichert werden. Bitte erneut versuchen.');
  }
  snapListeners.forEach((listener) => listener(eventId));
}

/**
 * Read side of Live Snaps and ticket types (supabase/ops/17_content_tickets.sql).
 * Tables that are not deployed in the current project are remembered per session,
 * so production does not repeat failing requests until the migration is applied.
 */

export type LiveSnap = {
  id: string;
  eventId: string | null;
  organizerId: string | null;
  mediaType: 'image' | 'video';
  url: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  byOrganizer: boolean;
};

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  externalUrl: string | null;
  salesEnd: string | null;
  soldOut: boolean;
};

export const SNAP_BUCKET = 'live-snaps';
const unavailable = new Set<string>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const missingSchema = (code?: string) => code === 'PGRST205' || code === '42P01' || code === '42703';

type SnapRow = { id: string; event_id: string | null; organizer_id: string | null; media_type: string; storage_path: string; caption: string | null; created_at: string; expires_at: string; by_organizer: boolean };
type TicketRow = { id: string; event_id: string; name: string; description: string | null; price_cents: number | null; currency: string; external_url: string | null; sales_end: string | null; sold_out: boolean };

/** Visible, unexpired snaps of an event. Expiry is enforced by RLS and re-checked here. */
export async function fetchEventSnaps(eventId: string, now = Date.now()): Promise<LiveSnap[]> {
  if (!uuid.test(eventId) || unavailable.has('live_snaps')) return [];
  // Gäste-Shots gibt es nur mit Konto (SQL 32): angemeldet mit der Sitzung lesen, sonst öffentlich (nur Club-Story).
  const client = await readClient();
  const { data, error } = await client.from('live_snaps')
    .select('id,event_id,organizer_id,media_type,storage_path,caption,created_at,expires_at,by_organizer')
    .eq('event_id', eventId).eq('moderation_status', 'visible').gt('expires_at', new Date(now).toISOString())
    .order('created_at', { ascending: false }).limit(50);
  if (error && missingSchema(error.code)) { unavailable.add('live_snaps'); return []; }
  if (error) throw new Error('Live Snaps konnten nicht geladen werden.');
  const rows = ((data ?? []) as SnapRow[]).filter((row) => Date.parse(row.expires_at) > now && (row.media_type === 'image' || row.media_type === 'video'));
  if (rows.length === 0) return [];
  // Private bucket: short-lived signed URLs, issued only while the row is readable under RLS.
  const { data: signed, error: signError } = await client.storage.from(SNAP_BUCKET).createSignedUrls(rows.map((row) => row.storage_path), 60 * 30);
  if (signError) return [];
  const urls = new Map((signed ?? []).flatMap((item) => item.signedUrl && item.path ? [[item.path, item.signedUrl] as const] : []));
  return rows.flatMap((row) => {
    const url = urls.get(row.storage_path);
    return url ? [{ id: row.id, eventId: row.event_id, organizerId: row.organizer_id, mediaType: row.media_type as LiveSnap['mediaType'], url, caption: row.caption, createdAt: row.created_at, expiresAt: row.expires_at, byOrganizer: row.by_organizer }] : [];
  });
}

/** Published ticket categories of an event (prices in cents). Informational only, no checkout. */
export async function fetchTicketTypes(eventId: string): Promise<TicketType[]> {
  if (!uuid.test(eventId) || unavailable.has('ticket_types')) return [];
  const { data, error } = await getSupabase().from('ticket_types')
    .select('id,event_id,name,description,price_cents,currency,external_url,sales_end,sold_out')
    .eq('event_id', eventId).eq('is_published', true).order('sort_order').order('price_cents').limit(20);
  if (error && missingSchema(error.code)) { unavailable.add('ticket_types'); return []; }
  if (error) throw new Error('Ticketinformationen konnten nicht geladen werden.');
  return ((data ?? []) as TicketRow[]).map((row) => ({
    id: row.id, eventId: row.event_id, name: row.name, description: row.description,
    priceCents: typeof row.price_cents === 'number' && row.price_cents >= 0 ? row.price_cents : null,
    currency: /^[A-Z]{3}$/.test(row.currency) ? row.currency : 'EUR',
    externalUrl: safeExternalUrl(row.external_url), salesEnd: row.sales_end, soldOut: !!row.sold_out,
  }));
}

export function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return 'Preis auf Anfrage';
  if (cents === 0) return 'Kostenlos';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);
}

/** Reasons accepted by public.content_reports (SQL 17). */
export const shotReportReasons = [
  { id: 'nudity', label: 'Nacktheit oder sexuelle Inhalte' },
  { id: 'violence', label: 'Gewalt oder Gefahr' },
  { id: 'harassment', label: 'Beleidigung oder Belästigung' },
  { id: 'privacy', label: 'Zeigt mich oder andere ohne Erlaubnis' },
  { id: 'spam', label: 'Spam oder Werbung' },
  { id: 'other', label: 'Etwas anderes' },
] as const;
export type ShotReportReason = typeof shotReportReasons[number]['id'];

/**
 * Reports a visitor shot (live_snaps row). Needs a signed-in account (RLS of SQL 17);
 * three different reports hide the shot until it is reviewed.
 */
export async function reportShot(snapId: string, reason: ShotReportReason, details: string) {
  if (!uuid.test(snapId)) throw new Error('Test-SHOTS können nicht gemeldet werden.');
  if (unavailable.has('content_reports')) throw new Error('Melden ist hier noch nicht eingerichtet.');
  // Melden braucht die Sitzung des Kontos (der öffentliche Client hat keine).
  const client = await signedInClient('Zum Melden bitte zuerst anmelden.');
  const { error } = await client.from('content_reports').insert({ snap_id: snapId, reason, details: details.trim().slice(0, 500) || null });
  if (error && missingSchema(error.code)) { unavailable.add('content_reports'); throw new Error('Melden ist hier noch nicht eingerichtet.'); }
  if (error?.code === '23505') return; // already reported by this account
  if (error?.code === '42501') throw new Error('Zum Melden bitte zuerst anmelden.');
  if (error) throw new Error('Die Meldung konnte nicht gesendet werden. Bitte später erneut versuchen.');
}
