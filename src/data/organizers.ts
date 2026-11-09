import type { ImageSourcePropType } from 'react-native';
import type { SpotEvent } from '../types/events';
export type Organizer = { id: string; name: string; biography?: string; city: string; image: ImageSourcePropType };
// No verified organizer relation exists in public.events yet. Never infer one from an event title.
export const organizers: Organizer[] = [];
export const organizerEvents: (SpotEvent & { organizerId: string })[] = [];
export function getUpcomingOrganizerEvents(id: string, now = Date.now()) {
  return organizerEvents.filter(event => event.organizerId === id && Date.parse(event.startsAt) > now)
    .sort((a,b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
}
