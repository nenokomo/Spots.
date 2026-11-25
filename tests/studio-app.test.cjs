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

test('structure: three tabs and a separate plus, story only at the profile picture, nothing doubled', () => {
  const tabs = read('src/features/studio/StudioTabsLayout.tsx');
  const names = [...tabs.matchAll(/<Tabs\.Screen name="([a-z]+)"/g)].map((match) => match[1]);
  assert.deepEqual(names, ['index', 'stats', 'profile'], 'Events · Zahlen · Profil');
  assert.match(tabs, /title: 'Profil'/, 'the last tab keeps its name');
  assert.match(tabs, /accessibilityLabel="Neues Event anlegen" onPress=\{\(\) => newEvent\(\)\}/, 'the plus is its own button next to the bar');
  assert.deepEqual(fs.readdirSync(path.join(__dirname, '../src/app/studio/(tabs)')).sort(), ['_layout.tsx', 'index.tsx', 'profile.tsx', 'stats.tsx']);
  // Ein Event legt man nur über das Plus an.
  const creating = fs.readdirSync(path.join(__dirname, '../src/features/studio')).filter((file) => /newEvent\(\)/.test(read(`src/features/studio/${file}`)));
  assert.deepEqual(creating, ['StudioTabsLayout.tsx'], 'no second way to create an event');
  // Story posten gibt es nur über das Profilbild am Event.
  const posting = fs.readdirSync(path.join(__dirname, '../src/features/studio')).filter((file) => read(`src/features/studio/${file}`).includes('eventStory: true'));
  assert.deepEqual(posting, ['Story.tsx']);
  const story = read('src/features/studio/Story.tsx');
  assert.match(story, /title="Storys ansehen"/);
  assert.match(story, /title="Story posten"/);
  assert.ok(!read('src/features/studio/StatsScreen.tsx').includes('testSales'), 'no made-up sales numbers');
  // Absagen und Löschen fragen nach.
  assert.match(read('src/features/studio/EventScreen.tsx'), /title=\{sheet === 'cancel' \? 'Event absagen\?'/);
  assert.match(read('src/features/studio/AccountCard.tsx'), /<ConfirmSheet visible=\{confirm\}/);
  // Neues Event fährt von unten ein und lässt sich nicht versehentlich wegwischen.
  assert.match(read('src/features/studio/StudioLayout.tsx'), /<Stack\.Screen name="new" options=\{\{ presentation: 'fullScreenModal', gestureEnabled: false \}\} \/>/);
});

test('the page is the form: creating and editing use the guest event page, parts open as sheets', () => {
  const page = read('src/features/studio/EventScreen.tsx');
  assert.equal([...page.matchAll(/<EventDetailView /g)].length, 2, 'the same guest view for a new and for a saved event');
  assert.match(page, /onEdit: setPart, empty: guest\.empty, close: true/, 'new event: placeholders to tap');
  assert.match(page, /<EventPartSheet part=\{part\} organizer=\{organizer\} form=\{form\} isNew applyLabel="Übernehmen"/);
  assert.match(page, /applyLabel="Speichern"/, 'saved event: a part is saved right away');
  assert.ok(!fs.existsSync(path.join(__dirname, '../src/app/studio/edit')), 'no separate step pages');
  assert.ok(!fs.existsSync(path.join(__dirname, '../src/app/studio/page.tsx')), 'no separate form page for the profile');
  // Profil: die Veranstalterseite der Gäste; das Profilbild mit „+“ ist die Story in Entdecken.
  const profile = read('src/features/studio/ProfileScreen.tsx');
  assert.match(profile, /<OrganizerProfileView organizer=\{toPublicOrganizer\(organizer\)\} events=\{guestEvents\(events, organizer\.id\)\}/);
  assert.match(profile, /avatar: <ExploreStory /);
  assert.match(read('src/features/studio/ExploreStory.tsx'), /<OrganizerStoryTile organizer=\{explore\}/, 'the same tile as in Entdecken');
  // Die Besucher-Seiten bleiben für Gäste, wie sie sind: Bearbeiten nur mit `edit`.
  const guestEvent = read('src/screens/EventDetailScreen.tsx');
  assert.match(guestEvent, /export function EventDetailView\(/);
  assert.match(guestEvent, /return <EventDetailView event=\{event\} organizer=\{organizer\} tickets=\{content\.tickets\} liveSnaps=\{content\.snaps\}/);
  assert.match(read('src/screens/OrganizerProfileScreen.tsx'), /return <OrganizerProfileView organizer=\{data\.organizer\} events=\{data\.events\} posts=\{data\.posts\} onBack=\{back\} \/>/);
});

test('guest view data: own events are mapped with the rules of the visitor app, drafts included; guests only get published ones', () => {
  const adapter = load('src/services/eventAdapter.ts', { '../constants/theme': { categories: ['Alle', 'Techno', 'House', 'Hip-Hop', 'Konzerte', 'Events', 'Clubs'] },
    './eventSchema': { publishedValue: true }, '../../assets/events/nightlife.jpg': 1 });
  const view = load('src/features/studio/guestView.ts', { '../../services/eventAdapter': adapter, '../../services/eventSchema': { publishedValue: true }, './eventForm': form });
  const organizerId = '11111111-1111-4111-8111-111111111111';
  const draft = event({ startsAt: '2026-11-28T22:00:00+00:00', endsAt: '2026-11-29T04:00:00+00:00', genre: 'Techno, Goa', isPublished: false });
  const mapped = view.toSpotEvent(draft, organizerId);
  assert.equal(mapped.title, 'Techno Night');
  assert.deepEqual(plain(mapped.categories), ['Techno', 'Clubs'], 'same filters as on the radar');
  assert.deepEqual(plain(mapped.genres), ['Techno', 'Goa']);
  assert.equal(mapped.venue, 'Club Eins');
  assert.equal(mapped.organizerId, organizerId);
  assert.equal(mapped.imageIsPlaceholder, false);
  assert.equal(view.guestEvents([draft, event({ id: 'e2', startsAt: '2026-12-05T22:00:00+00:00', endsAt: null, isPublished: true }),
    event({ id: 'e3', startsAt: '2026-12-06T22:00:00+00:00', isPublished: true, status: 'cancelled' })], organizerId).length, 1, 'drafts and cancelled events are not on the public page');
  assert.deepEqual(plain(view.toPublicTickets('e1', [ticket({ soldOut: true })])), [{ id: 't1', eventId: 'e1', name: 'Abendkasse', description: null, priceCents: 1200, currency: 'EUR', externalUrl: null, salesEnd: null, soldOut: true }]);
  assert.equal(view.toPublicPosts('o', [{ id: 'p1', body: 'a', isPublished: true, createdAt: 'x', images: [] }, { id: 'p2', body: 'b', isPublished: false, createdAt: 'y', images: [] }]).length, 1);
});

test('defaults from the last event: times, place, kind, genre and door tickets; title, date, flyer, text and link are new', () => {
  const last = event({ ticketUrl: null, genre: 'House', imageUrl: 'https://x.example/alt.jpg' });
  const fresh = form.freshForm(organizer, { event: last, tickets: [ticket()] });
  assert.equal(fresh.title, '');
  assert.equal(fresh.date, '');
  assert.equal(fresh.imageUrl, null);
  assert.equal(fresh.description, '');
  assert.equal(fresh.startTime, '23:00');
  assert.equal(fresh.endTime, '05:00');
  assert.deepEqual(plain(fresh.genres), ['House']);
  assert.equal(fresh.placeMode, 'own');
  assert.deepEqual(plain(fresh.prices.map((row) => [row.id ?? null, row.name, row.price])), [[null, 'Abendkasse', '12']], 'door prices again, as new rows');
  // Ein Ticket-Link gehört zu genau einem Event: nichts davon übernehmen.
  const online = form.freshForm(organizer, { event: event({ ticketUrl: 'https://t.example/alt' }), tickets: [ticket({ name: 'Early Bird', priceCents: 800 })] });
  assert.equal(online.ticketUrl, '');
  assert.equal(online.ticketMode, 'door');
  assert.deepEqual(plain(online.prices.map((row) => row.price)), ['']);
  assert.equal(form.freshForm(organizer, null).title, '', 'without an earlier event: empty defaults');
  // Datum nur als Vorschlag: gleicher Wochentag, nächster Termin.
  assert.equal(form.suggestedDate({ startsAt: '2026-11-21T22:00:00.000Z' }, now), '28.11.2026', 'last Saturday → next Saturday');
  assert.equal(form.suggestedDate({ startsAt: '2026-11-28T22:00:00.000Z' }, now), '05.12.2026', 'a planned Saturday → the one after');
  assert.equal(form.suggestedDate(null, now), '25.11.2026', 'no earlier event → today');
});

test('what is missing: saving needs title and time, publishing also a flyer', () => {
  const empty = form.initialForm(organizer, null);
  assert.deepEqual(plain(form.missingForSave(empty, { isNew: true, now })), ['title', 'when']);
  assert.deepEqual(plain(form.missingForPublish(empty, { isNew: true, now })), ['flyer', 'title', 'when']);
  const ready = { ...empty, title: 'Nacht', date: '28.11.2026', startTime: '23:00', endTime: '05:00' };
  assert.deepEqual(plain(form.missingForSave(ready, { isNew: true, now })), []);
  assert.deepEqual(plain(form.missingForPublish(ready, { isNew: true, now })), ['flyer']);
  assert.deepEqual(plain(form.missingForPublish({ ...ready, imageUrl: 'https://x.example/f.jpg' }, { isNew: true, now })), []);
  assert.equal(form.partLabels.when, 'Datum und Uhrzeit');
});

test('new event on its page: placeholders for what is missing, same mapping as for guests', () => {
  const adapter = load('src/services/eventAdapter.ts', { '../constants/theme': { categories: ['Alle', 'Techno', 'House', 'Hip-Hop', 'Konzerte', 'Events', 'Clubs'] },
    './eventSchema': { publishedValue: true }, '../../assets/events/nightlife.jpg': 1 });
  const view = load('src/features/studio/guestView.ts', { '../../services/eventAdapter': adapter, '../../services/eventSchema': { publishedValue: true }, './eventForm': form });
  const owner = { ...organizer, id: '11111111-1111-4111-8111-111111111111' };
  const empty = view.formEvent(form.initialForm(owner, null), owner, now);
  assert.deepEqual(plain(empty.empty), { title: 'Titel hinzufügen', when: 'Datum und Uhrzeit wählen' });
  assert.equal(empty.event.venue, 'Club Eins', 'the own place is already there');
  assert.ok(Date.parse(empty.event.startsAt) > now, 'without a time the page does not show the event as over');
  const filled = view.formEvent({ ...form.initialForm(owner, null), title: 'Nacht', date: '28.11.2026', startTime: '23:00', endTime: '05:00', genres: ['Techno'],
    prices: [{ key: 'a', name: 'Abendkasse', price: '12' }] }, owner, now);
  assert.deepEqual(plain(filled.empty), {});
  assert.equal(filled.event.title, 'Nacht');
  assert.equal(filled.event.startsAt, '2026-11-28T22:00:00.000Z');
  assert.deepEqual(plain(filled.event.categories), ['Techno', 'Clubs']);
  assert.deepEqual(plain(filled.tickets.map((item) => [item.name, item.priceCents])), [['Abendkasse', 1200]]);
});

test('numbers: one sentence of insight, a comparison only with enough data', () => {
  const status = load('src/utils/eventStatus.ts', { './events': load('src/utils/events.ts') });
  const format = load('src/features/studio/format.ts', { '../../utils/eventStatus': status, '../../utils/events': load('src/utils/events.ts') });
  assert.equal(format.ticketInsight(0, 0), 'Noch hat niemand dieses Event in Spots gesehen.');
  assert.equal(format.ticketInsight(340, 15), '4 % der Aufrufe führten zu den Tickets.');
  assert.equal(format.ticketInsight(340, 15, [{ views: 500, ticketClicks: 10 }]), '4 % der Aufrufe führten zu den Tickets.', 'one other event is no basis');
  const others = [{ views: 500, ticketClicks: 10 }, { views: 300, ticketClicks: 6 }, { views: 5, ticketClicks: 5 }];
  assert.equal(format.ticketInsight(340, 34, others), '10 % der Aufrufe führten zu den Tickets. Das ist mehr als bei euren anderen Events (2 %).');
  assert.equal(format.ticketInsight(1000, 5, others), 'unter 1 % der Aufrufe führten zu den Tickets. Das ist weniger als bei euren anderen Events (2 %).');
  assert.equal(format.ticketInsight(1000, 20, others), '2 % der Aufrufe führten zu den Tickets. Das ist etwa so viel wie bei euren anderen Events (2 %).');
});
