// Echte SQL von 26_organizer_review_stats.sql in PGlite (nie Supabase): Antrag/Freigabe und Event-Statistik.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const ADMIN = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
const OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002';
const EDITOR = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000003';
const STRANGER = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000004';
const OLD_OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000005';
const GOABASE = 'bbbbbbbb-bbbb-4bbb-8bbb-000000000101';
const DEVICE_A = 'device-aaaaaaaaaaaaaaaa';
const DEVICE_B = 'device-bbbbbbbbbbbbbbbb';

test('organizer review + stats SQL: request, team approval, no self-publishing, privacy-friendly counters', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql', '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${ADMIN}','admin@example.invalid'),('${OWNER}','owner@example.invalid'),
    ('${EDITOR}','editor@example.invalid'),('${STRANGER}','stranger@example.invalid'),('${OLD_OWNER}','old@example.invalid');
    insert into events(id,title,source,source_event_id,starts_at,status,is_published)
    values('${GOABASE}','Goabase party','goabase','1',now()+interval '1 day','scheduled',true);`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql', '25_account_lifecycle.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id, note) values ('${ADMIN}', 'Fixture')`);

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const one = async (user, statement, params) => (await as(user, statement, params)).rows[0];

  // Ein Veranstalter, der vor SQL 26 schon öffentlich war, bleibt öffentlich (gilt als freigegeben).
  const legacy = (await one(OLD_OWNER, `select public.create_organizer('alter-club','Alter Club') id`)).id;
  await as(OLD_OWNER, `update organizers set is_published=true where id=$1`, [legacy]);
  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('26_organizer_review_stats.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 26 must not change events');
  assert.deepEqual(await one(null, `select review_status, is_published from organizers where id=$1`, [legacy]), { review_status: 'approved', is_published: true });

  const organizer = (await one(OWNER, `select public.create_organizer('neuer-club','Neuer Club') id`)).id;
  await as(OWNER, `select public.set_organizer_editor($1,$2,true)`, [organizer, EDITOR]);

  await t.test('organizers can no longer publish themselves', async () => {
    await assert.rejects(as(OWNER, `update organizers set is_published=true where id=$1`, [organizer]), /permission denied/);
    await assert.rejects(as(OWNER, `update organizers set review_status='approved' where id=$1`, [organizer]), /permission denied/);
    // Profiltexte bleiben bearbeitbar.
    assert.equal((await as(OWNER, `update organizers set city='Karlsruhe' where id=$1 returning id`, [organizer])).rows.length, 1);
    assert.equal((await as(null, `select id from organizers where id=$1`, [organizer])).rows.length, 0, 'draft is not public');
    // Events eines nicht freigegebenen Veranstalters bleiben Entwürfe.
    await assert.rejects(as(OWNER, `insert into events(title,source,organizer_id,starts_at,status,is_published)
      values('Zu früh','spots',$1,now()+interval '2 days','scheduled',true)`, [organizer]), /row-level security/);
  });

  await t.test('only the owner submits; editors and strangers cannot', async () => {
    await assert.rejects(as(EDITOR, `select public.spots_organizer_submit($1)`, [organizer]), /Owner required/);
    await assert.rejects(as(STRANGER, `select public.spots_organizer_submit($1)`, [organizer]), /Owner required/);
    await assert.rejects(as(null, `select public.spots_organizer_submit($1)`, [organizer]), /permission denied/);
    await as(OWNER, `select public.spots_organizer_submit($1)`, [organizer]);
    await assert.rejects(as(OWNER, `select public.spots_organizer_submit($1)`, [organizer]), /cannot be submitted/);
    await as(OWNER, `select public.spots_organizer_withdraw($1)`, [organizer]);
    await as(OWNER, `select public.spots_organizer_submit($1)`, [organizer]);
  });

  await t.test('only admins see the queue and decide', async () => {
    await assert.rejects(as(OWNER, `select * from public.spots_admin_organizer_queue()`), /Not allowed/);
    await assert.rejects(as(OWNER, `select public.spots_admin_review_organizer($1,'approved')`, [organizer]), /Not allowed/);
    const queue = (await as(ADMIN, `select id, review_status, owner_email from public.spots_admin_organizer_queue()`)).rows;
    assert.deepEqual(queue[0], { id: organizer, review_status: 'pending', owner_email: 'owner@example.invalid' });
    await as(ADMIN, `select public.spots_admin_review_organizer($1,'rejected','Bitte Website angeben')`, [organizer]);
    assert.deepEqual(await one(OWNER, `select review_status, review_note, is_published from organizers where id=$1`, [organizer]),
      { review_status: 'rejected', review_note: 'Bitte Website angeben', is_published: false });
    await assert.rejects(as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [organizer]), /not allowed/);
    await as(OWNER, `select public.spots_organizer_submit($1)`, [organizer]);
    await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [organizer]);
    assert.equal((await as(null, `select id from organizers where id=$1`, [organizer])).rows.length, 1, 'approved is public');
  });

  let eventId;
  await t.test('after approval, events go live without further review; suspension hides them again', async () => {
    eventId = (await one(EDITOR, `insert into events(title,source,organizer_id,starts_at,status,is_published)
      values('Opening','spots',$1,now()+interval '2 days','scheduled',true) returning id`, [organizer])).id;
    assert.equal((await as(null, `select id from events where id=$1`, [eventId])).rows.length, 1);
    await as(ADMIN, `select public.spots_admin_review_organizer($1,'suspended','Prüfung')`, [organizer]);
    assert.equal((await as(null, `select id from events where id=$1`, [eventId])).rows.length, 0);
    await assert.rejects(as(OWNER, `select public.spots_organizer_submit($1)`, [organizer]), /cannot be submitted/);
    await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [organizer]);
    assert.equal((await as(null, `select id from events where id=$1`, [eventId])).rows.length, 1);
  });

  await t.test('counters: once per device, event, kind and day; imports and junk ignored; no raw ids stored', async () => {
    for (let i = 0; i < 3; i++) await as(null, `select public.spots_track_event($1,'view',$2)`, [eventId, DEVICE_A]);
    await as(STRANGER, `select public.spots_track_event($1,'view',$2)`, [eventId, DEVICE_B]);
    await as(null, `select public.spots_track_event($1,'ticket_click',$2)`, [eventId, DEVICE_A]);
    await as(null, `select public.spots_track_event($1,'view',$2)`, [GOABASE, DEVICE_A]);
    await as(null, `select public.spots_track_event($1,'like',$2)`, [eventId, DEVICE_A]);
    await as(null, `select public.spots_track_event($1,'view','kurz')`, [eventId]);
    await as(null, `select public.spots_track_event($1,'view',$2)`, ['bbbbbbbb-bbbb-4bbb-8bbb-00000000ffff', DEVICE_A]);
    await as(STRANGER, `insert into saved_events(event_id) values($1)`, [eventId]);
    const stats = await one(EDITOR, `select views, ticket_clicks, saves, snaps from public.spots_organizer_event_stats($1)`, [organizer]);
    assert.deepEqual(stats, { views: 2, ticket_clicks: 1, saves: 1, snaps: 0 });
    const stored = JSON.stringify((await db.query(`select * from spots_stats_private.recent_hits`)).rows);
    assert.ok(!stored.includes(DEVICE_A) && !stored.includes(eventId), 'only hashes are stored');
    assert.equal((await db.query(`select count(*)::int n from spots_stats_private.event_daily where event_id=$1`, [GOABASE])).rows[0].n, 0);
  });

  await t.test('every uploaded snap of an organizer event counts once', async () => {
    const live = (await one(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
      values('Jetzt','spots',$1,now()-interval '1 hour',now()+interval '4 hours','scheduled',true) returning id`, [organizer])).id;
    await as(OWNER, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${OWNER}/a.jpg')`, [live]);
    await as(STRANGER, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${STRANGER}/b.jpg')`, [live]);
    await as(STRANGER, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${STRANGER}/c.jpg')`, [GOABASE]).catch(() => {});
    const rows = (await as(OWNER, `select event_id, snaps from public.spots_organizer_event_stats($1)`, [organizer])).rows;
    assert.equal(rows.find((row) => row.event_id === live).snaps, 2);
  });

  await t.test('stats and counter tables are private', async () => {
    await assert.rejects(as(STRANGER, `select * from public.spots_organizer_event_stats($1)`, [organizer]), /Not allowed/);
    await assert.rejects(as(null, `select * from public.spots_organizer_event_stats($1)`, [organizer]), /permission denied/);
    await assert.rejects(as(OWNER, `select * from spots_stats_private.event_daily`), /permission denied/);
    assert.equal((await as(ADMIN, `select * from public.spots_organizer_event_stats($1)`, [organizer])).rows.length, 2);
  });

  await t.test('old salts and hashes are cleaned up', async () => {
    await db.exec(`insert into spots_stats_private.daily_salt values (current_date - 5, 'alt');
      insert into spots_stats_private.recent_hits values (current_date - 5, 'alt')`);
    await as(null, `select public.spots_track_event($1,'view','device-cccccccccccccccc')`, [eventId]);
    assert.equal((await db.query(`select count(*)::int n from spots_stats_private.daily_salt where salt='alt'`)).rows[0].n, 0);
    assert.equal((await db.query(`select count(*)::int n from spots_stats_private.recent_hits where hit='alt'`)).rows[0].n, 0);
  });

  await t.test('account deletion still hides orphaned organizers', async () => {
    await as(OLD_OWNER, `select public.spots_delete_my_account()`);
    assert.deepEqual((await db.query(`select review_status, is_published from organizers where id=$1`, [legacy])).rows[0],
      { review_status: 'approved', is_published: false });
  });

  await t.test('organizer limit: at most three owned organizers per account', async () => {
    for (const slug of ['zwei-club', 'drei-club']) await as(OWNER, `select public.create_organizer($1,'X')`, [slug]);
    await assert.rejects(as(OWNER, `select public.create_organizer('vier-club','X')`), /limit reached/);
  });

  await assert.rejects(db.exec(sql('26_organizer_review_stats.sql')), /already exist/);
});
