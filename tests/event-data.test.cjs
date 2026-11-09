const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');

// Node already has URL; only the native polyfill bootstrap needs substitution.
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'react-native-url-polyfill/auto') return {};
  return originalLoad.call(this, id, parent, isMain);
};

// Exercise the actual TypeScript adapter/queries without loading React Native.
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
require.extensions['.jpg'] = (module) => { module.exports = 1; };

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://spots-test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_fixture';

const { mapEventRow, safeExternalUrl } = require('../src/services/eventAdapter.ts');
const { isLiveEvent, isUpcomingEvent } = require('../src/types/events.ts');
const { distanceKm, matchesEventPeriod } = require('../src/utils/events.ts');
const { fetchUpcomingEvents, fetchLiveEvents, fetchEvent, fetchSavedEvents } = require('../src/services/events.ts');

function row(overrides = {}) {
  return {
    id: '8fd319ee-d7c6-4ae5-a3d7-6678cb301bc0', title: 'Test fixture only', publication: true, status: 'scheduled',
    startsAt: '2026-11-03T22:00:00+01:00', endsAt: '2026-11-04T05:00:00+01:00',
    latitude: 49.009, longitude: 8.404, city: 'Karlsruhe', genres: ['Psytrance'],
    ...overrides,
  };
}

test('live requires start <= now < end, including overnight, and valid GPS', () => {
  const event = mapEventRow(row());
  assert.equal(isLiveEvent(event, Date.parse('2026-11-03T20:59:59Z')), false);
  assert.equal(isLiveEvent(event, Date.parse('2026-11-03T21:00:00Z')), true);
  assert.equal(isLiveEvent(event, Date.parse('2026-11-04T01:00:00Z')), true);
  assert.equal(isLiveEvent(event, Date.parse('2026-11-04T04:00:00Z')), false);
  assert.equal(isUpcomingEvent(event, Date.parse('2026-11-03T20:59:59Z')), true);
  assert.equal(isUpcomingEvent(event, Date.parse('2026-11-03T21:00:00Z')), false);
  for (const overrides of [{ endsAt: null }, { endsAt: 'invalid' }, { endsAt: '2026-11-03T19:00:00Z' }, { latitude: null }, { latitude: '' }, { latitude: 91 }, { longitude: -181 }]) {
    assert.equal(isLiveEvent(mapEventRow(row(overrides)), Date.parse('2026-11-03T23:00:00Z')), false);
  }
});

test('adapter rejects unpublished/malformed events and ambiguous timezone timestamps', () => {
  for (const overrides of [{ publication: false }, { publication: 'published' }, { title: '' }, { id: null }, { startsAt: 'tomorrow' }, { startsAt: '2026-11-03T21:00:00' }]) {
    assert.equal(mapEventRow(row(overrides)), null);
  }
  assert.equal(mapEventRow(row({ latitude: '0', longitude: '0' })).coordinate.latitude, 0);
  assert.equal(mapEventRow(row()).imageIsPlaceholder, true);
  assert.deepEqual(mapEventRow(row()).genres, ['Psytrance']);
  assert.deepEqual(mapEventRow(row()).categories, []);
  assert.equal(mapEventRow(row({ category: 'Techno' })).categories[0], 'Techno');
  assert.deepEqual(mapEventRow(row({ genres: 'Psytrance, Goa; Ambient' })).genres, ['Psytrance', 'Goa', 'Ambient']);
});

test('unsafe source, image and ticket URLs never become links', () => {
  for (const value of ['javascript:alert(1)', 'file:///tmp/test', 'https://user:password@example.org', 'not a URL']) assert.equal(safeExternalUrl(value), null);
  const event = mapEventRow(row({ imageUrl: 'javascript:alert(1)', ticketUrl: 'file:///test', sourceUrl: 'https://www.goabase.net/party/example' }));
  assert.equal(event.imageIsPlaceholder, true);
  assert.equal(event.ticketUrl, null);
  assert.match(event.sourceUrl, /^https:\/\/www.goabase.net/);
});

