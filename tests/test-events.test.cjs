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

const { testEvents, TEST_EVENT_IDS } = require('../src/services/testEvents.ts');
const { isLiveEvent, isUpcomingEvent } = require('../src/types/events.ts');
const { distanceKm } = require('../src/utils/events.ts');

const NOW = Date.parse('2026-11-14T20:10:00Z');

test('test events are never produced outside development', () => {
  assert.equal(typeof __DEV__, 'undefined');
  assert.deepEqual(testEvents(NOW), []);
});

test('five clearly labelled Karlsruhe parties: three running, two starting later tonight', () => {
  const events = testEvents(NOW, true);
  assert.equal(events.length, 5);
  assert.equal(new Set(events.map((event) => event.id)).size, 5);
  for (const event of events) {
    assert.match(event.title, /^TEST · /);
    assert.equal(event.location, 'Karlsruhe');
    assert.equal(event.imageIsPlaceholder, true, 'no invented flyer');
    assert.ok(TEST_EVENT_IDS.has(event.id));
    assert.ok(distanceKm({ latitude: 49.0069, longitude: 8.4037 }, event.coordinate) < 5);
    assert.ok(Date.parse(event.endsAt) > Date.parse(event.startsAt));
  }
  assert.equal(events.filter((event) => isLiveEvent(event, NOW)).length, 3);
  assert.equal(events.filter((event) => isUpcomingEvent(event, NOW)).length, 2);
});
