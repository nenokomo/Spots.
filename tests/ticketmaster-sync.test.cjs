// Ticketmaster-Import ohne Netzwerk: Umwandlung und Abruf gegen eine simulierte API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.join(__dirname, '../supabase/functions/import-ticketmaster/sync.ts');
function load() {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, AbortController,
    setTimeout, clearTimeout }, { filename: 'sync.ts' });
  return module.exports;
}
const { mapEvent, synchronize, SyncError } = load();
const plain = (value) => JSON.parse(JSON.stringify(value)); // Werte aus der Sandbox vergleichbar machen
const KEY = 'FixtureKey0123456789abcdefABCDEF';
const NOW = Date.parse('2030-06-01T12:00:00Z');
const hours = (h) => new Date(NOW + h * 3_600_000).toISOString().replace('.000Z', 'Z');

function tmEvent({ id = 'Fx001', start = {}, end, status = 'onsale', genre = 'Rock', subGenre = 'Pop',
  segment = 'Music', ...rest } = {}) {
  return {
    id, name: '  Fixture   Konzert ', type: 'event', test: false,
    url: `https://www.ticketmaster.de/event/fixture-${id}`,
    dates: { start: { localDate: '2030-06-02', dateTime: hours(30), dateTBA: false, timeTBA: false,
      noSpecificTime: false, ...start }, ...(end ? { end } : {}), status: { code: status } },
    classifications: [{ primary: true, segment: { name: segment }, genre: { name: genre }, subGenre: { name: subGenre } }],
    images: [
      { url: 'https://s1.ticketm.net/dam/a/portrait_3_2.jpg', ratio: '3_2', width: 3000 },
      { url: 'https://s1.ticketm.net/dam/a/tablet_16_9.jpg', ratio: '16_9', width: 1024 },
      { url: 'https://s1.ticketm.net/dam/a/retina_16_9.jpg', ratio: '16_9', width: 2048 },
      { url: 'https://s1.ticketm.net/dam/a/tiny_16_9.jpg', ratio: '16_9', width: 205 },
    ],
    _embedded: { venues: [{ name: 'Fixture Halle', city: { name: 'Berlin' },
      location: { latitude: '52.52', longitude: '13.405' } }] },
    ...rest,
  };
}
const row = (event) => { const result = mapEvent(event); assert.ok('row' in result, JSON.stringify(result)); return result.row; };
const skip = (event) => { const result = mapEvent(event); assert.ok('skip' in result, JSON.stringify(result)); return result.skip; };

test('maps a Ticketmaster event to exactly the Spots fields', () => {
  assert.deepEqual(plain(row(tmEvent())), {
    source: 'ticketmaster', source_event_id: 'Fx001',
    source_url: 'https://www.ticketmaster.de/event/fixture-Fx001',
    ticket_url: 'https://www.ticketmaster.de/event/fixture-Fx001',
    title: 'Fixture Konzert', venue_name: 'Fixture Halle', city: 'Berlin', genre: 'Rock',
    category: 'concert', starts_at: '2030-06-02T18:00:00.000Z', ends_at: null,
    latitude: 52.52, longitude: 13.405,
    image_url: 'https://s1.ticketm.net/dam/a/retina_16_9.jpg', status: 'scheduled',
  });
});

test('status codes: both spellings of cancelled, unknown codes are skipped', () => {
  for (const [code, expected] of [['onsale', 'scheduled'], ['offsale', 'scheduled'], ['rescheduled', 'scheduled'],
    ['canceled', 'cancelled'], ['cancelled', 'cancelled'], ['postponed', 'postponed'], ['OnSale', 'scheduled']]) {
    assert.equal(row(tmEvent({ status: code })).status, expected, code);
  }
  assert.equal(skip(tmEvent({ status: 'moved' })), 'unknown_status');
  assert.equal(skip(tmEvent({ status: '' })), 'unknown_status');
});

test('no guessed times: TBA/TBD/no specific time or missing dateTime are skipped', () => {
  for (const flag of ['dateTBA', 'dateTBD', 'timeTBA', 'noSpecificTime']) {
    assert.equal(skip(tmEvent({ start: { [flag]: true } })), 'no_exact_start', flag);
  }
  assert.equal(skip(tmEvent({ start: { dateTime: undefined } })), 'no_exact_start');
  assert.equal(skip(tmEvent({ start: { dateTime: '2030-06-02' } })), 'no_exact_start');
});

test('end times are only kept when exact and after the start', () => {
  assert.equal(row(tmEvent({ end: { dateTime: hours(33) } })).ends_at, '2030-06-02T21:00:00.000Z');
  assert.equal(row(tmEvent({ end: { dateTime: hours(33), approximate: true } })).ends_at, null);
  assert.equal(row(tmEvent({ end: { dateTime: hours(30) } })).ends_at, null);
  assert.equal(row(tmEvent({ end: { dateTime: hours(29) } })).ends_at, null);
});

