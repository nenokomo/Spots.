// Veranstalter-Bereich (App): Adresse aus dem Namen, Zeit-Hilfen fürs Bearbeiten, wann gezählt wird. Ohne Netz.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), vm = require('node:vm'), ts = require('typescript');

function load(file, requireMap = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Intl, Date, Math, require: (name) => {
    if (name in requireMap) return requireMap[name];
    throw new Error(`unexpected import ${name}`);
  } });
  return module.exports;
}

test('slug: readable address from the name, valid for SQL 15, with a fallback suffix', () => {
  const { slugFromName, slugWithSuffix, slugPattern } = load('src/features/organizer/slug.ts');
  assert.equal(slugFromName('Club Eins'), 'club-eins');
  assert.equal(slugFromName('Müller & Söhne Größenwahn'), 'mueller-soehne-groessenwahn');
  assert.equal(slugFromName('  Café Noir!  '), 'cafe-noir');
  assert.equal(slugFromName('!!'), '');
  assert.equal(slugFromName('x'), '');
  const long = slugFromName('a'.repeat(100));
  assert.ok(slugPattern.test(long) && long.length <= 64);
  const suffixed = slugWithSuffix('club-eins', () => 0.5);
  assert.match(suffixed, /^club-eins-[a-z0-9]{4}$/);
  assert.ok(slugPattern.test(slugWithSuffix('', () => 0)));
  assert.ok(slugPattern.test(slugWithSuffix('b'.repeat(64), () => 0.99)));
});

test('berlin time: formatting is the inverse of parsing, summer and winter', () => {
  const { formatBerlinInput, parseBerlinDateTime } = load('src/utils/berlinTime.ts');
  for (const [date, time] of [['24.12.2026', '23:30'], ['01.07.2027', '00:05'], ['29.03.2026', '03:15']]) {
    const parsed = parseBerlinDateTime(date, time);
    assert.deepEqual({ ...formatBerlinInput(parsed) }, { date, time });
  }
  assert.deepEqual({ ...formatBerlinInput('2026-11-15T22:00:00Z') }, { date: '15.11.2026', time: '23:00' });
});

test('stats: only organizer events are counted, never local TEST events; device ids fit SQL 26', () => {
  const sync = load('src/services/savedEventsSync.ts');
  const stats = load('src/services/eventStats.ts', {
    '@react-native-async-storage/async-storage': { default: {} }, '../lib/supabase': { getSupabase: () => ({}) }, './savedEventsSync': sync,
  });
  assert.equal(stats.shouldTrack({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizerId: 'o' }), true);
  assert.equal(stats.shouldTrack({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organizerId: null }), false, 'imports are not counted');
  assert.equal(stats.shouldTrack({ id: 'f0f0f0f0-0000-4000-8000-000000000001', organizerId: 'f0f0f0f0-0000-4000-8000-0000000000a1' }), false);
  assert.equal(stats.shouldTrack(null), false);
  const device = stats.randomDeviceId();
  assert.match(device, /^[a-z0-9]{32}$/);
  assert.match(device, /^[A-Za-z0-9-]{16,64}$/, 'matches the SQL 26 check');
});

test('screens: dashboard never sets is_published on organizers and events stay drafts before approval', () => {
  const api = fs.readFileSync(path.join(__dirname, '../src/features/organizer/organizerApi.ts'), 'utf8');
  const updateBlock = api.slice(api.indexOf('export async function updateOrganizerProfile'), api.indexOf('export async function submitOrganizer'));
  assert.ok(!updateBlock.includes('is_published'), 'profile update must not touch is_published');
  const sheet = fs.readFileSync(path.join(__dirname, '../src/features/organizer/OrganizerEventSheet.tsx'), 'utf8');
  assert.match(sheet, /isPublished: status === 'scheduled' && approved && published/);
  const management = fs.readFileSync(path.join(__dirname, '../src/features/accounts/management.ts'), 'utf8');
  assert.ok(!management.includes("'is_published'"), 'old self-publishing path removed');
});
