// Goabase OpenAPI 1.1.1: limit <= 500, offset <= 40 (checked 2026-11-04).
const API = "https://www.goabase.net/api/party/json/";
const MAX_OFFSET = 40;
const MAX_EVENTS = 5000;

type SourceDiagnostic = {
  stage: "feed" | "detail";
  phase: "fetch" | "body" | "json" | "record";
  kind: "http" | "redirect" | "timeout" | "network_or_redirect" | "body_read" | "invalid_json" | "invalid_record" | "response_too_large";
  http_status: number | null;
  offset?: number;
  event_id?: string;
  redirect_target?: "goabase_deleted" | "goabase_other" | "external_or_invalid";
};

export class SyncError extends Error {
  constructor(message: string, public status = 502, public diagnostic?: SourceDiagnostic) { super(message); }
}

type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SyncError("invalid_source_record");
  }
  return value as ObjectValue;
}

function identity(value: unknown): string {
  if (!(typeof value === "string" || (typeof value === "number" && Number.isSafeInteger(value)))) {
    throw new SyncError("invalid_source_id");
  }
  const id = String(value);
  if (!/^[1-9]\d*$/.test(id)) throw new SyncError("invalid_source_id");
  return id;
}

function timestamp(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) {
    throw new SyncError("invalid_source_timestamp");
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new SyncError("invalid_source_timestamp");
  return parsed;
}

function text(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new SyncError("invalid_source_text");
  return value.trim() || null;
}

