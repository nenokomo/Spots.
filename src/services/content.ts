import { getSupabase } from '../lib/supabase';
import { safeExternalUrl } from './eventAdapter';

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
  const client = getSupabase();
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
