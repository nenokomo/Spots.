// Runs the actual SQL in an ephemeral PostgreSQL WASM database, never Supabase.
// Install PGlite outside the app; see GOABASE_SYNC.md for the reproducible command.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const pgliteModule = process.env.SPOTS_PGLITE_MODULE;

test('real SQL: lease fencing, atomic upsert, versions, UUIDs and permissions', {
  skip: !pgliteModule && 'Set SPOTS_PGLITE_MODULE to the isolated PGlite installation',
}, async t => {
  const { PGlite } = require(pgliteModule);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  const inspect = fs.readFileSync(path.join(root, 'supabase/ops/04_inspect_test_schema.sql'), 'utf8');
  assert.equal((await db.query(inspect)).rows[0].inspection.events_table, null);
  const bootstrap = fs.readFileSync(path.join(root, 'supabase/ops/05_create_test_events.sql'), 'utf8');
  await db.exec(bootstrap);
  const inspected = (await db.query(inspect)).rows[0].inspection;
  assert.equal(inspected.columns.length, 19);
  assert.equal(inspected.rls[0].enabled, true);
  assert.equal(inspected.policies[0].cmd, 'SELECT');
  await assert.rejects(db.exec(bootstrap), /events already exists/);
  await db.exec('rollback'); // The failed guarded bootstrap must not replace the table.
  const sql = fs.readFileSync(path.join(root, 'supabase/ops/03_goabase_sync_backend.sql'), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // Reviewable repeat installation, no duplicate index or data.
  async function rpc(name, args = []) {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(',');
    return (await db.query(`select public.${name}(${placeholders}) as value`, args)).rows[0].value;
  }
  const begin = () => rpc('spots_goabase_begin');
  const release = token => rpc('spots_goabase_release', [token]);
  const apply = (token, rows) => rpc('spots_goabase_apply', [token, JSON.stringify(rows)]);
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,
    'supabase/functions/import-goabase/sync.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, URL });
  const row = (changes = {}) => module.exports.mapParty({ id: 1001, nameParty: 'SQL fixture',
    nameStatus: 'Scheduled', dateStart: '2099-06-01T14:00:00Z', dateEnd: '2099-06-01T18:00:00Z',
    dateModified: '2026-11-01T10:00:00Z', nameTown: 'Fixture town', ...changes },
    String(changes.id ?? 1001), Date.now());

  await t.test('overlapping acquisition returns busy; release preserves known inventory', async () => {
    const lease = await begin();
    assert.equal(await begin(), null);
    assert.deepEqual(lease.ids, []);
    await release(lease.token);
  });

  await t.test('repeated imports preserve UUID and count unchanged rows accurately', async () => {
    let lease = await begin();
    assert.equal((await apply(lease.token, [row()])).inserted, 1);
    const first = (await db.query('select * from events')).rows[0];
    await release(lease.token);
    lease = await begin();
    assert.deepEqual(lease.ids, ['1001']);
    assert.equal((await apply(lease.token, [row()])).unchanged, 1);
    assert.equal((await db.query('select * from events')).rows[0].id, first.id);
    await release(lease.token);
  });

  await t.test('cancellation updates status/flag; stale and conflicting equal versions cannot republish', async () => {
    const lease = await begin();
    const cancelled = row({ nameStatus: 'Cancelled', dateModified: '2026-11-02T10:00:00Z' });
    assert.equal((await apply(lease.token, [cancelled])).cancelled, 1);
    assert.equal((await apply(lease.token, [row()])).rejected_versions, 1);
    assert.equal((await apply(lease.token, [row({ dateModified: cancelled.source_modified_at })])).rejected_versions, 1);
    const event = (await db.query('select * from events')).rows[0];
    assert.equal(event.status, 'cancelled');
    assert.equal(event.is_published, false);
    await release(lease.token);
  });

  await t.test('postponement and confirmed new dates update the same event', async () => {
    const lease = await begin();
    const id = (await db.query('select id from events')).rows[0].id;
    await apply(lease.token, [row({ nameStatus: 'Postponed', dateModified: '2026-11-03T10:00:00Z' })]);
    assert.equal((await db.query('select * from events')).rows[0].is_published, false);
    const next = row({ nameParty: 'New date', dateStart: '2099-07-01T14:00:00Z',
      dateEnd: '2099-07-01T18:00:00Z', dateModified: '2026-11-04T10:00:00Z', geoLat: 50 });
    assert.equal((await apply(lease.token, [next])).updated, 1);
    const event = (await db.query('select * from events')).rows[0];
    assert.equal(event.id, id);
    assert.equal(event.title, 'New date');
    assert.equal(event.latitude, 50);
    assert.equal(event.is_published, true);
    await release(lease.token);
  });

  await t.test('expired owner cannot apply or release the replacement lease', async () => {
    const old = await begin();
    await db.exec("update spots_sync_private.goabase_lease set expires_at = now() - interval '1 second'");
    const replacement = await begin();
    assert.notEqual(old.token, replacement.token);
    await assert.rejects(apply(old.token, [row()]), /Invalid or expired/);
    await release(old.token);
    assert.equal(await begin(), null);
    await apply(replacement.token, []);
    await release(replacement.token);
  });

  await t.test('invalid row rolls back the entire batch; duplicate IDs are rejected', async () => {
    const lease = await begin();
    await assert.rejects(apply(lease.token, [row({ id: 1002 }), { ...row({ id: 1003 }), starts_at: 'broken' }]));
    assert.equal((await db.query('select count(*)::int as n from events')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int as n from spots_sync_private.goabase_versions')).rows[0].n, 1);
    await assert.rejects(apply(lease.token, [row(), row()]), /Duplicate source/);
    await release(lease.token);
  });

  await t.test('empty batches never delete or cancel; DB enforces expiry independently', async () => {
    const lease = await begin();
    await apply(lease.token, []);
    assert.equal((await db.query('select count(*)::int as n from events')).rows[0].n, 1);
    const past = row({ id: 1002, dateStart: '2000-06-01T10:00:00Z', dateEnd: '2000-06-01T11:00:00Z' });
    past.is_published = true;
    await apply(lease.token, [past]);
    assert.equal((await db.query("select is_published from events where source_event_id='1002'")).rows[0].is_published, false);
    await release(lease.token);
  });

  await t.test('backend RPC permissions exclude PUBLIC, anon and authenticated', async () => {
    for (const name of ['spots_goabase_begin()', 'spots_goabase_apply(uuid,jsonb)', 'spots_goabase_release(uuid)']) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        const result = await db.query("select has_function_privilege($1, $2, 'EXECUTE') as allowed", [role, `public.${name}`]);
        assert.equal(result.rows[0].allowed, role === 'service_role');
      }
    }
    const result = await db.query("select has_schema_privilege('anon', 'spots_sync_private', 'USAGE') as allowed");
    assert.equal(result.rows[0].allowed, false);
  });

  await t.test('controlled source fixtures exercise the real RPCs and roll back all fixture data', async () => {
    const { prepare } = require('../scripts/test-goabase-fixtures.cjs');
    const results = await db.exec(await prepare());
    const outcome = results.at(-1).rows[0].fixture_results;
    assert.equal(outcome.passed, true);
    assert.equal(outcome.fixture_rollback_verified, true);
    assert.equal(outcome.cases.length, 11);
    assert.equal(outcome.original_events, 2);
  });
});
