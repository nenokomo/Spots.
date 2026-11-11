import type { Coordinate } from '../utils/events';

export type VenueKind = 'club' | 'live' | 'eventlocation';

/** Ein Ort (Club, Live-Musik, Eventlocation). Ein Ort sagt nie, dass gerade eine Party läuft. */
export type Venue = {
  id: string;
  name: string;
  kind: VenueKind;
  street: string | null;
  houseNumber: string | null;
  postcode: string | null;
  city: string | null;
  coordinate: Coordinate;
  website: string | null;
  openingHours: string | null;
  /** OpenStreetMap-Objekt, z. B. "node/123" – für den Quellenlink. */
  sourceRef: string | null;
  source: 'osm' | 'redaktion' | 'test';
};

export const venueKindLabels: Record<VenueKind, string> = {
  club: 'Club',
  live: 'Live-Musik',
  eventlocation: 'Eventlocation',
};

export const venueReportReasons = [
  { id: 'closed', label: 'Geschlossen oder gibt es nicht mehr' },
  { id: 'wrong_location', label: 'Falscher Ort auf der Karte' },
  { id: 'wrong_details', label: 'Name, Adresse oder Website falsch' },
  { id: 'not_a_venue', label: 'Kein Club und keine Location' },
  { id: 'inappropriate', label: 'Unangemessener Eintrag' },
  { id: 'other', label: 'Etwas anderes' },
] as const;
export type VenueReportReason = (typeof venueReportReasons)[number]['id'];

export function venueAddress(venue: Venue) {
  const street = [venue.street, venue.houseNumber].filter(Boolean).join(' ');
  const town = [venue.postcode, venue.city].filter(Boolean).join(' ');
  return [street, town].filter(Boolean).join(', ') || null;
}

/** Quellenlink zu OpenStreetMap (ODbL verlangt die Namensnennung). */
export function venueSourceUrl(venue: Venue) {
  return venue.source === 'osm' && venue.sourceRef && /^(node|way|relation)\/\d+$/.test(venue.sourceRef)
    ? `https://www.openstreetmap.org/${venue.sourceRef}` : null;
}
