import { getAccountClient } from '../accounts/client';
import { ORGANIZER_PUBLIC_BUCKET, toStoryItems, type OrganizerStoryItem } from '../../services/organizerStories';
import type { OrganizerSignupData } from './signup';

// Veranstalter-Bereich (SQL 15, 17, 26, 27). Alle Aufrufe laufen mit der Sitzung des Kontos;
// die Datenbank prüft Mitgliedschaft, Besitz und Freigabe selbst. Fehlertexte verraten keine Details.
const failure = (action: string) => new Error(`${action} hat nicht geklappt. Bitte Verbindung prüfen und erneut versuchen.`);

export type ReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
export const reviewLabels: Record<ReviewStatus, string> = {
  draft: 'Noch nicht beantragt', pending: 'Antrag wird geprüft', approved: 'Freigegeben',
  rejected: 'Abgelehnt', suspended: 'Gesperrt',
};
export type MyOrganizer = {
  id: string; slug: string; displayName: string; biography: string | null; city: string | null;
  street: string | null; houseNumber: string | null; postcode: string | null;
  avatarUrl: string | null; websiteUrl: string | null; socialUrl: string | null; isPublished: boolean;
  reviewStatus: ReviewStatus; reviewNote: string | null; role: 'owner' | 'editor';
};
export type OrganizerProfileInput = {
  displayName: string; biography: string | null; street: string; houseNumber: string; postcode: string; city: string;
  avatarUrl: string | null; websiteUrl: string | null; socialUrl: string | null;
};
export type OrganizerContact = { contactName: string; phone: string };
export type AccountType = 'private' | 'organizer';
export type EventCategory = 'club' | 'concert' | 'event';
export type OrganizerEvent = {
  id: string; title: string; description: string | null; startsAt: string; endsAt: string | null;
  venueId: string | null; venueName: string | null; street: string | null; houseNumber: string | null; postcode: string | null; city: string | null; latitude: number | null; longitude: number | null;
  imageUrl: string | null; ticketUrl: string | null; genre: string | null; category: EventCategory;
  status: 'scheduled' | 'cancelled' | 'postponed'; isPublished: boolean;
};
export type OrganizerEventInput = Omit<OrganizerEvent, 'id'>;
export type EventStats = { eventId: string; title: string; startsAt: string; isPublished: boolean; views: number; ticketClicks: number; saves: number; snaps: number };
export type PublicVenueChoice = { id: string; name: string; city: string | null };

const organizerFields = 'id,slug,display_name,biography,city,street,house_number,postcode,avatar_url,website_url,social_url,is_published,review_status,review_note';
type OrganizerRow = {
  id: string; slug: string; display_name: string; biography: string | null; city: string | null; street: string | null;
  house_number: string | null; postcode: string | null; avatar_url: string | null; website_url: string | null; social_url: string | null;
  is_published: boolean; review_status: ReviewStatus; review_note: string | null;
};
const toOrganizer = (row: OrganizerRow, role: 'owner' | 'editor'): MyOrganizer => ({
  id: row.id, slug: row.slug, displayName: row.display_name, biography: row.biography, city: row.city,
  street: row.street, houseNumber: row.house_number, postcode: row.postcode,
  avatarUrl: row.avatar_url, websiteUrl: row.website_url, socialUrl: row.social_url, isPublished: row.is_published,
  reviewStatus: row.review_status, reviewNote: row.review_note, role,
});

/** Welche Oberfläche? Die Kontoart steht fest seit der Registrierung (SQL 28). Ältere Konten sind privat. */
export async function fetchAccountType(): Promise<AccountType> {
  const { data, error } = await getAccountClient().rpc('spots_my_account_type');
  if (error) throw failure('Laden der Kontoart');
  return data === 'organizer' ? 'organizer' : 'private';
}

/** Nachholen, falls der Club bei der Registrierung nicht angelegt werden konnte. */
export async function registerOrganizer(data: OrganizerSignupData): Promise<string> {
  const { data: id, error } = await getAccountClient().rpc('spots_register_organizer', { p_data: data });
  if (error || typeof id !== 'string') throw failure('Anlegen des Clubs');
  return id;
}

