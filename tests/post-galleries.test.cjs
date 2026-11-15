// Echte SQL von 19_post_galleries.sql in PGlite (nie Supabase). Der Storage-Teil läuft gegen ein kleines Modell
// von storage.objects/foldername; die echte Prüfung mit Dateien folgt in Spots-Test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = '19191919-1919-4919-8919-000000000001';
const STRANGER = '19191919-1919-4919-8919-000000000002';

test('gallery SQL: members add up to 10 ordered images to their posts; readable only with the post', {
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
  await db.exec(`insert into auth.users(id,email) values('${OWNER}','o@example.invalid'),('${STRANGER}','s@example.invalid')`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql']) await db.exec(sql(file));

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);` : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const organizer = (await as(OWNER, `select public.create_organizer('galerie-club','Galerie Club') id`)).rows[0].id;
  await db.query(`update organizers set is_published=true where id=$1`, [organizer]);
  const published = (await as(OWNER, `insert into organizer_posts(organizer_id,body,is_published) values($1,'Rückblick',true) returning id`, [organizer])).rows[0].id;
  const draft = (await as(OWNER, `insert into organizer_posts(organizer_id,body,is_published) values($1,'Entwurf',false) returning id`, [organizer])).rows[0].id;
  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('19_post_galleries.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 19 must not change events');

  await t.test('members add ordered images from their own folder; strangers and foreign folders are rejected', async () => {
    for (const order of [0, 1, 2]) await as(OWNER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,$3)`, [published, `${OWNER}/bild-${order}.jpg`, order]);
    await as(OWNER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,0)`, [draft, `${OWNER}/entwurf.jpg`]);
    await assert.rejects(as(STRANGER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,5)`, [published, `${STRANGER}/fremd.jpg`]), /row-level security/);
    await assert.rejects(as(OWNER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,6)`, [published, `${STRANGER}/fremd.jpg`]), /row-level security/);
    await assert.rejects(as(OWNER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,10)`, [published, `${OWNER}/zu-viel.jpg`]), /check constraint/);
    await assert.rejects(as(OWNER, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,1)`, [published, `${OWNER}/doppelt.jpg`]), /duplicate key/);
    await assert.rejects(as(null, `insert into organizer_post_media(post_id,storage_path,sort_order) values($1,$2,7)`, [published, `${OWNER}/anon.jpg`]), /permission denied/);
  });

  await t.test('images are readable with their post: public post for everyone, draft only for members', async () => {
    assert.equal((await as(null, `select id from organizer_post_media`)).rows.length, 3);
    assert.equal((await as(STRANGER, `select id from organizer_post_media`)).rows.length, 3);
    assert.equal((await as(OWNER, `select id from organizer_post_media`)).rows.length, 4);
    await db.exec(`insert into storage.objects(bucket_id,name) values('organizer-media','${OWNER}/bild-0.jpg'),('organizer-media','${OWNER}/entwurf.jpg'),('organizer-media','${OWNER}/lose.jpg')`);
    const files = (await as(null, `select name from storage.objects where bucket_id='organizer-media' order by name`)).rows.map((row) => row.name);
    assert.deepEqual(files, [`${OWNER}/bild-0.jpg`], 'only files of readable gallery images can be signed');
  });

  await t.test('only members reorder or delete; strangers change nothing', async () => {
    assert.equal((await as(STRANGER, `update organizer_post_media set sort_order=9 where post_id=$1 returning id`, [published])).rows.length, 0);
    assert.equal((await as(STRANGER, `delete from organizer_post_media where post_id=$1 returning id`, [published])).rows.length, 0);
    assert.equal((await as(OWNER, `delete from organizer_post_media where storage_path=$1 returning id`, [`${OWNER}/bild-2.jpg`])).rows.length, 1);
  });

  await assert.rejects(db.exec(sql('19_post_galleries.sql')), /already exists/);
});
