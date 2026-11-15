// Veranstalter-Bereich (App): Adresse aus dem Namen, Zeit-Hilfen fürs Bearbeiten, wann gezählt wird. Ohne Netz.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), vm = require('node:vm'), ts = require('typescript');

function load(file, requireMap = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Intl, Date, Math, URL, URLSearchParams, require: (name) => {
    if (name in requireMap) return requireMap[name];
    throw new Error(`unexpected import ${name}`);
  } });
  return module.exports;
}

const club = (overrides = {}) => ({ name: ' Club  Eins ', street: 'Kaiserstraße', houseNumber: '12a', postcode: '76133', city: 'Karlsruhe',
  website: 'club-eins.de', social: '@clubeins', contactName: 'Alex Beispiel', phone: '+49 721 123456', ...overrides });

test('club signup: same rules as SQL 28, friendly link input, clear German errors', () => {
  const { validateOrganizerSignup, normalizeWebsite, normalizeSocial } = load('src/features/organizer/signup.ts');
  const ok = validateOrganizerSignup(club());
  assert.deepEqual(JSON.parse(JSON.stringify(ok.data)), { name: 'Club Eins', street: 'Kaiserstraße', house_number: '12a', postcode: '76133', city: 'Karlsruhe',
    website_url: 'https://club-eins.de', social_url: 'https://www.instagram.com/clubeins', contact_name: 'Alex Beispiel', phone: '+49 721 123456' });
  const optional = validateOrganizerSignup(club({ website: '', social: '  ' }));
  assert.equal(optional.data.website_url, null);
  assert.equal(optional.data.social_url, null);
  assert.equal(normalizeWebsite('http://club.de'), 'invalid', 'only https');
  assert.equal(normalizeWebsite('https://club.de/programm'), 'https://club.de/programm');
  assert.equal(normalizeSocial('https://www.tiktok.com/@club'), 'https://www.tiktok.com/%40club', '@ in the path is allowed, encoded');
  assert.equal(normalizeSocial('tiktok.com/@club'), 'https://tiktok.com/%40club');
  assert.equal(normalizeSocial('https://name:pass@evil.example/x'), 'invalid', 'credentials in links stay forbidden');
  assert.match(normalizeSocial('https://www.tiktok.com/@club'), /^https:\/\/[^\s@]+$/, 'passes the SQL 28 check');
  for (const [field, value, message] of [['name', 'X', /Namen/], ['street', '', /Straße/], ['houseNumber', '', /Hausnummer/], ['postcode', '7613', /Postleitzahl/],
    ['city', ' ', /Stadt/], ['website', 'http://club.de', /Website/], ['social', 'mit leerzeichen', /Social/], ['contactName', 'A', /Ansprechperson/], ['phone', 'abc', /Telefon/]]) {
    assert.match(validateOrganizerSignup(club({ [field]: value })).error, message, field);
  }
});

test('registration: private accounts send no metadata, clubs send account type and club data', async () => {
  const { createAccountActions } = load('src/features/accounts/auth.ts');
  const calls = [];
  const actions = createAccountActions({ auth: { signUp: async (arg) => { calls.push(arg); return { data: { session: null }, error: null }; } } });
  await actions.register('privat@example.invalid', 'eightchars', 'meine-app://account');
  await actions.register('club@example.invalid', 'eightchars', 'meine-app://account', { name: 'Club Eins' });
  assert.equal('data' in calls[0].options, false);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].options.data)), { account_type: 'organizer', organizer: { name: 'Club Eins' } });
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

test('studio: never sets is_published on organizers, events stay drafts before approval, private profile has no organizer entry', () => {
  const api = fs.readFileSync(path.join(__dirname, '../src/features/organizer/organizerApi.ts'), 'utf8');
  const updateBlock = api.slice(api.indexOf('export async function updateOrganizerProfile'), api.indexOf('export async function submitOrganizer'));
  assert.ok(!updateBlock.includes('is_published'), 'profile update must not touch is_published');
  const editor = fs.readFileSync(path.join(__dirname, '../src/features/studio/EventEditorScreen.tsx'), 'utf8');
  assert.match(editor, /isPublished: status === 'scheduled' && approved && live/);
  const profile = fs.readFileSync(path.join(__dirname, '../src/screens/ProfileScreen.tsx'), 'utf8');
  assert.ok(!profile.includes('/dashboard') && !profile.includes('Veranstalter-Bereich'), 'private accounts cannot become organizers');
  const studioLayout = fs.readFileSync(path.join(__dirname, '../src/features/studio/StudioLayout.tsx'), 'utf8');
  assert.match(studioLayout, /type !== 'organizer'\) return <Redirect href="\/" \/>/, 'studio only for organizer accounts');
  const management = fs.readFileSync(path.join(__dirname, '../src/features/accounts/management.ts'), 'utf8');
  assert.ok(!management.includes("'is_published'"), 'old self-publishing path removed');
});

test('geocoding: structured German address, first hit inside Germany, nothing found is null, errors are German', async () => {
  const { geocodeAddress, geocodeUrl } = load('src/features/organizer/geocode.ts');
  const address = { street: 'Kaiserstraße', houseNumber: '12a', postcode: '76133', city: 'Karlsruhe' };
  const url = new URL(geocodeUrl(address));
  assert.equal(url.origin + url.pathname, 'https://nominatim.openstreetmap.org/search');
  assert.equal(url.searchParams.get('street'), '12a Kaiserstraße');
  assert.equal(url.searchParams.get('postalcode'), '76133');
  assert.equal(url.searchParams.get('countrycodes'), 'de');
  assert.equal(url.searchParams.get('limit'), '1');
  const reply = (body, ok = true) => async () => ({ ok, json: async () => body });
  assert.deepEqual({ ...(await geocodeAddress(address, reply([{ lat: '49.0094', lon: '8.3994', display_name: 'Kaiserstraße 12a, Karlsruhe' }]))) },
    { latitude: 49.0094, longitude: 8.3994, label: 'Kaiserstraße 12a, Karlsruhe' });
  assert.equal(await geocodeAddress(address, reply([])), null);
  assert.equal(await geocodeAddress(address, reply([{ lat: '40.7', lon: '-74.0' }])), null, 'outside Germany');
  await assert.rejects(geocodeAddress(address, reply(null, false)), /später erneut/);
});

test('event page address: street with number and postcode with city, nothing without street', () => {
  const { formatEventAddress } = load('src/hooks/useEventAddress.ts', { react: {}, '../lib/supabase': {} });
  assert.deepEqual({ ...formatEventAddress({ street: 'Kaiserstraße', house_number: '12a', postcode: '76133' }, 'Karlsruhe') },
    { street: 'Kaiserstraße 12a', postcodeCity: '76133 Karlsruhe' });
  assert.equal(formatEventAddress({ street: null, house_number: null, postcode: '76133' }, 'Karlsruhe'), null);
  assert.equal(formatEventAddress(null, 'Karlsruhe'), null);
});

test('event editor: end time is required and an own address is turned into a map position', () => {
  const editor = fs.readFileSync(path.join(__dirname, '../src/features/studio/EventEditorScreen.tsx'), 'utf8');
  assert.match(editor, /!endTime\.trim\(\) \? 'Bitte das Ende eingeben/);
  assert.match(editor, /await geocodeAddress\(place\)/);
});
