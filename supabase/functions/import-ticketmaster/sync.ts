// Ticketmaster Discovery API v2 (gelesen 11.11.2026): 5.000 Aufrufe/Tag, 5/Sekunde,
// pro Suche nur size * page < 1000. Siehe docs/TICKETMASTER_IMPORT.md.
const SEARCH = "https://app.ticketmaster.com/discovery/v2/events.json";
const DETAIL = "https://app.ticketmaster.com/discovery/v2/events/";
export const PAGE_SIZE = 200;
const DEPTH_LIMIT = 1000;
const WINDOW_DAYS = 7;
const HORIZON_DAYS = 30;
const LOOKBACK_HOURS = 12; // laufende Events, die schon begonnen haben
const MAX_EVENTS = 5000;
const MAX_RECHECKS = 200;
const DAY_MS = 86_400_000;

export class SyncError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

type ObjectValue = Record<string, unknown>;
const isObject = (value: unknown): value is ObjectValue =>
  !!value && typeof value === "object" && !Array.isArray(value);

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinate(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

const ALLOWED_HOST = /^([a-z0-9-]+\.)*(ticketmaster\.[a-z]{2,3}(\.[a-z]{2})?|universe\.com)$/;
function ticketUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return ALLOWED_HOST.test(url.hostname) ? url.href : null;
  } catch { return null; }
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Größtes 16:9-Bild ab 640 px Breite, sonst das größte https-Bild. Bilder bleiben bei Ticketmaster. */
function pickImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const candidates = images.filter(isObject)
    .map((image) => ({ url: httpsUrl(image.url), ratio: image.ratio, width: Number(image.width) || 0 }))
    .filter((image) => image.url);
  const wide = candidates.filter((image) => image.ratio === "16_9" && image.width >= 640);
  const pool = wide.length ? wide : candidates;
  pool.sort((a, b) => b.width - a.width);
  return pool[0]?.url ?? null;
}

// Feste Zuordnung, keine Rateerei: Unbekanntes bleibt leer.
const GENRES: Record<string, string> = {
  "Hip-Hop/Rap": "Hip-Hop", Rock: "Rock", Pop: "Pop", Alternative: "Alternative", Metal: "Metal",
  Jazz: "Jazz", Blues: "Blues", Classical: "Classical", Folk: "Folk", Country: "Country",
  "R&B": "R&B", Reggae: "Reggae", World: "World", Latin: "Latin", Punk: "Punk",
  "Dance/Electronic": "Electronic",
};
const ELECTRONIC: Record<string, string> = {
  Techno: "Techno", House: "House", Trance: "Trance", "Drum & Bass": "Drum & Bass", Dubstep: "Dubstep",
};

function genreOf(classifications: unknown): { genre: string | null; music: boolean } {
  if (!Array.isArray(classifications) || !classifications.length) return { genre: null, music: false };
  const list = classifications.filter(isObject);
  const main = list.find((c) => c.primary === true) ?? list[0];
  if (!main) return { genre: null, music: false };
  const name = (value: unknown) => (isObject(value) && typeof value.name === "string" ? value.name : null);
  const music = name(main.segment) === "Music";
  const genre = name(main.genre);
  const sub = name(main.subGenre);
  if (genre === "Dance/Electronic" && sub && ELECTRONIC[sub]) return { genre: ELECTRONIC[sub], music };
  return { genre: genre ? GENRES[genre] ?? null : null, music };
}

const STATUS: Record<string, "scheduled" | "cancelled" | "postponed"> = {
  onsale: "scheduled", offsale: "scheduled", rescheduled: "scheduled",
  canceled: "cancelled", cancelled: "cancelled", postponed: "postponed",
};

export type TicketmasterRow = {
  source: "ticketmaster"; source_event_id: string; source_url: string; ticket_url: string;
  title: string; venue_name: string | null; city: string | null; genre: string | null;
  category: "concert"; starts_at: string; ends_at: string | null;
  latitude: number | null; longitude: number | null; image_url: string | null;
  status: "scheduled" | "cancelled" | "postponed";
};
export type MapResult = { row: TicketmasterRow } | { skip: string };

