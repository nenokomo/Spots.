import { getAccountClient } from '../accounts/client';
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
  venueId: string | null; venueName: string | null; city: string | null; latitude: number | null; longitude: number | null;
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

const eventFields = 'id,title,description,starts_at,ends_at,venue_id,venue_name,city,latitude,longitude,image_url,ticket_url,genre,category,status,is_published';
type EventRow = {
  id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; venue_id: string | null;
  venue_name: string | null; city: string | null; latitude: number | null; longitude: number | null; image_url: string | null;
  ticket_url: string | null; genre: string | null; category: string | null; status: OrganizerEvent['status']; is_published: boolean;
};
const toEvent = (row: EventRow): OrganizerEvent => ({
  id: row.id, title: row.title, description: row.description, startsAt: row.starts_at, endsAt: row.ends_at,
  venueId: row.venue_id, venueName: row.venue_name, city: row.city, latitude: row.latitude, longitude: row.longitude,
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
    venue_id: input.venueId, venue_name: input.venueName?.trim() || null, city: input.city?.trim() || null,
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

/** Lädt ein Bild in den öffentlichen Speicher (SQL 27, Ordner = Veranstalter) und liefert die feste Adresse. */
export async function uploadOrganizerImage(organizerId: string, image: { uri: string; mimeType?: string | null }, kind: 'logo' | 'flyer'): Promise<string> {
  const mimeType = image.mimeType || 'image/jpeg';
  const extension = imageTypes[mimeType];
  if (!extension) throw new Error('Bitte ein JPG-, PNG- oder WebP-Bild wählen.');
  const body = await fetch(image.uri).then((response) => response.arrayBuffer());
  if (body.byteLength > maxImageBytes) throw new Error('Das Bild ist größer als 5 MB.');
  const random = Math.floor(Math.random() * 36 ** 6).toString(36);
  const path = `${organizerId}/${kind}-${Date.now().toString(36)}-${random}.${extension}`;
  const storage = getAccountClient().storage.from('organizer-public');
  const { error } = await storage.upload(path, body, { contentType: mimeType, upsert: false });
  if (error) throw failure('Hochladen des Bilds');
  return storage.getPublicUrl(path).data.publicUrl;
}