export async function fetchOrganizerContact(organizerId: string): Promise<OrganizerContact | null> {
  const { data, error } = await getAccountClient().rpc('spots_organizer_contact', { p_organizer_id: organizerId });
  if (error) throw failure('Laden der Ansprechperson');
  const row = (data ?? [])[0] as { contact_name: string; phone: string } | undefined;
  return row ? { contactName: row.contact_name, phone: row.phone } : null;
}

export async function saveOrganizerContact(organizerId: string, contact: OrganizerContact): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_organizer_set_contact', {
    p_organizer_id: organizerId, p_contact_name: contact.contactName.trim(), p_phone: contact.phone.trim() });
  if (error) throw failure('Speichern der Ansprechperson');
}

async function currentUserId(): Promise<string> {
  const { data, error } = await getAccountClient().auth.getUser();
  if (error || !data.user) throw new Error('Bitte anmelden.');
  return data.user.id;
}

export async function fetchMyOrganizers(): Promise<MyOrganizer[]> {
  const userId = await currentUserId();
  const { data, error } = await getAccountClient().from('organizer_memberships')
    .select(`role,organizer:organizers(${organizerFields})`).eq('user_id', userId).order('created_at');
  if (error) throw failure('Laden deiner Veranstalter');
  return (data ?? []).flatMap((row) => {
    const organizer = (Array.isArray(row.organizer) ? row.organizer[0] : row.organizer) as OrganizerRow | null;
    return organizer ? [toOrganizer(organizer, row.role as 'owner' | 'editor')] : [];
  });
}

export async function updateOrganizerProfile(id: string, input: OrganizerProfileInput): Promise<void> {
  const { data, error } = await getAccountClient().from('organizers').update({
    display_name: input.displayName.trim(), biography: input.biography?.trim() || null,
    street: input.street.trim(), house_number: input.houseNumber.trim(), postcode: input.postcode.trim(), city: input.city.trim(),
    avatar_url: input.avatarUrl, website_url: input.websiteUrl, social_url: input.socialUrl,
  }).eq('id', id).select('id');
  if (error || data?.length !== 1) throw failure('Speichern des Profils');
}

export async function submitOrganizer(id: string): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_organizer_submit', { p_organizer_id: id });
  if (error) throw failure('Antrag stellen');
}

export async function withdrawOrganizer(id: string): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_organizer_withdraw', { p_organizer_id: id });
  if (error) throw failure('Antrag zurückziehen');
}

const eventFields = 'id,title,description,starts_at,ends_at,venue_id,venue_name,street,house_number,postcode,city,latitude,longitude,image_url,ticket_url,genre,category,status,is_published';
type EventRow = {
  id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; venue_id: string | null;
  venue_name: string | null; street: string | null; house_number: string | null; postcode: string | null; city: string | null; latitude: number | null; longitude: number | null; image_url: string | null;
  ticket_url: string | null; genre: string | null; category: string | null; status: OrganizerEvent['status']; is_published: boolean;
};
const toEvent = (row: EventRow): OrganizerEvent => ({
  id: row.id, title: row.title, description: row.description, startsAt: row.starts_at, endsAt: row.ends_at,
  venueId: row.venue_id, venueName: row.venue_name, street: row.street, houseNumber: row.house_number, postcode: row.postcode, city: row.city, latitude: row.latitude, longitude: row.longitude,
  imageUrl: row.image_url, ticketUrl: row.ticket_url, genre: row.genre,
  category: row.category === 'concert' || row.category === 'event' ? row.category : 'club',
  status: row.status, isPublished: row.is_published,
});

export async function fetchOrganizerEvents(organizerId: string): Promise<OrganizerEvent[]> {
  const { data, error } = await getAccountClient().from('events').select(eventFields)
    .eq('organizer_id', organizerId).eq('source', 'spots').order('starts_at', { ascending: false }).limit(200);
  if (error) throw failure('Laden der Events');
  return ((data ?? []) as EventRow[]).map(toEvent);
}

