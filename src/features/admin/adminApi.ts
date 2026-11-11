import { getAccountClient } from '../accounts/client';
import type { VenueKind } from '../../types/venues';

// Alle Aufrufe laufen mit der Sitzung des angemeldeten Kontos; die Datenbank prüft die Admin-Rolle (SQL 22).
const failure = (action: string) => new Error(`${action} hat nicht geklappt. Bitte Verbindung prüfen und erneut versuchen.`);
type Embedded = { id: string; name: string; city: string | null } | null;
const one = (value: unknown): Embedded => {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === 'object' ? item as Embedded : null;
};

export type DraftCategory = 'club' | 'concert' | 'event';
export type AdminDraft = {
  id: string; title: string; startsAt: string; endsAt: string | null; genre: string | null; category: DraftCategory;
  ticketUrl: string | null; sourceUrl: string | null; provenance: string; venue: Embedded;
};
export type PendingVenue = { id: string; name: string; kind: VenueKind; city: string | null; website: string | null };
export type OpenReport = { id: string; reason: string; note: string | null; createdAt: string; venue: Embedded };
export type VenueChoice = { id: string; name: string; city: string | null; kind: VenueKind };
export type NewDraft = {
  venueId: string; title: string; startsAt: string; endsAt: string | null; genre: string | null; category: DraftCategory;
  ticketUrl: string | null; sourceUrl: string | null; provenance: string;
};

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await getAccountClient().rpc('spots_is_admin');
  return !error && data === true;
}

export async function fetchOpenDrafts(): Promise<AdminDraft[]> {
  const { data, error } = await getAccountClient().from('event_drafts')
    .select('id,title,starts_at,ends_at,genre,category,ticket_url,source_url,provenance,venue:venues(id,name,city)')
    .eq('status', 'open').order('starts_at').limit(200);
  if (error) throw failure('Laden der Entwürfe');
  return (data ?? []).map((row) => ({
    id: row.id, title: row.title, startsAt: row.starts_at, endsAt: row.ends_at, genre: row.genre, category: row.category,
    ticketUrl: row.ticket_url, sourceUrl: row.source_url, provenance: row.provenance, venue: one(row.venue),
  }));
}

export async function createDraft(input: NewDraft): Promise<string> {
  const { data, error } = await getAccountClient().from('event_drafts').insert({
    venue_id: input.venueId, title: input.title.trim(), starts_at: input.startsAt, ends_at: input.endsAt,
    genre: input.genre?.trim() || null, category: input.category, ticket_url: input.ticketUrl, source_url: input.sourceUrl,
    provenance: input.provenance.trim(),
  }).select('id').single();
  if (error || !data) throw failure('Speichern des Entwurfs');
  return data.id as string;
}

export async function approveDraft(id: string): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_approve_draft', { p_draft_id: id, p_publish: true });
  if (error) throw failure('Freigeben');
}

export async function rejectDraft(id: string, note?: string): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_reject_draft', { p_draft_id: id, p_note: note?.trim() || null });
  if (error) throw failure('Ablehnen');
}

export async function fetchPendingVenues(): Promise<PendingVenue[]> {
  const { data, error } = await getAccountClient().from('venues').select('id,name,kind,city,website')
    .eq('review_status', 'pending').order('name').limit(200);
  if (error) throw failure('Laden der Orte');
  return (data ?? []) as PendingVenue[];
}

export async function setVenueStatus(id: string, status: 'approved' | 'hidden' | 'pending'): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_set_venue_status', { p_venue_id: id, p_status: status });
  if (error) throw failure('Ändern des Orts');
}

export async function fetchOpenReports(): Promise<OpenReport[]> {
  const { data, error } = await getAccountClient().from('venue_reports')
    .select('id,reason,note,created_at,venue:venues(id,name,city)').eq('status', 'open')
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw failure('Laden der Meldungen');
  return (data ?? []).map((row) => ({ id: row.id, reason: row.reason, note: row.note, createdAt: row.created_at, venue: one(row.venue) }));
}

export async function resolveReport(id: string, status: 'resolved' | 'dismissed'): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_resolve_report', { p_report_id: id, p_status: status });
  if (error) throw failure('Abschließen der Meldung');
}

/** Ortssuche für neue Events: Admins sehen auch ungeprüfte Orte, nie ausgeblendete. */
export async function searchVenues(query: string): Promise<VenueChoice[]> {
  const term = query.trim().replace(/[%_\\,()]/g, ' ').slice(0, 60);
  if (term.length < 2) return [];
  const { data, error } = await getAccountClient().from('venues').select('id,name,city,kind')
    .ilike('name', `%${term}%`).neq('review_status', 'hidden').order('name').limit(15);
  if (error) throw failure('Ortssuche');
  return (data ?? []) as VenueChoice[];
}
