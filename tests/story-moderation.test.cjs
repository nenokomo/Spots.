// Echte SQL von 34 (Moderation), 35 (Einladungen) und 36 (Bild-Aufräumliste) in PGlite, nie Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = '34343434-3434-4434-8434-000000000001';
const GUEST = '34343434-3434-4434-8434-000000000002';
const ADMIN = '34343434-3434-4434-8434-000000000003';
const HELPER = '34343434-3434-4434-8434-000000000004';
const PRIVATE = '34343434-3434-4434-8434-000000000005';
const REPORTERS = [6, 7, 8].map((n) => `34343434-3434-4434-8434-00000000000${n}`);

test('SQL 34–36: story reports and team queue, team lock for shots, invites by code, orphaned public media', {
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
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql', '25_account_lifecycle.sql',
    '26_organizer_review_stats.sql', '27_organizer_public_media.sql', '28_organizer_signup.sql', '30_shots_moderation.sql', '33_organizer_stories.sql']) await db.exec(sql(file));
  const user = (id, meta) => db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`, [id, `${id.slice(-2)}@example.invalid`, JSON.stringify(meta)]);
  await user(OWNER, { account_type: 'organizer', organizer: { name: 'Melde Club', street: 'Kaiserstraße', house_number: '1', postcode: '76133', city: 'Karlsruhe', contact_name: 'Alex Beispiel', phone: '+49 721 123456' } });
  await user(HELPER, { account_type: 'organizer' });
  for (const id of [GUEST, ADMIN, PRIVATE, ...REPORTERS]) await user(id, { account_type: 'private' });
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
  const story = async (name) => (await as(OWNER, `insert into organizer_story_items(organizer_id,storage_path) values($1,$2) returning id`, [club, `${club}/story-${name}.jpg`])).rows[0].id;
  const itemA = await story('a');
  const itemB = await story('b');
  const snap = async (name) => (await as(GUEST, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image',$2) returning id`, [event, `${GUEST}/${name}.jpg`])).rows[0].id;
  const shot = await snap('shot');
  const reported = await snap('shot2');

  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  for (const file of ['34_story_moderation.sql', '35_organizer_invites.sql', '36_public_media_cleanup.sql']) await db.exec(sql(file));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 34–36 must not change events');

  const explore = async (who = null) => (await as(who, `select story from public.spots_explore_organizers('Karlsruhe')`)).rows[0].story.map((item) => item.id).sort();

  await t.test('accounts report story items once; reports alone never hide a story', async () => {
    for (const reporter of REPORTERS) await as(reporter, `insert into content_reports(story_item_id,reason) values($1,'spam')`, [itemA]);
    await assert.rejects(as(REPORTERS[0], `insert into content_reports(story_item_id,reason) values($1,'other')`, [itemA]), /duplicate key/);
    await assert.rejects(as(null, `insert into content_reports(story_item_id,reason) values($1,'spam')`, [itemA]), /permission denied|row-level security/);
    await assert.rejects(as(GUEST, `insert into content_reports(story_item_id,snap_id,reason) values($1,$2,'spam')`, [itemA, shot]), /check constraint/);
    assert.deepEqual(await explore(), [itemA, itemB].sort(), 'three reports do not hide an organizer story');
    assert.equal((await as(GUEST, `select count(*)::int n from content_reports`)).rows[0].n, 0, 'reports stay private');
  });

  await t.test('team queue lists reported items first; hiding removes them from Explore, the club still sees them', async () => {
    await assert.rejects(as(OWNER, `select * from public.spots_admin_story_queue()`), /Not allowed/);
    const queue = (await as(ADMIN, `select * from public.spots_admin_story_queue()`)).rows;
    assert.equal(queue[0].id, itemA);
    assert.equal(Number(queue[0].report_count), 3);
    assert.deepEqual(queue[0].reasons, ['spam']);
    assert.equal(queue[0].organizer_name, 'Melde Club');
    await assert.rejects(as(OWNER, `select public.spots_admin_set_story_status($1,'hidden')`, [itemA]), /Not allowed/);
    await as(ADMIN, `select public.spots_admin_set_story_status($1,'hidden')`, [itemA]);
    assert.deepEqual(await explore(), [itemB]);
    assert.deepEqual(await explore(OWNER), [itemB], 'also hidden in Explore for the club itself');
    assert.equal((await as(null, `select count(*)::int n from organizer_story_items`)).rows[0].n, 1);
    const own = (await as(OWNER, `select moderation_status from organizer_story_items where id=$1`, [itemA])).rows[0];
    assert.equal(own.moderation_status, 'hidden', 'the club sees that the team hid it');
    await assert.rejects(as(OWNER, `update organizer_story_items set moderation_status='visible' where id=$1`, [itemA]), /permission denied/);
    await as(ADMIN, `select public.spots_admin_set_story_status($1,'visible')`, [itemA]);
    assert.deepEqual(await explore(), [itemA, itemB].sort());
    assert.equal((await as(ADMIN, `delete from organizer_story_items where id=$1 returning id`, [itemA])).rows.length, 1, 'team can delete');
    assert.equal((await db.query(`select count(*)::int n from content_reports where story_item_id is not null`)).rows[0].n, 0, 'reports go with the item');
  });

  await t.test('clubs hide and re-show visitor shots of their events, but not what the team locked', async () => {
    const setStatus = (who, id, status) => as(who, `update live_snaps set moderation_status=$2 where id=$1 returning id`, [id, status]);
    assert.equal((await setStatus(OWNER, shot, 'hidden')).rows.length, 1);
    assert.equal((await setStatus(OWNER, shot, 'visible')).rows.length, 1);
    assert.equal((await setStatus(HELPER, shot, 'hidden')).rows.length, 0, 'not a member yet');
    await as(ADMIN, `select public.spots_admin_set_snap_status($1,'hidden')`, [reported]);
    assert.equal((await setStatus(OWNER, reported, 'visible')).rows.length, 0);
    assert.equal((await db.query(`select moderation_status from live_snaps where id=$1`, [reported])).rows[0].moderation_status, 'hidden');
    await as(ADMIN, `select public.spots_admin_set_snap_status($1,'visible')`, [reported]);
    assert.equal((await setStatus(OWNER, reported, 'hidden')).rows.length, 1, 'unlocked again');
  });

  await t.test('invites: owner creates a code, an organizer account redeems it once, private accounts never', async () => {
    await assert.rejects(as(HELPER, `select * from public.spots_organizer_create_invite($1)`, [club]), /Owner required/);
    const invite = (await as(OWNER, `select * from public.spots_organizer_create_invite($1)`, [club])).rows[0];
    assert.match(invite.code, /^[0-9A-F]{12}$/);
    assert.deepEqual((await as(OWNER, `select code from public.spots_organizer_invites($1)`, [club])).rows.map((r) => r.code), [invite.code]);
    await assert.rejects(as(HELPER, `select * from public.spots_organizer_invites($1)`, [club]), /Owner required/);
    await assert.rejects(as(PRIVATE, `select public.spots_organizer_redeem_invite($1)`, [invite.code]), /Organizer account required/);
    assert.equal((await as(HELPER, `select public.spots_organizer_redeem_invite('000000000000') id`)).rows[0].id, null, 'wrong code: no error, no membership');
    const spaced = `${invite.code.slice(0, 4)}-${invite.code.slice(4, 8)} ${invite.code.slice(8).toLowerCase()}`;
    assert.equal((await as(HELPER, `select public.spots_organizer_redeem_invite($1) id`, [spaced])).rows[0].id, club);
    assert.equal((await db.query(`select role from organizer_memberships where user_id=$1`, [HELPER])).rows[0].role, 'editor');
    assert.equal((await as(HELPER, `select public.spots_organizer_redeem_invite($1) id`, [invite.code])).rows[0].id, null, 'a code works once');
    assert.equal((await as(OWNER, `select count(*)::int n from public.spots_organizer_invites($1)`, [club])).rows[0].n, 0);
    // The new member can work: post to the story and moderate shots.
    await as(HELPER, `insert into organizer_story_items(organizer_id,storage_path) values($1,$2)`, [club, `${club}/story-helper.jpg`]);
    assert.equal((await as(HELPER, `update live_snaps set moderation_status='hidden' where id=$1 returning id`, [shot])).rows.length, 1);
    const members = (await as(OWNER, `select email, role from public.spots_organizer_members($1)`, [club])).rows;
    assert.deepEqual(members.map((m) => m.role), ['owner', 'editor']);
    await assert.rejects(as(HELPER, `select * from public.spots_organizer_members($1)`, [club]), /Owner required/);
    await as(OWNER, `select public.set_organizer_editor($1,$2,false)`, [club, HELPER]);
    assert.equal((await db.query(`select count(*)::int n from organizer_memberships where user_id=$1`, [HELPER])).rows[0].n, 0);
  });

  await t.test('invites: limit of five open codes, revoke, expiry and attempt limit', async () => {
    const codes = [];
    for (let index = 0; index < 5; index += 1) codes.push((await as(OWNER, `select * from public.spots_organizer_create_invite($1)`, [club])).rows[0].code);
    await assert.rejects(as(OWNER, `select * from public.spots_organizer_create_invite($1)`, [club]), /limit/);
    await assert.rejects(as(HELPER, `select public.spots_organizer_revoke_invite($1)`, [codes[0]]), /Owner required/);
    await as(OWNER, `select public.spots_organizer_revoke_invite($1)`, [codes[0]]);
    assert.equal((await as(HELPER, `select public.spots_organizer_redeem_invite($1) id`, [codes[0]])).rows[0].id, null);
    await db.query(`update spots_accounts_private.organizer_invites set expires_at=now()-interval '1 minute' where code=$1`, [codes[1]]);
    assert.equal((await as(HELPER, `select public.spots_organizer_redeem_invite($1) id`, [codes[1]])).rows[0].id, null, 'expired');
    for (let index = 0; index < 7; index += 1) await as(HELPER, `select public.spots_organizer_redeem_invite('FFFFFFFFFFFF')`);
    await assert.rejects(as(HELPER, `select public.spots_organizer_redeem_invite($1)`, [codes[2]]), /Too many attempts/);
    assert.equal((await db.query(`select count(*)::int n from organizer_memberships where user_id=$1`, [HELPER])).rows[0].n, 0);
    await assert.rejects(as(HELPER, `select * from spots_accounts_private.organizer_invites`), /permission denied/);
  });

  await t.test('orphan list: only unreferenced files older than a day, only for the server', async () => {
    const base = 'https://proj.supabase.co/storage/v1/object/public/organizer-public/';
    const put = (name, age) => db.query(`insert into storage.objects(bucket_id,name,created_at) values('organizer-public',$1,now()-$2::interval)`, [name, age]);
    await put(`${club}/logo-used.jpg`, '3 days');
    await put(`${club}/flyer-used.jpg`, '3 days');
    await put(`${club}/story-b.jpg`, '3 days');
    await put(`${club}/logo-old.jpg`, '3 days');
    await put(`${club}/story-gone.jpg`, '2 days');
    await put(`${club}/flyer-fresh.jpg`, '2 hours');
    await db.query(`insert into storage.objects(bucket_id,name,created_at) values('live-snaps',$1,now()-interval '9 days')`, [`${GUEST}/old.jpg`]);
    await db.query(`update organizers set avatar_url=$2 where id=$1`, [club, `${base}${club}/logo-used.jpg`]);
    await db.query(`update events set image_url=$2 where id=$1`, [event, `${base}${club}/flyer-used.jpg`]);
    const orphans = (await db.query(`select name from public.spots_public_media_orphans(100)`)).rows.map((r) => r.name).sort();
    assert.deepEqual(orphans, [`${club}/logo-old.jpg`, `${club}/story-gone.jpg`]);
    await assert.rejects(as(OWNER, `select * from public.spots_public_media_orphans(10)`), /permission denied/);
    await assert.rejects(as(null, `select * from public.spots_public_media_orphans(10)`), /permission denied/);
  });

  for (const file of ['34_story_moderation.sql', '35_organizer_invites.sql', '36_public_media_cleanup.sql']) {
    await assert.rejects(db.exec(sql(file)), /already exist/);
    await db.exec('rollback');
  }
});
