import type { ImageSourcePropType } from 'react-native';
import type { Category } from '../constants/theme';

export type SpotEvent = {
  id: string;
  title: string;
  categories: Exclude<Category, 'Alle'>[];
  genres?: string[];
  date: string;
  startsAt: string;
  endsAt?: string | null;
  location: string;
  venue?: string | null;
  image: ImageSourcePropType;
  imageIsPlaceholder?: boolean;
  coordinate?: { latitude: number; longitude: number } | null;
  description?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
};

export type LocatedEvent = SpotEvent & { coordinate: NonNullable<SpotEvent['coordinate']> };

export function matchesCategory(event: SpotEvent, category: Category) {
  return category === 'Alle' || event.categories.includes(category);
}

export function isLocatedEvent(event: SpotEvent): event is LocatedEvent {
  const point = event.coordinate;
  return !!point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export function isLiveEvent(event: SpotEvent, now: number = Date.now()): event is LocatedEvent {
  return isLocatedEvent(event) && !!event.endsAt
    && Date.parse(event.startsAt) <= now && now < Date.parse(event.endsAt);
}

export function isUpcomingEvent(event: SpotEvent, now: number = Date.now()) {
  return Date.parse(event.startsAt) > now;
}
