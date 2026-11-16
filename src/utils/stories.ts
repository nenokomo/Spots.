import type { ImageSourcePropType } from 'react-native';
import type { LiveSnap } from '../services/content';
import type { ExploreOrganizer } from '../services/organizerStories';
import type { SpotEvent } from '../types/events';
import { eventDayLabel, eventTimeLabel } from './events';

/** test: local symbol photo added only in development so stories can be tried with several slides. */
export type StoryMedia = {
  kind: 'image'; source: ImageSourcePropType; placeholder: boolean; test?: boolean;
  /** Text zu diesem einen Bild (Veranstalter-Story), z. B. „So war's letzten Samstag“. */
  caption?: string | null;
  /** Verknüpftes Event dieses Bilds, z. B. „Sa., 21.11. · Techno Night“. */
  detail?: string | null;
};

/**
 * One page of the full-screen story viewer: an event (Explore results, organizer page) or an organizer (Explore directory).
 * Pages share gestures and layout; only their media and texts differ.
 */
export type StoryPage = {
  id: string;
  media: StoryMedia[];
  /** Small pink line above the title, e.g. „HEUTE · 22:00 UHR“ or „VERANSTALTER“. */
  overline: string;
  title: string;
  /** Line with a pin icon: venue and city. */
  place: string | null;
  /** Extra line under the place, e.g. the next event of an organizer. */
  subtitle?: string | null;
  tags: string[];
  actionLabel: string;
  /** Only events can be saved from the story. */
  saveEvent?: { id: string; title: string } | null;
  /** Shown for a symbol photo that is not a TEST picture. */
  placeholderNote: string;
  imageLabel: string;
};

// Development only (never in a release build): extra symbol photos per story, clearly labelled as test images.
const DEV_STORY_IMAGES: ImageSourcePropType[] = __DEV__ ? [
  require('../../assets/events/club.jpg'),
  require('../../assets/events/today-hero-party.png'),
  require('../../assets/events/today-hero-dj.png'),
] : [];

/**
 * Preview media of an event for the Explore stories.
 * Only real media of the event record is used; without an event image the
 * neutral symbol photo is shown and labelled as such. 24-hour BeReels are a
 * separate feature with their own lifetime and must never be mixed in here.
 * Videos need a media relation in the backend and a player module first.
 */
export function eventStoryMedia(event: SpotEvent): StoryMedia[] {
  const own: StoryMedia = { kind: 'image', source: event.image, placeholder: !!event.imageIsPlaceholder };
  return [own, ...DEV_STORY_IMAGES.map((source): StoryMedia => ({ kind: 'image', source, placeholder: true, test: true }))];
}

/** Story page of one event. */
export function eventStoryPage(event: SpotEvent, today: string, actionLabel = 'Event ansehen'): StoryPage {
  return {
    id: event.id, media: eventStoryMedia(event),
    overline: `${eventDayLabel(event.startsAt, today).toLocaleUpperCase('de')} · ${eventTimeLabel(event.startsAt)} UHR`,
    title: event.title, place: [event.venue, event.location].filter(Boolean).join(' · ') || null,
    tags: (event.genres?.length ? event.genres : event.categories).slice(0, 4), actionLabel,
    saveEvent: { id: event.id, title: event.title },
    placeholderNote: 'Symbolbild · für dieses Event liegt noch kein Bild vor', imageLabel: `Eventbild: ${event.title}`,
  };
}

// Loaded on first use: only organizers without logo and story need it.
const organizerFallback = (): ImageSourcePropType => require('../../assets/events/club.jpg');

/** Cover of an organizer tile: newest story picture, else the logo, else null (tile shows the name only). */
export function organizerCover(organizer: Pick<ExploreOrganizer, 'story' | 'avatarUrl'>): { uri: string; logo: boolean } | null {
  if (organizer.story[0]) return { uri: organizer.story[0].url, logo: false };
  return organizer.avatarUrl ? { uri: organizer.avatarUrl, logo: true } : null;
}

/**
 * Story page of one organizer for the Explore directory. Only pictures the organizer posted (newest first).
 * Without a story: the logo, else a labelled symbol photo – never pictures of somebody else.
 */
