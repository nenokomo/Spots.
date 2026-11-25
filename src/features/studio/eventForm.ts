import { formatBerlinInput, parseBerlinDateTime, parseBerlinEnd } from '../../utils/berlinTime';
import { parsePrice, type EventCategory, type MyOrganizer, type OrganizerEvent, type PublicVenueChoice, type StudioTicket, type StudioTicketInput } from '../organizer/organizerApi';
import { normalizeWebsite } from '../organizer/signup';

// Logik hinter „Event anlegen / bearbeiten“ (ohne Oberfläche, damit sie sich ohne Gerät testen lässt):
// Schritte, Startwerte, Prüfung pro Schritt mit Fehlern direkt am Feld, Tickets als ein Abschnitt, Checkliste.

export const steps = ['event', 'when', 'where', 'tickets', 'preview'] as const;
export type Step = typeof steps[number];
export const stepLabels: Record<Step, string> = { event: 'Event', when: 'Wann', where: 'Wo', tickets: 'Tickets', preview: 'Vorschau' };

/** Teile der Eventseite, die man einzeln bearbeitet (gleiche Namen wie `EventPart` der Eventseite). */
export type FormPart = 'flyer' | 'title' | 'when' | 'description' | 'tickets' | 'place';
export const partLabels: Record<FormPart, string> = { flyer: 'Flyer', title: 'Titel', when: 'Datum und Uhrzeit', description: 'Beschreibung', tickets: 'Tickets', place: 'Ort' };
/** Welche Prüfung zu welchem Teil gehört. Flyer und Beschreibung haben keine Pflichtangaben. */
export const stepOfPart: Record<FormPart, Step | null> = { flyer: null, title: 'event', when: 'when', description: null, tickets: 'tickets', place: 'where' };

export const categoryLabels: Record<EventCategory, string> = { club: 'Clubnacht', concert: 'Konzert', event: 'Event' };

/**
 * Genres zur Auswahl statt Freitext, damit Events zu den Filtern passen.
 * Die ersten drei sind zugleich Filter im Radar (src/constants/theme.ts → categories, Zuordnung in services/eventAdapter.ts).
 */
export const genreChoices = ['Techno', 'House', 'Hip-Hop', 'Drum & Bass', 'Trance', 'Disco', 'Pop', 'Rock', 'Latin', 'Afrobeats', '90er', 'Schlager'] as const;
export const maxGenres = 3;
/** Länge der Spalte in der Datenbank. */
const maxGenreLength = 40;

export type Place = { name: string; street: string; houseNumber: string; postcode: string; city: string };
/** online = Tickets über einen Link, door = Abendkasse, free = Eintritt frei. */
export type TicketMode = 'online' | 'door' | 'free';
export const ticketModeLabels: Record<TicketMode, string> = { online: 'Online', door: 'Abendkasse', free: 'Eintritt frei' };
export type PriceRow = { key: string; id?: string; name: string; price: string; externalUrl?: string | null };

export type EventForm = {
  title: string; category: EventCategory; genres: string[]; otherGenre: string; description: string; imageUrl: string | null;
  /** „TT.MM.JJJJ“ und „HH:MM“ in Berliner Zeit. */
  date: string; startTime: string; endTime: string;
  /** own = beim Veranstalter selbst, other = anderer Ort (aus der Ortssuche oder eigene Adresse). */
  placeMode: 'own' | 'other'; venue: PublicVenueChoice | null; place: Place;
  ticketMode: TicketMode; ticketUrl: string; prices: PriceRow[];
};
export type FormErrors = Partial<Record<'title' | 'date' | 'startTime' | 'endTime' | 'placeName' | 'street' | 'postcode' | 'city' | 'ticketUrl' | 'prices', string>>;

const freeTicketName = 'Eintritt frei';
let rowCounter = 0;
export const newPriceRow = (name = ''): PriceRow => ({ key: `new-${Date.now().toString(36)}-${rowCounter += 1}`, name, price: '' });

