// Echte SQL von 25_account_lifecycle.sql in PGlite (auf 15 und 17): Konto löschen und Merkliste mit Konto.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test');
const root = path.resolve(__dirname, '..');
const sql = name => fs.readFileSync(path.join(root, 'supabase/ops', name), 'utf8');

const OWNER = 'eeeeeeee-eeee-4eee-8eee-000000000001';
const VISITOR = 'eeeeeeee-eeee-4eee-8eee-000000000002';
const PARTNER = 'eeeeeeee-eeee-4eee-8eee-000000000003';
const LIVE = 'eeeeeeee-eeee-4eee-8eee-000000000101';
const FUTURE = 'eeeeeeee-eeee-4eee-8eee-000000000102';
const DRAFT = 'eeeeeeee-eeee-4eee-8eee-000000000103';
const UNKNOWN = 'eeeeeeee-eeee-4eee-8eee-000000000999';

test('account lifecycle SQL: saved events sync and own account deletion', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async t => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE), db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql', '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${OWNER}','o@example.invalid'),('${VISITOR}','v@example.invalid'),('${PARTNER}','p@example.invalid');
  insert into events(id,title,source,source_event_id,starts_at,ends_at,status,is_published) values
   ('${LIVE}','Live import','goabase','1',now()-interval '2 hours',now()+interval '4 hours','scheduled',true),
   ('${FUTURE}','Future import','goabase','2',now()+interval '3 days',now()+interval '3 days 6 hours','scheduled',true),
   ('${DRAFT}','Unpublished import','goabase','3',now()-interval '1 hour',now()+interval '4 hours','scheduled',false);`);
  await db.exec(sql('15_organizer_accounts.sql'));
  await db.exec(sql('17_content_tickets.sql'));
  const imports = async () => (await db.query(`select to_jsonb(e) as data from events e where source='goabase' order by id`)).rows;
  const before = await imports();
  await db.exec(sql('25_account_lifecycle.sql'));
  await db.exec(sql('25_account_lifecycle.sql')); // wiederholbar

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);` : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const ids = rows => rows.map(r => Object.values(r)[0]);
  const sync = async (user, add) => ids((await as(user, `select * from public.spots_sync_saved_events($1::uuid[])`, [add])).rows);

  await t.test('only signed-in users may call the functions', async () => {
    await assert.rejects(as(null, `select public.spots_sync_saved_events('{}')`), /permission denied/);
    await assert.rejects(as(null, `select public.spots_delete_my_account()`), /permission denied/);
    await assert.rejects(db.query(`select public.spots_delete_my_account()`), /Not signed in/);
  });

  await t.test('device list merges into the account: public events only, no duplicates, private per user', async () => {
    assert.deepEqual(await sync(VISITOR, []), []);
    const merged = await sync(VISITOR, [LIVE, FUTURE, DRAFT, UNKNOWN, LIVE]);
    assert.deepEqual([...merged].sort(), [FUTURE, LIVE].sort(), 'unpublished and unknown IDs are skipped');
    assert.deepEqual([...await sync(VISITOR, [FUTURE])].sort(), [FUTURE, LIVE].sort(), 'repeat is harmless');
    assert.deepEqual(await sync(PARTNER, []), [], 'other accounts see nothing');
    await as(VISITOR, `delete from saved_events where event_id=$1`, [LIVE]);
    assert.deepEqual(await sync(VISITOR, []), [FUTURE], 'removing works through the table');
    await assert.rejects(sync(VISITOR, Array.from({ length: 501 }, (_, i) => `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, '0')}`)), /Too many/);
  });

  await t.test('deleting an account: own data gone, sole organizers hidden, shared organizers stay, events never deleted', async () => {
    const solo = (await as(OWNER, `select public.create_organizer('solo-club','Solo Club') id`)).rows[0].id;
    const shared = (await as(OWNER, `select public.create_organizer('shared-club','Shared Club') id`)).rows[0].id;
    await as(OWNER, `update organizers set is_published=true where id = any($1::uuid[])`, [[solo, shared]]);
    await as(OWNER, `select public.set_organizer_editor($1,$2,true)`, [shared, PARTNER]);
    const soloEvent = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,status,is_published)
      values('Solo night','spots',$1,now()+interval '1 day','scheduled',true) returning id`, [solo])).rows[0].id;
    const sharedEvent = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,status,is_published)
      values('Shared night','spots',$1,now()+interval '1 day','scheduled',true) returning id`, [shared])).rows[0].id;
    await as(OWNER, `select public.save_private_profile('Owner')`);
    await sync(OWNER, [LIVE]);

    assert.equal((await as(OWNER, `select public.spots_delete_my_account() ok`)).rows[0].ok, true);
    const row = async (q, p) => (await db.query(q, p)).rows[0];
    assert.equal((await row(`select count(*)::int n from auth.users where id=$1`, [OWNER])).n, 0);
    assert.equal((await row(`select count(*)::int n from user_profiles where id=$1`, [OWNER])).n, 0);
    assert.equal((await row(`select count(*)::int n from saved_events where user_id=$1`, [OWNER])).n, 0);
    assert.equal((await row(`select count(*)::int n from organizer_memberships where user_id=$1`, [OWNER])).n, 0);
    assert.deepEqual(await row(`select is_published from organizers where id=$1`, [solo]), { is_published: false });
    assert.deepEqual(await row(`select is_published from organizers where id=$1`, [shared]), { is_published: true }, 'partner keeps it');
    assert.deepEqual(await row(`select is_published from events where id=$1`, [soloEvent]), { is_published: false });
    assert.deepEqual(await row(`select is_published from events where id=$1`, [sharedEvent]), { is_published: true });
    assert.equal((await row(`select count(*)::int n from events where id = any($1::uuid[])`, [[soloEvent, sharedEvent]])).n, 2, 'events stay');
    assert.equal((await row(`select count(*)::int n from auth.users where id = any($1::uuid[])`, [[VISITOR, PARTNER]])).n, 2, 'others untouched');
    assert.deepEqual(await sync(VISITOR, []), [FUTURE]);
    assert.deepEqual(await imports(), before, 'imported events unchanged');
  });
});
