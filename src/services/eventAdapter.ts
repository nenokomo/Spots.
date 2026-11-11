import { categories, type Category } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { publishedValue } from './eventSchema';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Reject timestamps without an explicit timezone rather than interpreting them
// in the phone's local timezone and potentially showing a future event as live.
function timestamp(value: unknown) {
  const raw = text(value);
  return raw && /T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) && Number.isFinite(Date.parse(raw)) ? raw : null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Spelling variants of the same source category, e.g. Goabase stores "club".
// Exact synonyms only; genres are never guessed from titles or venues.
const categoryAliases: Record<string, Exclude<Category, 'Alle'>> = {
  club: 'Clubs', clubs: 'Clubs', event: 'Events', events: 'Events', techno: 'Techno', house: 'House',
  'hip-hop': 'Hip-Hop', hiphop: 'Hip-Hop', 'hip hop': 'Hip-Hop',
  concert: 'Konzerte', concerts: 'Konzerte', konzert: 'Konzerte', konzerte: 'Konzerte',
};

// Feste Genre-Schlüssel der Importe (z. B. Ticketmaster) auf Deutsch anzeigen; alles andere bleibt, wie es ist.
const genreLabels: Record<string, string> = { Classical: 'Klassik', World: 'Weltmusik' };

function number(value: unknown, limit: number) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

export function safeExternalUrl(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

export function mapEventRow(value: unknown): SpotEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.publication !== publishedValue || row.status !== 'scheduled') return null;
  const id = typeof row.id === 'number' && Number.isFinite(row.id) ? String(row.id) : text(row.id);
  const title = text(row.title);
  const startsAt = timestamp(row.startsAt);
  if (!id || !title || !startsAt) return null;
  const rawEnd = timestamp(row.endsAt);
  const endsAt = rawEnd && Date.parse(rawEnd) > Date.parse(startsAt) ? rawEnd : null;
  const latitude = number(row.latitude, 90);
  const longitude = number(row.longitude, 180);
  const imageUrl = safeExternalUrl(row.imageUrl);
  const rawGenres = Array.isArray(row.genres) ? row.genres : typeof row.genres === 'string' ? row.genres.split(/[,;|]/) : [];
  const genres = rawGenres.map(text).filter((genre): genre is string => !!genre).map((genre) => genreLabels[genre] ?? genre);
  const rawCategories = [text(row.category), ...genres].filter((item): item is string => !!item);
  const matched = categories.filter((category): category is Exclude<Category, 'Alle'> => category !== 'Alle'
    && rawCategories.some((item) => categoryAliases[item.toLowerCase()] === category));
  const organizerId = text(row.organizerId);

  return {
    id, title, startsAt, endsAt,
    // Unknown genres retain their original names; no invented genre assignment.
    categories: matched,
    genres,
    date: new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(startsAt)),
    location: text(row.city) ?? 'Ort nicht angegeben',
    venue: text(row.venue),
    coordinate: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    image: imageUrl ? { uri: imageUrl } : require('../../assets/events/nightlife.jpg'),
    imageIsPlaceholder: !imageUrl,
    description: text(row.description),
    sourceName: text(row.sourceName),
    sourceUrl: safeExternalUrl(row.sourceUrl),
    ticketUrl: safeExternalUrl(row.ticketUrl),
    organizerId: organizerId && uuidPattern.test(organizerId) ? organizerId : null,
  };
}