test('ticket links: only https Ticketmaster or Universe hosts', () => {
  for (const url of ['https://www.ticketmaster.de/x', 'https://www.universe.com/events/x',
    'https://www.ticketmaster.co.uk/x', 'https://ticketmaster.fr/x']) {
    assert.equal(row(tmEvent({ url })).ticket_url, url);
  }
  for (const url of ['https://www.travelcircus.de/x', 'http://www.ticketmaster.de/x', 'https://ticketmaster.de.evil.example/x',
    'https://user:pw@www.ticketmaster.de/x', 'https://www.ticketmaster.de:8443/x', 'nonsense', undefined]) {
    assert.equal(skip(tmEvent({ url })), 'foreign_ticket_host', String(url));
  }
});

test('genres: fixed mapping, electronic subgenres only when exact, unknown stays empty', () => {
  assert.equal(row(tmEvent({ genre: 'Hip-Hop/Rap', subGenre: 'Hip-Hop/Rap' })).genre, 'Hip-Hop');
  assert.equal(row(tmEvent({ genre: 'Dance/Electronic', subGenre: 'Techno' })).genre, 'Techno');
  assert.equal(row(tmEvent({ genre: 'Dance/Electronic', subGenre: 'House' })).genre, 'House');
  assert.equal(row(tmEvent({ genre: 'Dance/Electronic', subGenre: 'Dance/Electronic' })).genre, 'Electronic');
  assert.equal(row(tmEvent({ genre: 'Classical', subGenre: 'Classical/Vocal' })).genre, 'Classical');
  assert.equal(row(tmEvent({ genre: 'Other', subGenre: 'Other' })).genre, null);
  assert.equal(row(tmEvent({ genre: 'Undefined', subGenre: 'Undefined' })).genre, null);
  assert.equal(skip(tmEvent({ segment: 'Sports' })), 'not_music');
  assert.equal(skip(tmEvent({ classifications: [] })), 'not_music');
});

test('records that are tests, invalid or untitled are skipped', () => {
  assert.equal(skip(tmEvent({ test: true })), 'test_event');
  assert.equal(skip(tmEvent({ id: 'bad id!' })), 'invalid_id');
  assert.equal(skip(tmEvent({ name: '   ' })), 'missing_title');
  assert.equal(skip(null), 'invalid_record');
  assert.equal(skip([]), 'invalid_record');
});

test('images: largest wide image, fallback to the largest https image, none over http', () => {
  assert.equal(row(tmEvent({ images: [{ url: 'https://s1.ticketm.net/p.jpg', ratio: '3_2', width: 640 },
    { url: 'https://s1.ticketm.net/q.jpg', ratio: '4_3', width: 305 }] })).image_url, 'https://s1.ticketm.net/p.jpg');
  assert.equal(row(tmEvent({ images: [{ url: 'http://s1.ticketm.net/p.jpg', ratio: '16_9', width: 2048 }] })).image_url, null);
  assert.equal(row(tmEvent({ images: undefined })).image_url, null);
});

test('coordinates: both or none; venue data optional', () => {
  const broken = row(tmEvent({ _embedded: { venues: [{ name: 'X', location: { latitude: '91', longitude: '13' } }] } }));
  assert.equal(broken.latitude, null);
  assert.equal(broken.longitude, null);
  const none = row(tmEvent({ _embedded: undefined }));
  assert.deepEqual([none.venue_name, none.city, none.latitude], [null, null, null]);
});

// Simulierte Discovery API: filtert nach Zeitfenster und blättert seitenweise.
function upstream(events, { details = new Map(), fail } = {}) {
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push(url.href);
    assert.equal(init.redirect, 'manual');
    assert.equal(url.searchParams.get('apikey'), KEY);
    if (fail) return fail(url);
    if (url.pathname === '/discovery/v2/events.json') {
      const from = Date.parse(url.searchParams.get('startDateTime'));
      const to = Date.parse(url.searchParams.get('endDateTime'));
      const size = Number(url.searchParams.get('size')), page = Number(url.searchParams.get('page'));
      const inWindow = events.filter((e) => { const t = Date.parse(e.dates.start.dateTime); return t >= from && t < to; });
      const slice = inWindow.slice(page * size, (page + 1) * size);
      return new Response(JSON.stringify({
        ...(slice.length ? { _embedded: { events: slice } } : {}),
        page: { size, totalElements: inWindow.length, totalPages: Math.ceil(inWindow.length / size), number: page },
      }), { status: 200 });
    }
    const id = decodeURIComponent(url.pathname.split('/').at(-1).replace(/\.json$/, ''));
    return details.has(id) ? new Response(JSON.stringify(details.get(id)), { status: 200 })
      : new Response('{"errors":[]}', { status: 404 });
  };
  return { requests, fetcher };
}
const options = (extra = {}) => ({ apiKey: KEY, now: () => NOW, sleep: async () => {}, ...extra });

