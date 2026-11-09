import type { SpotEvent } from '../types/events';

export type Coordinate = { latitude: number; longitude: number };

export function dayKey(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-');
}

export function partyWindowKey(now: Date = new Date()) {
  const today = dayKey(now);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (hour >= 5) return today;
  const [year, month, day] = today.split('-').map(Number);
  const previousDay = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  return `${today}|${previousDay}`;
}

export function happensToday(event: SpotEvent, window = partyWindowKey()) {
  return window.split('|').includes(dayKey(new Date(event.startsAt)));
}

export function distanceKm(a: Coordinate, b: Coordinate) {
  const radians = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function matchesEventPeriod(event: SpotEvent, period: string, today: string) {
  const date = dayKey(new Date(event.startsAt));
  const calendarDate = new Date(`${date}T12:00:00Z`);
  const weekday = calendarDate.getUTCDay();
  if (period === 'today') return date === today;
  if (period === 'friday') return weekday === 5;
  if (period === 'saturday') return weekday === 6;
  if (period === 'nextWeek') {
    const anchor = new Date(`${today}T12:00:00Z`);
    const daysUntilMonday = 7 - ((anchor.getUTCDay() + 6) % 7);
    anchor.setUTCDate(anchor.getUTCDate() + daysUntilMonday);
    const start = anchor.toISOString().slice(0, 10);
    anchor.setUTCDate(anchor.getUTCDate() + 7);
    return date >= start && date < anchor.toISOString().slice(0, 10);
  }
  return true;
}
