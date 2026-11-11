// Schritt 0 aus docs/TICKETMASTER_IMPORT.md: einmalige, rein lesende Machbarkeitsprüfung.
// Nur GET-Anfragen an die Ticketmaster Discovery API, keine Supabase-Aufrufe, keine Schreibzugriffe.
// Speichert ausschließlich zusammengefasste Zahlen, keine Eventdaten und nie den API-Schlüssel.
// Aufruf: node scripts/probe-ticketmaster-readonly.cjs
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const keyFile = path.join(root, '.env.ticketmaster.local');
const reportFile = path.join(root, 'supabase/.temp/ticketmaster-probe.json');
const API = 'https://app.ticketmaster.com/discovery/v2/events.json';
const PAGE_SIZE = 200;
const MAX_PAGES = 5; // size * page muss unter 1000 bleiben
const DAYS = 30;

const AREAS = [
  { name: 'Deutschland', params: { countryCode: 'DE' } },
  { name: 'Karlsruhe 30 km', lat: 49.0069, lon: 8.4037, radius: 30 },
  { name: 'Berlin 30 km', lat: 52.52, lon: 13.405, radius: 30 },
];

function readKey() {
  if (!fs.existsSync(keyFile)) throw new Error('.env.ticketmaster.local fehlt.');
  const line = fs.readFileSync(keyFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('TICKETMASTER_API_KEY='));
  const key = line ? line.slice('TICKETMASTER_API_KEY='.length).trim() : '';
  if (!/^[A-Za-z0-9]{16,64}$/.test(key)) throw new Error('Kein gültiger Schlüssel in .env.ticketmaster.local eingetragen.');
  return key;
}

// Geohash-Kodierung (Standardalgorithmus) für den Parameter geoPoint.
function geohash(lat, lon, precision = 7) {
  const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latR = [-90, 90], lonR = [-180, 180], even = true, bit = 0, ch = 0, out = '';
  while (out.length < precision) {
    const range = even ? lonR : latR, value = even ? lon : lat, mid = (range[0] + range[1]) / 2;
    if (value >= mid) { ch = (ch << 1) | 1; range[0] = mid; } else { ch <<= 1; range[1] = mid; }
    even = !even;
    if (++bit === 5) { out += chars[ch]; bit = 0; ch = 0; }
  }
  return out;
}

const isoSeconds = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bump = (map, k) => { const key = k || '(leer)'; map[key] = (map[key] || 0) + 1; };
const top = (map, n = 15) => Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n));

async function fetchPage(key, area, page) {
  const url = new URL(API);
  const start = new Date(), end = new Date(Date.now() + DAYS * 864e5);
  const params = {
    segmentName: 'Music', sort: 'date,asc', size: String(PAGE_SIZE), page: String(page), locale: '*',
    startDateTime: isoSeconds(start), endDateTime: isoSeconds(end), ...(area.params || {}),
  };
  if (area.lat != null) Object.assign(params, { geoPoint: geohash(area.lat, area.lon), radius: String(area.radius), unit: 'km', countryCode: 'DE' });
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('apikey', key);
  const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15000) });
  const quota = { limit: r.headers.get('rate-limit'), available: r.headers.get('rate-limit-available') };
  if (!r.ok) {
    // Fehlertext ohne Schlüssel weitergeben.
    const body = (await r.text()).replaceAll(key, '***').slice(0, 300);
    throw new Error(`HTTP ${r.status} für ${area.name}, Seite ${page}: ${body}`);
  }
  return { json: await r.json(), quota };
}

function analyse(events, stats) {
  for (const e of events) {
    stats.sampled++;
    const s = e.dates?.start || {};
    if (s.dateTime && !s.dateTBA && !s.timeTBA && !s.noSpecificTime) stats.with_exact_start++;
    if (e.dates?.end?.dateTime) stats.with_end_time++;
    bump(stats.status, e.dates?.status?.code);
    const c = (e.classifications || []).find((x) => x.primary) || (e.classifications || [])[0] || {};
    bump(stats.genres, c.genre?.name);
    bump(stats.subgenres, c.subGenre?.name);
    if ((e.images || []).some((i) => i.ratio === '16_9' && i.width >= 640)) stats.with_large_16_9_image++;
    const v = e._embedded?.venues?.[0];
    if (v?.location?.latitude && v?.location?.longitude) stats.with_venue_coordinates++;
    bump(stats.cities, v?.city?.name);
    try { bump(stats.ticket_hosts, new URL(e.url).hostname); } catch { bump(stats.ticket_hosts, '(ungültig)'); }
  }
}

async function main() {
  if (fs.existsSync(reportFile)) throw new Error(`Bericht existiert schon (${path.relative(root, reportFile)}). Zum Wiederholen erst löschen.`);
  const key = readKey();
  const report = { run_at: new Date().toISOString(), days: DAYS, segment: 'Music', areas: [] };
  let lastQuota = null;
  for (const area of AREAS) {
    const stats = { area: area.name, total_reported: null, sampled: 0, with_exact_start: 0, with_end_time: 0,
      with_large_16_9_image: 0, with_venue_coordinates: 0, status: {}, genres: {}, subgenres: {}, cities: {}, ticket_hosts: {} };
    for (let page = 0; page < MAX_PAGES; page++) {
      const { json, quota } = await fetchPage(key, area, page);
      lastQuota = quota;
      stats.total_reported = json.page?.totalElements ?? 0;
      const events = json._embedded?.events || [];
      analyse(events, stats);
      if (page + 1 >= (json.page?.totalPages ?? 0) || events.length < PAGE_SIZE) break;
      await sleep(300); // unter 5 Anfragen pro Sekunde bleiben
    }
    for (const k of ['status', 'genres', 'subgenres', 'cities', 'ticket_hosts']) stats[k] = top(stats[k]);
    report.areas.push(stats);
    await sleep(300);
  }
  report.quota_after = lastQuota;
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nZusammenfassung gespeichert: ${path.relative(root, reportFile)}`);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
