import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { OrganizerEventSummary, PublicOrganizer, PublicOrganizerPost } from '../types/accounts';

const organizerFields = 'id,slug,display_name,biography,city,avatar_url,website_url,is_published,created_at,updated_at';
const safeUrl = (value: string | null): string | null => {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
};

/** Explicit public projection. Never queries auth users, private profiles or memberships. */
export function createPublicOrganizerReader(client: SupabaseClient) {
  return {
    async profile(identifier: { id: string } | { slug: string }): Promise<PublicOrganizer | null> {
      const field = 'id' in identifier ? 'id' : 'slug';
      const { data, error } = await client.from('organizers').select(organizerFields).eq('is_published', true)
        .eq(field, 'id' in identifier ? identifier.id : identifier.slug).maybeSingle();
      if (error) throw new Error('Veranstalterprofil konnte nicht geladen werden.');
      return data ? { id: data.id, slug: data.slug, displayName: data.display_name, biography: data.biography,
        city: data.city, avatarUrl: safeUrl(data.avatar_url), websiteUrl: safeUrl(data.website_url),
        isPublished: data.is_published, createdAt: data.created_at, updatedAt: data.updated_at } : null;
    },
    async events(organizerId: string): Promise<OrganizerEventSummary[]> {
      const { data, error } = await client.from('events').select('id,organizer_id,title,starts_at,ends_at,city,image_url,status,organizers!inner(is_published)')
        .eq('organizer_id', organizerId).eq('source', 'spots').eq('is_published', true).eq('status', 'scheduled')
        .eq('organizers.is_published', true).order('starts_at').order('id').limit(100);
      if (error) throw new Error('Veranstalterevents konnten nicht geladen werden.');
      return (data ?? []).map(row => ({ id: row.id, organizerId: row.organizer_id, title: row.title,
        startsAt: row.starts_at, endsAt: row.ends_at, city: row.city, imageUrl: safeUrl(row.image_url), status: 'scheduled' }));
    },
    async posts(organizerId: string): Promise<PublicOrganizerPost[]> {
      const { data, error } = await client.from('organizer_posts').select('id,organizer_id,body,created_at,updated_at,organizers!inner(is_published)')
        .eq('organizer_id', organizerId).eq('is_published', true).eq('organizers.is_published', true)
        .order('created_at', { ascending: false }).order('id').limit(100);
      if (error) throw new Error('Veranstalterbeiträge konnten nicht geladen werden.');
      return (data ?? []).map(row => ({ id: row.id, organizerId: row.organizer_id, body: row.body, createdAt: row.created_at, updatedAt: row.updated_at }));
    },
  };
}
export const fetchPublicOrganizer = (identifier: { id: string } | { slug: string }) => createPublicOrganizerReader(getSupabase()).profile(identifier);
export const fetchPublicOrganizerEvents = (id: string) => createPublicOrganizerReader(getSupabase()).events(id);
export const fetchPublicOrganizerPosts = (id: string) => createPublicOrganizerReader(getSupabase()).posts(id);
