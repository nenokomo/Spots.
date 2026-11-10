const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), test = require('node:test');
const root = path.resolve(__dirname, '..');
const sql = name => fs.readFileSync(path.join(root, 'supabase/ops', name), 'utf8');

const OWNER = 'eeeeeeee-eeee-4eee-8eee-000000000001';
const VISITOR = 'eeeeeeee-eeee-4eee-8eee-000000000002';
const STRANGER = 'eeeeeeee-eeee-4eee-8eee-000000000003';
const FOURTH = 'eeeeeeee-eeee-4eee-8eee-000000000004';
const LIVE_IMPORT = 'eeeeeeee-eeee-4eee-8eee-000000000101';
const FUTURE_IMPORT = 'eeeeeeee-eeee-4eee-8eee-000000000102';
const DRAFT_IMPORT = 'eeeeeeee-eeee-4eee-8eee-000000000103';

test('content SQL: Live Snaps lifetime/moderation, reports, saved events, ticket types and unchanged events', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL RLS tests',
}, async t => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE), db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql', '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${OWNER}','o@example.invalid'),('${VISITOR}','v@example.invalid'),('${STRANGER}','s@example.invalid'),('${FOURTH}','f@example.invalid');
  insert into events(id,title,source,source_event_id,starts_at,ends_at,status,is_published) values
   ('${LIVE_IMPORT}','Live import','goabase','1',now()-interval '2 hours',now()+interval '4 hours','scheduled',true),
   ('${FUTURE_IMPORT}','Future import','goabase','2',now()+interval '3 days',now()+interval '3 days 6 hours','scheduled',true),
   ('${DRAFT_IMPORT}','Unpublished import','goabase','3',now()-interval '1 hour',now()+interval '4 hours','scheduled',false);`);
  await db.exec(sql('15_organizer_accounts.sql'));
  const snapshot = async () => (await db.query(`select to_jsonb(e)-'organizer_id' as data from events e order by id`)).rows;
  const before = await snapshot();
  await db.exec(sql('17_content_tickets.sql'));
  assert.deepEqual(await snapshot(), before, 'SQL 17 must not change existing events');

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);` : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const count = async (user, table, where = 'true') => (await as(user, `select count(*)::int n from ${table} where ${where}`)).rows[0].n;

  // Owner sets up a published organizer with a live Spots event.
  const organizer = (await as(OWNER, `select public.create_organizer('content-fixture','Content fixture') id`)).rows[0].id;
  await as(OWNER, `update organizers set is_published=true where id=$1`, [organizer]);
  const spotsEvent = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Own night','spots',$1,now()-interval '1 hour',now()+interval '5 hours','scheduled',true) returning id`, [organizer])).rows[0].id;

  await t.test('visitor snaps start pending, last 24 hours and only during the event window', async () => {
    const row = (await as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${VISITOR}/a.jpg') returning moderation_status,by_organizer,author_id,extract(epoch from expires_at-created_at)::int seconds`, [LIVE_IMPORT])).rows[0];
    assert.deepEqual(row, { moderation_status: 'pending', by_organizer: false, author_id: VISITOR, seconds: 86400 });
    assert.equal(await count(null, 'live_snaps'), 0, 'pending snap must not be public');
    assert.equal(await count(VISITOR, 'live_snaps'), 1, 'author sees own snap');
    await assert.rejects(as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${VISITOR}/b.jpg')`, [FUTURE_IMPORT]), /row-level security/);
    await assert.rejects(as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${VISITOR}/c.jpg')`, [DRAFT_IMPORT]), /row-level security/);
    await assert.rejects(as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${OWNER}/d.jpg')`, [LIVE_IMPORT]), /row-level security/);
    await assert.rejects(as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path,moderation_status) values($1,'image','${VISITOR}/e.jpg','visible')`, [LIVE_IMPORT]), /permission denied/);
    await assert.rejects(as(null, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','x/y.jpg')`, [LIVE_IMPORT]), /permission denied/);
    await assert.rejects(as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path,duration_ms) values($1,'image','${VISITOR}/f.jpg',2000)`, [LIVE_IMPORT]), /check constraint/);
  });

  await t.test('organizer snaps are visible at once; organizers moderate visitor snaps of their own events only', async () => {
    await as(OWNER, `insert into live_snaps(event_id,media_type,storage_path,duration_ms) values($1,'video','${OWNER}/o.mp4',9000)`, [spotsEvent]);
    assert.equal(await count(null, 'live_snaps', `event_id='${spotsEvent}'`), 1);
    const visitorSnap = (await as(VISITOR, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${VISITOR}/g.jpg') returning id`, [spotsEvent])).rows[0].id;
    assert.equal((await as(STRANGER, `update live_snaps set moderation_status='visible' where id=$1 returning id`, [visitorSnap])).rows.length, 0, 'stranger cannot moderate');
    assert.equal((await as(OWNER, `update live_snaps set moderation_status='visible' where id=$1 returning id`, [visitorSnap])).rows.length, 1);
    assert.equal(await count(null, 'live_snaps', `event_id='${spotsEvent}'`), 2);
    await assert.rejects(as(OWNER, `update live_snaps set moderation_status='pending' where id=$1`, [visitorSnap]), /row-level security/);
    await assert.rejects(as(OWNER, `update live_snaps set expires_at=now()+interval '9 days' where id=$1`, [visitorSnap]), /permission denied/);
    // Visitor snaps of imported events have no organizer: only Spots moderation (service role) can publish them.
    assert.equal((await as(OWNER, `update live_snaps set moderation_status='visible' where event_id=$1 returning id`, [LIVE_IMPORT])).rows.length, 0);
  });

  await t.test('expired snaps disappear for everyone except backend cleanup', async () => {
    await db.exec(`update live_snaps set created_at=now()-interval '26 hours',expires_at=now()-interval '2 hours' where storage_path='${OWNER}/o.mp4'`);
    assert.equal(await count(null, 'live_snaps', `event_id='${spotsEvent}'`), 1);
    const expired = (await db.query(`select storage_path from spots_content_private.expired_snaps(10)`)).rows.map(row => row.storage_path);
    assert.deepEqual(expired, [`${OWNER}/o.mp4`]);
    await assert.rejects(as(VISITOR, `select * from spots_content_private.expired_snaps(10)`), /permission denied/);
  });

  await t.test('three reports hide a visible snap; reports stay private to the reporter', async () => {
    const snap = (await db.query(`select id from live_snaps where storage_path='${VISITOR}/g.jpg'`)).rows[0].id;
    for (const user of [VISITOR, STRANGER]) await as(user, `insert into content_reports(snap_id,reason) values($1,'privacy')`, [snap]);
    assert.equal(await count(null, 'live_snaps', `id='${snap}'`), 1, 'two reports keep it visible');
    await assert.rejects(as(VISITOR, `insert into content_reports(snap_id,reason) values($1,'spam')`, [snap]), /duplicate key/);
    await as(FOURTH, `insert into content_reports(snap_id,reason) values($1,'harassment')`, [snap]);
    assert.equal(await count(null, 'live_snaps', `id='${snap}'`), 0, 'third report hides it');
    assert.equal(await count(STRANGER, 'content_reports'), 1, 'reporter sees only own report');
    await assert.rejects(as(null, `insert into content_reports(snap_id,reason) values($1,'spam')`, [snap]), /permission denied/);
  });

  await t.test('saved events are private per account and only for public events', async () => {
    await as(VISITOR, `insert into saved_events(event_id) values($1)`, [FUTURE_IMPORT]);
    assert.equal(await count(VISITOR, 'saved_events'), 1);
    assert.equal(await count(STRANGER, 'saved_events'), 0);
    assert.equal(await count(null, 'saved_events').catch(() => -1), -1, 'anon has no access');
    await assert.rejects(as(VISITOR, `insert into saved_events(event_id) values($1)`, [DRAFT_IMPORT]), /row-level security/);
    await assert.rejects(as(STRANGER, `insert into saved_events(user_id,event_id) values($1,$2)`, [VISITOR, LIVE_IMPORT]), /permission denied/);
    assert.equal((await as(STRANGER, `delete from saved_events returning event_id`)).rows.length, 0);
  });

  await t.test('ticket types: organizers manage their own events; public sees published ones only', async () => {
    await as(OWNER, `insert into ticket_types(event_id,name,price_cents,is_published,external_url) values($1,'Early Bird',1200,true,'https://tickets.example.org/a'),($1,'Draft',2000,false,null)`, [spotsEvent]);
    assert.equal(await count(null, 'ticket_types'), 1);
    assert.equal(await count(OWNER, 'ticket_types'), 2);
    await assert.rejects(as(STRANGER, `insert into ticket_types(event_id,name) values($1,'Fake')`, [spotsEvent]), /row-level security/);
    await assert.rejects(as(OWNER, `insert into ticket_types(event_id,name) values($1,'Import')`, [LIVE_IMPORT]), /row-level security/);
    await assert.rejects(as(OWNER, `insert into ticket_types(event_id,name,external_url) values($1,'Bad','http://insecure.example')`, [spotsEvent]), /check constraint/);
    assert.equal((await as(STRANGER, `update ticket_types set price_cents=1 returning id`)).rows.length, 0);
  });

  assert.deepEqual((await db.query(`select to_jsonb(e)-'organizer_id' as data from events e where source<>'spots' order by id`)).rows, before);
  await assert.rejects(db.exec(sql('17_content_tickets.sql')), /already exist/);
});