/** Neues Event (id leer) oder Änderung. Mit Ort aus dem Adressbuch setzt die Datenbank Name, Stadt und Position selbst. */
export async function saveOrganizerEvent(organizerId: string, input: OrganizerEventInput, id?: string): Promise<string> {
  const row = {
    title: input.title.trim(), description: input.description?.trim() || null, starts_at: input.startsAt, ends_at: input.endsAt,
    venue_id: input.venueId, venue_name: input.venueName?.trim() || null, street: input.street?.trim() || null,
    house_number: input.houseNumber?.trim() || null, postcode: input.postcode?.trim() || null, city: input.city?.trim() || null,
    latitude: input.latitude, longitude: input.longitude, image_url: input.imageUrl, ticket_url: input.ticketUrl,
    genre: input.genre?.trim() || null, category: input.category, status: input.status, is_published: input.isPublished,
  };
  const client = getAccountClient();
  const { data, error } = id
    ? await client.from('events').update(row).eq('id', id).eq('organizer_id', organizerId).select('id').single()
    : await client.from('events').insert({ ...row, organizer_id: organizerId, source: 'spots' }).select('id').single();
  if (error || !data) throw failure('Speichern des Events');
  return data.id as string;
}

export async function fetchEventStats(organizerId: string): Promise<EventStats[]> {
  const { data, error } = await getAccountClient().rpc('spots_organizer_event_stats', { p_organizer_id: organizerId });
  if (error) throw failure('Laden der Statistik');
  return ((data ?? []) as { event_id: string; title: string; starts_at: string; is_published: boolean; views: number; ticket_clicks: number; saves: number; snaps: number }[])
    .map((row) => ({ eventId: row.event_id, title: row.title, startsAt: row.starts_at, isPublished: row.is_published,
      views: Number(row.views), ticketClicks: Number(row.ticket_clicks), saves: Number(row.saves), snaps: Number(row.snaps) }));
}

/** Ortssuche für Veranstalter: nur veröffentlichte Orte aus dem Adressbuch. */
export async function searchPublicVenues(query: string): Promise<PublicVenueChoice[]> {
  const term = query.trim().replace(/[%_\\,()]/g, ' ').slice(0, 60);
  if (term.length < 2) return [];
  const { data, error } = await getAccountClient().from('venues').select('id,name,city')
    .eq('is_published', true).ilike('name', `%${term}%`).order('name').limit(15);
  if (error) throw failure('Ortssuche');
  return (data ?? []) as PublicVenueChoice[];
}

const imageTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const maxImageBytes = 5 * 1024 * 1024;

async function uploadPublicImage(organizerId: string, image: { uri: string; mimeType?: string | null }, kind: 'logo' | 'flyer' | 'story') {
  const mimeType = image.mimeType || 'image/jpeg';
  const extension = imageTypes[mimeType];
  if (!extension) throw new Error('Bitte ein JPG-, PNG- oder WebP-Bild wählen.');
  const body = await fetch(image.uri).then((response) => response.arrayBuffer());
  if (body.byteLength > maxImageBytes) throw new Error('Das Bild ist größer als 5 MB.');
  const random = Math.floor(Math.random() * 36 ** 6).toString(36);
  const path = `${organizerId}/${kind}-${Date.now().toString(36)}-${random}.${extension}`;
  const storage = getAccountClient().storage.from(ORGANIZER_PUBLIC_BUCKET);
  const { error } = await storage.upload(path, body, { contentType: mimeType, upsert: false });
  if (error) throw failure('Hochladen des Bilds');
  return { path, url: storage.getPublicUrl(path).data.publicUrl };
}

/** Lädt ein Bild in den öffentlichen Speicher (SQL 27, Ordner = Veranstalter) und liefert die feste Adresse. */
export async function uploadOrganizerImage(organizerId: string, image: { uri: string; mimeType?: string | null }, kind: 'logo' | 'flyer'): Promise<string> {
  return (await uploadPublicImage(organizerId, image, kind)).url;
}

