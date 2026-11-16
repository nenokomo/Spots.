import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

/**
 * Veranstalter-Story für „Entdecken“ (SQL 33): freigegebene Veranstalter einer Stadt mit ihren Story-Bildern
 * und dem nächsten Event. Öffentlich lesbar, ohne Konto. Bilder liegen im öffentlichen Bucket „organizer-public“.
 */
export const ORGANIZER_PUBLIC_BUCKET = 'organizer-public';

export type OrganizerStoryItem = {
  id: string; storagePath: string; url: string; caption: string | null; createdAt: string;
  /** Verknüpftes eigenes Event (vergangen oder kommend); null ohne Event oder wenn es nicht öffentlich ist. */
  event: { id: string; title: string; startsAt: string } | null;
};
export type ExploreOrganizer = {
  id: string; slug: string; displayName: string; city: string | null; avatarUrl: string | null;
  nextEvent: { id: string; title: string; startsAt: string } | null;
  story: OrganizerStoryItem[];
};

type StoryRow = { id: string; storage_path: string; caption: string | null; created_at: string; event_id: string | null; event_title: string | null; event_starts_at: string | null };
type ExploreRow = {
  id: string; slug: string; display_name: string; city: string | null; avatar_url: string | null;
  next_event_id: string | null; next_event_title: string | null; next_event_starts_at: string | null; story: StoryRow[] | null;
};

const safeHttps = (value: string | null) => {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
};

/** Öffentliche Adresse eines Story-Bilds. Nur Pfade im Ordner des Veranstalters (wie die Datenbank prüft). */
export function storyImageUrl(client: SupabaseClient, organizerId: string, storagePath: string): string | null {
  if (!storagePath.startsWith(`${organizerId}/story-`)) return null;
  return safeHttps(client.storage.from(ORGANIZER_PUBLIC_BUCKET).getPublicUrl(storagePath).data.publicUrl);
}

export function toStoryItems(client: SupabaseClient, organizerId: string, rows: StoryRow[]): OrganizerStoryItem[] {
  return rows.flatMap((row) => {
    const url = storyImageUrl(client, organizerId, row.storage_path);
    if (!url) return [];
    return [{ id: row.id, storagePath: row.storage_path, url, caption: row.caption, createdAt: row.created_at,
      event: row.event_id && row.event_title && row.event_starts_at ? { id: row.event_id, title: row.event_title, startsAt: row.event_starts_at } : null }];
  });
}

// SQL 33 fehlt in dieser Umgebung (z. B. Produktion vor dem Einspielen): einmal merken, keine Fehlerseite.
let unavailable = false;
const missing = (error: { code?: string }) => error.code === 'PGRST202' || error.code === '42883' || error.code === 'PGRST205';

export function createExploreOrganizerReader(client: SupabaseClient) {
  return async function fetchExploreOrganizers(city: string | null): Promise<ExploreOrganizer[]> {
    if (unavailable) return [];
    const { data, error } = await client.rpc('spots_explore_organizers', { p_city: city?.trim() || null, p_limit: 60 });
    if (error && missing(error)) { unavailable = true; return []; }
    if (error) throw new Error('Veranstalter konnten nicht geladen werden.');
    return ((data ?? []) as ExploreRow[]).map((row) => ({
      id: row.id, slug: row.slug, displayName: row.display_name, city: row.city, avatarUrl: safeHttps(row.avatar_url),
      nextEvent: row.next_event_id && row.next_event_title && row.next_event_starts_at
        ? { id: row.next_event_id, title: row.next_event_title, startsAt: row.next_event_starts_at } : null,
      story: toStoryItems(client, row.id, row.story ?? []),
    }));
  };
}

export const fetchExploreOrganizers = (city: string | null) => createExploreOrganizerReader(getSupabase())(city);
