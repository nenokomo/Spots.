// Echte SQL von 20_ticketmaster_sync_backend.sql in PGlite (nie Supabase).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sql = (name) => fs.readFileSync(path.join(root, 'supabase/ops', name), 'utf8');
const GOABASE_ID = 'eeeeeeee-eeee-4eee-8eee-000000000201';

function loadSync() {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'supabase/functions/import-ticketmaster/sync.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, URL, URLSearchParams, AbortController, setTimeout, clearTimeout });
  return module.exports;
}

test('Ticketmaster SQL: lease, upsert with stable UUIDs, visibility, removals, block list, permissions', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql',
    '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  await db.exec(`insert into events(id,title,source,source_event_id,starts_at,status,is_published)
    values('${GOABASE_ID}','Goabase party','goabase','4711',now()+interval '2 days','scheduled',true)`);
  await db.exec(sql('15_organizer_accounts.sql'));
  await db.exec(sql('20_ticketmaster_sync_backend.sql'));
  await db.exec(sql('20_ticketmaster_sync_backend.sql')); // wiederholbar

  const { mapEvent } = loadSync();
  const at = (h) => new Date(Date.now() + h * 3_600_000).toISOString();
  const tm = (id, { start = 24, end, status = 'onsale', url, name = `Konzert ${id}` } = {}) => {
    const result = mapEvent({ id, name, url: url ?? `https://www.ticketmaster.de/event/${id}`,
      dates: { start: { dateTime: at(start) }, ...(end != null ? { end: { dateTime: at(end) } } : {}), status: { code: status } },
      classifications: [{ primary: true, segment: { name: 'Music' }, genre: { name: 'Hip-Hop/Rap' } }],
      _embedded: { venues: [{ name: 'Halle', city: { name: 'Köln' }, location: { latitude: '50.94', longitude: '6.96' } }] } });
    assert.ok('row' in result, JSON.stringify(result));
    return JSON.parse(JSON.stringify(result.row));
  };
  const rpc = async (name, args = []) => {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(',');
    return (await db.query(`select public.${name}(${placeholders}) as value`, args)).rows[0].value;
  };
  const apply = (token, rows, removed = [], unconfirmed = []) => rpc('spots_ticketmaster_apply',
    [token, JSON.stringify(rows), JSON.stringify(removed), JSON.stringify(unconfirmed)]);
  const event = async (id) => (await db.query(`select * from events where source='ticketmaster' and source_event_id=$1`, [id])).rows[0];
  const goabase = async () => (await db.query(`select to_jsonb(e) as row from events e where id='${GOABASE_ID}'`)).rows[0].row;
  const goabaseBefore = await goabase();
  const count = async () => (await db.query(`select count(*)::int as n from events where source='ticketmaster'`)).rows[0].n;

  await t.test('only one run at a time; release frees the lease', async () => {
    const lease = await rpc('spots_ticketmaster_begin');
    assert.deepEqual(lease.ids, []);
    assert.equal(await rpc('spots_ticketmaster_begin'), null);
    await rpc('spots_ticketmaster_release', [lease.token]);
    const again = await rpc('spots_ticketmaster_begin');
    assert.ok(again.token);
    await rpc('spots_ticketmaster_release', [again.token]);
  });

  let firstUuid;
  await t.test('insert, unchanged repeat, update keeps the UUID; visibility is computed in SQL', async () => {
    const lease = await rpc('spots_ticketmaster_begin');
    const rows = [tm('T1'), tm('T2', { status: 'cancelled' }), tm('T3', { start: -2 }), tm('T4', { start: -10 }),
      tm('T5', { start: -10, end: 2 })];
    assert.deepEqual(await apply(lease.token, rows),
      { inserted: 5, updated: 0, unchanged: 0, blocked: 0, removed: 0, unconfirmed: 0 });
    const published = Object.fromEntries((await db.query(
      `select source_event_id, is_published from events where source='ticketmaster'`)).rows.map((r) => [r.source_event_id, r.is_published]));
    assert.deepEqual(published, { T1: true, T2: false, T3: true, T4: false, T5: true },
      'cancelled hidden; without end visible for 8 hours like in the app');
    firstUuid = (await event('T1')).id;
    assert.deepEqual(await apply(lease.token, rows),
      { inserted: 0, updated: 0, unchanged: 5, blocked: 0, removed: 0, unconfirmed: 0 });
    const renamed = tm('T1', { name: 'Neuer Titel' });
    assert.equal((await apply(lease.token, [renamed])).updated, 1);
    const updated = await event('T1');
    assert.equal(updated.id, firstUuid);
    assert.equal(updated.title, 'Neuer Titel');
    assert.equal(updated.genre, 'Hip-Hop');
    assert.equal(updated.category, 'concert');
    assert.equal(updated.organizer_id, null);
    await rpc('spots_ticketmaster_release', [lease.token]);
  });

  await t.test('invalid batches are rejected completely', async () => {
    const lease = await rpc('spots_ticketmaster_begin');
    const before = await count();
    const valid = tm('T9');
    const invalid = [
      [{ ...valid, source: 'goabase' }], [{ ...valid, ticket_url: 'https://www.travelcircus.de/x' }],
      [{ ...valid, source_url: 'https://ticketmaster.de.evil.example/x' }], [{ ...valid, title: '  ' }],
      [{ ...valid, status: 'source_removed' }], [{ ...valid, category: 'club' }], [{ ...valid, image_url: 'http://x' }],
      [{ ...valid, source_event_id: 'bad id' }], [{ ...valid, ends_at: valid.starts_at }], [valid, valid],
    ];
    for (const rows of invalid) await assert.rejects(apply(lease.token, rows), /Invalid|Duplicate/, JSON.stringify(rows[0]));
    await assert.rejects(apply(lease.token, [tm('T10')], ['T10']), /Duplicate/);
    await assert.rejects(apply(lease.token, [], ['bad id']), /Invalid Ticketmaster ID/);
    assert.equal(await count(), before);
    await rpc('spots_ticketmaster_release', [lease.token]);
    await assert.rejects(apply(lease.token, [valid]), /lease/, 'released token cannot write');
    await assert.rejects(apply(null, [valid]), /lease/);
  });

  await t.test('known IDs, removals and unconfirmed events keep their rows but are hidden', async () => {
    const lease = await rpc('spots_ticketmaster_begin');
    assert.deepEqual([...lease.ids].sort(), ['T1', 'T3', 'T4', 'T5'],
      'scheduled events that started at most 12 hours ago (search lookback) or later; cancelled T2 is not rechecked');
    assert.deepEqual(await apply(lease.token, [], ['T3', 'UNKNOWN'], ['T5']),
      { inserted: 0, updated: 0, unchanged: 0, blocked: 0, removed: 1, unconfirmed: 1 });
    assert.deepEqual([(await event('T3')).status, (await event('T3')).is_published], ['source_removed', false]);
    assert.deepEqual([(await event('T5')).status, (await event('T5')).is_published], ['source_unconfirmed', false]);
    assert.equal((await apply(lease.token, [], ['T3'])).removed, 0, 'repeat is a no-op');
    await rpc('spots_ticketmaster_release', [lease.token]);
  });

  await t.test('block list: removal request hides immediately and stays hidden on import', async () => {
    assert.equal(await rpc('spots_ticketmaster_block', ['T1', 'Löschwunsch Veranstalter']), true);
    assert.equal((await event('T1')).is_published, false);
    const lease = await rpc('spots_ticketmaster_begin');
    assert.equal((await apply(lease.token, [tm('T1')])).blocked, 1);
    assert.equal((await event('T1')).is_published, false);
    await rpc('spots_ticketmaster_release', [lease.token]);
    await assert.rejects(rpc('spots_ticketmaster_block', ['bad id', 'x']), /Invalid/);
    await assert.rejects(rpc('spots_ticketmaster_block', ['T2', ' ']), /Invalid/);
  });

  await t.test('an expired lease cannot write after a takeover', async () => {
    const lease = await rpc('spots_ticketmaster_begin');
    await db.exec(`update spots_sync_private.ticketmaster_lease set expires_at = now() - interval '1 second'`);
    await assert.rejects(apply(lease.token, [tm('T7')]), /lease/);
    const takeover = await rpc('spots_ticketmaster_begin');
    assert.notEqual(takeover.token, lease.token);
    await rpc('spots_ticketmaster_release', [lease.token]); // alter Besitzer kann neue Sperre nicht lösen
    assert.equal(await rpc('spots_ticketmaster_begin'), null);
    await rpc('spots_ticketmaster_release', [takeover.token]);
  });

  await t.test('Goabase rows are untouched; only the service role may call the import functions', async () => {
    assert.deepEqual(await goabase(), goabaseBefore);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        for (const call of ['spots_ticketmaster_begin()', `spots_ticketmaster_release(gen_random_uuid())`,
          `spots_ticketmaster_apply(gen_random_uuid(),'[]','[]','[]')`, `spots_ticketmaster_block('T2','x')`]) {
          await assert.rejects(db.query(`select public.${call}`), /permission denied/, `${role}: ${call}`);
        }
        await assert.rejects(db.query('select * from spots_sync_private.ticketmaster_blocklist'), /permission denied/);
      } finally { await db.exec('reset role'); }
    }
    await db.exec('set role service_role');
    try {
      const lease = (await db.query('select public.spots_ticketmaster_begin() as v')).rows[0].v;
      assert.ok(lease.token);
      await db.query('select public.spots_ticketmaster_release($1)', [lease.token]);
    } finally { await db.exec('reset role'); }
  });
});
