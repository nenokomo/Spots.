import { geocodeAddress } from '../organizer/geocode';
import { addTicket, deleteTicket, fetchTickets, saveOrganizerEvent, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { eventTimes, genreText, missingForSave, partLabels, resolvedPlace, sameAddress, ticketChanges, ticketPlan, type EventForm } from './eventForm';

/**
 * Speichert ein Event aus den Eingaben: neu anlegen oder ändern, samt Kartenposition und Ticketarten.
 * `live` = soll es für Gäste sichtbar sein. Vor der Freigabe des Veranstalters bleibt jedes Event ein Entwurf.
 * `existingId` = ein neues Event, das schon einmal gespeichert wurde (zweiter Versuch ändert es, statt ein zweites anzulegen).
 * Wirft einen Fehler mit einer Meldung für die Oberfläche.
 */
export async function saveEventForm({ organizer, event, form, live, existingId, onSaved }: {
  organizer: MyOrganizer; event: OrganizerEvent | null; form: EventForm; live: boolean; existingId?: string | null;
  /** Sobald das Event selbst gespeichert ist (vor den Ticketarten): die ID merken, falls danach noch etwas scheitert. */
  onSaved?: (id: string) => void;
}): Promise<string> {
  const approved = organizer.reviewStatus === 'approved';
  const missing = missingForSave(form, { isNew: !event });
  const times = eventTimes(form);
  if (missing.length > 0 || !times) throw new Error(`Bitte zuerst ausfüllen: ${missing.map((part) => partLabels[part]).join(', ') || partLabels.when}.`);
  const { venue, place } = resolvedPlace(form, organizer);
  const plan = ticketPlan(form);

  // Eigene Adresse → Kartenposition. Unveränderte Adresse behält ihre Position (keine neue Anfrage).
  let position: { latitude: number | null; longitude: number | null } = { latitude: null, longitude: null };
  if (!venue) {
    if (event && !event.venueId && sameAddress(place, event) && event.latitude !== null && event.longitude !== null) {
      position = { latitude: event.latitude, longitude: event.longitude };
    } else {
      const found = await geocodeAddress(place);
      if (!found) throw new Error('Diese Adresse haben wir nicht gefunden. Bitte Straße, Hausnummer, PLZ und Stadt prüfen.');
      position = { latitude: found.latitude, longitude: found.longitude };
    }
  }

  const status = event?.status ?? 'scheduled';
  const id = event?.id ?? existingId ?? undefined;
  const savedId = await saveOrganizerEvent(organizer.id, {
    title: form.title, description: form.description || null, startsAt: times.startsAt.toISOString(), endsAt: times.endsAt.toISOString(),
    venueId: venue?.id ?? null, venueName: venue ? venue.name : place.name,
    street: venue ? null : place.street, houseNumber: venue ? null : place.houseNumber, postcode: venue ? null : place.postcode,
    city: venue ? venue.city : place.city, latitude: position.latitude, longitude: position.longitude,
    imageUrl: form.imageUrl, ticketUrl: plan.ticketUrl, genre: genreText(form), category: form.category, status,
    isPublished: status === 'scheduled' && approved && live,
  }, id);
  onSaved?.(savedId);

  // Ticketarten angleichen: frisch gelesen, damit ein zweiter Versuch nichts doppelt anlegt.
  const current = id ? await fetchTickets(savedId) : [];
  const changes = ticketChanges(current, plan.desired);
  for (const ticketId of changes.remove) await deleteTicket(ticketId);
  const kept = current.length - changes.remove.length;
  for (const [offset, ticket] of changes.add.entries()) await addTicket(savedId, ticket, kept + offset);
  return savedId;
}