export function ownPlace(organizer: Pick<MyOrganizer, 'displayName' | 'street' | 'houseNumber' | 'postcode' | 'city'>): Place {
  return { name: organizer.displayName, street: organizer.street ?? '', houseNumber: organizer.houseNumber ?? '', postcode: organizer.postcode ?? '', city: organizer.city ?? '' };
}
/** Hat der Veranstalter eine eigene Adresse? Nur dann gibt es „Bei euch“. */
export const hasOwnPlace = (place: Place) => !!place.street.trim() && !!place.houseNumber.trim() && /^[0-9]{5}$/.test(place.postcode.trim()) && !!place.city.trim();
/** Gleiche Anschrift wie am gespeicherten Event? Dann bleibt die Kartenposition, ohne neue Suche. */
export const sameAddress = (a: Place, event: Pick<OrganizerEvent, 'street' | 'houseNumber' | 'postcode' | 'city'>) => a.street.trim() === (event.street ?? '')
  && a.houseNumber.trim() === (event.houseNumber ?? '') && a.postcode.trim() === (event.postcode ?? '') && a.city.trim() === (event.city ?? '');

/** „12“ oder „12,50“ für das Preisfeld. */
export function priceInput(cents: number | null): string {
  if (cents === null) return '';
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}

export function ticketModeOf(event: Pick<OrganizerEvent, 'ticketUrl'> | null, tickets: StudioTicket[]): TicketMode {
  if (event?.ticketUrl || tickets.some((ticket) => ticket.externalUrl)) return 'online';
  if (tickets.length > 0 && tickets.every((ticket) => ticket.priceCents === 0)) return 'free';
  return 'door';
}

/**
 * Startwerte. Neues Event: beim Veranstalter selbst, Abendkasse. Bearbeiten: die Werte des Events.
 * `copy` = als Vorlage für ein neues Event: alles außer dem Datum.
 */
export function initialForm(organizer: MyOrganizer, event: OrganizerEvent | null, tickets: StudioTicket[] = [], copy = false): EventForm {
  const own = ownPlace(organizer);
  const start = event ? formatBerlinInput(event.startsAt) : null;
  const parts = (event?.genre ?? '').split(/[,;|]/).map((part) => part.trim()).filter(Boolean);
  const known = genreChoices.filter((choice) => parts.some((part) => part.toLocaleLowerCase('de') === choice.toLocaleLowerCase('de')));
  const other = parts.filter((part) => !genreChoices.some((choice) => choice.toLocaleLowerCase('de') === part.toLocaleLowerCase('de')));
  const mode = ticketModeOf(event, tickets);
  const rows = mode === 'free' ? [] : tickets.map((ticket): PriceRow => ({ key: copy ? newPriceRow().key : ticket.id, id: copy ? undefined : ticket.id, name: ticket.name,
    price: priceInput(ticket.priceCents), externalUrl: ticket.externalUrl }));
  const elsewhere = !!event && (!!event.venueId || !sameAddress(own, event) || (event.venueName ?? '') !== own.name);
  return {
    title: event?.title ?? '', category: event?.category ?? 'club', genres: [...known], otherGenre: other.join(', '),
    description: event?.description ?? '', imageUrl: event?.imageUrl ?? null,
    date: copy ? '' : start?.date ?? '', startTime: start?.time ?? '', endTime: event?.endsAt ? formatBerlinInput(event.endsAt).time : '',
    placeMode: elsewhere || !hasOwnPlace(own) ? 'other' : 'own',
    venue: event?.venueId ? { id: event.venueId, name: event.venueName ?? 'Ort', city: event.city } : null,
    place: event && !event.venueId && elsewhere
      ? { name: event.venueName ?? '', street: event.street ?? '', houseNumber: event.houseNumber ?? '', postcode: event.postcode ?? '', city: event.city ?? '' }
      : hasOwnPlace(own) ? { name: '', street: '', houseNumber: '', postcode: '', city: own.city } : own,
    ticketMode: mode, ticketUrl: event?.ticketUrl ?? '',
    prices: rows.length > 0 ? rows : mode === 'door' ? [newPriceRow('Abendkasse')] : [],
  };
}

