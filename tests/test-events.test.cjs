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

const { testEvents, testOrganizer, testOrganizerPosts, TEST_EVENT_IDS, TEST_ORGANIZER_ID } = require('../src/services/testEvents.ts');
const { eventHref } = require('../src/navigation/eventRoutes.ts');
const { isLiveEvent, isUpcomingEvent } = require('../src/types/events.ts');
const { distanceKm } = require('../src/utils/events.ts');

const NOW = Date.parse('2026-11-14T20:10:00Z');

test('test events are never produced outside development', () => {
  assert.equal(typeof __DEV__, 'undefined');
  assert.deepEqual(testEvents(NOW), []);
  assert.equal(testOrganizer(TEST_ORGANIZER_ID), null);
});

test('seven clearly labelled Karlsruhe parties: three running, two later tonight, two on later days', () => {
  const events = testEvents(NOW, true);
  assert.equal(events.length, 7);
  assert.equal(new Set(events.map((event) => event.id)).size, 7);
  for (const event of events) {
    assert.match(event.title, /^TEST · /);
    assert.equal(event.location, 'Karlsruhe');
    assert.equal(event.imageIsPlaceholder, true, 'no invented flyer');
    assert.ok(TEST_EVENT_IDS.has(event.id));
    assert.ok(distanceKm({ latitude: 49.0069, longitude: 8.4037 }, event.coordinate) < 5);
    assert.ok(Date.parse(event.endsAt) > Date.parse(event.startsAt));
  }
  assert.equal(events.filter((event) => isLiveEvent(event, NOW)).length, 3);
  assert.equal(events.filter((event) => isUpcomingEvent(event, NOW)).length, 4);
});

test('test organizer: future events open the organizer page from Explore, tonight opens the event', () => {
  const organizer = testOrganizer(TEST_ORGANIZER_ID, true);
  assert.match(organizer.displayName, /^TEST · /);
  assert.equal(testOrganizer('test-club', true).id, TEST_ORGANIZER_ID);
  assert.equal(testOrganizer('someone-else', true), null);
  assert.equal(testOrganizerPosts()[0].organizerId, TEST_ORGANIZER_ID);
  const owned = testEvents(NOW, true).filter((event) => event.organizerId === TEST_ORGANIZER_ID);
  assert.equal(owned.length, 3);
  const routes = owned.map((event) => eventHref(event, 'discover', NOW).pathname);
  assert.deepEqual(routes, ['/event/[id]', '/organizer/[id]', '/organizer/[id]']);
  assert.deepEqual(eventHref(owned[1], 'discover', NOW).params, { id: TEST_ORGANIZER_ID, event: owned[1].id });
});
