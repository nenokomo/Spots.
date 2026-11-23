// App-Seite der Veranstalter-Story (SQL 33): Bildadressen, Stadtregel, Story-Seiten. Ohne Netz, ohne erfundene Daten.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, requireMap = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Intl, Date, URL, __DEV__: false, require: (name) => {
    if (name in requireMap) return requireMap[name];
    throw new Error(`unexpected import ${name}`);
  } });
  return module.exports;
}
const ORG = '33333333-3333-4333-8333-0000000000aa';
const client = { storage: { from: (bucket) => ({ getPublicUrl: (p) => ({ data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/${bucket}/${p}` } }) }) } };
const plain = (value) => JSON.parse(JSON.stringify(value));
const service = () => load('src/services/organizerStories.ts', { '../lib/supabase': { getSupabase: () => client } });

test('story items: only pictures in the organizer folder, public bucket address, event only when public', () => {
  const { toStoryItems } = service();
  const items = toStoryItems(client, ORG, [
    { id: '1', storage_path: `${ORG}/story-a.jpg`, caption: 'So war es', created_at: '2026-11-15T10:00:00Z', event_id: 'e1', event_title: 'Techno Night', event_starts_at: '2026-11-14T22:00:00+01:00' },
    { id: '2', storage_path: `${ORG}/story-b.jpg`, caption: null, created_at: '2026-11-14T10:00:00Z', event_id: null, event_title: null, event_starts_at: null },
    { id: '3', storage_path: `other/story-c.jpg`, caption: null, created_at: '2026-11-14T10:00:00Z', event_id: null, event_title: null, event_starts_at: null },
    { id: '4', storage_path: `${ORG}/logo.jpg`, caption: null, created_at: '2026-11-14T10:00:00Z', event_id: null, event_title: null, event_starts_at: null },
  ]);
  assert.deepEqual(plain(items.map((item) => item.id)), ['1', '2']);
  assert.equal(items[0].url, `https://proj.supabase.co/storage/v1/object/public/organizer-public/${ORG}/story-a.jpg`);
  assert.equal(items[0].event.title, 'Techno Night');
  assert.equal(items[1].event, null);
});

test('city rule matches the database: equal or one is the other plus more words', () => {
  const { sameCity } = service();
  assert.equal(sameCity('Frankfurt am Main', 'Frankfurt'), true);
  assert.equal(sameCity(' frankfurt ', 'Frankfurt am Main'), true);
  assert.equal(sameCity('Frank', 'Frankfurt'), false);
  assert.equal(sameCity('Karlsruhe', 'Frankfurt'), false);
  assert.equal(sameCity(null, 'Karlsruhe'), false);
});

test('organizer story page: own pictures with caption and event, else the logo; profile button, no save button', () => {
  const events = load('src/utils/events.ts', {});
  const stories = load('src/utils/stories.ts', { './events': events, '../../assets/events/club.jpg': 7 });
  const organizer = { id: ORG, slug: 'club', displayName: 'Club Eins', city: 'Karlsruhe', avatarUrl: 'https://example.org/logo.png',
    nextEvent: { id: 'e2', title: 'Freitag', startsAt: '2026-11-20T22:00:00+01:00' },
    story: [{ id: '1', storagePath: `${ORG}/story-a.jpg`, url: 'https://example.org/a.jpg', caption: 'So war es', createdAt: '2026-11-15T10:00:00Z',
      event: { id: 'e1', title: 'Techno Night', startsAt: '2026-11-14T22:00:00+01:00' } }] };
  const page = stories.organizerStoryPage(organizer, '2026-11-17');
  assert.equal(page.media.length, 1);
  assert.equal(page.media[0].source.uri, 'https://example.org/a.jpg');
  assert.equal(page.media[0].caption, 'So war es');
  assert.match(page.media[0].detail, /Techno Night$/);
  assert.equal(page.actionLabel, 'Zum Profil');
  assert.equal(page.saveEvent, null);
  assert.match(page.subtitle, /^Nächstes Event: .*Freitag$/);
  assert.deepEqual(plain(stories.organizerCover(organizer)), { uri: 'https://example.org/a.jpg', logo: false });

  const logoOnly = stories.organizerStoryPage({ ...organizer, story: [], nextEvent: null }, '2026-11-17');
  assert.equal(logoOnly.media[0].source.uri, 'https://example.org/logo.png');
  assert.equal(logoOnly.media[0].placeholder, false);
  assert.equal(logoOnly.subtitle, null);
  assert.deepEqual(plain(stories.organizerCover({ story: [], avatarUrl: 'https://example.org/logo.png' })), { uri: 'https://example.org/logo.png', logo: true });

  const nothing = stories.organizerStoryPage({ ...organizer, story: [], avatarUrl: null }, '2026-11-17');
  assert.equal(nothing.media[0].placeholder, true, 'symbol photo is labelled as such');
  assert.match(nothing.placeholderNote, /noch keine Story/);
  assert.equal(stories.organizerCover({ story: [], avatarUrl: null }), null);
});

test('event story page keeps the former texts of the event story', () => {
  const events = load('src/utils/events.ts', {});
  const stories = load('src/utils/stories.ts', { './events': events });
  const event = { id: 'e', title: 'Nacht', categories: ['Club'], genres: ['Techno'], startsAt: '2026-11-17T22:00:00+01:00', location: 'Karlsruhe', venue: 'Halle', image: { uri: 'https://example.org/e.jpg' }, imageIsPlaceholder: false };
  const page = stories.eventStoryPage(event, '2026-11-17', 'Zum Veranstalter');
  assert.equal(page.overline, 'HEUTE · 22:00 UHR');
  assert.equal(page.place, 'Halle · Karlsruhe');
  assert.deepEqual(plain(page.tags), ['Techno']);
  assert.deepEqual(plain(page.saveEvent), { id: 'e', title: 'Nacht' });
  assert.equal(page.actionLabel, 'Zum Veranstalter');
});

test('studio helpers: ticket prices in cents and invite codes in groups of four', () => {
  const api = load('src/features/organizer/organizerApi.ts', { '../accounts/client': { getAccountClient: () => client },
    '../../services/organizerStories': service(), '../../services/organizers': { postImageUrls: async () => new Map() }, './signup': {} });
  assert.equal(api.parsePrice('12'), 1200);
  assert.equal(api.parsePrice('12,5'), 1250);
  assert.equal(api.parsePrice(' 8.90 € '), 890);
  assert.equal(api.parsePrice('0'), 0);
  assert.equal(api.parsePrice(''), null, 'empty means price open');
  assert.equal(api.parsePrice('zwölf'), 'invalid');
  assert.equal(api.parsePrice('12,555'), 'invalid');
  assert.equal(api.parsePrice('-5'), 'invalid');
  assert.equal(api.formatInviteCode('0A1B2C3D4E5F'), '0A1B-2C3D-4E5F');
});

test('daily totals: one row per day with zeros, sums over events, days outside the window ignored', () => {
  const api = load('src/features/organizer/organizerApi.ts', { '../accounts/client': { getAccountClient: () => client },
    '../../services/organizerStories': service(), '../../services/organizers': { postImageUrls: async () => new Map() }, './signup': {} });
  const rows = [
    { eventId: 'a', day: '2026-11-21', views: 3, ticketClicks: 1, saves: 0, snaps: 0 },
    { eventId: 'b', day: '2026-11-21', views: 2, ticketClicks: 0, saves: 1, snaps: 4 },
    { eventId: 'a', day: '2026-11-23', views: 5, ticketClicks: 2, saves: 0, snaps: 0 },
    { eventId: 'a', day: '2026-10-01', views: 99, ticketClicks: 0, saves: 0, snaps: 0 },
  ];
  const totals = plain(api.dailyTotals(rows, '2026-11-23', 4));
  assert.deepEqual(totals.map((row) => row.day), ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']);
  assert.deepEqual(totals[1], { day: '2026-11-21', views: 5, ticketClicks: 1, saves: 1, snaps: 4 });
  assert.deepEqual(totals[2], { day: '2026-11-22', views: 0, ticketClicks: 0, saves: 0, snaps: 0 });
  assert.equal(totals[3].views, 5);
  assert.equal(api.dailyTotals([], '2026-03-01', 3)[0].day, '2026-02-27', 'crosses month borders');
});

test('post images: signed links in gallery order, posts without readable media stay without images', async () => {
  const media = [
    { post_id: 'p1', storage_path: 'u/a.jpg', sort_order: 0 }, { post_id: 'p1', storage_path: 'u/b.jpg', sort_order: 1 },
    { post_id: 'p2', storage_path: 'u/c.jpg', sort_order: 0 }, { post_id: 'p2', storage_path: 'u/blocked.jpg', sort_order: 1 },
  ];
  const calls = [];
  const stub = {
    from: (table) => ({ select: () => ({ in: (column, ids) => ({ order: () => ({ limit: async () => { calls.push([table, column, ids]); return { data: media, error: null }; } }) }) }) }),
    storage: { from: (bucket) => ({ createSignedUrls: async (paths, seconds) => { calls.push([bucket, seconds]);
      return { data: paths.map((p) => p.includes('blocked') ? { path: p, signedUrl: null, error: 'not found' } : { path: p, signedUrl: `https://proj.supabase.co/sign/${p}?token=t` }) }; } }) },
  };
  const { postImageUrls } = load('src/services/organizers.ts', { '../lib/supabase': { getSupabase: () => stub } });
  const images = await postImageUrls(stub, ['p1', 'p2', 'p3']);
  assert.deepEqual(plain(images.get('p1')), ['https://proj.supabase.co/sign/u/a.jpg?token=t', 'https://proj.supabase.co/sign/u/b.jpg?token=t']);
  assert.deepEqual(plain(images.get('p2')), ['https://proj.supabase.co/sign/u/c.jpg?token=t']);
  assert.equal(images.get('p3'), undefined);
  assert.deepEqual(plain(calls[0]), ['organizer_post_media', 'post_id', ['p1', 'p2', 'p3']]);
  assert.deepEqual(plain(calls[1]), ['organizer-media', 3600]);
  assert.equal((await postImageUrls(stub, [])).size, 0);
});
