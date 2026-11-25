import { mapEventRow } from '../../services/eventAdapter';
import { publishedValue } from '../../services/eventSchema';
import type { TicketType } from '../../services/content';
import type { PublicOrganizer, PublicOrganizerPost } from '../../types/accounts';
import type { SpotEvent } from '../../types/events';
import type { EventPart } from '../../screens/EventDetailScreen';
import type { MyOrganizer, OrganizerEvent, StudioPost, StudioTicket } from '../organizer/organizerApi';
import type { Step } from './eventForm';

// Spots Studio zeigt Eventseite und Veranstalterseite mit derselben Ansicht wie die Besucher-App
// (src/screens/EventDetailScreen.tsx, OrganizerProfileScreen.tsx). Hier werden die eigenen Daten des Veranstalters –
// auch Entwürfe – in die Form gebracht, die diese Ansichten erwarten, mit denselben Regeln wie für Gäste.

/** Ein eigenes Event so, wie es die Besucher-App liest (gleiche Zuordnung von Genre, Filter, Bild und Ort). */
export function toSpotEvent(event: OrganizerEvent, organizerId: string): SpotEvent | null {
  return mapEventRow({
    id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt,
    // Auch Entwürfe und abgesagte Events sollen in der Ansicht erscheinen; ob Gäste sie sehen, zeigt das Studio daneben.
    publication: publishedValue, status: 'scheduled',
    latitude: event.latitude, longitude: event.longitude, city: event.city, venue: event.venueName, description: event.description,
    genres: event.genre, category: event.category, imageUrl: event.imageUrl, sourceName: 'spots', sourceUrl: null, ticketUrl: event.ticketUrl, organizerId,
  });
}

export function toPublicOrganizer(organizer: MyOrganizer): PublicOrganizer {
  return { id: organizer.id, slug: organizer.slug, displayName: organizer.displayName, biography: organizer.biography, city: organizer.city,
    avatarUrl: organizer.avatarUrl, websiteUrl: organizer.websiteUrl, isPublished: organizer.isPublished, createdAt: '', updatedAt: '',
    motto: organizer.motto, coverUrl: organizer.coverUrl };
}

export function toPublicTickets(eventId: string, tickets: StudioTicket[]): TicketType[] {
  return tickets.map((ticket) => ({ id: ticket.id, eventId, name: ticket.name, description: null, priceCents: ticket.priceCents, currency: 'EUR',
    externalUrl: ticket.externalUrl, salesEnd: null, soldOut: ticket.soldOut }));
}

/** Nur veröffentlichte Beiträge – so wie Gäste sie sehen. */
export function toPublicPosts(organizerId: string, posts: StudioPost[]): PublicOrganizerPost[] {
  return posts.filter((post) => post.isPublished).map((post) => ({ id: post.id, organizerId, body: post.body, createdAt: post.createdAt, updatedAt: post.createdAt, images: post.images }));
}

/** Was Gäste von den Events sehen: veröffentlicht und nicht abgesagt. */
export function guestEvents(events: OrganizerEvent[], organizerId: string): SpotEvent[] {
  return events.filter((event) => event.isPublished && event.status === 'scheduled')
    .flatMap((event) => { const mapped = toSpotEvent(event, organizerId); return mapped ? [mapped] : []; });
}

/** Welcher Schritt von „Event anlegen/bearbeiten“ zu welchem Stift auf der Eventseite gehört. */
export const partStep: Record<EventPart, Step> = { flyer: 'event', title: 'event', description: 'event', when: 'when', place: 'where', tickets: 'tickets' };
