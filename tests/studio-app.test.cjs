// Spots Studio (App): Logik hinter „Event anlegen/bearbeiten“, Checkliste, Zahlen-Helfer und der Aufbau der Reiter. Ohne Netz.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test'), vm = require('node:vm'), ts = require('typescript');

function load(file, requireMap = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Intl, Date, Math, JSON, URL, require: (name) => {
    if (name in requireMap) return requireMap[name];
    throw new Error(`unexpected import ${name}`);
  } });
  return module.exports;
}
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

const berlinTime = load('src/utils/berlinTime.ts');
const signup = load('src/features/organizer/signup.ts');
const api = load('src/features/organizer/organizerApi.ts', { '../accounts/client': {}, '../../services/organizerStories': {}, '../../services/organizers': {}, './signup': {} });
const form = load('src/features/studio/eventForm.ts', { '../../utils/berlinTime': berlinTime, '../organizer/organizerApi': api, '../organizer/signup': signup });

const organizer = { id: 'o', displayName: 'Club Eins', street: 'Kaiserstraße', houseNumber: '12a', postcode: '76133', city: 'Karlsruhe', reviewStatus: 'approved' };
const event = (overrides = {}) => ({ id: 'e1', title: 'Techno Night', description: 'Line-up folgt', startsAt: '2026-11-28T22:00:00.000Z', endsAt: '2026-11-29T04:00:00.000Z',
  venueId: null, venueName: 'Club Eins', street: 'Kaiserstraße', houseNumber: '12a', postcode: '76133', city: 'Karlsruhe', latitude: 49, longitude: 8.4,
  imageUrl: 'https://x.example/f.jpg', ticketUrl: null, genre: 'techno, Goa', category: 'club', status: 'scheduled', isPublished: false, ...overrides });
const ticket = (overrides = {}) => ({ id: 't1', name: 'Abendkasse', priceCents: 1200, externalUrl: null, soldOut: false, ...overrides });
const now = Date.parse('2026-11-25T12:00:00Z');

test('new event: starts at the organizer, door tickets, nothing invented', () => {
  const fresh = form.initialForm(organizer, null);
  assert.equal(fresh.placeMode, 'own');
  assert.equal(fresh.ticketMode, 'door');
  assert.deepEqual(plain(fresh.prices.map((row) => [row.name, row.price])), [['Abendkasse', '']]);
  assert.equal(fresh.date, '');
  assert.equal(form.genreText(fresh), null);
  // Ohne eigene Adresse (z. B. Kollektiv) gibt es „Bei euch“ nicht.
  assert.equal(form.initialForm({ ...organizer, street: null, houseNumber: null, postcode: null }, null).placeMode, 'other');
});

test('edit: values come back in Berlin time, genres match the radar filters, own address is recognised', () => {
  const edit = form.initialForm(organizer, event(), [ticket()]);
  assert.equal(edit.date, '28.11.2026');
  assert.equal(edit.startTime, '23:00');
  assert.equal(edit.endTime, '05:00');
  assert.equal(form.endsNextDay(edit), true);
  assert.deepEqual(plain(edit.genres), ['Techno'], 'known genre in the spelling of the filter');
  assert.equal(edit.otherGenre, 'Goa');
  assert.equal(form.genreText(edit), 'Techno, Goa');
  assert.equal(edit.placeMode, 'own');
  assert.equal(edit.ticketMode, 'door');
  assert.deepEqual(plain(edit.prices.map((row) => [row.id, row.name, row.price])), [['t1', 'Abendkasse', '12']]);
  const elsewhere = form.initialForm(organizer, event({ venueName: 'Halle 7', street: 'Hafenweg', houseNumber: '3', postcode: '76189' }));
  assert.equal(elsewhere.placeMode, 'other');
  assert.equal(elsewhere.place.name, 'Halle 7');
  assert.equal(form.initialForm(organizer, event({ venueId: 'v1', venueName: 'Substage' })).venue.name, 'Substage');
});

test('duplicate: everything but the date, tickets become new rows', () => {
  const copy = form.initialForm(organizer, event({ ticketUrl: 'https://tickets.example/x' }), [ticket({ name: 'Early Bird', priceCents: 850 })], true);
  assert.equal(copy.date, '');
  assert.equal(copy.startTime, '23:00');
  assert.equal(copy.title, 'Techno Night');
  assert.equal(copy.ticketMode, 'online');
  assert.equal(copy.prices[0].id, undefined);
  assert.equal(copy.prices[0].price, '8,50');
});

