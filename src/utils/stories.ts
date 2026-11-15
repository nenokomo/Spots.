import type { ImageSourcePropType } from 'react-native';
import type { LiveSnap } from '../services/content';
import type { SpotEvent } from '../types/events';

/** test: local symbol photo added only in development so stories can be tried with several slides. */
export type StoryMedia = { kind: 'image'; source: ImageSourcePropType; placeholder: boolean; test?: boolean };

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
