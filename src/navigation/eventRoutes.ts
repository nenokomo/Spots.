import type { SpotEvent } from '../types/events';
import { isTonight } from '../utils/eventStatus';

/**
 * Where the user opened an event from.
 * - radar, saved, link, organizer, story: the user already chose this event → event detail.
 * - discover: browsing upcoming events → for future events with a verified organizer,
 *   open the organizer page first and highlight the chosen event.
 */
export type EventEntry = 'radar' | 'discover' | 'saved' | 'organizer' | 'link';

type Routable = Pick<SpotEvent, 'id' | 'startsAt' | 'endsAt'> & { organizerId?: string | null };

export function eventDetailHref(id: string) {
  return { pathname: '/event/[id]', params: { id } } as const;
}

export function organizerHref(id: string, highlightEventId?: string) {
  return highlightEventId
    ? { pathname: '/organizer/[id]', params: { id, event: highlightEventId } } as const
    : { pathname: '/organizer/[id]', params: { id } } as const;
}

/**
 * Central, context-dependent navigation rule (case A/B/D of the product spec).
 * Tonight's events always open their detail page. Events without a verified
 * organizer (all imported events) always open their detail page as well.
 */
export function eventHref(event: Routable, entry: EventEntry, now: number = Date.now()) {
  if (entry === 'discover' && event.organizerId && !isTonight(event, now)) {
    return organizerHref(event.organizerId, event.id);
  }
  return eventDetailHref(event.id);
}