test('cancelled or unconfirmed events are rejected even when still marked published', () => {
  for (const status of ['cancelled', 'canceled', 'Cancelled', 'postponed', 'deleted', 'draft', '', null]) {
    assert.equal(mapEventRow(row({ status, publication: true })), null);
  }
  assert.ok(mapEventRow(row({ status: 'scheduled', publication: true })));
});

test('radius filtering separates Karlsruhe from Berlin without invented distances', () => {
  const center = { latitude: 49.009, longitude: 8.404 };
  assert.equal(distanceKm(center, center), 0);
  assert.ok(distanceKm(center, { latitude: 49.004, longitude: 8.389 }) < 10);
  assert.ok(distanceKm(center, { latitude: 52.52, longitude: 13.405 }) > 500);
});

test('date filters use timestamps and next calendar week, including year rollover', () => {
  assert.equal(matchesEventPeriod(mapEventRow(row({ startsAt: '2026-11-06T22:00:00+01:00' })), 'friday', '2026-11-03'), true);
  assert.equal(matchesEventPeriod(mapEventRow(row({ startsAt: '2026-11-06T23:30:00Z' })), 'saturday', '2026-11-03'), true);
  assert.equal(matchesEventPeriod(mapEventRow(row({ startsAt: '2027-01-04T20:00:00Z' })), 'nextWeek', '2026-12-31'), true);
  assert.equal(matchesEventPeriod(mapEventRow(row({ startsAt: '2027-01-11T20:00:00Z' })), 'nextWeek', '2026-12-31'), false);
});

test('real Supabase SDK builds publication/time/GPS filters; no writes or demo fallback', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
    requests.push({ url, method: init?.method ?? 'GET' });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const signal = new AbortController().signal;
    assert.deepEqual(await fetchUpcomingEvents(signal), []);
    assert.deepEqual(await fetchLiveEvents(signal), []);
    assert.equal(requests[0].url.searchParams.get('is_published'), 'eq.true');
    assert.equal(requests[0].url.searchParams.get('status'), 'eq.scheduled');
    assert.ok(requests[0].url.searchParams.get('select').includes('genres:genre'));
    assert.ok(requests[0].url.searchParams.get('select').includes('publication:is_published'));
    assert.ok(requests[1].url.searchParams.get('select').includes('status:status'));
    assert.match(requests[0].url.searchParams.get('starts_at'), /^gt\./);
    assert.match(requests[1].url.searchParams.get('starts_at'), /^lte\./);
    assert.match(requests[1].url.searchParams.get('ends_at'), /^gt\./);
    assert.deepEqual(requests[1].url.searchParams.getAll('latitude'), ['gte.-90', 'lte.90']);
    assert.deepEqual(requests[1].url.searchParams.getAll('longitude'), ['gte.-180', 'lte.180']);
    await fetchEvent('test-midnight-pulse', signal);
    await fetchEvent('123', signal);
    assert.equal(requests.length, 2);
    await fetchSavedEvents(['test-midnight-pulse', '8fd319ee-d7c6-4ae5-a3d7-6678cb301bc0'], signal);
    await fetchEvent('8fd319ee-d7c6-4ae5-a3d7-6678cb301bc0', signal);
    assert.ok(requests.every((request) => request.url.searchParams.get('status') === 'eq.scheduled'));
    assert.ok(!requests[2].url.searchParams.get('id').includes('test-midnight'));
    assert.ok(requests.every((request) => request.method === 'GET'));
    assert.ok(!requests[0].url.searchParams.get('select').includes('*'));
    assert.ok(!requests[0].url.searchParams.get('select').includes('address'));
  } finally { global.fetch = originalFetch; }
});

test('query failures are visible errors, not empty success or fabricated events', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ code: '42703', message: 'column does not exist' }), { status: 400, headers: { 'content-type': 'application/json' } });
  try {
    await assert.rejects(fetchUpcomingEvents(new AbortController().signal), /Event-Spalten/);
  } finally { global.fetch = originalFetch; }
});
