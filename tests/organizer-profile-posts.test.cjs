// Echte SQL von 37 (Motto, Titelbild), 38 (Statistik-Verlauf) und 39 (Beiträge löschen) in PGlite, nie Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = '37373737-3737-4737-8737-000000000001';
const GUEST = '37373737-3737-4737-8737-000000000002';
const ADMIN = '37373737-3737-4737-8737-000000000003';
const STRANGER = '37373737-3737-4737-8737-000000000004';
const SECOND = '37373737-3737-4737-8737-000000000005';

test('SQL 37–39: motto and cover, daily stats with new saves, deleting posts with their gallery', {
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
    '33_organizer_stories.sql', '34_story_moderation.sql', '36_public_media_cleanup.sql']) await db.exec(sql(file));
  const user = (id, meta) => db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`, [id, `${id.slice(-2)}@example.invalid`, JSON.stringify(meta)]);
  await user(OWNER, { account_type: 'organizer', organizer: { name: 'Profil Club', street: 'Kaiserstraße', house_number: '1', postcode: '76133', city: 'Karlsruhe', contact_name: 'Alex Beispiel', phone: '+49 721 123456' } });
  for (const id of [GUEST, ADMIN, STRANGER, SECOND]) await user(id, { account_type: 'private' });
  await db.query(`insert into spots_admin_private.admins(user_id) values ($1)`, [ADMIN]);

  const as = async (who, statement, params) => {
    await db.exec(who ? `set role authenticated;select set_config('request.jwt.claim.sub','${who}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const club = (await db.query(`select organizer_id id from organizer_memberships where user_id=$1`, [OWNER])).rows[0].id;
  await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [club]);
  const event = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Morgen','spots',$1,now()+interval '1 day',now()+interval '1 day 6 hours','scheduled',true) returning id`, [club])).rows[0].id;
  // Ein Merklisten-Eintrag von vor der Umstellung: zählt in der Gesamtzahl, aber an keinem Tag.
  await as(GUEST, `insert into saved_events(event_id) values($1)`, [event]);

  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  for (const file of ['37_organizer_motto_cover.sql', '38_event_stats_daily.sql', '39_organizer_post_delete.sql']) await db.exec(sql(file));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 37–39 must not change events');

  const base = 'https://proj.supabase.co/storage/v1/object/public/organizer-public/';

  await t.test('members set motto and cover; both are public, limits apply, a used cover is never an orphan', async () => {
    await as(OWNER, `update organizers set motto=$2, cover_url=$3 where id=$1`, [club, 'Techno bis zum Morgen', `${base}${club}/cover-a.jpg`]);
    assert.equal((await as(STRANGER, `update organizers set motto='Fremd' where id=$1 returning id`, [club])).rows.length, 0);
    const open = (await as(null, `select motto, cover_url from organizers where id=$1`, [club])).rows[0];
    assert.equal(open.motto, 'Techno bis zum Morgen');
    assert.equal(open.cover_url, `${base}${club}/cover-a.jpg`);
    await assert.rejects(as(OWNER, `update organizers set motto=$2 where id=$1`, [club, 'x'.repeat(121)]), /check constraint/);
    await assert.rejects(as(OWNER, `update organizers set cover_url='http://example.org/a.jpg' where id=$1`, [club]), /check constraint/);
    await as(OWNER, `update organizers set motto=null where id=$1`, [club]);
    const put = (name) => db.query(`insert into storage.objects(bucket_id,name,created_at) values('organizer-public',$1,now()-interval '3 days')`, [name]);
    await put(`${club}/cover-a.jpg`);
    await put(`${club}/cover-old.jpg`);
    assert.deepEqual((await db.query(`select name from public.spots_public_media_orphans(100)`)).rows.map((r) => r.name), [`${club}/cover-old.jpg`]);
  });

  await t.test('daily stats: per event and day, new saves counted from now on, only for members and the team', async () => {
    const device = (n) => `device-${String(n).padStart(12, '0')}`;
    for (let n = 0; n < 3; n += 1) await as(null, `select public.spots_track_event($1,'view',$2)`, [event, device(n)]);
    await as(null, `select public.spots_track_event($1,'ticket_click',$2)`, [event, device(0)]);
    await as(SECOND, `insert into saved_events(event_id) values($1)`, [event]);
    await db.query(`insert into spots_stats_private.event_daily(event_id,day,views) values($1,spots_stats_private.today()-3,7),($1,spots_stats_private.today()-40,9)`, [event]);
    const daily = (await as(OWNER, `select * from public.spots_organizer_event_stats_daily($1)`, [club])).rows;
    assert.equal(daily.length, 2, 'the day 40 days ago is outside the default window');
    assert.deepEqual([daily[0].views, daily[0].saves], [7, 0]);
    const today = daily[1];
    assert.deepEqual([today.event_id, today.views, today.ticket_clicks, today.saves, today.snaps], [event, 3, 1, 1, 0]);
    assert.equal((await as(OWNER, `select count(*)::int n from public.spots_organizer_event_stats_daily($1, 365)`, [club])).rows[0].n, 3);
    assert.equal((await as(OWNER, `select count(*)::int n from public.spots_organizer_event_stats_daily($1, 1)`, [club])).rows[0].n, 1);
    assert.equal((await as(ADMIN, `select count(*)::int n from public.spots_organizer_event_stats_daily($1)`, [club])).rows[0].n, 2);
    await assert.rejects(as(STRANGER, `select * from public.spots_organizer_event_stats_daily($1)`, [club]), /Not allowed/);
    await assert.rejects(as(null, `select * from public.spots_organizer_event_stats_daily($1)`, [club]), /permission denied/);
    const totals = (await as(OWNER, `select saves, views from public.spots_organizer_event_stats($1)`, [club])).rows[0];
    assert.deepEqual([Number(totals.saves), Number(totals.views)], [2, 19], 'totals still include the older save and all days');
  });

  await t.test('posts: gallery readable with the published post, deleting removes post, gallery and reports', async () => {
    const post = (await as(OWNER, `insert into organizer_posts(organizer_id,body,is_published) values($1,'Rückblick auf Samstag',true) returning id`, [club])).rows[0].id;
    for (const [index, name] of ['a', 'b'].entries()) {
      await as(OWNER, `insert into storage.objects(bucket_id,name) values('organizer-media',$1)`, [`${OWNER}/post-${name}.jpg`]);
      await as(OWNER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,$3)`, [post, `${OWNER}/post-${name}.jpg`, index]);
    }
    await assert.rejects(as(STRANGER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,5)`, [post, `${STRANGER}/x.jpg`]), /row-level security/);
    assert.equal((await as(null, `select count(*)::int n from organizer_post_media where post_id=$1`, [post])).rows[0].n, 2);
    assert.equal((await as(null, `select count(*)::int n from storage.objects where bucket_id='organizer-media'`)).rows[0].n, 2, 'files can be signed while the post is public');
    await as(OWNER, `update organizer_posts set is_published=false where id=$1`, [post]);
    assert.equal((await as(null, `select count(*)::int n from storage.objects where bucket_id='organizer-media'`)).rows[0].n, 0, 'withdrawn post: files are not readable anymore');
    await as(OWNER, `update organizer_posts set is_published=true where id=$1`, [post]);
    await as(GUEST, `insert into content_reports(post_id,reason) values($1,'spam')`, [post]);

    assert.equal((await as(STRANGER, `delete from organizer_posts where id=$1 returning id`, [post])).rows.length, 0);
    assert.equal((await as(null, `select count(*)::int n from organizer_posts where id='${post}'`)).rows[0].n, 1);
    assert.equal((await as(OWNER, `delete from organizer_posts where id=$1 returning id`, [post])).rows.length, 1);
    assert.equal((await db.query(`select count(*)::int n from organizer_post_media`)).rows[0].n, 0);
    assert.equal((await db.query(`select count(*)::int n from content_reports where post_id is not null`)).rows[0].n, 0);
    assert.equal((await as(null, `select count(*)::int n from storage.objects where bucket_id='organizer-media'`)).rows[0].n, 0);
    assert.equal((await as(OWNER, `delete from storage.objects where bucket_id='organizer-media' returning name`)).rows.length, 2, 'the uploader removes the files');

    const second = (await as(OWNER, `insert into organizer_posts(organizer_id,body,is_published) values($1,'Zweiter',true) returning id`, [club])).rows[0].id;
    await as(OWNER, `insert into storage.objects(bucket_id,name) values('organizer-media',$1)`, [`${OWNER}/post-c.jpg`]);
    assert.equal((await as(ADMIN, `delete from organizer_posts where id=$1 returning id`, [second])).rows.length, 1, 'team can delete');
    assert.equal((await as(ADMIN, `delete from storage.objects where name=$1 returning name`, [`${OWNER}/post-c.jpg`])).rows.length, 1);
  });

  await t.test('at most 100 posts per organizer', async () => {
    await db.query(`insert into organizer_posts(organizer_id,body) select $1, 'Beitrag ' || n from generate_series(1,99) n`, [club]);
    await as(OWNER, `insert into organizer_posts(organizer_id,body) values($1,'Nummer 100')`, [club]);
    await assert.rejects(as(OWNER, `insert into organizer_posts(organizer_id,body) values($1,'Nummer 101')`, [club]), /limit/);
  });

  for (const file of ['37_organizer_motto_cover.sql', '38_event_stats_daily.sql', '39_organizer_post_delete.sql']) {
    await assert.rejects(db.exec(sql(file)), /already exist/);
    await db.exec('rollback');
  }
});
