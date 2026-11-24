import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { OrganizerEventSummary, PublicOrganizer, PublicOrganizerPost } from '../types/accounts';

const baseFields = 'id,slug,display_name,biography,city,avatar_url,website_url,is_published,created_at,updated_at';
// motto und cover_url gibt es erst mit SQL 37; ohne die Spalten liest die App das Profil wie bisher.
let profileExtras: boolean | null = null;
type ProfileRow = {
  id: string; slug: string; display_name: string; biography: string | null; city: string | null; avatar_url: string | null;
  website_url: string | null; is_published: boolean; created_at: string; updated_at: string; motto?: string | null; cover_url?: string | null;
};
const MEDIA_BUCKET = 'organizer-media';

/** The organizer tables are not deployed in this Supabase project yet (SQL 15 missing). */
export class OrganizerUnavailableError extends Error {
  constructor() { super('Veranstalterprofile sind in dieser Umgebung noch nicht eingerichtet.'); this.name = 'OrganizerUnavailableError'; }
}
const missingSchema = (error: { code?: string }) => error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703';
const safeUrl = (value: string | null): string | null => {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
};

/**
 * Bilder zu Beiträgen, in Reihenfolge, als kurz gültige Links (eine Stunde). Lesbar nur, solange der Beitrag
 * lesbar ist. Fehlt SQL 19 oder klappt etwas nicht, bleiben die Beiträge ohne Bild statt mit Fehler.
 */
export async function postImageUrls(client: SupabaseClient, postIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (postIds.length === 0) return result;
  const { data, error } = await client.from('organizer_post_media').select('post_id,storage_path,sort_order')
    .in('post_id', postIds).order('sort_order').limit(1000);
  if (error || !data?.length) return result;
  const media = data as { post_id: string; storage_path: string }[];
  const signed = await client.storage.from(MEDIA_BUCKET).createSignedUrls(media.map((row) => row.storage_path), 60 * 60);
  const urls = new Map((signed.data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
  for (const row of media) {
    const url = safeUrl(urls.get(row.storage_path) ?? null);
    if (url) result.set(row.post_id, [...(result.get(row.post_id) ?? []), url]);
  }
  return result;
}

/** Explicit public projection. Never queries auth users, private profiles or memberships. */
export function createPublicOrganizerReader(client: SupabaseClient) {
  return {
    async profile(identifier: { id: string } | { slug: string }): Promise<PublicOrganizer | null> {
      const field = 'id' in identifier ? 'id' : 'slug';
      const read = (fields: string) => client.from('organizers').select(fields).eq('is_published', true)
        .eq(field, 'id' in identifier ? identifier.id : identifier.slug).maybeSingle();
      let result = await read(profileExtras === false ? baseFields : `${baseFields},motto,cover_url`);
      if (result.error?.code === '42703' && profileExtras !== false) { profileExtras = false; result = await read(baseFields); }
      else if (!result.error && profileExtras === null) profileExtras = true;
      const error = result.error;
      const data = result.data as ProfileRow | null;
      if (error && missingSchema(error)) throw new OrganizerUnavailableError();
      if (error) throw new Error('Veranstalterprofil konnte nicht geladen werden.');
      return data ? { id: data.id, slug: data.slug, displayName: data.display_name, biography: data.biography,
        city: data.city, avatarUrl: safeUrl(data.avatar_url), websiteUrl: safeUrl(data.website_url),
        isPublished: data.is_published, createdAt: data.created_at, updatedAt: data.updated_at,
        motto: data.motto?.trim() || null, coverUrl: safeUrl(data.cover_url ?? null) } : null;
    },
    async events(organizerId: string): Promise<OrganizerEventSummary[]> {
      const { data, error } = await client.from('events').select('id,organizer_id,title,starts_at,ends_at,city,image_url,status,organizers!inner(is_published)')
        .eq('organizer_id', organizerId).eq('source', 'spots').eq('is_published', true).eq('status', 'scheduled')
        .eq('organizers.is_published', true).order('starts_at').order('id').limit(100);
      if (error && missingSchema(error)) throw new OrganizerUnavailableError();
      if (error) throw new Error('Veranstalterevents konnten nicht geladen werden.');
      return (data ?? []).map(row => ({ id: row.id, organizerId: row.organizer_id, title: row.title,
        startsAt: row.starts_at, endsAt: row.ends_at, city: row.city, imageUrl: safeUrl(row.image_url), status: 'scheduled' }));
    },
    async posts(organizerId: string): Promise<PublicOrganizerPost[]> {
      // Bilder eines Beitrags liegen in organizer_post_media (SQL 19, privater Bucket): unten kurz gültige Links.
      const { data, error } = await client.from('organizer_posts').select('id,organizer_id,body,created_at,updated_at,organizers!inner(is_published)')
        .eq('organizer_id', organizerId).eq('is_published', true).eq('organizers.is_published', true)
        .order('created_at', { ascending: false }).order('id').limit(100);
      if (error && missingSchema(error)) throw new OrganizerUnavailableError();
      if (error) throw new Error('Veranstalterbeiträge konnten nicht geladen werden.');
      const rows = data ?? [];
      const images = await postImageUrls(client, rows.map((row) => row.id as string));
      return rows.map(row => ({ id: row.id, organizerId: row.organizer_id, body: row.body, createdAt: row.created_at, updatedAt: row.updated_at, images: images.get(row.id) ?? [] }));
    },
  };
}
export const fetchPublicOrganizer = (identifier: { id: string } | { slug: string }) => createPublicOrganizerReader(getSupabase()).profile(identifier);
export const fetchPublicOrganizerEvents = (id: string) => createPublicOrganizerReader(getSupabase()).events(id);
export const fetchPublicOrganizerPosts = (id: string) => createPublicOrganizerReader(getSupabase()).posts(id);