test('searches Germany/Music in weekly windows from 12 hours ago to 30 days ahead', async () => {
  const api = upstream([tmEvent({ id: 'A1' }), tmEvent({ id: 'B2', start: { dateTime: hours(-3) } }),
    tmEvent({ id: 'C3', start: { dateTime: hours(-20) } }), tmEvent({ id: 'D4', start: { dateTime: hours(24 * 29) } })]);
  const gaps = [];
  const result = await synchronize([], options({ fetcher: api.fetcher, sleep: async (ms) => { gaps.push(ms); } }));
  assert.deepEqual(plain(result.rows.map((r) => r.source_event_id).sort()), ['A1', 'B2', 'D4']);
  assert.equal(result.windows, 5);
  assert.equal(result.requests, 5);
  assert.equal(gaps.length, 4, 'pause between requests keeps us under 5 per second');
  const first = new URL(api.requests[0]);
  assert.equal(first.searchParams.get('countryCode'), 'DE');
  assert.equal(first.searchParams.get('segmentName'), 'Music');
  assert.equal(first.searchParams.get('size'), '200');
  assert.equal(first.searchParams.get('startDateTime'), '2030-06-01T00:00:00Z');
  assert.equal(new URL(api.requests.at(-1)).searchParams.get('endDateTime'), '2030-07-01T12:00:00Z');
});

test('pages through a busy window and stops before the 1000-item depth limit', async () => {
  const many = Array.from({ length: 450 }, (_, i) => tmEvent({ id: `P${i}`, start: { dateTime: hours(1 + i / 100) } }));
  const api = upstream(many);
  const result = await synchronize([], options({ fetcher: api.fetcher }));
  assert.equal(result.rows.length, 450);
  assert.equal(result.requests, 3 + 4);
  const tooMany = Array.from({ length: 1000 }, (_, i) => tmEvent({ id: `Q${i}`, start: { dateTime: hours(2) } }));
  await assert.rejects(synchronize([], options({ fetcher: upstream(tooMany).fetcher })), /source_pagination_limit/);
});

test('rate limits, HTTP errors and network failures abort without leaking the key', async () => {
  const cases = [
    [() => new Response('slow down', { status: 429 }), /source_rate_limited/],
    [() => new Response('nope', { status: 500 }), /source_http_500/],
    [() => new Response('<html>', { status: 200 }), /source_invalid_json/],
    [() => new Response('{"page":{}}', { status: 200 }), /invalid_source_page/],
    [() => { throw new Error(`boom apikey=${KEY}`); }, /source_network_error/],
  ];
  for (const [fail, pattern] of cases) {
    const error = await synchronize([], options({ fetcher: upstream([], { fail }).fetcher })).catch((e) => e);
    assert.ok(error instanceof SyncError, String(error));
    assert.match(error.message, pattern);
    assert.ok(!error.message.includes(KEY));
  }
});

test('missing API key or bad known IDs fail before any request', async () => {
  let called = false;
  const fetcher = async () => { called = true; return new Response('{}'); };
  await assert.rejects(synchronize([], { apiKey: '', fetcher }), /source_not_configured/);
  await assert.rejects(synchronize(['ok', 'bad id'], options({ fetcher })), /invalid_known_id/);
  assert.equal(called, false);
});

test('known events missing from the search are checked one by one', async () => {
  const moved = tmEvent({ id: 'K2', start: { dateTime: hours(24 * 60) } });
  const unknown = tmEvent({ id: 'K3', status: 'moved' });
  const api = upstream([tmEvent({ id: 'K4', url: 'https://www.travelcircus.de/k4' }), tmEvent({ id: 'K5' })],
    { details: new Map([['K2', moved], ['K3', unknown]]) });
  const result = await synchronize(['K1', 'K2', 'K3', 'K4', 'K5'], options({ fetcher: api.fetcher }));
  assert.deepEqual(plain(result.removed), ['K1'], '404 means removed at the source');
  assert.deepEqual(plain(result.rows.map((r) => r.source_event_id).sort()), ['K2', 'K5'], 'detail still valid: keep updating');
  assert.deepEqual(plain(result.unconfirmed), ['K3', 'K4'], 'found but no longer importable: hide instead of guessing');
  assert.equal(result.rechecked, 3);
  assert.equal(result.skipped.foreign_ticket_host, 1);
});

test('a detail answer for a different ID is rejected', async () => {
  const api = upstream([], { details: new Map([['K1', tmEvent({ id: 'OTHER' })]]) });
  await assert.rejects(synchronize(['K1'], options({ fetcher: api.fetcher })), /invalid_source_detail/);
});

test('the run budget ends the sync before the deadline', async () => {
  let now = NOW;
  const api = upstream([]);
  const fetcher = async (url, init) => { now += 40_000; return api.fetcher(url, init); };
  await assert.rejects(synchronize([], options({ fetcher, now: () => now, budgetMs: 100_000 })), /sync_deadline_exceeded/);
});
