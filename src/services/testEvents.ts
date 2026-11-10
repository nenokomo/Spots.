import { mapEventRow } from './eventAdapter';
import type { SpotEvent } from '../types/events';

/**
 * Local TEST events for trying the radar and Explore on a phone.
 * - Only in development builds (Expo Go, web preview). Never in a release build.
 * - Never written to any database. Switch off with EXPO_PUBLIC_SPOTS_TEST_EVENTS=0.
 * - Clearly labelled "TEST", fictitious venues, placeholder image; real events are untouched.
 * - Times are relative to "now", so tonight's events are always running or about to start.
 */
const IDS = [1, 2, 3, 4, 5].map((n) => `f0f0f0f0-0000-4000-8000-00000000000${n}`);
export const TEST_EVENT_IDS = new Set(IDS);

// [title, genre, hours from now (start), duration hours, latitude, longitude]
const PLAN: [string, string, number, number, number, number][] = [
  ['TEST · Techno Night', 'Techno', -1.5, 7, 49.0094, 8.3994],
  ['TEST · House Terrasse', 'House', -0.5, 6, 49.0120, 8.4190],
  ['TEST · Hip-Hop Cellar', 'Hip-Hop', -2.5, 6, 49.0036, 8.3868],
  ['TEST · Late Night Disco', 'Disco', 1, 6, 49.0069, 8.4037],
  ['TEST · Drum & Bass Session', 'Drum & Bass', 3, 5, 48.9952, 8.4106],
];

function enabled() {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  return dev && process.env.EXPO_PUBLIC_SPOTS_TEST_EVENTS !== '0';
}

/** Five fictitious parties in Karlsruhe around tonight. Empty unless running in development. */
export function testEvents(now: number = Date.now(), force = false): SpotEvent[] {
  if (!force && !enabled()) return [];
  const halfHour = 30 * 60 * 1000;
  const base = Math.round(now / halfHour) * halfHour;
  return PLAN.flatMap(([title, genre, startHours, duration, latitude, longitude], index) => {
    const start = base + startHours * 3_600_000;
    const event = mapEventRow({
      id: IDS[index], title, publication: true, status: 'scheduled',
      startsAt: new Date(start).toISOString(), endsAt: new Date(start + duration * 3_600_000).toISOString(),
      latitude, longitude, city: 'Karlsruhe', venue: `Testlocation ${index + 1}`,
      description: 'Lokales Testevent zum Ausprobieren der App. Kein echtes Event, keine echte Location.',
      genres: genre, category: 'club', imageUrl: null, sourceName: 'Spots-Testdaten', sourceUrl: null, ticketUrl: null,
    });
    return event ? [event] : [];
  });
}
