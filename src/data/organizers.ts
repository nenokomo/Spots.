import type { ImageSourcePropType } from 'react-native';
import { demoEvents, type DemoEvent } from './events';

export type DemoOrganizer = {
  id: string;
  name: string;
  biography?: string;
  city: string;
  image: ImageSourcePropType;
};

// Demo profiles use the existing fixture names and explicit organizer IDs.
// Multiple dated editions of the same fixture belong to one lasting profile.
export const demoOrganizers: DemoOrganizer[] = Array.from(
  new Map(demoEvents.map(event => [event.organizerId, {
    id: event.organizerId,
    name: event.title.replace(' · Testevent', ''),
    city: event.location.split(' · ')[0],
    image: event.image,
  }])).values(),
);

export function getUpcomingOrganizerEvents(organizerId: string, now = Date.now()): DemoEvent[] {
  return demoEvents
    .filter(event => event.organizerId === organizerId && Date.parse(event.startsAt) >= now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
}
