import type { SpotEvent } from '../types/events';
import { TEST_EVENT_IDS } from './testEvents';

export type RankedEvent = { event: SpotEvent; rank: number; ticketsSold: number };
export type Popularity = { ranked: RankedEvent[]; city: string | null; preview: boolean };

/**
 * "Gehypt" ranking for Explore: events of the user's city ordered by tickets sold.
 *
 * There is no ticket sales data yet (Spots ticketing is not live). Until there is,
 * this returns nothing in production, so popularity is never invented.
 * In development it ranks the local TEST events with fixed, clearly fictitious
 * numbers so the section can be previewed; the UI labels it "Vorschau".
 */
const TEST_TICKETS: Record<string, number> = {
  'f0f0f0f0-0000-4000-8000-000000000006': 412,
  'f0f0f0f0-0000-4000-8000-000000000004': 287,
  'f0f0f0f0-0000-4000-8000-000000000007': 230,
  'f0f0f0f0-0000-4000-8000-000000000005': 164,
  'f0f0f0f0-0000-4000-8000-000000000001': 98,
};

function enabled() {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  return dev && process.env.EXPO_PUBLIC_SPOTS_TEST_EVENTS !== '0';
}

/** Ranked events for one city. `city` null = the city most of the candidates are in. */
export function popularEvents(events: SpotEvent[], city: string | null, limit = 5, force = false): Popularity {
  if (!force && !enabled()) return { ranked: [], city, preview: false };
  const candidates = events.filter((event) => TEST_EVENT_IDS.has(event.id) && TEST_TICKETS[event.id] !== undefined && (!city || event.location === city));
  const ranked = candidates
    .map((event) => ({ event, ticketsSold: TEST_TICKETS[event.id] }))
    .sort((a, b) => b.ticketsSold - a.ticketsSold)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const resolvedCity = city ?? ranked[0]?.event.location ?? null;
  return { ranked, city: resolvedCity, preview: ranked.length > 0 };
}