/** Genre für die Datenbank: Auswahl und „Anderes“, mit Komma getrennt (so trennt die Besucher-App sie wieder). */
export function genreText(form: Pick<EventForm, 'genres' | 'otherGenre'>): string | null {
  const text = [...form.genres, form.otherGenre.trim()].filter(Boolean).join(', ').slice(0, maxGenreLength).replace(/,\s*$/, '').trim();
  return text || null;
}

/** Beginn und Ende als Zeitpunkte, oder null, solange etwas fehlt. Ein Ende vor dem Beginn gilt am nächsten Tag. */
export function eventTimes(form: Pick<EventForm, 'date' | 'startTime' | 'endTime'>): { startsAt: Date; endsAt: Date } | null {
  const startsAt = parseBerlinDateTime(form.date, form.startTime);
  if (!startsAt) return null;
  const endsAt = parseBerlinEnd(form.date, startsAt, form.endTime);
  return endsAt && endsAt !== 'invalid' ? { startsAt, endsAt } : null;
}

/** Endet das Event am Tag nach dem Beginn (23:00 bis 05:00)? Für den Hinweis am Feld „Ende“. */
export function endsNextDay(form: Pick<EventForm, 'date' | 'startTime' | 'endTime'>): boolean {
  const times = eventTimes(form);
  return !!times && formatBerlinInput(times.endsAt).date !== formatBerlinInput(times.startsAt).date;
}

type PriceCheck = { name: string; priceCents: number | null; id?: string; externalUrl: string | null };
/** Ausgefüllte Preiszeilen. Leere Zeilen zählen nicht; halb ausgefüllte sind ein Fehler. */
function readPrices(rows: PriceRow[]): PriceCheck[] | 'invalid' {
  const result: PriceCheck[] = [];
  for (const row of rows) {
    const name = row.name.trim().slice(0, 80), price = row.price.trim();
    if (!name && !price) continue;
    if (!name) return 'invalid';
    if (!price) {
      // Schon gespeicherte Ticketarten dürfen ohne Preis bleiben; die vorausgefüllte „Abendkasse“ ohne Preis zählt als leer.
      if (row.id) { result.push({ name, priceCents: null, id: row.id, externalUrl: row.externalUrl ?? null }); continue; }
      if (name === 'Abendkasse') continue;
      return 'invalid';
    }
    const cents = parsePrice(price);
    if (cents === 'invalid' || cents === null) return 'invalid';
    result.push({ name, priceCents: cents, id: row.id, externalUrl: row.externalUrl ?? null });
  }
  return result;
}

