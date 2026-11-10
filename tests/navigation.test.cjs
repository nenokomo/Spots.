const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === 'react-native-url-polyfill/auto') return {};
  return originalLoad.call(this, id, parent, isMain);
};
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
require.extensions['.jpg'] = (module) => { module.exports = 1; };
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://spots-test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_fixture';

const { eventPhase, isTonight, nightKey } = require('../src/utils/eventStatus.ts');
const { eventHref } = require('../src/navigation/eventRoutes.ts');
const { mapEventRow } = require('../src/services/eventAdapter.ts');

const ORGANIZER = '0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b';
const at = (iso) => Date.parse(iso);
// 23:00–04:00 Berlin on 14/15 November 2026 (UTC+1).
const night = { id: 'e1', startsAt: '2026-11-14T22:00:00Z', endsAt: '2026-11-15T03:00:00Z', organizerId: ORGANIZER };

test('a party from 23:00 to 04:00 stays live across midnight and ends at 04:00', () => {
  assert.equal(eventPhase(night, at('2026-11-14T20:00:00Z')), 'today');
  assert.equal(eventPhase(night, at('2026-11-14T22:30:00Z')), 'live');
  assert.equal(eventPhase(night, at('2026-11-14T23:00:00Z')), 'live', 'midnight in Berlin');
  assert.equal(eventPhase(night, at('2026-11-15T02:59:00Z')), 'live');
  assert.equal(eventPhase(night, at('2026-11-15T03:00:00Z')), 'ended');
});

test('night boundaries: 01:00 starts belong to the evening before; events without end are not live forever', () => {
  assert.equal(nightKey(at('2026-11-15T01:30:00Z')), '2026-11-14', '02:30 Berlin is still Saturday night');
  assert.equal(nightKey(at('2026-11-15T05:00:00Z')), '2026-11-15');
  const afterMidnight = { startsAt: '2026-11-15T00:00:00Z', endsAt: null };
  assert.equal(eventPhase(afterMidnight, at('2026-11-14T19:00:00Z')), 'today', '01:00 start counts as tonight');
  assert.equal(eventPhase({ startsAt: '2026-11-15T19:00:00Z' }, at('2026-11-14T19:00:00Z')), 'tomorrow');
  assert.equal(eventPhase({ startsAt: '2026-11-20T19:00:00Z' }, at('2026-11-14T19:00:00Z')), 'upcoming');
  const open = { startsAt: '2026-11-14T22:00:00Z', endsAt: null };
  assert.equal(eventPhase(open, at('2026-11-14T23:00:00Z')), 'started');
  assert.equal(eventPhase(open, at('2026-11-15T07:00:00Z')), 'ended');
});

test('discover opens the organizer for future events, the detail page for tonight and for imports', () => {
  const now = at('2026-11-10T18:00:00Z');
  assert.deepEqual(eventHref(night, 'discover', now), { pathname: '/organizer/[id]', params: { id: ORGANIZER, event: 'e1' } });
  assert.deepEqual(eventHref(night, 'discover', at('2026-11-14T19:00:00Z')), { pathname: '/event/[id]', params: { id: 'e1' } }, 'tonight → detail');
  assert.deepEqual(eventHref(night, 'discover', at('2026-11-14T23:30:00Z')), { pathname: '/event/[id]', params: { id: 'e1' } }, 'live → detail');
  assert.deepEqual(eventHref({ ...night, organizerId: null }, 'discover', now), { pathname: '/event/[id]', params: { id: 'e1' } }, 'no verified organizer → detail');
  for (const entry of ['radar', 'saved', 'link', 'organizer']) {
    assert.deepEqual(eventHref(night, entry, now), { pathname: '/event/[id]', params: { id: 'e1' } }, `${entry} always opens the event`);
  }
  assert.equal(isTonight(night, at('2026-11-15T02:00:00Z')), true);
});

test('source category spellings map to filters; organizer IDs must be UUIDs', () => {
  const base = { id: '8fd319ee-d7c6-4ae5-a3d7-6678cb301bc0', title: 'Fixture', publication: true, status: 'scheduled', startsAt: '2026-11-03T22:00:00+01:00' };
  assert.deepEqual(mapEventRow({ ...base, category: 'club' }).categories, ['Clubs']);
  assert.deepEqual(mapEventRow({ ...base, category: 'CLUBS' }).categories, ['Clubs']);
  assert.deepEqual(mapEventRow({ ...base, category: 'festival' }).categories, [], 'no guessing beyond exact synonyms');
  assert.equal(mapEventRow({ ...base, organizerId: ORGANIZER }).organizerId, ORGANIZER);
  assert.equal(mapEventRow({ ...base, organizerId: 'not-a-uuid' }).organizerId, null);
  assert.equal(mapEventRow(base).organizerId, null);
});

test('events load without organizer_id where SQL 15 is missing, and remember that per session', async () => {
  const { fetchUpcomingEvents, fetchLiveEvents, fetchOrganizerEvents } = require('../src/services/events.ts');
  const originalFetch = global.fetch;
  const selects = [];
  global.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url ?? input.toString());
    const select = url.searchParams.get('select');
    selects.push(select);
    if (select.includes('organizer_id') || url.searchParams.has('organizer_id')) {
      return new Response(JSON.stringify({ code: '42703', message: 'column events.organizer_id does not exist' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const signal = new AbortController().signal;
    // Radar and Explore start in parallel: both optimistic requests fail, both must fall back.
    assert.deepEqual(await Promise.all([fetchUpcomingEvents(signal), fetchLiveEvents(signal)]), [[], []]);
    assert.equal(selects.length, 4, 'two failed optimistic requests, two fallbacks');
    assert.equal(selects.filter((select) => select.includes('organizer_id')).length, 2);
    await fetchUpcomingEvents(signal);
    assert.equal(selects.length, 5, 'no repeated failing request');
    assert.deepEqual(await fetchOrganizerEvents(ORGANIZER, signal), []);
    assert.equal(selects.length, 5, 'organizer events are skipped without the relation');
  } finally { global.fetch = originalFetch; }
});
