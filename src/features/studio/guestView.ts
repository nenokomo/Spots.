import { mapEventRow } from '../../services/eventAdapter';
import { publishedValue } from '../../services/eventSchema';
import type { TicketType } from '../../services/content';
import type { PublicOrganizer, PublicOrganizerPost } from '../../types/accounts';
import type { SpotEvent } from '../../types/events';
import type { MyOrganizer, OrganizerEvent, StudioPost, StudioTicket } from '../organizer/organizerApi';
import { eventTimes, genreText, resolvedPlace, ticketPlan, type EventForm } from './eventForm';

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

/**
 * Ein noch nicht gespeichertes Event aus den Eingaben, so wie Gäste es sehen würden. Fehlen Titel oder Zeit, steht dort
 * ein Platzhalter (`empty`), den die Eventseite zum Antippen anbietet – so legt man ein Event direkt auf seiner Seite an.
 * Die Kartenposition gibt es erst nach dem Speichern; bis dahin steht der Ort als Text da.
 */
export function formEvent(form: EventForm, organizer: MyOrganizer, now: number): { event: SpotEvent | null; tickets: TicketType[]; empty: { title?: string; when?: string } } {
  const times = eventTimes(form);
  const { venue, place } = resolvedPlace(form, organizer);
  const plan = ticketPlan(form);
  const title = form.title.trim();
  const id = 'neu';
  const event = toSpotEvent({
    id, title: title || 'Titel hinzufügen', description: form.description.trim() || null,
    // Ohne gewählte Zeit: ein Platzhalter in der Zukunft, damit die Seite das Event nicht als beendet zeigt.
    startsAt: (times?.startsAt ?? new Date(now + 86_400_000)).toISOString(), endsAt: times?.endsAt.toISOString() ?? null,
    venueId: venue?.id ?? null, venueName: venue ? venue.name : place.name,
    street: venue ? null : place.street, houseNumber: venue ? null : place.houseNumber, postcode: venue ? null : place.postcode,
    city: venue ? venue.city : place.city, latitude: null, longitude: null,
    imageUrl: form.imageUrl, ticketUrl: plan.ticketUrl, genre: genreText(form), category: form.category, status: 'scheduled', isPublished: false,
  }, organizer.id);
  return {
    event,
    tickets: plan.desired.map((ticket, position) => ({ id: ticket.id ?? `neu-${position}`, eventId: id, name: ticket.name, description: null, priceCents: ticket.priceCents,
      currency: 'EUR', externalUrl: ticket.externalUrl ?? null, salesEnd: null, soldOut: false })),
    empty: { title: title ? undefined : 'Titel hinzufügen', when: times ? undefined : 'Datum und Uhrzeit wählen' },
  };
}
