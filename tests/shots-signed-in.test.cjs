// Echte SQL von 32_shots_signed_in_only.sql in PGlite (nie Supabase): Gäste-Shots nur mit Konto, Club-Story für alle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = '32323232-3232-4232-8232-000000000001';
const GUEST = '32323232-3232-4232-8232-000000000002';
const OTHER = '32323232-3232-4232-8232-000000000003';

test('shots SQL 32: visitor shots only for signed-in accounts, organizer story for everyone, files follow the rows', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
  create schema storage;grant usage on schema storage to anon,authenticated;
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;grant select on storage.objects to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql', '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${OWNER}','o@example.invalid'),('${GUEST}','g@example.invalid'),('${OTHER}','x@example.invalid')`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql', '30_shots_moderation.sql']) await db.exec(sql(file));
  // Storage-Leseregel wie SQL 18 (an live_snaps gebunden).
  await db.exec(`create policy spots_snaps_read on storage.objects for select to anon, authenticated
    using (bucket_id = 'live-snaps' and exists(select 1 from public.live_snaps s where s.storage_path = name));`);

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);` : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const organizer = (await as(OWNER, `select public.create_organizer('story-club','Story Club') id`)).rows[0].id;
  await db.query(`update organizers set is_published=true where id=$1`, [organizer]);
  const event = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published) values('Jetzt','spots',$1,now()-interval '1 hour',now()+interval '4 hours','scheduled',true) returning id`, [organizer])).rows[0].id;
  await as(OWNER, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${OWNER}/story.jpg')`, [event]);
  await as(GUEST, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image','${GUEST}/shot.jpg')`, [event]);
  await db.exec(`insert into storage.objects(bucket_id,name) values('live-snaps','${OWNER}/story.jpg'),('live-snaps','${GUEST}/shot.jpg')`);
  const read = async (user) => (await as(user, `select storage_path from live_snaps `)).rows.map((row) => row.storage_path).sort();
  const files = async (user) => (await as(user, `select name from storage.objects where bucket_id='live-snaps' `)).rows.map((row) => row.name).sort();

  assert.deepEqual(await read(null), [`${GUEST}/shot.jpg`, `${OWNER}/story.jpg`].sort(), 'before SQL 32 guests saw everything');
  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('32_shots_signed_in_only.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 32 must not change events');

  await t.test('guests without account see only the organizer story, also for files', async () => {
    assert.deepEqual(await read(null), [`${OWNER}/story.jpg`]);
    assert.deepEqual(await files(null), [`${OWNER}/story.jpg`]);
  });
  await t.test('any signed-in account sees the visitor shots too', async () => {
    assert.deepEqual(await read(OTHER), [`${GUEST}/shot.jpg`, `${OWNER}/story.jpg`].sort());
    assert.deepEqual(await files(OTHER), [`${GUEST}/shot.jpg`, `${OWNER}/story.jpg`].sort());
  });
  await t.test('hidden or expired visitor shots stay invisible, also for accounts', async () => {
    await db.exec(`update live_snaps set moderation_status='hidden' where storage_path='${GUEST}/shot.jpg'`);
    assert.deepEqual(await read(OTHER), [`${OWNER}/story.jpg`]);
    await db.exec(`update live_snaps set moderation_status='visible', created_at=now()-interval '26 hours', expires_at=now()-interval '2 hours' where storage_path='${GUEST}/shot.jpg'`);
    assert.deepEqual(await read(OTHER), [`${OWNER}/story.jpg`]);
    assert.deepEqual(await read(GUEST), [`${GUEST}/shot.jpg`, `${OWNER}/story.jpg`].sort(), 'authors still see their own shots');
  });

  await assert.rejects(db.exec(sql('32_shots_signed_in_only.sql')), /already exists/);
});