export function mapEvent(value: unknown): MapResult {
  if (!isObject(value)) return { skip: "invalid_record" };
  const id = typeof value.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value.id) ? value.id : null;
  if (!id) return { skip: "invalid_id" };
  if (value.test === true) return { skip: "test_event" };
  const title = text(value.name, 300);
  if (!title) return { skip: "missing_title" };
  const { genre, music } = genreOf(value.classifications);
  if (!music) return { skip: "not_music" };
  const dates = isObject(value.dates) ? value.dates : {};
  const start = isObject(dates.start) ? dates.start : {};
  // Ohne genaue Startzeit kein Import: keine geratenen Uhrzeiten.
  if (start.dateTBA === true || start.dateTBD === true || start.timeTBA === true || start.noSpecificTime === true) {
    return { skip: "no_exact_start" };
  }
  const startsAt = timestamp(start.dateTime);
  if (startsAt === null) return { skip: "no_exact_start" };
  const end = isObject(dates.end) ? dates.end : {};
  const endTime = end.approximate === true || end.noSpecificTime === true ? null : timestamp(end.dateTime);
  const endsAt = endTime !== null && endTime > startsAt ? endTime : null;
  const code = isObject(dates.status) && typeof dates.status.code === "string" ? dates.status.code.toLowerCase() : "";
  const status = STATUS[code];
  if (!status) return { skip: "unknown_status" };
  const url = ticketUrl(value.url);
  if (!url) return { skip: "foreign_ticket_host" };
  const embedded = isObject(value._embedded) ? value._embedded : {};
  const venue = Array.isArray(embedded.venues) && isObject(embedded.venues[0]) ? embedded.venues[0] : {};
  const location = isObject(venue.location) ? venue.location : {};
  const latitude = coordinate(location.latitude, -90, 90);
  const longitude = coordinate(location.longitude, -180, 180);
  return { row: {
    source: "ticketmaster", source_event_id: id, source_url: url, ticket_url: url, title,
    venue_name: text(venue.name, 200), city: isObject(venue.city) ? text(venue.city.name, 120) : null,
    genre, category: "concert",
    starts_at: new Date(startsAt).toISOString(),
    ends_at: endsAt === null ? null : new Date(endsAt).toISOString(),
    latitude: latitude !== null && longitude !== null ? latitude : null,
    longitude: latitude !== null && longitude !== null ? longitude : null,
    image_url: pickImage(value.images), status,
  } };
}

const apiTime = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

type Options = {
  apiKey: string; fetcher?: typeof fetch; now?: () => number;
  sleep?: (ms: number) => Promise<void>; gapMs?: number; timeoutMs?: number; budgetMs?: number;
};