function coordinate(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function image(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function mapParty(value: unknown, expectedId: string, now: number) {
  const p = object(value);
  const id = identity(p.id);
  const title = text(p.nameParty);
  if (id !== expectedId || !title) throw new SyncError("invalid_source_detail");
  const start = timestamp(p.dateStart);
  const end = p.dateEnd == null || p.dateEnd === "" ? null : timestamp(p.dateEnd);
  if (end !== null && end <= start) throw new SyncError("invalid_source_end");
  const modified = timestamp(p.dateModified);
  const status = text(p.nameStatus)?.toLowerCase();
  let sourceUrl = `https://www.goabase.net/${id}`;
  const canonical = text(p.urlParty);
  if (canonical) {
    let url: URL;
    try { url = new URL(canonical); } catch { throw new SyncError("invalid_source_link"); }
    if (url.origin !== "https://www.goabase.net" || url.username || url.password ||
      url.search || url.hash || url.pathname.split("/").filter(Boolean).at(-1) !== id) {
      throw new SyncError("invalid_source_link");
    }
    sourceUrl = url.href;
  }
  if (status !== "scheduled" && status !== "cancelled" && status !== "postponed") {
    throw new SyncError("unknown_source_status");
  }
  return {
    source: "goabase", source_event_id: id, source_url: sourceUrl,
    title, city: text(p.nameTown), category: "club",
    starts_at: new Date(start).toISOString(),
    ends_at: end === null ? null : new Date(end).toISOString(),
    latitude: coordinate(p.geoLat, -90, 90), longitude: coordinate(p.geoLon, -180, 180),
    image_url: image(p.urlImageSmall), status,
    is_published: status === "scheduled" && (end !== null ? end > now : start >= now),
    source_modified_at: new Date(modified).toISOString(),
  };
}

type Options = {
  fetcher?: typeof fetch; now?: () => number; pageSize?: number;
  timeoutMs?: number; budgetMs?: number;
};

export async function synchronize(knownIds: unknown[], options: Options = {}) {
  const fetcher = options.fetcher ?? fetch;
  const clock = options.now ?? Date.now;
  const deadline = clock() + (options.budgetMs ?? 90000);
  const size = options.pageSize ?? 500;
  if (!Number.isInteger(size) || size < 1 || size > 500) throw new SyncError("invalid_page_size", 500);
  const ids = new Set(knownIds.map(identity));
  if (ids.size > MAX_EVENTS) throw new SyncError("sync_capacity_exceeded", 503);

  async function get(url: URL, stage: "feed" | "detail"): Promise<ObjectValue | null> {
    const remaining = deadline - clock();
    if (remaining <= 0) throw new SyncError("sync_deadline_exceeded", 504);
    const controller = new AbortController();
    // Allowlisted metadata only: never URLs, raw exceptions, headers or response bodies.
    const diagnostic: SourceDiagnostic = { stage, phase: "fetch", kind: "network_or_redirect", http_status: null,
      ...(stage === "feed" ? { offset: Number(url.searchParams.get("offset")) } : { event_id: url.pathname.split("/").at(-1)! }) };
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Also bounds body reads and fetch implementations ignoring abort.
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new SyncError("source_timeout", 504));
      }, Math.min(options.timeoutMs ?? 8000, remaining));
    });
    try {
      return await Promise.race([expired, (async () => {
        // Inspect but never follow redirects, preserving the existing fail-closed policy.
        const response = await fetcher(url, { signal: controller.signal, redirect: "manual",
          headers: { Accept: "application/json" } });
        diagnostic.http_status = response.status;
        if (response.status >= 300 && response.status < 400) {
          diagnostic.kind = "redirect";
          diagnostic.redirect_target = "external_or_invalid";
          try {
            const location = response.headers.get("location");
            if (location) {
              const target = new URL(location, url);
              if (target.origin === "https://www.goabase.net" && !target.username && !target.password && !target.search && !target.hash) {
                diagnostic.redirect_target = stage === "detail" && [301, 302, 303, 307, 308].includes(response.status) &&
                  target.pathname === `/party/deleted/${diagnostic.event_id}` &&
                  !location.includes("\\") && !/[%?#]|\/\.\.?\//.test(location)
                  ? "goabase_deleted" : "goabase_other";
              }
            }
          } catch { /* Only the classification is retained. */ }
          if (diagnostic.redirect_target === "goabase_deleted") return null;
          throw new SyncError(`source_http_${response.status}`);
        }
        diagnostic.kind = "http";
        if (!response.ok) throw new SyncError(`source_http_${response.status}`);
        diagnostic.phase = "body";
        diagnostic.kind = "body_read";
        const body = await response.text();
        if (body.length > 8_000_000) {
          diagnostic.kind = "response_too_large";
          throw new SyncError("source_response_too_large");
        }
        diagnostic.phase = "json";
        diagnostic.kind = "invalid_json";
        const parsed: unknown = JSON.parse(body);
        diagnostic.phase = "record";
        diagnostic.kind = "invalid_record";
        return object(parsed);
      })()]);
    } catch (error) {
      const failure = error instanceof SyncError ? error : new SyncError("source_network_or_json_error");
      if (failure.message === "source_timeout") diagnostic.kind = "timeout";
      failure.diagnostic = { ...diagnostic };
      throw failure;
    } finally { clearTimeout(timer); }
  }

  const discovered = new Set<string>();
  let offset = 0;
  while (true) {
    const url = new URL(API);
    url.search = new URLSearchParams({ country: "DE", eventtype: "club",
      limit: String(size), offset: String(offset) }).toString();
    const payload = await get(url, "feed");
    if (!payload || !Array.isArray(payload.partylist) || payload.partylist.length > size) {
      throw new SyncError("invalid_source_page");
    }
    let added = 0;
    for (const entry of payload.partylist) {
      const id = identity(object(entry).id);
      if (!discovered.has(id)) added++;
      discovered.add(id);
      ids.add(id);
    }
    if (ids.size > MAX_EVENTS) throw new SyncError("sync_capacity_exceeded", 503);
    if (payload.partylist.length < size) break;
    if (!added) throw new SyncError("source_pagination_stalled");
    if (offset === MAX_OFFSET) throw new SyncError("source_pagination_limit");
    // Last documented offset may overlap the first page; IDs are deduplicated.
    offset = Math.min(offset + size, MAX_OFFSET);
  }

  const pending = [...ids];
  const rows: ReturnType<typeof mapParty>[] = [];
  const removed: string[] = [];
  const unconfirmed: { source_event_id: string; source_modified_at: string; reason: "missing" | "moved" | "unrecognized" }[] = [];
  // Recheck every stored ID, even past/cancelled events. No writes until all succeed.
  let failure: unknown;
  const workers = Array.from({ length: Math.min(3, pending.length) }, async () => {
    while (pending.length && !failure) {
      const id = pending.shift()!;
      try {
        const payload = await get(new URL(id, API), "detail");
        if (payload === null) removed.push(id);
        else {
          try { rows.push(mapParty(payload.party, id, clock())); }
          catch (error) {
            if (!(error instanceof SyncError) || error.message !== "unknown_source_status") throw error;
            // mapParty already validated identity, dates/version, title and canonical link.
            // Never copy an arbitrary upstream status into logs or map it to scheduled.
            const raw = text(object(payload.party).nameStatus)?.toLowerCase();
            unconfirmed.push({ source_event_id: id,
              source_modified_at: new Date(timestamp(object(payload.party).dateModified)).toISOString(),
              reason: raw == null ? "missing" : raw === "moved" ? "moved" : "unrecognized" });
          }
        }
      } catch (error) { failure ??= error; }
    }
  });
  await Promise.all(workers);
  if (failure) throw failure;
  if (clock() >= deadline) throw new SyncError("sync_deadline_exceeded", 504);
  return { rows, removed, unconfirmed, discovered: discovered.size };
}
