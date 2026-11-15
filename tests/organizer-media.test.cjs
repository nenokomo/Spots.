// Echte SQL von 27_organizer_public_media.sql in PGlite (nie Supabase). Der Storage-Teil läuft gegen ein
// kleines Modell von storage.buckets/objects/foldername; die echte Prüfung mit Dateien folgt in Spots-Test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = 'cccccccc-cccc-4ccc-8ccc-000000000001';
const STRANGER = 'cccccccc-cccc-4ccc-8ccc-000000000002';
const ADMIN = 'cccccccc-cccc-4ccc-8ccc-000000000003';
const GOABASE = 'cccccccc-cccc-4ccc-8ccc-000000000101';

test('public media SQL: members-only uploads per organizer folder, events take name/place from published venues', {
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
  await db.exec(`insert into auth.users(id,email) values('${OWNER}','o@example.invalid'),('${STRANGER}','s@example.invalid'),('${ADMIN}','a@example.invalid');
    insert into events(id,title,source,source_event_id,starts_at,status,is_published)
    values('${GOABASE}','Goabase party','goabase','1',now()+interval '1 day','scheduled',true);`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql', '26_organizer_review_stats.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id) values ('${ADMIN}')`);
  await db.query('select public.spots_venues_apply_osm($1,$2,false)', ['DE-BW', JSON.stringify([
    { type: 'node', id: 1, lat: 49.0094, lon: 8.3994, tags: { amenity: 'nightclub', name: 'Club Eins', 'addr:city': 'Karlsruhe' } },
    { type: 'node', id: 2, lat: 49.1, lon: 8.5, tags: { amenity: 'events_venue', name: 'Halle ohne Website' } }])]);
  const published = (await db.query(`select id from venues where source_ref='node/1' and is_published`)).rows[0].id;
  const unpublished = (await db.query(`select id from venues where source_ref='node/2'`)).rows[0].id;

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const organizer = (await as(OWNER, `select public.create_organizer('bild-club','Bild Club') id`)).rows[0].id;
  await as(OWNER, `select public.spots_organizer_submit($1)`, [organizer]);
  await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [organizer]);

  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('27_organizer_public_media.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 27 must not change events');
  assert.deepEqual((await db.query(`select public, file_size_limit from storage.buckets where id='organizer-public'`)).rows[0], { public: true, file_size_limit: 5242880 });

  await t.test('only members upload into their organizer folder; nobody else lists, replaces or deletes', async () => {
    await as(OWNER, `insert into storage.objects(bucket_id,name) values('organizer-public',$1)`, [`${organizer}/logo.jpg`]);
    await assert.rejects(as(STRANGER, `insert into storage.objects(bucket_id,name) values('organizer-public',$1)`, [`${organizer}/fake.jpg`]), /row-level security/);
    await assert.rejects(as(OWNER, `insert into storage.objects(bucket_id,name) values('organizer-public','kein-ordner/x.jpg')`), /row-level security/);
    await assert.rejects(as(OWNER, `insert into storage.objects(bucket_id,name) values('organizer-public','x.jpg')`), /row-level security/);
    await assert.rejects(as(null, `insert into storage.objects(bucket_id,name) values('organizer-public',$1)`, [`${organizer}/anon.jpg`]), /row-level security/);
    assert.equal((await as(STRANGER, `select name from storage.objects where bucket_id='organizer-public'`)).rows.length, 0);
    assert.equal((await as(null, `select name from storage.objects where bucket_id='organizer-public'`)).rows.length, 0);
    assert.equal((await as(STRANGER, `delete from storage.objects where bucket_id='organizer-public' returning name`)).rows.length, 0);
    assert.equal((await as(OWNER, `select name from storage.objects where bucket_id='organizer-public'`)).rows.length, 1);
    assert.equal((await as(OWNER, `delete from storage.objects where name=$1 returning name`, [`${organizer}/logo.jpg`])).rows.length, 1);
  });

  await t.test('organizer events take name, city and position from a published venue', async () => {
    const row = (await as(OWNER, `insert into events(title,source,organizer_id,starts_at,status,is_published,venue_id,venue_name,city,latitude,longitude)
      values('Am Ort','spots',$1,now()+interval '2 days','scheduled',true,$2,'Falscher Name','Falsche Stadt',1,1)
      returning venue_name, city, latitude, longitude`, [organizer, published])).rows[0];
    assert.deepEqual(row, { venue_name: 'Club Eins', city: 'Karlsruhe', latitude: 49.0094, longitude: 8.3994 });
    await assert.rejects(as(OWNER, `insert into events(title,source,organizer_id,starts_at,status,is_published,venue_id)
      values('Versteckt','spots',$1,now()+interval '2 days','scheduled',false,$2)`, [organizer, unpublished]), /not available/);
    const id = (await as(OWNER, `select id from events where title='Am Ort'`)).rows[0].id;
    const changed = (await as(OWNER, `update events set venue_name='Anders' where id=$1 returning venue_name`, [id])).rows[0];
    assert.equal(changed.venue_name, 'Club Eins', 'venue fields stay tied to the venue');
    const freed = (await as(OWNER, `update events set venue_id=null, venue_name='Eigener Ort' where id=$1 returning venue_name`, [id])).rows[0];
    assert.equal(freed.venue_name, 'Eigener Ort', 'without a venue the organizer types the place');
    const imported = await as(OWNER, `update events set venue_id=$2 where id=$1`, [GOABASE, published]);
    assert.equal(imported.affectedRows, 0, 'imports cannot be linked to a venue by organizers');
  });

  await t.test('imports are untouched by the venue trigger', async () => {
    assert.deepEqual((await db.query(`select to_jsonb(e) data from events e where source<>'spots' order by id`)).rows,
      eventsBefore.filter((row) => row.data.source !== 'spots'));
  });

  await assert.rejects(db.exec(sql('27_organizer_public_media.sql')), /already exist/);
});
