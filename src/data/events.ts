import type { ImageSourcePropType } from 'react-native';
import type { Category } from '../constants/theme';

export type DemoEvent = {
  id: string;
  title: string;
  biography?: string;
  organizerId: string;
  ticketUrl?: string;
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
    organizerId: 'midnight-pulse-organizer',
    title: 'Midnight Pulse · Testevent',
    categories: ['Techno', 'Events'],
    date: '02.11.2026 · ab 21:00',
    startsAt: '2026-11-02T21:00:00+01:00',
    location: 'Karlsruhe · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 49.009, longitude: 8.404 },
  },
  {
    id: 'test-velvet-house',
    organizerId: 'velvet-house-organizer',
    title: 'Velvet House · Testevent',
    categories: ['House', 'Events'],
    date: 'Freitag, 06.11.2026 · ab 22:00',
    startsAt: '2026-11-06T22:00:00+01:00',
    location: 'Karlsruhe · Beispielort',
    image: require('../../assets/events/club.jpg'),
    coordinate: { latitude: 49.004, longitude: 8.389 },
  },
  {
    id: 'test-neon-club',
    organizerId: 'neon-club-organizer',
    title: 'Neon Club · Testevent',
    categories: ['Clubs', 'Events'],
    date: 'Samstag, 07.11.2026 · ab 23:00',
    startsAt: '2026-11-07T23:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.486, longitude: 13.465 },
  },
  {
    id: 'neon-nights',
    organizerId: 'neon-nights-organizer',
    title: 'Neon Nights',
    categories: ['Techno', 'Events'],
    date: 'Freitag ab 21:00',
    startsAt: '2026-10-30T21:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.571, longitude: 13.493 },
  },
  {
    id: 'house-session',
    organizerId: 'house-session-organizer',
    title: 'House Session',
    categories: ['House', 'Events'],
    date: 'Samstag ab 22:00',
    startsAt: '2026-10-31T22:00:00+01:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/club.jpg'),
    coordinate: { latitude: 52.484, longitude: 13.335 },
  },
  {
    id: 'club-open-air',
    organizerId: 'club-open-air-organizer',
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
const karlsruheParties: { id: string; title: string; genre: 'Techno' | 'House' | 'Clubs' | 'Events'; latitude: number; longitude: number }[] = [
  { id: 'karlsruhe-organizer-1', title: 'Fächerstadt Beats', genre: 'Techno', latitude: 49.009, longitude: 8.404 },
  { id: 'karlsruhe-organizer-2', title: 'Karlsruhe House Lights', genre: 'House', latitude: 49.004, longitude: 8.389 },
  { id: 'karlsruhe-organizer-3', title: 'Südstadt Session', genre: 'Events', latitude: 48.998, longitude: 8.413 },
  { id: 'karlsruhe-organizer-4', title: 'Weststadt After Dark', genre: 'Clubs', latitude: 49.01, longitude: 8.372 },
  { id: 'karlsruhe-organizer-5', title: 'Oststadt Frequenz', genre: 'Techno', latitude: 49.013, longitude: 8.436 },
  { id: 'karlsruhe-organizer-6', title: 'Durlach Dance', genre: 'House', latitude: 48.999, longitude: 8.471 },
  { id: 'karlsruhe-organizer-7', title: 'Mühlburg Midnight', genre: 'Events', latitude: 49.015, longitude: 8.351 },
  { id: 'karlsruhe-organizer-8', title: 'Nordstadt Neon', genre: 'Clubs', latitude: 49.031, longitude: 8.391 },
  { id: 'karlsruhe-organizer-9', title: 'Rüppurr Rhythm', genre: 'House', latitude: 48.974, longitude: 8.406 },
  { id: 'karlsruhe-organizer-10', title: 'Knielingen Bass', genre: 'Techno', latitude: 49.034, longitude: 8.337 },
];

demoEvents.push(...karlsruheParties.map((party, index): DemoEvent => ({
  id: `karlsruhe-demo-${index + 1}`,
  organizerId: party.id,
  title: party.title,
  categories: party.genre === 'Events' ? ['Events'] : [party.genre, 'Events'],
  date: `29.10.2026 · ab ${index % 2 === 0 ? '21:00' : '22:00'}`,
  startsAt: `2026-10-29T${index % 2 === 0 ? '21' : '22'}:00:00+01:00`,
  location: 'Karlsruhe · Beispielort',
  image: index % 2 === 0 ? require('../../assets/events/nightlife.jpg') : require('../../assets/events/club.jpg'),
  coordinate: { latitude: party.latitude, longitude: party.longitude },
})));

// User-requested fictional test events for 3 November 2026, not real venues.
// Fixed dates intentionally do not roll forward on subsequent days.
demoEvents.push(...karlsruheParties.slice(0, 5).map((party, index): DemoEvent => ({
  id: `karlsruhe-test-2026-11-03-${index + 1}`,
  organizerId: party.id,
  title: `${party.title} · Testevent`,
  categories: party.genre === 'Events' ? ['Events'] : [party.genre, 'Events'],
  date: `03.11.2026 · ab ${index % 2 === 0 ? '21:00' : '22:00'}`,
  startsAt: `2026-11-03T${index % 2 === 0 ? '21' : '22'}:00:00+01:00`,
  location: 'Karlsruhe · fiktiver Beispielort',
  image: index % 2 === 0 ? require('../../assets/events/nightlife.jpg') : require('../../assets/events/club.jpg'),
  coordinate: { latitude: party.latitude, longitude: party.longitude },
})));

// Five fictional Karlsruhe events for 4 November 2026, using public-area
// example coordinates. Dates stay fixed rather than moving forward daily.
demoEvents.push(...karlsruheParties.slice(0, 5).map((party, index): DemoEvent => ({
  id: `karlsruhe-test-2026-11-04-${index + 1}`,
  organizerId: party.id,
  title: `${party.title} · Testevent`,
  categories: party.genre === 'Events' ? ['Events'] : [party.genre, 'Events'],
  date: `04.11.2026 · ab ${index % 2 === 0 ? '21:00' : '22:00'}`,
  startsAt: `2026-11-04T${index % 2 === 0 ? '21' : '22'}:00:00+01:00`,
  location: 'Karlsruhe · fiktiver Beispielort',
  image: index % 2 === 0 ? require('../../assets/events/nightlife.jpg') : require('../../assets/events/club.jpg'),
  coordinate: { latitude: party.latitude, longitude: party.longitude },
})));

// Five additional fictional Karlsruhe events for 5 November 2026. They use
// public-area example coordinates and fixed dates rather than real venues.
demoEvents.push(...karlsruheParties.slice(5, 10).map((party, index): DemoEvent => ({
  id: `karlsruhe-test-2026-11-05-${index + 1}`,
  organizerId: party.id,
  title: `${party.title} · Testevent`,
  categories: party.genre === 'Events' ? ['Events'] : [party.genre, 'Events'],
  date: `05.11.2026 · ab ${index % 2 === 0 ? '21:00' : '22:00'}`,
  startsAt: `2026-11-05T${index % 2 === 0 ? '21' : '22'}:00:00+01:00`,
  location: 'Karlsruhe · fiktiver Beispielort',
  image: index % 2 === 0 ? require('../../assets/events/nightlife.jpg') : require('../../assets/events/club.jpg'),
  coordinate: { latitude: party.latitude, longitude: party.longitude },
})));

// User-requested fictional Karlsruhe fixtures for 8 November 2026.
// Dates remain fixed; coordinates represent public areas, not actual venues.
demoEvents.push(...karlsruheParties.slice(0, 5).map((party, index): DemoEvent => ({
  id: `karlsruhe-test-2026-11-08-${index + 1}`,
  organizerId: party.id,
  title: `${party.title} · Testevent`,
  categories: party.genre === 'Events' ? ['Events'] : [party.genre, 'Events'],
  date: `08.11.2026 · ab ${index % 2 === 0 ? '21:00' : '22:00'}`,
  startsAt: `2026-11-08T${index % 2 === 0 ? '21' : '22'}:00:00+01:00`,
  location: 'Karlsruhe · fiktiver Beispielort',
  image: index % 2 === 0 ? require('../../assets/events/nightlife.jpg') : require('../../assets/events/club.jpg'),
  coordinate: { latitude: party.latitude, longitude: party.longitude },
})));

export function matchesCategory(event: DemoEvent, category: Category) {
  return category === 'Alle' || event.categories.includes(category);
}
