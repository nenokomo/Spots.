// Eingaben des Spots-Teams („24.12.2026“, „23:30“) sind Berliner Ortszeit; gespeichert wird UTC.
const berlinParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Berlin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});

function berlinOffsetMs(utc: number) {
  const parts = Object.fromEntries(berlinParts.formatToParts(new Date(utc)).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return asUtc - Math.floor(utc / 60_000) * 60_000;
}

function parseDate(date: string) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  // Fängt auch den 31.02. ab.
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? { day, month, year } : null;
}

function parseTime(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const [hour, minute] = [Number(match[1]), Number(match[2])];
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

function toUtc(year: number, month: number, day: number, hour: number, minute: number) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = naive - berlinOffsetMs(naive);
  return new Date(naive - berlinOffsetMs(first));
}

/** „TT.MM.JJJJ“ und „HH:MM“ in Berliner Zeit → Zeitpunkt, sonst null. */
export function parseBerlinDateTime(date: string, time: string): Date | null {
  const d = parseDate(date);
  const t = parseTime(time);
  return d && t ? toUtc(d.year, d.month, d.day, t.hour, t.minute) : null;
}

/** Ende einer Nacht: liegt die Endzeit vor dem Beginn (23:00 → 05:00), gilt der Folgetag. Leere Eingabe = kein Ende. */
export function parseBerlinEnd(date: string, start: Date, endTime: string): Date | null | 'invalid' {
  if (!endTime.trim()) return null;
  const d = parseDate(date);
  const t = parseTime(endTime);
  if (!d || !t) return 'invalid';
  const sameDay = toUtc(d.year, d.month, d.day, t.hour, t.minute);
  if (sameDay > start) return sameDay;
  return toUtc(d.year, d.month, d.day + 1, t.hour, t.minute);
}