test('validation per step: errors at the field, end required, no past events, address complete', () => {
  const fresh = form.initialForm(organizer, null);
  assert.deepEqual(plain(form.validateStep(fresh, 'event')), { title: 'Bitte einen Titel eingeben.' });
  assert.deepEqual(Object.keys(form.validateStep(fresh, 'when')).sort(), ['date', 'endTime', 'startTime']);
  const timed = { ...fresh, title: 'Nacht', date: '28.11.2026', startTime: '23:00', endTime: '05:00' };
  assert.deepEqual(plain(form.validateStep(timed, 'when', { isNew: true, now })), {});
  assert.match(form.validateStep({ ...timed, date: '20.11.2026' }, 'when', { isNew: true, now }).date, /Vergangenheit/);
  assert.deepEqual(plain(form.validateStep({ ...timed, date: '20.11.2026' }, 'when', { isNew: false, now })), {}, 'old events can still be edited');
  assert.match(form.validateStep({ ...timed, endTime: '' }, 'when', { isNew: true, now }).endTime, /Ende/);
  assert.deepEqual(plain(form.validateStep(timed, 'where')), {}, 'own place needs nothing');
  const other = { ...timed, placeMode: 'other', place: { name: '', street: '', houseNumber: '', postcode: '7613', city: '' } };
  assert.deepEqual(Object.keys(form.validateStep(other, 'where')).sort(), ['city', 'placeName', 'postcode', 'street']);
  assert.deepEqual(plain(form.validateStep({ ...other, venue: { id: 'v', name: 'Substage', city: 'Karlsruhe' } }, 'where')), {}, 'a venue from the search needs no address');
  assert.equal(form.firstInvalidStep(fresh, { isNew: true, now }), 'event');
  assert.equal(form.firstInvalidStep(timed, { isNew: true, now }), null);
  const times = form.eventTimes(timed);
  assert.equal(times.startsAt.toISOString(), '2026-11-28T22:00:00.000Z');
  assert.equal(times.endsAt.toISOString(), '2026-11-29T04:00:00.000Z', 'end after midnight is the next day');
});

test('tickets are one section: online link, door prices or free entry', () => {
  const base = { ...form.initialForm(organizer, null), title: 'Nacht', date: '28.11.2026', startTime: '23:00', endTime: '05:00' };
  // Abendkasse ohne Preis: nichts wird gespeichert, kein Fehler.
  assert.deepEqual(plain(form.validateStep(base, 'tickets')), {});
  assert.deepEqual(plain(form.ticketPlan(base)), { ticketUrl: null, desired: [] });
  const door = { ...base, prices: [{ key: 'a', name: 'Abendkasse', price: '12,50' }, { key: 'b', name: '', price: '' }] };
  assert.deepEqual(plain(form.ticketPlan(door).desired), [{ name: 'Abendkasse', priceCents: 1250, externalUrl: null }]);
  assert.match(form.validateStep({ ...base, prices: [{ key: 'a', name: 'VIP', price: 'viel' }] }, 'tickets').prices, /Name und Preis/);
  assert.match(form.validateStep({ ...base, prices: [{ key: 'a', name: '', price: '10' }] }, 'tickets').prices, /Name und Preis/);
  const online = { ...base, ticketMode: 'online', ticketUrl: 'tickets.example.de/nacht', prices: [{ key: 'a', name: 'Early Bird', price: '8' }] };
  assert.deepEqual(plain(form.validateStep(online, 'tickets')), {});
  assert.deepEqual(plain(form.ticketPlan(online)), { ticketUrl: 'https://tickets.example.de/nacht', desired: [{ name: 'Early Bird', priceCents: 800, externalUrl: null }] });
  assert.match(form.validateStep({ ...online, ticketUrl: '' }, 'tickets').ticketUrl, /Ticket-Link/);
  assert.match(form.validateStep({ ...online, ticketUrl: 'http://unsicher.de' }, 'tickets').ticketUrl, /ungültig/);
  const free = { ...base, ticketMode: 'free', ticketUrl: 'egal.de' };
  assert.deepEqual(plain(form.ticketPlan(free)), { ticketUrl: null, desired: [{ name: 'Eintritt frei', priceCents: 0, externalUrl: null }] });
  assert.equal(form.ticketModeOf(event(), [ticket({ name: 'Eintritt frei', priceCents: 0 })]), 'free');
  assert.equal(form.ticketModeOf(event({ ticketUrl: 'https://t.example' }), []), 'online');
  assert.equal(form.ticketModeOf(null, []), 'door');
});