export async function synchronize(knownIds: unknown[], options: Options) {
  if (typeof options.apiKey !== "string" || !/^[A-Za-z0-9]{16,64}$/.test(options.apiKey)) {
    throw new SyncError("source_not_configured", 503);
  }
  const fetcher = options.fetcher ?? fetch;
  const clock = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const gap = options.gapMs ?? 250; // unter 5 Anfragen pro Sekunde
  const deadline = clock() + (options.budgetMs ?? 100_000);
  const known = new Set<string>();
  for (const id of knownIds) {
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new SyncError("invalid_known_id", 500);
    known.add(id);
  }
  let requests = 0;

  // Fehlermeldungen enthalten nie URL, Schlüssel, Header oder Antworttexte.
  async function get(url: URL, allowMissing = false): Promise<ObjectValue | null> {
    const remaining = deadline - clock();
    if (remaining <= 0) throw new SyncError("sync_deadline_exceeded", 504);
    if (requests > 0) await sleep(gap);
    requests++;
    url.searchParams.set("apikey", options.apiKey);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new SyncError("source_timeout", 504)); },
        Math.min(options.timeoutMs ?? 10_000, remaining));
    });
    try {
      return await Promise.race([expired, (async () => {
        const response = await fetcher(url, { signal: controller.signal, redirect: "manual",
          headers: { Accept: "application/json" } });
        if (allowMissing && response.status === 404) return null;
        if (response.status === 429) throw new SyncError("source_rate_limited", 503);
        if (!response.ok) throw new SyncError(`source_http_${response.status}`);
        const body = await response.text();
        if (body.length > 8_000_000) throw new SyncError("source_response_too_large");
        let parsed: unknown;
        try { parsed = JSON.parse(body); } catch { throw new SyncError("source_invalid_json"); }
        if (!isObject(parsed)) throw new SyncError("source_invalid_json");
        return parsed;
      })()]);
    } catch (error) {
      throw error instanceof SyncError ? error : new SyncError("source_network_error");
    } finally { clearTimeout(timer); }
  }

  const rows = new Map<string, TicketmasterRow>();
  const skipped: Record<string, number> = {};
  const seen = new Set<string>();
  // Bekannte Events, die zwar gefunden, aber nicht mehr übernehmbar sind, werden ausgeblendet.
  const unconfirmed = new Set<string>();
  const now = clock();
  const from = now - LOOKBACK_HOURS * 3_600_000;
  const until = now + HORIZON_DAYS * DAY_MS;
  let windows = 0;
  for (let windowStart = from; windowStart < until; windowStart += WINDOW_DAYS * DAY_MS) {
    windows++;
    const windowEnd = Math.min(windowStart + WINDOW_DAYS * DAY_MS, until);
    for (let page = 0; ; page++) {
      if ((page + 1) * PAGE_SIZE > DEPTH_LIMIT) throw new SyncError("source_pagination_limit");
      const url = new URL(SEARCH);
      url.search = new URLSearchParams({
        countryCode: "DE", segmentName: "Music", locale: "*", sort: "date,asc",
        size: String(PAGE_SIZE), page: String(page),
        startDateTime: apiTime(windowStart), endDateTime: apiTime(windowEnd),
      }).toString();
      const payload = (await get(url))!;
      const info = isObject(payload.page) ? payload.page : null;
      const total = Number(info?.totalElements);
      const totalPages = Number(info?.totalPages);
      if (!info || !Number.isInteger(total) || total < 0 || !Number.isInteger(totalPages)) {
        throw new SyncError("invalid_source_page");
      }
      // Mehr Treffer, als die API ausliefert: lieber abbrechen als unvollständig schreiben.
      if (total >= DEPTH_LIMIT) throw new SyncError("source_pagination_limit");
      const embedded = isObject(payload._embedded) ? payload._embedded : {};
      const events = Array.isArray(embedded.events) ? embedded.events : [];
      if (events.length > PAGE_SIZE) throw new SyncError("invalid_source_page");
      for (const event of events) {
        const result = mapEvent(event);
        const id = isObject(event) && typeof event.id === "string" ? event.id : null;
        if (id) seen.add(id);
        if ("row" in result) {
          rows.set(result.row.source_event_id, result.row);
          unconfirmed.delete(result.row.source_event_id);
        } else {
          skipped[result.skip] = (skipped[result.skip] ?? 0) + 1;
          if (id && known.has(id) && !rows.has(id)) unconfirmed.add(id);
        }
      }
      if (rows.size > MAX_EVENTS) throw new SyncError("sync_capacity_exceeded", 503);
      if (page + 1 >= totalPages || events.length < PAGE_SIZE) break;
    }
  }

  // Bekannte Events, die in der Suche fehlen, einzeln nachprüfen statt pauschal zu löschen.
  const removed: string[] = [];
  const missing = [...known].filter((id) => !seen.has(id)).sort().slice(0, MAX_RECHECKS);
  for (const id of missing) {
    const detail = await get(new URL(`${DETAIL}${encodeURIComponent(id)}.json?locale=*`), true);
    if (detail === null) { removed.push(id); continue; }
    if (detail.id !== id) throw new SyncError("invalid_source_detail");
    const result = mapEvent(detail);
    if ("row" in result) rows.set(id, result.row);
    else unconfirmed.add(id);
  }

  return { rows: [...rows.values()], removed, unconfirmed: [...unconfirmed].sort(), skipped, windows, requests,
    discovered: seen.size, rechecked: missing.length };
}
