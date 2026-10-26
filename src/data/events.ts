import type { ImageSourcePropType } from 'react-native';
import type { Category } from '../constants/theme';

export type DemoEvent = {
  id: string;
  title: string;
  categories: Exclude<Category, 'Alle'>[];
  date: string;
  location: string;
  image: ImageSourcePropType;
  coordinate: { latitude: number; longitude: number };
};

// Design examples only. Coordinates are public Berlin areas, never private addresses.
export const demoEvents: DemoEvent[] = [
  {
    id: 'neon-nights',
    title: 'Neon Nights',
    categories: ['Techno', 'Party'],
    date: 'Freitag ab 21:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.571, longitude: 13.493 },
  },
  {
    id: 'house-session',
    title: 'House Session',
    categories: ['House', 'Party'],
    date: 'Samstag ab 22:00',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/club.jpg'),
    coordinate: { latitude: 52.484, longitude: 13.335 },
  },
  {
    id: 'club-open-air',
    title: 'Club Open Air',
    categories: ['Techno', 'Clubs'],
    date: 'Nächste Woche',
    location: 'Berlin · Beispielort',
    image: require('../../assets/events/nightlife.jpg'),
    coordinate: { latitude: 52.486, longitude: 13.465 },
  },
];

export function matchesCategory(event: DemoEvent, category: Category) {
  return category === 'Alle' || event.categories.includes(category);
}
