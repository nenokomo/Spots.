import { eventPhase } from '../../utils/eventStatus';
import { dayKey } from '../../utils/events';
import type { OrganizerEvent } from '../organizer/organizerApi';

export const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });
export const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
export const longFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const count = new Intl.NumberFormat('de-DE');

type Timing = Pick<OrganizerEvent, 'startsAt' | 'endsAt'>;

/** Läuft oder kommt noch (bis zum Ende bzw. 8 Stunden nach Beginn ohne Ende). */
export function isUpcoming(event: Timing, now = Date.now()): boolean {
  const end = event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt) + 8 * 3_600_000;
  return end >= now;
}

export function eventState(event: Pick<OrganizerEvent, 'status' | 'isPublished'>): { label: string; tone: 'accent' | 'amber' | 'red' | 'muted' } {
  if (event.status === 'cancelled') return { label: 'Abgesagt', tone: 'red' };
  if (event.status === 'postponed') return { label: 'Verschoben', tone: 'amber' };
  return event.isPublished ? { label: 'Live in Spots', tone: 'accent' } : { label: 'Entwurf', tone: 'muted' };
}

/** „Sa., 28.11. · 23:00–05:00 Uhr“ */
export function whenLine(event: Timing): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? `–${timeFormat.format(new Date(event.endsAt))}` : '';
  return `${dayFormat.format(start)} · ${timeFormat.format(start)}${end} Uhr`;
}

/** „Club Eins, Karlsruhe“ */
export function placeLine(event: Pick<OrganizerEvent, 'venueName' | 'city'>): string | null {
  return [event.venueName, event.city].filter(Boolean).join(', ') || null;
}

/** Wie weit ist es bis zum Event? `live` = es läuft gerade. */
export function countdown(event: Timing, now = Date.now()): { label: string; live: boolean } {
  const phase = eventPhase(event, now);
  const time = timeFormat.format(new Date(event.startsAt));
  if (phase === 'live' || phase === 'started') return { label: 'Läuft jetzt', live: true };
  if (phase === 'today') return { label: `Heute · ${time} Uhr`, live: false };
  if (phase === 'tomorrow') return { label: `Morgen · ${time} Uhr`, live: false };
  if (phase === 'ended') return { label: 'Vorbei', live: false };
  const days = Math.round((Date.parse(`${dayKey(new Date(event.startsAt))}T12:00:00Z`) - Date.parse(`${dayKey(new Date(now))}T12:00:00Z`)) / 86_400_000);
  return { label: days === 1 ? 'Morgen' : `In ${days} Tagen`, live: false };
}

/** Story posten geht wie in der Datenbank (SQL 33): bis zwei Stunden nach dem Ende, nicht bei abgesagten Events. */
export function canPostStory(event: Pick<OrganizerEvent, 'status' | 'startsAt' | 'endsAt'>, now = Date.now()): boolean {
  const end = event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt) + 8 * 3_600_000;
  return event.status === 'scheduled' && end + 2 * 3_600_000 > now;
}

/** „8 %“ – Anteil ohne Nachkommastellen, unter 1 % als „unter 1 %“. Ohne Basis gibt es keine Quote. */
export function share(part: number, total: number): string | null {
  if (total <= 0) return null;
  const percent = (part / total) * 100;
  if (part > 0 && percent < 1) return 'unter 1 %';
  return `${Math.round(percent)} %`;
}

/**
 * Ein Satz Erkenntnis für die Zahlen eines Events: welcher Anteil der Aufrufe zu den Tickets geführt hat und – wenn es
 * genug andere Events mit Aufrufen gibt – ob das mehr oder weniger ist als sonst. Kein Vergleich ohne belastbare Basis
 * (mindestens zwei andere Events mit je 20 Aufrufen).
 */
export function ticketInsight(views: number, ticketClicks: number, others: { views: number; ticketClicks: number }[] = []): string {
  if (views <= 0) return 'Noch hat niemand dieses Event in Spots gesehen.';
  // Aus einer Handvoll Aufrufen lässt sich nichts ablesen: lieber das sagen als eine Quote aus drei Aufrufen.
  if (views < 10) return views === 1 ? 'Erst 1 Aufruf. Für eine Aussage ist das noch zu wenig.' : `Erst ${count.format(views)} Aufrufe. Für eine Aussage ist das noch zu wenig.`;
  const base = `${share(ticketClicks, views)} der Aufrufe führten zu den Tickets.`;
  const basis = others.filter((row) => row.views >= 20);
  if (basis.length < 2) return base;
  const otherViews = basis.reduce((sum, row) => sum + row.views, 0);
  const otherClicks = basis.reduce((sum, row) => sum + row.ticketClicks, 0);
  const own = ticketClicks / views, usual = otherClicks / otherViews;
  const usualText = share(otherClicks, otherViews);
  if (own > usual * 1.15 && own - usual >= 0.01) return `${base} Das ist mehr als bei euren anderen Events (${usualText}).`;
  if (own < usual * 0.85 && usual - own >= 0.01) return `${base} Das ist weniger als bei euren anderen Events (${usualText}).`;
  return `${base} Das ist etwa so viel wie bei euren anderen Events (${usualText}).`;
}
