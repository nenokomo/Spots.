import type { ImageSourcePropType } from 'react-native';
import type { Category } from '../constants/theme';

export type DemoEvent = {
  id: string;
  title: string;
  categories: Exclude<Category, 'Alle'>[];
  date: string;
  startsAt: string;
  location: string;
  image: ImageSourcePropType;
  coordinate: { latitude: number; longitude: number };
};

// Design examples only. Coordinates are public Berlin areas, never private addresses.
export const demoEvents: DemoEvent[] = [
  // Explicit test parties with fixed dates and public-area example coordinates.
  // They are fictional and never move forward automatically with the current date.
  {
    id: 'test-midnight-pulse',
    title: 'Midnight Pulse · Testparty',
    categories: ['Techno', 'Party'],
    date: '02.11.2026 · ab 21:00',
    startsAt: '2026-11-02T21:00:00+01:00',
    location: 'Karlsruhe · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 49.009, longitude: 8.404 },
  },
  {
    id: 'test-velvet-house',
    title: 'Velvet House · Testparty',
    categories: ['House', 'Party'],
    date: 'Freitag, 06.11.2026 · ab 22:00',
    startsAt: '2026-11-06T22:00:00+01:00',
    location: 'Karlsruhe · Beispielort',
    image: require('../../assets/events/club.jpg'),
    coordinate: { latitude: 49.004, longitude: 8.389 },
  },
  {
    id: 'test-neon-club',
    title: 'Neon Club · Testparty',
    categories: ['Clubs', 'Party'],
    date: 'Samstag, 07.11.2026 · ab 23:00',
    startsAt: '2026-11-07T23:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.486, longitude: 13.465 },
  },
  {
    id: 'neon-nights',
    title: 'Neon Nights',
    categories: ['Techno', 'Party'],
    date: 'Freitag ab 21:00',
    startsAt: '2026-10-30T21:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.571, longitude: 13.493 },
  },
  {
    id: 'house-session',
    title: 'House Session',
    categories: ['House', 'Party'],
    date: 'Samstag ab 22:00',
    startsAt: '2026-10-31T22:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/club.jpg'),
    coordinate: { latitude: 52.484, longitude: 13.335 },
  },
  {
    id: 'club-open-air',
    title: 'Club Open Air',
    categories: ['Techno', 'Clubs'],
    date: 'Nächste Woche',
    startsAt: '2026-11-06T21:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.486, longitude: 13.465 },
  },
];

// Explicitly fictional fixtures dated 29 October 2026; public-area coordinates,
// not actual venues or private party addresses. These never roll forward daily.
const karlsruheParties: { title: string; genre: 'Techno' | 'House' | 'Clubs' | 'Party'; latitude: number; longitude: number }[] = [
  { title: 'Fächerstadt Beats', genre: 'Techno', latitude: 49.009, longitude: 8.404 },
  { title: 'Karlsruhe House Lights', genre: 'House', latitude: 49.004, longitude: 8.389 },
  { title: 'Südstadt Session', genre: 'Party', latitude: 48.998, longitude: 8.413 },
  { title: 'Weststadt After Dark', genre: 'Clubs', latitude: 49.01, longitude: 8.372 },
  { title: 'Oststadt Frequenz', genre: 'Techno', latitude: 49.013, longitude: 8.436 },
  { title: 'Durlach Dance', genre: 'House', latitude: 48.999, longitude: 8.471 },
  { title: 'Mühlburg Midnight', genre: 'Party', latitude: 49.015, longitude: 8.351 },
  { title: 'Nordstadt Neon', genre: 'Clubs', latitude: 49.031, longitude: 8.391 },
  { title: 'Rüppurr Rhythm', genre: 'House', latitude: 48.974, longitude: 8.406 },
  { title: 'Knielingen Bass', genre: 'Techno', latitude: 49.034, longitude: 8.337 },
];

demoEvents.push(...karlsruheParties.map((party, index): DemoEvent => ({
  id: `karlsruhe-demo-${index + 1}`,
  title: party.title,
  categories: party.genre === 'Party' ? ['Party'] : [party.genre, 'Party'],
  date: `29.10.2026 · ab ${index % 2 === 0 ? '21:00' : '22:00'}`,
  startsAt: `2026-10-29T${index % 2 === 0 ? '21' : '22'}:00:00+01:00`,
  location: 'Karlsruhe · Beispielort',
  image: index % 2 === 0 ? require('../../assets/events/nightlife.jpg') : require('../../assets/events/club.jpg'),
  coordinate: { latitude: party.latitude, longitude: party.longitude },
})));

export function matchesCategory(event: DemoEvent, category: Category) {
  return category === 'Alle' || event.categories.includes(category);
}