// ---------------------------------------------------------------------------------------------
// Entdecken-Story (SQL 33): Bilder, die bleiben, bis der Club sie löscht. Höchstens 30.
// ---------------------------------------------------------------------------------------------
export const maxStoryItems = 30;

export async function fetchMyStoryItems(organizerId: string): Promise<OrganizerStoryItem[]> {
  const client = getAccountClient();
  const { data, error } = await client.from('organizer_story_items').select('id,storage_path,caption,created_at,moderation_status,event_id,events(title,starts_at)')
    .eq('organizer_id', organizerId).order('created_at', { ascending: false }).order('id').limit(maxStoryItems);
  if (error) throw failure('Laden der Story');
  type Row = { id: string; storage_path: string; caption: string | null; created_at: string; moderation_status: string; event_id: string | null; events: { title: string; starts_at: string } | { title: string; starts_at: string }[] | null };
  return toStoryItems(client, organizerId, ((data ?? []) as Row[]).map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    return { id: row.id, storage_path: row.storage_path, caption: row.caption, created_at: row.created_at, moderation_status: row.moderation_status,
      event_id: event ? row.event_id : null, event_title: event?.title ?? null, event_starts_at: event?.starts_at ?? null };
  }));
}

/** Bild hochladen, dann die Zeile. Klappt die Zeile nicht, wird die Datei wieder entfernt. */
export async function addStoryItem(organizerId: string, image: { uri: string; mimeType?: string | null }, input: { caption: string | null; eventId: string | null }): Promise<void> {
  const client = getAccountClient();
  const { path } = await uploadPublicImage(organizerId, image, 'story');
  const { error } = await client.from('organizer_story_items')
    .insert({ organizer_id: organizerId, storage_path: path, caption: input.caption?.trim() || null, event_id: input.eventId });
  if (error) {
    await client.storage.from(ORGANIZER_PUBLIC_BUCKET).remove([path]).catch(() => {});
    if (error.message?.includes('limit')) throw new Error(`Die Story hat schon ${maxStoryItems} Bilder. Bitte zuerst eins löschen.`);
    throw failure('Speichern des Story-Bilds');
  }
}

/** Zeile löschen, danach die Datei (öffentliche Adresse funktioniert dann nicht mehr). */
export async function deleteStoryItem(organizerId: string, item: Pick<OrganizerStoryItem, 'id' | 'storagePath'>): Promise<void> {
  const client = getAccountClient();
  const { error } = await client.from('organizer_story_items').delete().eq('id', item.id).eq('organizer_id', organizerId);
  if (error) throw failure('Löschen des Story-Bilds');
  await client.storage.from(ORGANIZER_PUBLIC_BUCKET).remove([item.storagePath]).catch(() => {});
}

// ---------------------------------------------------------------------------------------------
// Shots und Event-Story eines eigenen Events im Studio (SQL 17/34): ansehen, ausblenden, wieder zeigen.
// ---------------------------------------------------------------------------------------------
export type StudioShot = {
  id: string; url: string | null; byOrganizer: boolean; hidden: boolean;
  /** Vom Spots-Team ausgeblendet oder entfernt: der Club kann es nicht ändern. */
  teamLocked: boolean; createdAt: string; expiresAt: string;
};

