import { getSupabase } from '../lib/supabase';
import { isLiveEvent, isUpcomingEvent, type SpotEvent } from '../types/events';
import { mapEventRow } from './eventAdapter';
import { eventColumns as columns, eventProjection, publishedValue } from './eventSchema';

const pageSize = 200;

function publishedQuery() {
  return getSupabase().from('events').select(eventProjection)
    .eq(columns.publication, publishedValue).eq(columns.status, 'scheduled');
}

type EventQuery = ReturnType<typeof publishedQuery>;

function queryError(code: string) {
  if (code === '42703' || code.startsWith('PGRST2')) return new Error('Die Event-Spalten passen noch nicht zur App. Bitte das Schema von public.events mit der Spaltenzuordnung in src/services/eventSchema.ts abgleichen.');
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return new Error('Kein Lesezugriff auf Events. Bitte Publishable Key, SELECT-Berechtigung und RLS-Regeln in Supabase prüfen.');
  return new Error('Events konnten nicht geladen werden. Bitte Internetverbindung und Supabase-Konfiguration prüfen.');
}

async function fetchPages(build: () => EventQuery, signal: AbortSignal) {
  const events: SpotEvent[] = [];
  const seen = new Set<string>();
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await build().order(columns.startsAt).order(columns.id)
      .range(offset, offset + pageSize - 1).abortSignal(signal);
    if (error) throw queryError(error.code);
    const rows: unknown[] = data ?? [];
    for (const row of rows) {
      const event = mapEventRow(row);
      if (!event) throw new Error('Ein Event enthält ungültige Pflichtangaben. Bitte Spaltenzuordnung, Titel und Startzeiten mit Zeitzone prüfen.');
      if (!seen.has(event.id)) { events.push(event); seen.add(event.id); }
    }
    if (rows.length < pageSize) return events;
  }
}

export async function fetchUpcomingEvents(signal: AbortSignal) {
  const now = new Date().toISOString();
  const events = await fetchPages(() => publishedQuery().gt(columns.startsAt, now), signal);
  return events.filter((event) => isUpcomingEvent(event));
}

export async function fetchLiveEvents(signal: AbortSignal) {
  const now = new Date().toISOString();
  const events = await fetchPages(() => publishedQuery().lte(columns.startsAt, now).gt(columns.endsAt, now)
    .gte(columns.latitude, -90).lte(columns.latitude, 90)
    .gte(columns.longitude, -180).lte(columns.longitude, 180), signal);
  // Also validate client-side, including end > start and numeric GPS bounds.
  return events.filter((event) => isLiveEvent(event));
}

export function fetchEvent(id: string, signal: AbortSignal) {
  // public.events uses UUIDs. Old demo ids never reach the UUID column.
  if (!isDatabaseId(id)) return Promise.resolve([]);
  return fetchPages(() => publishedQuery().eq(columns.id, id), signal);
}

function isDatabaseId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function fetchSavedEvents(ids: string[], signal: AbortSignal) {
  const validIds = [...new Set(ids.filter(isDatabaseId))];
  const events: SpotEvent[] = [];
  // Batches keep large local saved lists below URL length limits.
  for (let offset = 0; offset < validIds.length; offset += 50) {
    const batch = validIds.slice(offset, offset + 50);
    events.push(...await fetchPages(() => publishedQuery().in(columns.id, batch), signal));
  }
  return events;
}