export function organizerStoryPage(organizer: ExploreOrganizer, today: string): StoryPage {
  const media: StoryMedia[] = organizer.story.length > 0
    ? organizer.story.map((item) => ({ kind: 'image', source: { uri: item.url }, placeholder: false, caption: item.caption,
        detail: item.event ? `${eventDayLabel(item.event.startsAt, today)} · ${item.event.title}` : null }))
    : [{ kind: 'image', source: organizer.avatarUrl ? { uri: organizer.avatarUrl } : organizerFallback(), placeholder: !organizer.avatarUrl }];
  const next = organizer.nextEvent;
  return {
    id: organizer.id, media, overline: 'VERANSTALTER', title: organizer.displayName, place: organizer.city,
    subtitle: next ? `Nächstes Event: ${eventDayLabel(next.startsAt, today)}, ${eventTimeLabel(next.startsAt)} Uhr · ${next.title}` : null,
    tags: [], actionLabel: 'Zum Profil', saveEvent: null,
    placeholderNote: 'Symbolbild · dieser Veranstalter hat noch keine Story', imageLabel: `Story von ${organizer.displayName}`,
  };
}

export function remoteImageUri(source: ImageSourcePropType) {
  return source && typeof source === 'object' && 'uri' in source && typeof source.uri === 'string' ? source.uri : null;
}

/** One picture of a 24-hour snap, ready to show. Videos need a player module first and are left out. */
export type SnapMedia = { id: string; source: ImageSourcePropType; createdAt: string; expiresAt: string; test?: boolean };

const DEV_ORGANIZER_SNAPS: ImageSourcePropType[] = __DEV__ ? [require('../../assets/events/today-hero-dj.png'), require('../../assets/events/club.jpg')] : [];
const DEV_VISITOR_SNAPS: ImageSourcePropType[] = __DEV__ ? [require('../../assets/events/today-hero-party.png'), require('../../assets/events/nightlife.jpg'), require('../../assets/events/club.jpg')] : [];

/**
 * Splits an event's 24-hour snaps for the event page:
 * - organizer: the organizer's event story (watch as often as you like for 24 h, only on this event page),
 * - visitors: Shots from guests with an account, posted while the event runs (each can be opened once).
 * In development, local TEST events get labelled TEST pictures so the design can be tried.
 */
export function eventSnaps(event: Pick<SpotEvent, 'id' | 'title' | 'organizerId'>, snaps: LiveSnap[], now: number) {
  const images = snaps.filter((snap) => snap.mediaType === 'image' && Date.parse(snap.expiresAt) > now);
  const toMedia = (snap: LiveSnap): SnapMedia => ({ id: snap.id, source: { uri: snap.url }, createdAt: snap.createdAt, expiresAt: snap.expiresAt });
  let organizer = images.filter((snap) => snap.byOrganizer).map(toMedia);
  let visitors = images.filter((snap) => !snap.byOrganizer).map(toMedia);
  if (__DEV__ && organizer.length === 0 && visitors.length === 0 && event.title.startsWith('TEST ·')) {
    const test = (source: ImageSourcePropType, index: number, kind: string, hoursAgo: number): SnapMedia => ({
      id: `test-${kind}-${event.id}-${index}`, source, test: true,
      createdAt: new Date(now - hoursAgo * 3_600_000).toISOString(), expiresAt: new Date(now + (24 - hoursAgo) * 3_600_000).toISOString(),
    });
    organizer = event.organizerId ? DEV_ORGANIZER_SNAPS.map((source, index) => test(source, index, 'organizer', 3 - index)) : [];
    visitors = DEV_VISITOR_SNAPS.map((source, index) => test(source, index, 'visitor', 1 + index));
  }
  return { organizer, visitors };
}

/** „vor 5 Min.“ / „vor 2 Std.“ for snaps. */
export function snapAge(createdAt: string, now: number) {
  const minutes = Math.max(1, Math.round((now - Date.parse(createdAt)) / 60_000));
  return minutes < 60 ? `vor ${minutes} Min.` : `vor ${Math.round(minutes / 60)} Std.`;
}
