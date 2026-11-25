// Veranstalter-Bereich (App): Adresse aus dem Namen, Zeit-Hilfen fürs Bearbeiten, wann gezählt wird. Ohne Netz.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), vm = require('node:vm'), ts = require('typescript');

function load(file, requireMap = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Intl, Date, Math, URL, URLSearchParams, fetch: (...args) => globalThis.fetch(...args), require: (name) => {
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
  // Speichern (Schritte „Event anlegen/bearbeiten“) und die Eventseite (Veröffentlichen, Absagen): vor der Freigabe nie öffentlich.
  for (const file of ['saveEvent.ts', 'EventScreen.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '../src/features/studio', file), 'utf8');
    assert.match(source, /isPublished: status === 'scheduled' && approved && live/, file);
  }
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
  const form = fs.readFileSync(path.join(__dirname, '../src/features/studio/eventForm.ts'), 'utf8');
  assert.match(form, /if \(!form\.endTime\.trim\(\)\) errors\.endTime = 'Bitte das Ende wählen\.'/);
  const editor = fs.readFileSync(path.join(__dirname, '../src/features/studio/saveEvent.ts'), 'utf8');
  assert.match(editor, /await geocodeAddress\(place\)/);
});

test('start page: first Privat/Veranstalter, then login; registering uses that choice; guest is remembered; profile has no login form', () => {
  const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const start = read('src/features/accounts/AccountScreen.tsx');
  assert.match(start, /Wie nutzt du Spots\?/, 'step 1: choose Privat or Veranstalter');
  assert.match(start, /const showChoice = !kind && !recovering && !session;/);
  assert.match(start, /mode === 'register' && kind === 'organizer' && !team/, 'club fields come from the step-1 choice, no extra switch');
  assert.ok(!start.includes('styles.kinds'), 'no Privat/Veranstalter switch on the form anymore');
  assert.match(start, /Als Gast fortfahren/);
  assert.match(start, /router\.replace\(accountType === 'organizer' \? '\/studio' : '\/'\)/, 'account type decides after login');
  const root = read('src/app/_layout.tsx');
  assert.match(root, /<Stack\.Protected guard=\{allowed\} redirectTo="\/account">\s*<Stack\.Screen name="\(tabs\)" \/>/, 'visitor tabs only with account or as guest (works on native)');
  assert.ok(root.includes("const allowed = !!accountClientError || (account.session ? accountType !== 'organizer' : guest);"), 'organizers never get the visitor tabs');
  assert.ok(!read('src/features/accounts/guestMode.ts').includes('setItem'), 'guest choice is not stored: start page on every app start');
  assert.ok(!read('src/app/(tabs)/_layout.tsx').includes('Redirect'), 'no redirect in the tabs layout (ignored on native)');
  const profile = read('src/screens/ProfileScreen.tsx');
  assert.ok(!profile.includes('Konto verwalten'), 'old login row removed');
  assert.match(profile, /title="Abmelden"/);
  assert.match(profile, /title="Konto löschen" destructive/);
});

test('shots: posting needs an account, uploads into the own folder and notifies the event page; reporting uses the account session', async () => {
  const calls = [];
  const session = { current: { user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } } };
  let insertError = null;
  const accountClient = {
    auth: { getSession: async () => ({ data: { session: session.current } }), getUser: async () => ({ data: { user: session.current?.user ?? null } }) },
    storage: { from: (bucket) => ({
      upload: async (path, body, options) => { calls.push(['upload', bucket, path, options.contentType]); return { error: null }; },
      remove: async (paths) => { calls.push(['remove', bucket, ...paths]); return { error: null }; },
    }) },
    from: (table) => ({ insert: async (row) => { calls.push(['insert', table, row]); return { error: insertError }; } }),
  };
  const content = load('src/services/content.ts', {
    '../features/accounts/client': { accountClientError: null, getAccountClient: () => accountClient },
    '../lib/supabase': { getSupabase: () => { throw new Error('public client must not be used for writes'); } },
    './eventAdapter': { safeExternalUrl: (value) => value },
    './savedEventsSync': load('src/services/savedEventsSync.ts'),
  });
  const EVENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  globalThis.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(10) });
  const changed = [];
  content.onSnapsChanged((id) => changed.push(id));

  await content.postShot(EVENT, { uri: 'file:///shot.jpg', mimeType: 'image/jpeg' });
  const [upload, insert] = calls;
  assert.equal(upload[1], 'live-snaps');
  assert.match(upload[2], /^aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\/[a-z0-9]+-[a-z0-9]+\.jpg$/, 'own folder, random name');
  assert.deepEqual(JSON.parse(JSON.stringify(insert)), ['insert', 'live_snaps', { event_id: EVENT, media_type: 'image', storage_path: upload[2] }]);
  assert.deepEqual(changed, [EVENT]);

  calls.length = 0; insertError = { code: '42501', message: 'new row violates row-level security policy' };
  await assert.rejects(content.postShot(EVENT, { uri: 'file:///late.jpg', mimeType: 'image/jpeg' }), /während das Event läuft/);
  assert.equal(calls[2][0], 'remove', 'uploaded file is removed again when the row is rejected');

  insertError = null;
  await assert.rejects(content.postShot('f0f0f0f0-0000-4000-8000-000000000001', { uri: 'file:///test.jpg' }), /Test-Events/, 'local TEST events never reach the database');
  session.current = null;
  await assert.rejects(content.postShot(EVENT, { uri: 'file:///guest.jpg' }), /bitte zuerst anmelden/i);
  await assert.rejects(content.reportShot('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'spam', ''), /Zum Melden bitte zuerst anmelden/);
  session.current = { user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }; calls.length = 0;
  await content.reportShot('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'spam', ' zu laut ');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ['insert', 'content_reports', { snap_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', reason: 'spam', details: 'zu laut' }]);
});

test('shots for guests: locked tile with a sign-in link; signed-in accounts read shots with their session', () => {
  const shots = fs.readFileSync(path.join(__dirname, '../src/components/Shots.tsx'), 'utf8');
  assert.match(shots, /onPress=\{\(\) => guest \? setSignInHint\(true\) : setOpen\(unseen\)\}/, 'guests get the hint instead of the viewer');
  assert.match(shots, /Melde dich hier an, um sie zu sehen/);
  assert.match(shots, /router\.push\('\/account'\)/);
  const content = fs.readFileSync(path.join(__dirname, '../src/services/content.ts'), 'utf8');
  const fetchBlock = content.slice(content.indexOf('export async function fetchEventSnaps'), content.indexOf('export async function fetchTicketTypes'));
  assert.match(fetchBlock, /const client = await readClient\(\);/, 'shots are read with the account session when signed in');
});
