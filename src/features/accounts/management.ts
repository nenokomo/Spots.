import { getAccountClient } from './client';
import type { OrganizerProfileChanges, PrivateUserProfile, SpotsEventInput } from '../../types/accounts';

export async function savePrivateProfile(displayName: string): Promise<void> {
  const { error } = await getAccountClient().rpc('save_private_profile', { p_display_name: displayName.trim() });
  if (error) throw new Error('Privates Profil konnte nicht gespeichert werden.');
}
export async function fetchPrivateProfile(): Promise<PrivateUserProfile | null> {
  const client = getAccountClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error('Bitte anmelden.');
  const { data, error } = await client.from('user_profiles').select('id,display_name,created_at').eq('id', user.id).maybeSingle();
  if (error) throw new Error('Privates Profil konnte nicht geladen werden.');
  return data ? { id: data.id, displayName: data.display_name, createdAt: data.created_at } : null;
}
export async function createOrganizer(slug: string, displayName: string): Promise<string> {
  const { data, error } = await getAccountClient().rpc('create_organizer', { p_slug: slug.trim(), p_display_name: displayName.trim() });
  if (error || typeof data !== 'string') throw new Error('Veranstalter konnte nicht erstellt werden. Bitte Namen und eindeutigen Slug prüfen.');
  return data;
}
export async function updateOrganizer(id: string, input: OrganizerProfileChanges): Promise<void> {
  const fields = { slug: 'slug', displayName: 'display_name', biography: 'biography', city: 'city', avatarUrl: 'avatar_url', websiteUrl: 'website_url', isPublished: 'is_published' } as const;
  const row = Object.fromEntries(Object.entries(input).filter(([key]) => key in fields).map(([key, value]) => [fields[key as keyof typeof fields], value]));
  const { data, error } = await getAccountClient().from('organizers').update(row).eq('id', id).select('id');
  if (error || data?.length !== 1) throw new Error('Veranstalter konnte nicht geändert werden oder Berechtigung fehlt.');
}
export async function setOrganizerEditor(organizerId: string, userId: string, enabled: boolean): Promise<void> {
  const { error } = await getAccountClient().rpc('set_organizer_editor', { p_organizer_id: organizerId, p_user_id: userId, p_enabled: enabled });
  if (error) throw new Error('Mitgliedschaft konnte nicht geändert werden. Besitzerrechte sind erforderlich.');
}
export async function createSpotsEvent(input: SpotsEventInput): Promise<string> {
  for (const timestamp of [input.startsAt, input.endsAt].filter((value): value is string => !!value)) {
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) throw new Error('Bitte einen gültigen Termin mit Zeitzone angeben.');
  }
  const row = { organizer_id: input.organizerId, title: input.title, starts_at: input.startsAt, ends_at: input.endsAt ?? null,
    description: input.description ?? null, city: input.city ?? null, venue_name: input.venue ?? null,
    latitude: input.latitude ?? null, longitude: input.longitude ?? null, image_url: input.imageUrl ?? null, ticket_url: input.ticketUrl ?? null,
    source: 'spots', status: 'scheduled', is_published: false };
  const { data, error } = await getAccountClient().from('events').insert(row).select('id').single();
  if (error || !data) throw new Error('Evententwurf konnte nicht erstellt werden oder Berechtigung fehlt.');
  return data.id;
}