/** Prüft einen Schritt. `preview` prüft alles. Leeres Ergebnis = alles in Ordnung. */
export function validateStep(form: EventForm, step: Step, options: { isNew: boolean; now?: number } = { isNew: true }): FormErrors {
  const errors: FormErrors = {};
  const all = step === 'preview';
  if (all || step === 'event') {
    if (!form.title.trim()) errors.title = 'Bitte einen Titel eingeben.';
  }
  if (all || step === 'when') {
    const startsAt = parseBerlinDateTime(form.date, form.startTime);
    if (!form.date.trim()) errors.date = 'Bitte ein Datum wählen.';
    if (!form.startTime.trim()) errors.startTime = 'Bitte den Beginn wählen.';
    if (form.date.trim() && form.startTime.trim() && !startsAt) errors.date = 'Bitte Datum und Beginn prüfen.';
    if (startsAt && options.isNew && startsAt.getTime() < (options.now ?? Date.now()) - 8 * 3_600_000) errors.date = 'Das Event liegt in der Vergangenheit.';
    if (!form.endTime.trim()) errors.endTime = 'Bitte das Ende wählen.';
    else if (startsAt && !eventTimes(form)) errors.endTime = 'Bitte das Ende prüfen.';
  }
  if ((all || step === 'where') && form.placeMode === 'other' && !form.venue) {
    if (!form.place.name.trim()) errors.placeName = 'Bitte den Namen des Orts eingeben.';
    if (!form.place.street.trim() || !form.place.houseNumber.trim()) errors.street = 'Bitte Straße und Hausnummer eingeben.';
    if (!/^[0-9]{5}$/.test(form.place.postcode.trim())) errors.postcode = 'Bitte eine fünfstellige Postleitzahl eingeben.';
    if (!form.place.city.trim()) errors.city = 'Bitte die Stadt eingeben.';
  }
  if (all || step === 'tickets') {
    const prices = form.ticketMode === 'free' ? [] : readPrices(form.prices);
    if (prices === 'invalid') errors.prices = 'Bitte bei jedem Ticket Name und Preis eingeben, z. B. 12 oder 12,50.';
    if (form.ticketMode === 'online') {
      const link = normalizeWebsite(form.ticketUrl);
      const rowLinks = form.prices.some((row) => row.externalUrl);
      if (link === 'invalid') errors.ticketUrl = 'Der Ticket-Link ist ungültig.';
      else if (link === null && !rowLinks) errors.ticketUrl = 'Bitte den Ticket-Link eingeben.';
    }
  }
  return errors;
}

/** Der erste Schritt mit einem Fehler – dorthin springt die Vorschau, wenn noch etwas fehlt. */
export function firstInvalidStep(form: EventForm, options: { isNew: boolean; now?: number }): Step | null {
  return steps.find((step) => step !== 'preview' && Object.keys(validateStep(form, step, options)).length > 0) ?? null;
}

/** Ort, wie er gespeichert wird. Bei „own“ die Adresse des Veranstalters. */
export function resolvedPlace(form: EventForm, organizer: MyOrganizer): { venue: PublicVenueChoice | null; place: Place } {
  if (form.placeMode === 'own') return { venue: null, place: ownPlace(organizer) };
  return { venue: form.venue, place: form.place };
}

export type TicketPlan = { ticketUrl: string | null; desired: (StudioTicketInput & { id?: string })[] };
/** Tickets, wie sie gespeichert werden: ein Link am Event und die Ticketarten mit Preis. */
export function ticketPlan(form: EventForm): TicketPlan {
  if (form.ticketMode === 'free') return { ticketUrl: null, desired: [{ name: freeTicketName, priceCents: 0, externalUrl: null }] };
  const prices = readPrices(form.prices);
  const link = form.ticketMode === 'online' ? normalizeWebsite(form.ticketUrl) : null;
  return {
    ticketUrl: link === 'invalid' ? null : link,
    desired: prices === 'invalid' ? [] : prices.map((row) => ({ id: row.id, name: row.name, priceCents: row.priceCents, externalUrl: form.ticketMode === 'online' ? row.externalUrl : null })),
  };
}

/** Was sich an den Ticketarten ändert: unveränderte bleiben stehen (samt „ausverkauft“), der Rest wird entfernt und neu angelegt. */
export function ticketChanges(existing: StudioTicket[], desired: TicketPlan['desired']): { remove: string[]; add: StudioTicketInput[] } {
  const same = (ticket: StudioTicket, row: TicketPlan['desired'][number]) => ticket.name === row.name && ticket.priceCents === row.priceCents && (ticket.externalUrl ?? null) === (row.externalUrl ?? null);
  const kept = new Set<string>();
  const add: StudioTicketInput[] = [];
  for (const row of desired) {
    const match = existing.find((ticket) => !kept.has(ticket.id) && (row.id ? ticket.id === row.id : true) && same(ticket, row));
    if (match) kept.add(match.id);
    else add.push({ name: row.name, priceCents: row.priceCents, externalUrl: row.externalUrl ?? null });
  }
  return { remove: existing.filter((ticket) => !kept.has(ticket.id)).map((ticket) => ticket.id), add };
}

