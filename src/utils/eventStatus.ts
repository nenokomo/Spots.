import type { SpotEvent } from '../types/events';
import { dayKey } from './events';

/** Without a confirmed end, an event is treated as running for at most this long after its start. */
export const ASSUMED_DURATION_MS = 8 * 60 * 60 * 1000;
/** Nights end in the morning: until 05:00 Berlin time the previous evening still counts as "tonight". */
const NIGHT_ENDS_HOUR = 5;

export type EventPhase = 'live' | 'started' | 'today' | 'tomorrow' | 'upcoming' | 'ended';
type Timing = Pick<SpotEvent, 'startsAt' | 'endsAt'>;

function berlinHour(date: Date) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(date));
}

function addDays(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Calendar day of the current night in Berlin. 02:00 on Sunday still belongs to Saturday night. */
export function nightKey(now: number) {
  const date = new Date(now);
  const key = dayKey(date);
  return berlinHour(date) < NIGHT_ENDS_HOUR ? addDays(key, -1) : key;
}

/**
 * Single source of truth for an event's state relative to `now`.
 * Uses absolute timestamps, so 23:00–04:00 stays live across midnight.
 * - live: confirmed start <= now < confirmed end
 * - started: started, no confirmed end, still within the assumed duration
 * - ended: past its end (or the assumed duration without an end)
 * - today / tomorrow / upcoming: not started yet, by Berlin night
 */
export function eventPhase(event: Timing, now: number = Date.now()): EventPhase {
  const start = Date.parse(event.startsAt);
  const end = event.endsAt ? Date.parse(event.endsAt) : NaN;
  if (!Number.isFinite(start)) return 'upcoming';
  if (start <= now) {
    if (Number.isFinite(end) && end > start) return now < end ? 'live' : 'ended';
    return now - start < ASSUMED_DURATION_MS ? 'started' : 'ended';
  }
  const night = nightKey(now);
  const startDay = dayKey(new Date(start));
  // An event at 01:00 belongs to the night that started the evening before.
  const startNight = berlinHour(new Date(start)) < NIGHT_ENDS_HOUR ? addDays(startDay, -1) : startDay;
  if (startNight === night) return 'today';
  if (startNight === addDays(night, 1)) return 'tomorrow';
  return 'upcoming';
}

export const phaseLabel: Record<EventPhase, string> = {
  live: 'Läuft jetzt',
  started: 'Hat begonnen',
  today: 'Heute',
  tomorrow: 'Morgen',
  upcoming: 'Demnächst',
  ended: 'Vorbei',
};

/** Happening tonight: running now or starting later in the current night. */
export function isTonight(event: Timing, now: number = Date.now()) {
  const phase = eventPhase(event, now);
  return phase === 'live' || phase === 'started' || phase === 'today';
}

export function isEnded(event: Timing, now: number = Date.now()) {
  return eventPhase(event, now) === 'ended';
}
