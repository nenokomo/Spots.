import type { SupabaseClient } from '@supabase/supabase-js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lokale TEST-Events (src/services/testEvents.ts) sehen aus wie UUIDs, gibt es aber in keiner Datenbank. */
export const LOCAL_TEST_ID_PREFIX = 'f0f0f0f0-0000-4000-8000-';
/** Nur echte Events gehen ans Konto; TEST-Events bleiben auf dem Gerät. */
export const isSyncableId = (id: string) => uuidPattern.test(id) && !id.toLowerCase().startsWith(LOCAL_TEST_ID_PREFIX);

/**
 * Merkliste nach dem Abgleich mit dem Konto.
 * Erster Abgleich auf diesem Gerät: Gerät und Konto werden zusammengeführt.
 * Danach gilt das Konto (Löschen auf einem anderen Gerät kommt hier an); lokale TEST-Einträge bleiben.
 */
export function reconcileSavedIds(local: string[], server: string[], firstSync: boolean): string[] {
  const kept = firstSync ? local : local.filter((id) => !isSyncableId(id));
  return [...new Set([...server, ...kept])];
}

/** Server-Seite der Merkliste (SQL 17 + 25). Fehler werden ohne Details weitergegeben. */
export function createSavedEventsSync(client: Pick<SupabaseClient, 'rpc' | 'from'>) {
  return {
    /** Übernimmt öffentliche Events und liefert die vollständige Liste des Kontos. */
    async merge(ids: string[]): Promise<string[]> {
      const { data, error } = await client.rpc('spots_sync_saved_events', { p_add: ids.filter(isSyncableId).slice(0, 500) });
      if (error) throw new Error('Merkliste konnte nicht mit deinem Konto abgeglichen werden.');
      return Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : [];
    },
    async remove(id: string): Promise<void> {
      if (!isSyncableId(id)) return;
      const { error } = await client.from('saved_events').delete().eq('event_id', id);
      if (error) throw new Error('Merkliste konnte nicht mit deinem Konto abgeglichen werden.');
    },
  };
}