export type ChecklistItem = { key: 'flyer' | 'description' | 'tickets' | 'published'; label: string; done: boolean; step: Step };
/** „Fertig für die Gäste?“ – was einem Event noch fehlt. `ticketCount` null = Ticketarten laden noch. */
export function eventChecklist(event: Pick<OrganizerEvent, 'imageUrl' | 'description' | 'ticketUrl' | 'isPublished'>, ticketCount: number | null): ChecklistItem[] {
  return [
    { key: 'flyer', label: 'Flyer', done: !!event.imageUrl, step: 'event' },
    { key: 'description', label: 'Beschreibung', done: !!event.description?.trim(), step: 'event' },
    { key: 'tickets', label: 'Tickets', done: !!event.ticketUrl || (ticketCount ?? 0) > 0, step: 'tickets' },
    { key: 'published', label: event.isPublished ? 'Veröffentlicht' : 'Veröffentlichen', done: event.isPublished, step: 'preview' },
  ];
}

/**
 * Startwerte für ein neues Event. Mit einem früheren Event als Vorgabe (`last`): Uhrzeiten, Art, Genre und –
 * bei Abendkasse oder freiem Eintritt – die Tickets vom letzten Mal. Titel, Datum, Flyer, Text und der Ticket-Link
 * sind bei jedem Event neu.
 */
export function freshForm(organizer: MyOrganizer, last: { event: OrganizerEvent; tickets: StudioTicket[] } | null): EventForm {
  if (!last) return initialForm(organizer, null);
  const online = ticketModeOf(last.event, last.tickets) === 'online';
  const base = initialForm(organizer, { ...last.event, ticketUrl: null }, online ? [] : last.tickets, true);
  // Ort: wer eine eigene Adresse hat, startet immer „Bei euch“ – ein einmaliger anderer Ort (z. B. eine private Adresse)
  // soll nicht still ins nächste Event wandern. Ohne eigene Adresse ist der letzte Ort die beste Vorgabe.
  const home = hasOwnPlace(ownPlace(organizer)) ? initialForm(organizer, null) : null;
  return { ...base, ...(home ? { placeMode: home.placeMode, venue: home.venue, place: home.place } : {}), title: '', description: '', imageUrl: null, date: '', ticketUrl: '' };
}

/** Teile, ohne die sich das Event nicht speichern lässt (Titel, Zeit, vollständiger Ort, gültige Tickets). */
export function missingForSave(form: EventForm, options: { isNew: boolean; now?: number }): FormPart[] {
  return (['title', 'when', 'place', 'tickets'] as const).filter((part) => Object.keys(validateStep(form, stepOfPart[part]!, options)).length > 0);
}

/** Zum Veröffentlichen gehört außerdem ein Flyer. */
export function missingForPublish(form: EventForm, options: { isNew: boolean; now?: number }): FormPart[] {
  return [...(form.imageUrl ? [] : ['flyer' as const]), ...missingForSave(form, options)];
}

/**
 * Vorschlag für das Datum eines neuen Events: derselbe Wochentag wie beim letzten Event, der nächste freie Termin.
 * Ohne früheres Event: heute. Nur ein Startwert der Auswahl – das Datum wählt immer der Veranstalter.
 */
export function suggestedDate(last: Pick<OrganizerEvent, 'startsAt'> | null, now: number = Date.now()): string {
  const day = 86_400_000;
  const toUtc = (text: string) => { const [date, month, year] = text.split('.').map(Number); return Date.UTC(year, month - 1, date); };
  const pad = (value: number) => String(value).padStart(2, '0');
  const today = toUtc(formatBerlinInput(new Date(now)).date);
  let next = last ? toUtc(formatBerlinInput(last.startsAt).date) + 7 * day : today;
  while (next < today) next += 7 * day;
  const date = new Date(next);
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}
