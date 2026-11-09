// Matched to the public.events schema supplied on 3 November 2026.
// is_published controls visibility; scheduled excludes cancelled/unconfirmed events.
// Live status still requires a time interval and valid GPS, never status alone.
export const eventColumns = {
  id: 'id',
  title: 'title',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  publication: 'is_published',
  status: 'status',
  latitude: 'latitude',
  longitude: 'longitude',
  city: 'city',
  venue: 'venue_name',
  description: 'description',
  genres: 'genre',
  category: 'category',
  imageUrl: 'image_url',
  sourceName: 'source',
  sourceUrl: 'source_url',
  ticketUrl: 'ticket_url',
} satisfies Record<string, string | null>;

export const publishedValue = true;

// A projection intentionally avoids importing addresses or unrelated private fields.
export const eventProjection = Object.entries(eventColumns)
  .filter((entry): entry is [string, string] => entry[1] !== null)
  .map(([alias, column]) => `${alias}:${column}`).join(',');
