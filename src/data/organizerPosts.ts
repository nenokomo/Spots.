import type { ImageSourcePropType } from 'react-native';
export type OrganizerPost = { id: string; organizerId: string; image: ImageSourcePropType; caption: string; isDemo: boolean };
// No verified organizer posts are provided by the current backend.
export function getOrganizerPosts(): OrganizerPost[] {
  return [];
}
