import { ORGANIZER_PUBLIC_BUCKET, storyImageUrl } from '../../services/organizerStories';
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

export type OrganizerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type OrganizerRequest = {
  id: string; slug: string; displayName: string; city: string | null; biography: string | null; websiteUrl: string | null;
  avatarUrl: string | null; status: OrganizerStatus; note: string | null; submittedAt: string | null; ownerEmail: string | null; eventCount: number;
  address: string | null; socialUrl: string | null; contactName: string | null; phone: string | null; emailConfirmed: boolean;
};

/** Veranstalter-Anträge (SQL 26): offene zuerst, dann freigegebene, abgelehnte und gesperrte. */
export async function fetchOrganizerQueue(): Promise<OrganizerRequest[]> {
  const { data, error } = await getAccountClient().rpc('spots_admin_organizer_queue', { p_status: null });
  if (error) throw failure('Laden der Veranstalter');
  return ((data ?? []) as { id: string; slug: string; display_name: string; city: string | null; biography: string | null; website_url: string | null;
    avatar_url: string | null; review_status: OrganizerStatus; review_note: string | null; submitted_at: string | null; owner_email: string | null; event_count: number;
    street: string | null; house_number: string | null; postcode: string | null; social_url: string | null; contact_name: string | null; phone: string | null; email_confirmed: boolean | null }[])
    .map((row) => ({ id: row.id, slug: row.slug, displayName: row.display_name, city: row.city, biography: row.biography, websiteUrl: row.website_url,
      avatarUrl: row.avatar_url, status: row.review_status, note: row.review_note, submittedAt: row.submitted_at, ownerEmail: row.owner_email,
      eventCount: Number(row.event_count),
      address: [[row.street, row.house_number].filter(Boolean).join(' '), [row.postcode, row.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null,
      socialUrl: row.social_url, contactName: row.contact_name, phone: row.phone, emailConfirmed: row.email_confirmed === true }));
}

export async function reviewOrganizer(id: string, status: 'approved' | 'rejected' | 'suspended', note?: string): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_review_organizer', { p_organizer_id: id, p_status: status, p_note: note?.trim() || null });
  if (error) throw failure(status === 'approved' ? 'Freigeben' : status === 'rejected' ? 'Ablehnen' : 'Sperren');
}

export type SnapStatus = 'visible' | 'hidden' | 'removed';
export type AdminSnap = {
  id: string; eventId: string | null; eventTitle: string | null; url: string | null; status: SnapStatus; byOrganizer: boolean;
  createdAt: string; expiresAt: string; reportCount: number; reasons: string[];
};

/** Shots der letzten 24 Stunden (SQL 30): gemeldete und ausgeblendete zuerst, mit kurz gültigen Bild-Links. */
export async function fetchSnapQueue(): Promise<AdminSnap[]> {
  const client = getAccountClient();
  const { data, error } = await client.rpc('spots_admin_snap_queue', { p_limit: 100 });
  if (error) throw failure('Laden der Shots');
  const rows = (data ?? []) as { id: string; event_id: string | null; event_title: string | null; storage_path: string; moderation_status: SnapStatus;
    by_organizer: boolean; created_at: string; expires_at: string; report_count: number; reasons: string[] | null }[];
  const signed = rows.length ? (await client.storage.from('live-snaps').createSignedUrls(rows.map((row) => row.storage_path), 60 * 15)).data ?? [] : [];
  const urls = new Map(signed.flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
  return rows.map((row) => ({ id: row.id, eventId: row.event_id, eventTitle: row.event_title, url: urls.get(row.storage_path) ?? null,
    status: row.moderation_status, byOrganizer: row.by_organizer, createdAt: row.created_at, expiresAt: row.expires_at,
    reportCount: Number(row.report_count), reasons: row.reasons ?? [] }));
}

export type AdminStory = {
  id: string; organizerId: string; organizerName: string; storagePath: string; url: string | null; caption: string | null;
  status: 'visible' | 'hidden'; createdAt: string; reportCount: number; reasons: string[];
};

/** Story-Bilder der Veranstalter (SQL 34): gemeldete und ausgeblendete zuerst. Die Bilder liegen im öffentlichen Speicher. */
export async function fetchStoryQueue(): Promise<AdminStory[]> {
  const client = getAccountClient();
  const { data, error } = await client.rpc('spots_admin_story_queue', { p_limit: 100 });
  if (error) throw failure('Laden der Storys');
  const rows = (data ?? []) as { id: string; organizer_id: string; organizer_name: string; storage_path: string; caption: string | null;
    moderation_status: 'visible' | 'hidden'; created_at: string; report_count: number; reasons: string[] | null }[];
  return rows.map((row) => ({ id: row.id, organizerId: row.organizer_id, organizerName: row.organizer_name, storagePath: row.storage_path,
    url: storyImageUrl(client, row.organizer_id, row.storage_path), caption: row.caption, status: row.moderation_status,
    createdAt: row.created_at, reportCount: Number(row.report_count), reasons: row.reasons ?? [] }));
}

export async function setStoryStatus(id: string, status: 'visible' | 'hidden'): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_set_story_status', { p_item_id: id, p_status: status });
  if (error) throw failure(status === 'visible' ? 'Wieder zeigen' : 'Ausblenden');
}

/** Endgültig entfernen: Zeile löschen, danach die Datei (beides erlaubt die Datenbank dem Team, SQL 33). */
export async function deleteStory(story: Pick<AdminStory, 'id' | 'storagePath'>): Promise<void> {
  const client = getAccountClient();
  const { data, error } = await client.from('organizer_story_items').delete().eq('id', story.id).select('id');
  if (error || !data?.length) throw failure('Entfernen');
  await client.storage.from(ORGANIZER_PUBLIC_BUCKET).remove([story.storagePath]).catch(() => {});
}

export async function setSnapStatus(id: string, status: SnapStatus): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_admin_set_snap_status', { p_snap_id: id, p_status: status });
  if (error) throw failure(status === 'visible' ? 'Wieder zeigen' : status === 'hidden' ? 'Ausblenden' : 'Entfernen');
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
