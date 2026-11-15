import type { ImageSourcePropType } from 'react-native';
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
