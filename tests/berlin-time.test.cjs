// Eingaben des Admin-Bereichs: Berliner Ortszeit inkl. Sommer-/Winterzeit und Nächte über Mitternacht.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/berlinTime.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: loaded, exports: loaded.exports, Intl, Date, Object, Number });
const { parseBerlinDateTime, parseBerlinEnd } = loaded.exports;
const iso = (value) => (value instanceof Date || (value && typeof value.toISOString === 'function')) ? value.toISOString() : value;

test('Berlin local time becomes the right UTC instant in winter and summer', () => {
  assert.equal(iso(parseBerlinDateTime('24.12.2026', '23:30')), '2026-12-24T22:30:00.000Z');
  assert.equal(iso(parseBerlinDateTime('15.07.2026', '23:00')), '2026-07-15T21:00:00.000Z');
  assert.equal(iso(parseBerlinDateTime('1.3.2027', '9:05')), '2027-03-01T08:05:00.000Z');
  assert.equal(iso(parseBerlinDateTime('25.10.2026', '04:00')), '2026-10-25T03:00:00.000Z', 'after the switch back to winter time');
});

test('invalid dates and times are rejected', () => {
  for (const [date, time] of [['31.02.2026', '22:00'], ['2026-12-24', '22:00'], ['24.12.2026', '24:00'], ['24.12.2026', '22.00'], ['', '']]) {
    assert.equal(parseBerlinDateTime(date, time), null, `${date} ${time}`);
  }
});

test('an end before the start belongs to the next morning', () => {
  const start = parseBerlinDateTime('31.12.2026', '23:00');
  assert.equal(iso(parseBerlinEnd('31.12.2026', start, '05:00')), '2027-01-01T04:00:00.000Z');
  assert.equal(iso(parseBerlinEnd('31.12.2026', start, '23:30')), '2026-12-31T22:30:00.000Z');
  assert.equal(parseBerlinEnd('31.12.2026', start, ''), null);
  assert.equal(parseBerlinEnd('31.12.2026', start, '5 Uhr'), 'invalid');
});
