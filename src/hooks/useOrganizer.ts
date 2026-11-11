import { useCallback, useEffect, useState } from 'react';
import { fetchOrganizerEvents } from '../services/events';
import { fetchPublicOrganizer, fetchPublicOrganizerPosts, OrganizerUnavailableError } from '../services/organizers';
import { testEvents, testOrganizer, testOrganizerPosts } from '../services/testEvents';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import type { SpotEvent } from '../types/events';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrganizerPage = {
  organizer: PublicOrganizer | null;
  events: SpotEvent[];
  posts: PublicOrganizerPost[];
};
type State =
  | { status: 'loading' }
  | { status: 'ready'; data: OrganizerPage }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

/** Loads a public organizer by UUID or slug with its published events and posts. */
export function useOrganizerPage(identifier: string | undefined) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; state: State } | null>(null);
  const key = `${identifier ?? ''}:${revision}`;
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!identifier) return;
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        // Local test organizer (development only), see services/testEvents.ts.
        const fixture = testOrganizer(identifier);
        if (fixture) {
          await Promise.resolve();
          if (active) setResult({ key, state: { status: 'ready', data: { organizer: fixture, events: testEvents().filter((event) => event.organizerId === fixture.id), posts: testOrganizerPosts() } } });
          return;
        }
        const organizer = await fetchPublicOrganizer(uuid.test(identifier) ? { id: identifier } : { slug: identifier.toLowerCase() });
        if (!organizer) { if (active) setResult({ key, state: { status: 'ready', data: { organizer: null, events: [], posts: [] } } }); return; }
        const [events, posts] = await Promise.all([
          fetchOrganizerEvents(organizer.id, controller.signal),
          fetchPublicOrganizerPosts(organizer.id),
        ]);
        if (active) setResult({ key, state: { status: 'ready', data: { organizer, events, posts } } });
      } catch (error) {
        if (!active) return;
        setResult({ key, state: error instanceof OrganizerUnavailableError ? { status: 'unavailable' }
          : { status: 'error', message: error instanceof Error ? error.message : 'Veranstalterprofil konnte nicht geladen werden.' } });
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [identifier, key]);

  const state: State = !identifier ? { status: 'ready', data: { organizer: null, events: [], posts: [] } }
    : result?.key === key ? result.state : { status: 'loading' };
  return { state, reload };
}

// Small session cache: event detail pages only need the organizer's name and avatar.
const summaries = new Map<string, Promise<PublicOrganizer | null>>();

/** Name and avatar of an event's organizer. Null while loading, missing or unavailable. */
export function useOrganizerSummary(organizerId: string | null | undefined) {
  const [result, setResult] = useState<{ id: string; organizer: PublicOrganizer | null } | null>(null);
  useEffect(() => {
    if (!organizerId || !uuid.test(organizerId)) return;
    let active = true;
    let request = summaries.get(organizerId);
    if (!request) {
      const fixture = testOrganizer(organizerId);
      request = fixture ? Promise.resolve(fixture) : fetchPublicOrganizer({ id: organizerId }).catch(() => null);
      summaries.set(organizerId, request);
    }
    void request.then((organizer) => { if (active) setResult({ id: organizerId, organizer }); });
    return () => { active = false; };
  }, [organizerId]);
  return organizerId && result?.id === organizerId ? result.organizer : null;
}
