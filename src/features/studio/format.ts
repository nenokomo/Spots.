import type { OrganizerEvent } from '../organizer/organizerApi';

export const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });
export const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
export const longFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Läuft oder kommt noch (bis zum Ende bzw. 8 Stunden nach Beginn ohne Ende). */
export function isUpcoming(event: Pick<OrganizerEvent, 'startsAt' | 'endsAt'>, now = Date.now()): boolean {
  const end = event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt) + 8 * 3_600_000;
  return end >= now;
}

export function eventState(event: Pick<OrganizerEvent, 'status' | 'isPublished'>): { label: string; tone: 'accent' | 'amber' | 'red' | 'muted' } {
  if (event.status === 'cancelled') return { label: 'Abgesagt', tone: 'red' };
  if (event.status === 'postponed') return { label: 'Verschoben', tone: 'amber' };
  return event.isPublished ? { label: 'Live in Spots', tone: 'accent' } : { label: 'Entwurf', tone: 'muted' };
}
