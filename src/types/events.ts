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
  /** Verified organizer (only Spots-owned events). Imported events never get one. */
  organizerId?: string | null;
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

/**
 * Events without a confirmed end (mostly imported concerts) count as running for this long after their start,
 * so they appear on the radar at all. Shorter than the 8 hours used for "Hat begonnen": a concert that
 * started at 20:00 should not sit on the radar at 03:00.
 */
export const LIVE_WITHOUT_END_MS = 4 * 60 * 60 * 1000;

/** On the radar now: started and not over. With a confirmed end until that end, otherwise for LIVE_WITHOUT_END_MS. */
export function isLiveEvent(event: SpotEvent, now: number = Date.now()): event is LocatedEvent {
  if (!isLocatedEvent(event)) return false;
  const start = Date.parse(event.startsAt);
  if (!(start <= now)) return false;
  return event.endsAt ? now < Date.parse(event.endsAt) : now - start < LIVE_WITHOUT_END_MS;
}

export function isUpcomingEvent(event: SpotEvent, now: number = Date.now()) {
  return Date.parse(event.startsAt) > now;
}
