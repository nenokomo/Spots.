import type { ImageSourcePropType } from 'react-native';
import type { SpotEvent } from '../types/events';

export type StoryMedia = { kind: 'image'; source: ImageSourcePropType; placeholder: boolean };

/**
 * Preview media of an event for the Explore stories.
 * Only real media of the event record is used; without an event image the
 * neutral symbol photo is shown and labelled as such. 24-hour BeReels are a
 * separate feature with their own lifetime and must never be mixed in here.
 * Videos need a media relation in the backend and a player module first.
 */
export function eventStoryMedia(event: SpotEvent): StoryMedia[] {
  return [{ kind: 'image', source: event.image, placeholder: !!event.imageIsPlaceholder }];
}

export function remoteImageUri(source: ImageSourcePropType) {
  return source && typeof source === 'object' && 'uri' in source && typeof source.uri === 'string' ? source.uri : null;
}
