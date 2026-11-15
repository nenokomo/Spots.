// Echte SQL von 30_shots_moderation.sql in PGlite (nie Supabase): Shots sofort sichtbar, Melden blendet aus,
// Team-Moderation, Aufräumen nur durch den Server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const ADMIN = '30303030-3030-4030-8030-000000000001';
const GUEST = '30303030-3030-4030-8030-000000000002';
const R1 = '30303030-3030-4030-8030-000000000003';
const R2 = '30303030-3030-4030-8030-000000000004';
const R3 = '30303030-3030-4030-8030-000000000005';
const LIVE = '30303030-3030-4030-8030-000000000101';
const LATER = '30303030-3030-4030-8030-000000000102';

test('shots SQL: visitor shots visible at once, reports hide, team moderates, only the server cleans up', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql', '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${ADMIN}','a@example.invalid'),('${GUEST}','g@example.invalid'),('${R1}','1@example.invalid'),('${R2}','2@example.invalid'),('${R3}','3@example.invalid');
    insert into events(id,title,source,source_event_id,starts_at,ends_at,status,is_published) values
      ('${LIVE}','Läuft gerade','goabase','1',now()-interval '1 hour',now()+interval '4 hours','scheduled',true),
      ('${LATER}','Nächste Woche','goabase','2',now()+interval '7 days',now()+interval '7 days 6 hours','scheduled',true);`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id) values ('${ADMIN}')`);
  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('30_shots_moderation.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 30 must not change events');

  const as = async (user, statement, params, role = 'authenticated') => {
    await db.exec(user ? `set role ${role};select set_config('request.jwt.claim.sub','${user}',false);` : `set role ${role === 'authenticated' ? 'anon' : role};select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const visible = async (id) => (await as(null, `select id from live_snaps where id=$1`, [id])).rows.length === 1;
  const post = async (file, event = LIVE) => (await as(GUEST, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image',$2) returning id, moderation_status`, [event, `${GUEST}/${file}`])).rows[0];

  let shot;
  await t.test('a guest with an account posts during the event; the shot is visible at once; guests without account cannot post', async () => {
    shot = await post('a.jpg');
    assert.equal(shot.moderation_status, 'visible');
    assert.equal(await visible(shot.id), true);
    await assert.rejects(post('b.jpg', LATER), /row-level security/, 'only while the event runs');
    await assert.rejects(as(null, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','x/y.jpg')`, [LIVE]), /permission denied/);
  });

  await t.test('three reports hide a shot; the team still sees it in its queue, reported first', async () => {
    const quiet = await post('c.jpg');
    for (const reporter of [R1, R2, R3]) await as(reporter, `insert into content_reports(snap_id,reason) values($1,'privacy')`, [shot.id]);
    assert.equal(await visible(shot.id), false);
    const queue = (await as(ADMIN, `select id, moderation_status, report_count, reasons from public.spots_admin_snap_queue()`)).rows;
    assert.deepEqual({ ...queue[0], reasons: [...queue[0].reasons] }, { id: shot.id, moderation_status: 'hidden', report_count: 3, reasons: ['privacy'] });
    assert.ok(queue.some((row) => row.id === quiet.id));
    await assert.rejects(as(GUEST, `select * from public.spots_admin_snap_queue()`), /Not allowed/);
    await assert.rejects(as(null, `select * from public.spots_admin_snap_queue()`), /permission denied/);
    assert.equal((await as(ADMIN, `select id from live_snaps where id=$1`, [shot.id])).rows.length, 1, 'admins read hidden shots');
    assert.equal((await as(R1, `select id from live_snaps where id=$1`, [shot.id])).rows.length, 0, 'others do not');
  });

  await t.test('the team can show again, hide or remove; nobody else can', async () => {
    await as(ADMIN, `select public.spots_admin_set_snap_status($1,'visible')`, [shot.id]);
    assert.equal(await visible(shot.id), true);
    await as(ADMIN, `select public.spots_admin_set_snap_status($1,'removed')`, [shot.id]);
    assert.equal(await visible(shot.id), false);
    await assert.rejects(as(GUEST, `select public.spots_admin_set_snap_status($1,'visible')`, [shot.id]), /Not allowed/);
    await assert.rejects(as(ADMIN, `select public.spots_admin_set_snap_status($1,'pending')`, [shot.id]), /Not allowed/);
  });

  await t.test('cleanup: only the server role lists and deletes, and only expired shots', async () => {
    await db.exec(`update live_snaps set created_at=now()-interval '26 hours', expires_at=now()-interval '2 hours' where id='${shot.id}'`);
    await assert.rejects(as(GUEST, `select * from public.spots_snaps_cleanup_list()`), /permission denied/);
    const expired = (await as(null, `select id, storage_path from public.spots_snaps_cleanup_list()`, [], 'service_role')).rows;
    assert.deepEqual(expired, [{ id: shot.id, storage_path: `${GUEST}/a.jpg` }]);
    const all = (await db.query(`select id from live_snaps`)).rows.map((row) => row.id);
    const removed = (await as(null, `select public.spots_snaps_cleanup_delete($1::uuid[]) n`, [all], 'service_role')).rows[0].n;
    assert.equal(removed, 1, 'fresh shots are never deleted, even if passed in');
    assert.equal((await db.query(`select count(*)::int n from content_reports`)).rows[0].n, 0, 'reports go with the shot');
    await assert.rejects(as(GUEST, `select public.spots_snaps_cleanup_delete($1::uuid[])`, [all]), /permission denied/);
  });

  await assert.rejects(db.exec(sql('30_shots_moderation.sql')), /already exists/);
});