export async function fetchEventShots(eventId: string): Promise<StudioShot[]> {
  const client = getAccountClient();
  const { data, error } = await client.from('live_snaps').select('id,storage_path,by_organizer,moderation_status,team_locked,created_at,expires_at')
    .eq('event_id', eventId).eq('media_type', 'image').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(100);
  if (error) throw failure('Laden der Shots');
  const rows = (data ?? []) as { id: string; storage_path: string; by_organizer: boolean; moderation_status: string; team_locked: boolean; created_at: string; expires_at: string }[];
  const signed = rows.length ? (await client.storage.from('live-snaps').createSignedUrls(rows.map((row) => row.storage_path), 60 * 15)).data ?? [] : [];
  const urls = new Map(signed.flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
  return rows.map((row) => ({ id: row.id, url: urls.get(row.storage_path) ?? null, byOrganizer: row.by_organizer,
    hidden: row.moderation_status !== 'visible', teamLocked: row.team_locked, createdAt: row.created_at, expiresAt: row.expires_at }));
}

export async function setShotHidden(shotId: string, hidden: boolean): Promise<void> {
  const { data, error } = await getAccountClient().from('live_snaps').update({ moderation_status: hidden ? 'hidden' : 'visible' }).eq('id', shotId).select('id');
  if (error) throw failure(hidden ? 'Ausblenden' : 'Wieder zeigen');
  if (!data?.length) throw new Error('Dieses Bild hat das Spots-Team gesperrt. Es lässt sich hier nicht ändern.');
}

// ---------------------------------------------------------------------------------------------
// Team-Mitglieder (SQL 35): Der Besitzer erzeugt Einladungscodes; eingeladene Veranstalter-Konten lösen sie ein.
// ---------------------------------------------------------------------------------------------
export type OrganizerMember = { userId: string; email: string; role: 'owner' | 'editor'; since: string };
export type OrganizerInvite = { code: string; expiresAt: string };
/** 12 Zeichen in Vierergruppen, leichter abzutippen. */
export const formatInviteCode = (code: string) => code.replace(/(.{4})(?=.)/g, '$1-');

export async function fetchMembers(organizerId: string): Promise<OrganizerMember[]> {
  const { data, error } = await getAccountClient().rpc('spots_organizer_members', { p_organizer_id: organizerId });
  if (error) throw failure('Laden des Teams');
  return ((data ?? []) as { user_id: string; email: string; role: 'owner' | 'editor'; created_at: string }[])
    .map((row) => ({ userId: row.user_id, email: row.email, role: row.role, since: row.created_at }));
}

export async function fetchInvites(organizerId: string): Promise<OrganizerInvite[]> {
  const { data, error } = await getAccountClient().rpc('spots_organizer_invites', { p_organizer_id: organizerId });
  if (error) throw failure('Laden der Einladungen');
  return ((data ?? []) as { code: string; expires_at: string }[]).map((row) => ({ code: row.code, expiresAt: row.expires_at }));
}

export async function createInvite(organizerId: string): Promise<OrganizerInvite> {
  const { data, error } = await getAccountClient().rpc('spots_organizer_create_invite', { p_organizer_id: organizerId });
  const row = (data as { code: string; expires_at: string }[] | null)?.[0];
  if (error?.message?.includes('limit')) throw new Error('Es gibt schon fünf offene Einladungen. Bitte zuerst eine zurückziehen.');
  if (error || !row) throw failure('Erstellen der Einladung');
  return { code: row.code, expiresAt: row.expires_at };
}

export async function revokeInvite(code: string): Promise<void> {
  const { error } = await getAccountClient().rpc('spots_organizer_revoke_invite', { p_code: code });
  if (error) throw failure('Zurückziehen der Einladung');
}

export async function removeMember(organizerId: string, userId: string): Promise<void> {
  const { error } = await getAccountClient().rpc('set_organizer_editor', { p_organizer_id: organizerId, p_user_id: userId, p_enabled: false });
  if (error) throw failure('Entfernen');
}

/** Löst einen Einladungscode ein. Falscher oder abgelaufener Code: verständliche Meldung, kein Hinweis auf den Club. */
export async function redeemInvite(code: string): Promise<void> {
  const { data, error } = await getAccountClient().rpc('spots_organizer_redeem_invite', { p_code: code });
  if (error?.message?.includes('Too many')) throw new Error('Zu viele Versuche. Bitte in einer Stunde erneut versuchen.');
  if (error) throw failure('Einlösen');
  if (!data) throw new Error('Der Code ist ungültig oder abgelaufen. Bitte beim Club einen neuen erfragen.');
}
