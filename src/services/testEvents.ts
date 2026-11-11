import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import type { SpotEvent } from '../types/events';
import { mapEventRow } from './eventAdapter';

/**
 * Local TEST data for trying the app on a phone: seven parties in Karlsruhe and
 * one organizer with a post.
 * - Only in development builds (Expo Go, web preview). Never in a release build.
 * - Never written to any database. Switch off with EXPO_PUBLIC_SPOTS_TEST_EVENTS=0.
 * - Clearly labelled "TEST", fictitious venues, placeholder image; real events are untouched.
 * - Times are relative to "now": three events run, two start later tonight, two on later days.
 */
const IDS = [1, 2, 3, 4, 5, 6, 7].map((n) => `f0f0f0f0-0000-4000-8000-00000000000${n}`);
export const TEST_EVENT_IDS = new Set(IDS);
export const TEST_ORGANIZER_ID = 'f0f0f0f0-0000-4000-8000-0000000000a1';
const TEST_ORGANIZER_SLUG = 'test-club';

// [title, genre, hours from now (start), duration hours, latitude, longitude, belongs to the test organizer]
const PLAN: [string, string, number, number, number, number, boolean][] = [
  ['TEST · Techno Night', 'Techno', -1.5, 7, 49.0094, 8.3994, true],
  ['TEST · House Terrasse', 'House', -0.5, 6, 49.0120, 8.4190, false],
  ['TEST · Hip-Hop Cellar', 'Hip-Hop', -2.5, 6, 49.0036, 8.3868, false],
  ['TEST · Late Night Disco', 'Disco', 1, 6, 49.0069, 8.4037, false],
  ['TEST · Drum & Bass Session', 'Drum & Bass', 3, 5, 48.9952, 8.4106, false],
  // Later days: from Explore these open the organizer page first (navigation case B).
  ['TEST · Club Special', 'Techno', 50, 7, 49.0094, 8.3994, true],
  ['TEST · Rooftop Opening', 'House', 146, 6, 49.0094, 8.3994, true],
];

function enabled() {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  return dev && process.env.EXPO_PUBLIC_SPOTS_TEST_EVENTS !== '0';
}

/** Fictitious parties in Karlsruhe around tonight and on later days. Empty unless running in development. */
export function testEvents(now: number = Date.now(), force = false): SpotEvent[] {
  if (!force && !enabled()) return [];
  const halfHour = 30 * 60 * 1000;
  const base = Math.round(now / halfHour) * halfHour;
  return PLAN.flatMap(([title, genre, startHours, duration, latitude, longitude, organized], index) => {
    const start = base + startHours * 3_600_000;
    const event = mapEventRow({
      id: IDS[index], title, publication: true, status: 'scheduled',
      startsAt: new Date(start).toISOString(), endsAt: new Date(start + duration * 3_600_000).toISOString(),
      latitude, longitude, city: 'Karlsruhe', venue: `Testlocation ${index + 1}`,
      description: 'Lokales Testevent zum Ausprobieren der App. Kein echtes Event, keine echte Location.',
      genres: genre, category: 'club', imageUrl: null, sourceName: 'Spots-Testdaten', sourceUrl: null, ticketUrl: null,
      organizerId: organized ? TEST_ORGANIZER_ID : null,
    });
    return event ? [event] : [];
  });
}

/** Fictitious organizer of some test events, matched by UUID or slug. Null unless running in development. */
export function testOrganizer(identifier: string, force = false): PublicOrganizer | null {
  if ((!force && !enabled()) || (identifier !== TEST_ORGANIZER_ID && identifier.toLowerCase() !== TEST_ORGANIZER_SLUG)) return null;
  return {
    id: TEST_ORGANIZER_ID, slug: TEST_ORGANIZER_SLUG, displayName: 'TEST · Club Fixture',
    biography: 'Lokaler Testveranstalter zum Ausprobieren der Veranstalterseite. Kein echter Club.',
    city: 'Karlsruhe', avatarUrl: null, websiteUrl: null, isPublished: true,
    createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z',
  };
}

/** Local symbol photos for gallery posts, resolved from `local:<n>` paths. Never a real flyer. */
export const TEST_POST_IMAGES: Record<string, number> = {
  'local:1': require('../../assets/events/nightlife.jpg'),
  'local:2': require('../../assets/events/club.jpg'),
  'local:3': require('../../assets/events/today-hero-party.png'),
};

export function testOrganizerPosts(): PublicOrganizerPost[] {
  return [
    { id: 'f0f0f0f0-0000-4000-8000-0000000000b1', organizerId: TEST_ORGANIZER_ID, body: 'TEST-Beitrag: Rückblick auf Samstag. Danke an alle, die da waren! (Lokale Testdaten mit Symbolbildern)', createdAt: '2026-11-09T12:00:00Z', updatedAt: '2026-11-09T12:00:00Z', images: ['local:1', 'local:2', 'local:3'] },
    { id: 'f0f0f0f0-0000-4000-8000-0000000000b2', organizerId: TEST_ORGANIZER_ID, body: 'TEST-Beitrag: Am Wochenende öffnen wir um 23 Uhr.', createdAt: '2026-11-08T12:00:00Z', updatedAt: '2026-11-08T12:00:00Z', images: ['local:1'] },
    { id: 'f0f0f0f0-0000-4000-8000-0000000000b3', organizerId: TEST_ORGANIZER_ID, body: 'TEST-Beitrag ohne Bild: Neue Öffnungszeiten ab Dezember.', createdAt: '2026-11-07T12:00:00Z', updatedAt: '2026-11-07T12:00:00Z', images: [] },
  ];
}