test('ticket changes: unchanged types stay (keeps „ausverkauft“), the rest is replaced, nothing doubles', () => {
  const existing = [ticket(), ticket({ id: 't2', name: 'VIP', priceCents: 3000 })];
  assert.deepEqual(plain(form.ticketChanges(existing, [{ id: 't1', name: 'Abendkasse', priceCents: 1200, externalUrl: null }, { id: 't2', name: 'VIP', priceCents: 3500, externalUrl: null }])),
    { remove: ['t2'], add: [{ name: 'VIP', priceCents: 3500, externalUrl: null }] });
  assert.deepEqual(plain(form.ticketChanges(existing, [])), { remove: ['t1', 't2'], add: [] });
  const free = [ticket({ id: 'f', name: 'Eintritt frei', priceCents: 0 })];
  assert.deepEqual(plain(form.ticketChanges(free, [{ name: 'Eintritt frei', priceCents: 0, externalUrl: null }])), { remove: [], add: [] }, 'saving twice changes nothing');
  assert.deepEqual(plain(form.ticketChanges([], [{ name: 'Abendkasse', priceCents: 1000, externalUrl: null }])), { remove: [], add: [{ name: 'Abendkasse', priceCents: 1000, externalUrl: null }] });
});

test('checklist: flyer, description, tickets, published', () => {
  const open = form.eventChecklist(event({ imageUrl: null, description: ' ' }), 0);
  assert.deepEqual(plain(open.map((item) => [item.key, item.done, item.step])), [['flyer', false, 'event'], ['description', false, 'event'], ['tickets', false, 'tickets'], ['published', false, 'preview']]);
  assert.ok(form.eventChecklist(event({ isPublished: true }), 1).every((item) => item.done));
  assert.equal(form.eventChecklist(event({ ticketUrl: 'https://t.example' }), null).find((item) => item.key === 'tickets').done, true);
});

test('format: countdown, story window like SQL 33, quota without invented precision', () => {
  const status = load('src/utils/eventStatus.ts', { './events': load('src/utils/events.ts') });
  const format = load('src/features/studio/format.ts', { '../../utils/eventStatus': status, '../../utils/events': load('src/utils/events.ts') });
  const night = { startsAt: '2026-11-28T22:00:00.000Z', endsAt: '2026-11-29T04:00:00.000Z', status: 'scheduled' };
  assert.deepEqual(plain(format.countdown(night, now)), { label: 'In 3 Tagen', live: false });
  assert.deepEqual(plain(format.countdown(night, Date.parse('2026-11-28T12:00:00Z'))), { label: 'Heute · 23:00 Uhr', live: false });
  assert.deepEqual(plain(format.countdown(night, Date.parse('2026-11-28T23:30:00Z'))), { label: 'Läuft jetzt', live: true });
  assert.equal(format.whenLine(night), 'Sa., 28.11. · 23:00–05:00 Uhr');
  assert.equal(format.canPostStory(night, Date.parse('2026-11-29T05:59:00Z')), true, 'until two hours after the end');
  assert.equal(format.canPostStory(night, Date.parse('2026-11-29T06:01:00Z')), false);
  assert.equal(format.canPostStory({ ...night, status: 'cancelled' }, now), false);
  assert.equal(format.share(28, 340), '8 %');
  assert.equal(format.share(1, 340), 'unter 1 %');
  assert.equal(format.share(0, 340), '0 %');
  assert.equal(format.share(5, 0), null, 'no quota without views');
});

test('structure: five tabs with the plus in the middle, story only at the event, no dev sales numbers', () => {
  const tabs = read('src/features/studio/StudioTabsLayout.tsx');
  const names = [...tabs.matchAll(/<Tabs\.Screen name="([a-z]+)"/g)].map((match) => match[1]);
  assert.deepEqual(names, ['index', 'events', 'create', 'stats', 'profile'], 'Übersicht · Events · ＋ · Zahlen · Profil');
  assert.match(tabs, /title: 'Profil'/, 'the last tab keeps its name');
  for (const file of ['index', 'events', 'create', 'stats', 'profile']) assert.ok(fs.existsSync(path.join(__dirname, `../src/app/studio/(tabs)/${file}.tsx`)), file);
  assert.ok(!fs.existsSync(path.join(__dirname, '../src/app/studio/(tabs)/story.tsx')), 'no story tab');
  // Story posten gibt es nur über das Profilbild am Event.
  const posting = fs.readdirSync(path.join(__dirname, '../src/features/studio')).filter((file) => read(`src/features/studio/${file}`).includes('eventStory: true'));
  assert.deepEqual(posting, ['Story.tsx']);
  const story = read('src/features/studio/Story.tsx');
  assert.match(story, /title="Storys ansehen"/);
  assert.match(story, /title="Story posten"/);
  assert.ok(!read('src/features/studio/StatsScreen.tsx').includes('testSales'), 'no made-up sales numbers');
  // Absagen und Löschen fragen nach.
  assert.match(read('src/features/studio/EventScreen.tsx'), /<ConfirmSheet visible=\{confirm === 'cancel'\}/);
  assert.match(read('src/features/studio/AccountCard.tsx'), /<ConfirmSheet visible=\{confirm\}/);
});
