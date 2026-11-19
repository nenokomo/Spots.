// Echte SQL von 33_organizer_stories.sql in PGlite (nie Supabase): Veranstalter-Story für Entdecken,
// Event-Story ab dem Anlegen. Der Storage-Teil läuft gegen ein kleines Modell von storage.buckets/objects/foldername.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = '33333333-3333-4333-8333-000000000001';
const STRANGER = '33333333-3333-4333-8333-000000000002';
const ADMIN = '33333333-3333-4333-8333-000000000003';
const OTHER_OWNER = '33333333-3333-4333-8333-000000000004';
const GUEST = '33333333-3333-4333-8333-000000000005';

test('organizer stories SQL 33: member-only story items, explore list per city, event story from creation', {
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
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid default auth.uid());
  create function storage.foldername(name text) returns text[] language sql immutable as $f$
    select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $f$;
  grant execute on function storage.foldername(text) to anon,authenticated;
  alter table storage.objects enable row level security;
  grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${OWNER}','o@example.invalid'),('${STRANGER}','s@example.invalid'),
    ('${ADMIN}','a@example.invalid'),('${OTHER_OWNER}','p@example.invalid'),('${GUEST}','g@example.invalid')`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql',
    '26_organizer_review_stats.sql', '27_organizer_public_media.sql', '30_shots_moderation.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id) values ('${ADMIN}')`);

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const approvedOrganizer = async (user, slug, name, city) => {
    const id = (await as(user, `select public.create_organizer($1,$2) id`, [slug, name])).rows[0].id;
    await as(user, `update organizers set city=$2 where id=$1`, [id, city]);
    await as(user, `select public.spots_organizer_submit($1)`, [id]);
    await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [id]);
    return id;
  };
  const club = await approvedOrganizer(OWNER, 'story-club', 'Story Club', 'Frankfurt');
  const other = await approvedOrganizer(OTHER_OWNER, 'karlsruhe-club', 'Karlsruhe Club', 'Karlsruhe');
  const draft = (await as(STRANGER, `select public.create_organizer('entwurf','Entwurf Club') id`)).rows[0].id;
  await as(STRANGER, `update organizers set city='Frankfurt' where id=$1`, [draft]);

  const event = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Nächste Woche','spots',$1,now()+interval '7 days',now()+interval '7 days 6 hours','scheduled',true) returning id`, [club])).rows[0].id;
  const draftEvent = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Geheimer Entwurf','spots',$1,now()+interval '10 days',now()+interval '10 days 6 hours','scheduled',false) returning id`, [club])).rows[0].id;
  const past = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Letzter Samstag','spots',$1,now()-interval '5 days',now()-interval '4 days 18 hours','scheduled',true) returning id`, [club])).rows[0].id;
  const otherEvent = (await as(OTHER_OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
    values('Fremd','spots',$1,now()+interval '2 days',now()+interval '2 days 5 hours','scheduled',true) returning id`, [other])).rows[0].id;

  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('33_organizer_stories.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 33 must not change events');

  const story = (user, organizer, name, eventId = null, caption = null) => as(user,
    `insert into organizer_story_items(organizer_id,event_id,storage_path,caption) values($1,$2,$3,$4) returning id, created_by`,
    [organizer, eventId, `${organizer}/story-${name}.jpg`, caption]);

  await t.test('only members post story items into their own folder, linked to their own events', async () => {
    const row = (await story(OWNER, club, 'a', past, 'So war es letzten Samstag')).rows[0];
    assert.equal(row.created_by, OWNER, 'author is set by the server');
    await story(OWNER, club, 'b', event);
    await assert.rejects(story(STRANGER, club, 'fake'), /row-level security/);
    await assert.rejects(story(null, club, 'anon'), /permission denied|row-level security/);
    await assert.rejects(story(OWNER, club, 'fremd', otherEvent), /another organizer/);
    await assert.rejects(as(OWNER, `insert into organizer_story_items(organizer_id,storage_path) values($1,$2)`, [club, `${other}/story-x.jpg`]), /check constraint/);
    await assert.rejects(as(OWNER, `insert into organizer_story_items(organizer_id,storage_path) values($1,$2)`, [club, `${club}/logo.jpg`]), /check constraint/);
    await assert.rejects(as(OWNER, `update organizer_story_items set event_id=$1 where storage_path=$2`, [otherEvent, `${club}/story-b.jpg`]), /another organizer/);
  });

  await t.test('everyone reads stories of approved organizers only; drafts stay private', async () => {
    await story(STRANGER, draft, 'privat');
    const read = async (user) => (await as(user, `select storage_path from organizer_story_items order by storage_path`)).rows.map((r) => r.storage_path);
    assert.deepEqual(await read(null), [`${club}/story-a.jpg`, `${club}/story-b.jpg`]);
    assert.deepEqual(await read(STRANGER), [`${club}/story-a.jpg`, `${club}/story-b.jpg`, `${draft}/story-privat.jpg`].sort());
    assert.equal((await read(ADMIN)).length, 3);
  });

  await t.test('explore list: per city with story and next event, unpublished event titles stay hidden', async () => {
    const explore = async (city, user = null) => (await as(user, `select * from public.spots_explore_organizers($1)`, [city])).rows;
    const frankfurt = await explore('Frankfurt am Main');
    assert.deepEqual(frankfurt.map((r) => r.slug), ['story-club'], 'drafts and other cities are not listed');
    assert.equal(frankfurt[0].next_event_title, 'Nächste Woche');
    assert.deepEqual(frankfurt[0].story.map((item) => item.storage_path).sort(), [`${club}/story-a.jpg`, `${club}/story-b.jpg`]);
    assert.equal(frankfurt[0].story.find((item) => item.storage_path.endsWith('story-a.jpg')).event_title, 'Letzter Samstag');
    assert.deepEqual((await explore('  frankfurt ')).map((r) => r.slug), ['story-club']);
    assert.deepEqual((await explore('Karlsruhe')).map((r) => r.slug), ['karlsruhe-club']);
    assert.deepEqual((await explore('Frank')).map((r) => r.slug), [], 'prefixes of a word do not match');
    assert.deepEqual((await explore(null)).map((r) => r.slug), ['story-club', 'karlsruhe-club'], 'without city: all, organizers with story first');
    await as(OWNER, `insert into organizer_story_items(organizer_id,event_id,storage_path) values($1,$2,$3)`, [club, draftEvent, `${club}/story-c.jpg`]);
    const item = (await explore('Frankfurt'))[0].story.find((entry) => entry.storage_path.endsWith('story-c.jpg'));
    assert.equal(item.event_title, null, 'a draft event never shows its title publicly');
    await as(OWNER, `delete from organizer_story_items where storage_path=$1`, [`${club}/story-c.jpg`]);
  });

  await t.test('limit of 30 items per organizer; members and the team can delete', async () => {
    for (let index = 0; index < 28; index += 1) await story(OTHER_OWNER, other, `n${index}`);
    await story(OTHER_OWNER, other, 'n28');
    await story(OTHER_OWNER, other, 'n29');
    await assert.rejects(story(OTHER_OWNER, other, 'n30'), /limit/);
    assert.equal((await as(STRANGER, `delete from organizer_story_items where organizer_id=$1 returning id`, [other])).rows.length, 0);
    assert.equal((await as(ADMIN, `delete from organizer_story_items where storage_path=$1 returning id`, [`${other}/story-n0.jpg`])).rows.length, 1);
    assert.equal((await as(OTHER_OWNER, `delete from organizer_story_items where organizer_id=$1 returning id`, [other])).rows.length, 29);
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values('organizer-public','${club}/story-a.jpg','${OWNER}')`);
    assert.equal((await as(STRANGER, `delete from storage.objects where name=$1 returning name`, [`${club}/story-a.jpg`])).rows.length, 0);
    assert.equal((await as(ADMIN, `delete from storage.objects where name=$1 returning name`, [`${club}/story-a.jpg`])).rows.length, 1);
  });

  await t.test('event story: members post from creation (also drafts), guests still only around the event', async () => {
    const snap = (user, eventId, name) => as(user, `insert into live_snaps(event_id,media_type,storage_path) values($1,'image',$2) returning by_organizer`, [eventId, `${user}/${name}.jpg`]);
    assert.equal((await snap(OWNER, event, 'vorab')).rows[0].by_organizer, true);
    await snap(OWNER, draftEvent, 'entwurf');
    await assert.rejects(snap(GUEST, event, 'zu-frueh'), /row-level security/);
    await assert.rejects(snap(OWNER, past, 'zu-spaet'), /row-level security/, 'not after the event has ended');
    await assert.rejects(snap(OWNER, otherEvent, 'fremd'), /row-level security/);
    const running = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published)
      values('Läuft','spots',$1,now()-interval '1 hour',now()+interval '3 hours','scheduled',true) returning id`, [club])).rows[0].id;
    assert.equal((await snap(GUEST, running, 'jetzt')).rows[0].by_organizer, false);
    const stats = (await db.query(`select event_id, snaps from spots_stats_private.event_daily where snaps > 0 order by event_id`)).rows;
    assert.deepEqual(stats.map((r) => [r.event_id, Number(r.snaps)]), [[running, 1]], 'only guest shots count as Shots');
  });

  await assert.rejects(db.exec(sql('33_organizer_stories.sql')), /already exist/);
});
