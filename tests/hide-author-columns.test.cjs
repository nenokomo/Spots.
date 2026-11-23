// Echte SQL von 40_hide_author_columns.sql in PGlite (nie Supabase): Autoren von Shots und Story-Bildern
// sind über die Schnittstelle nicht mehr lesbar; alles, was die App tut, geht weiter.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = '40404040-4040-4040-8040-000000000001';
const GUEST = '40404040-4040-4040-8040-000000000002';
const ADMIN = '40404040-4040-4040-8040-000000000003';
const OTHER = '40404040-4040-4040-8040-000000000004';

test('SQL 40: author columns are not readable anymore, app flows keep working', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}',email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
  create schema storage;grant usage on schema storage to anon,authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid default auth.uid(),created_at timestamptz not null default now());
  create function storage.foldername(name text) returns text[] language sql immutable as $f$
    select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $f$;
  grant execute on function storage.foldername(text) to anon,authenticated;
  alter table storage.objects enable row level security;
  grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql', '09_goabase_source_removals.sql', '10_goabase_unconfirmed_status.sql']) await db.exec(sql(file));
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '18_content_storage.sql', '19_post_galleries.sql', '21_venues.sql', '22_admin_review.sql',
    '25_account_lifecycle.sql', '26_organizer_review_stats.sql', '27_organizer_public_media.sql', '28_organizer_signup.sql', '30_shots_moderation.sql',
    '32_shots_signed_in_only.sql', '33_organizer_stories.sql', '34_story_moderation.sql']) await db.exec(sql(file));
  const user = (id, meta) => db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`, [id, `${id.slice(-2)}@example.invalid`, JSON.stringify(meta)]);
  await user(OWNER, { account_type: 'organizer', organizer: { name: 'Privat Club', street: 'Kaiserstraße', house_number: '1', postcode: '76133', city: 'Karlsruhe', contact_name: 'Alex Beispiel', phone: '+49 721 123456' } });
  for (const id of [GUEST, ADMIN, OTHER]) await user(id, { account_type: 'private' });
  await db.query(`insert into spots_admin_private.admins(user_id) values ($1)`, [ADMIN]);

  const as = async (who, statement, params) => {
    await db.exec(who ? `set role authenticated;select set_config('request.jwt.claim.sub','${who}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const club = (await db.query(`select organizer_id id from organizer_memberships where user_id=$1`, [OWNER])).rows[0].id;
  await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [club]);
  const event = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Läuft','spots',$1,now()-interval '1 hour',now()+interval '4 hours','scheduled',true) returning id`, [club])).rows[0].id;
  await as(OWNER, `insert into organizer_story_items(organizer_id,storage_path) values($1,$2)`, [club, `${club}/story-a.jpg`]);
  await as(OWNER, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image',$2)`, [event, `${OWNER}/story.jpg`]);
  await as(GUEST, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image',$2)`, [event, `${GUEST}/shot.jpg`]);
  await db.query(`insert into storage.objects(bucket_id,name) values('live-snaps',$1),('live-snaps',$2)`, [`${OWNER}/story.jpg`, `${GUEST}/shot.jpg`]);

  assert.equal((await as(OTHER, `select author_id from live_snaps where not by_organizer`)).rows[0].author_id, GUEST, 'before SQL 40 anyone could read who posted');
  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  const snapsBefore = (await db.query(`select to_jsonb(s) data from live_snaps s order by id`)).rows;
  await db.exec(sql('40_hide_author_columns.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 40 must not change events');
  assert.deepEqual((await db.query(`select to_jsonb(s) data from live_snaps s order by id`)).rows, snapsBefore, 'SQL 40 must not change shots');

  await t.test('nobody reads the author of a shot or story picture through the API', async () => {
    for (const who of [null, OTHER, OWNER, GUEST]) {
      await assert.rejects(as(who, `select author_id from live_snaps`), /permission denied/);
      await assert.rejects(as(who, `select * from live_snaps`), /permission denied/);
      await assert.rejects(as(who, `select created_by from organizer_story_items`), /permission denied/);
    }
  });

  await t.test('reading like the app does still works: public story, shots with account, files, explore list', async () => {
    const columns = 'id,event_id,organizer_id,media_type,storage_path,caption,created_at,expires_at,by_organizer';
    assert.equal((await as(null, `select ${columns} from live_snaps where event_id=$1 and moderation_status='visible'`, [event])).rows.length, 1);
    assert.equal((await as(OTHER, `select ${columns} from live_snaps where event_id=$1 and moderation_status='visible'`, [event])).rows.length, 2);
    assert.equal((await as(null, `select name from storage.objects where bucket_id='live-snaps'`)).rows.length, 1);
    assert.equal((await as(OTHER, `select name from storage.objects where bucket_id='live-snaps'`)).rows.length, 2);
    const explore = (await as(null, `select story from public.spots_explore_organizers('Karlsruhe')`)).rows[0].story;
    assert.equal(explore.length, 1);
    assert.deepEqual(Object.keys(explore[0]).sort(), ['caption', 'created_at', 'event_id', 'event_starts_at', 'event_title', 'id', 'storage_path']);
    assert.equal((await as(OWNER, `select id,storage_path,caption,created_at,moderation_status,event_id from organizer_story_items where organizer_id=$1`, [club])).rows.length, 1);
  });

  await t.test('authors, clubs and the team keep their rights', async () => {
    assert.equal((await as(OWNER, `select id,team_locked from live_snaps where event_id=$1`, [event])).rows.length, 2, 'club sees all shots of its event');
    const guestShot = (await as(GUEST, `select id from live_snaps where storage_path=$1`, [`${GUEST}/shot.jpg`])).rows[0].id;
    assert.equal((await as(OWNER, `update live_snaps set moderation_status='hidden' where id=$1 returning id`, [guestShot])).rows.length, 1);
    assert.equal((await as(GUEST, `select id from live_snaps where id=$1`, [guestShot])).rows.length, 1, 'the author still sees the own hidden shot');
    assert.equal((await as(OTHER, `select id from live_snaps where id=$1`, [guestShot])).rows.length, 0);
    assert.equal((await as(ADMIN, `select count(*)::int n from public.spots_admin_snap_queue()`)).rows[0].n, 2);
    await as(GUEST, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image',$2)`, [event, `${GUEST}/second.jpg`]);
    assert.equal((await as(OTHER, `delete from live_snaps where storage_path=$1 returning id`, [`${GUEST}/second.jpg`])).rows.length, 0);
    assert.equal((await as(GUEST, `delete from live_snaps where storage_path=$1 returning id`, [`${GUEST}/second.jpg`])).rows.length, 1, 'authors delete their own shots');
    assert.equal((await as(OWNER, `delete from organizer_story_items where organizer_id=$1 returning id`, [club])).rows.length, 1);
  });

  await assert.rejects(db.exec(sql('40_hide_author_columns.sql')), /already hidden/);
});
