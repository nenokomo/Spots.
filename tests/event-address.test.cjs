// Echte SQL von 29_event_address.sql in PGlite (nie Supabase): Adresse an Club-Events, Ende Pflicht, Importe unverändert.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const OWNER = 'ffffffff-ffff-4fff-8fff-000000000001';
const ADMIN = 'ffffffff-ffff-4fff-8fff-000000000002';
const GOABASE = 'ffffffff-ffff-4fff-8fff-000000000101';

test('event address SQL: own address with position, end required for club events, imports untouched', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}',email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
  create function storage.foldername(name text) returns text[] language sql immutable as $f$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $f$;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${ADMIN}','a@example.invalid');
    insert into events(id,title,source,source_event_id,starts_at,status,is_published) values('${GOABASE}','Goabase ohne Ende','goabase','1',now()+interval '1 day','scheduled',true);`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql', '25_account_lifecycle.sql',
    '26_organizer_review_stats.sql', '27_organizer_public_media.sql', '28_organizer_signup.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id) values ('${ADMIN}')`);
  await db.query('select public.spots_venues_apply_osm($1,$2,false)', ['DE-BW', JSON.stringify([{ type: 'node', id: 1, lat: 49.0094, lon: 8.3994,
    tags: { amenity: 'nightclub', name: 'Club Eins', 'addr:street': 'Kaiserstraße', 'addr:housenumber': '12a', 'addr:postcode': '76133', 'addr:city': 'Karlsruhe' } }])]);
  const venue = (await db.query(`select id from venues where source_ref='node/1'`)).rows[0].id;
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'c@example.invalid',$2)`, [OWNER, JSON.stringify({ account_type: 'organizer',
    organizer: { name: 'Adress Club', street: 'Hauptstraße', house_number: '1', postcode: '76131', city: 'Karlsruhe', contact_name: 'Alex', phone: '0721 123456' } })]);
  const organizer = (await db.query(`select organizer_id from organizer_memberships where user_id=$1`, [OWNER])).rows[0].organizer_id;
  // Ein Club-Event ohne Ende von vor SQL 29 bleibt erhalten.
  const old = (await db.query(`insert into events(title,source,organizer_id,starts_at,status,is_published) values('Alt ohne Ende','spots',$1,now()+interval '3 days','scheduled',false) returning id`, [organizer])).rows[0].id;

  const before = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('29_event_address.sql'));
  const after = (await db.query(`select to_jsonb(e)-'street'-'house_number'-'postcode' data from events e order by id`)).rows;
  assert.deepEqual(after, before, 'SQL 29 must not change existing events');

  const as = async (user, statement, params) => {
    await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const inTwoDays = (hours) => new Date(Date.now() + 2 * 86400000 + hours * 3600000).toISOString();
  const insert = (fields) => as(OWNER, `insert into events(title,source,organizer_id,starts_at,ends_at,status,is_published,venue_name,street,house_number,postcode,city,latitude,longitude,venue_id)
    values($1,'spots',$2,$3,$4,'scheduled',false,$5,$6,$7,$8,$9,$10,$11,$12) returning venue_name,street,house_number,postcode,city,latitude,longitude`,
    [fields.title ?? 'Event', organizer, inTwoDays(0), fields.ends_at === undefined ? inTwoDays(6) : fields.ends_at,
      fields.venue_name ?? null, fields.street ?? null, fields.house_number ?? null, fields.postcode ?? null, fields.city ?? null,
      fields.latitude ?? null, fields.longitude ?? null, fields.venue_id ?? null]);

  await t.test('own address with position is stored as given', async () => {
    const row = (await insert({ venue_name: 'Hinterhof', street: 'Waldstraße', house_number: '5', postcode: '76133', city: 'Karlsruhe', latitude: 49.01, longitude: 8.4 })).rows[0];
    assert.deepEqual(row, { venue_name: 'Hinterhof', street: 'Waldstraße', house_number: '5', postcode: '76133', city: 'Karlsruhe', latitude: 49.01, longitude: 8.4 });
    await assert.rejects(insert({ venue_name: 'X', postcode: '123' }), /check constraint/);
  });

  await t.test('a venue from the address book sets name, address and position', async () => {
    const row = (await insert({ venue_id: venue, venue_name: 'Falsch', street: 'Falsch', postcode: '99999', latitude: 1, longitude: 1 })).rows[0];
    assert.deepEqual(row, { venue_name: 'Club Eins', street: 'Kaiserstraße', house_number: '12a', postcode: '76133', city: 'Karlsruhe', latitude: 49.0094, longitude: 8.3994 });
  });

  await t.test('club events need an end; imports do not; old rows stay but must get an end when changed', async () => {
    await assert.rejects(insert({ ends_at: null, venue_name: 'Ohne Ende' }), /events_spots_end_required/);
    await db.query(`insert into events(title,source,source_event_id,starts_at,status,is_published) values('Import ohne Ende','goabase','2',now()+interval '1 day','scheduled',true)`);
    await assert.rejects(as(OWNER, `update events set title='Alt geändert' where id=$1`, [old]), /events_spots_end_required/);
    assert.equal((await as(OWNER, `update events set title='Alt mit Ende', ends_at=starts_at+interval '6 hours' where id=$1 returning id`, [old])).rows.length, 1);
  });

  await assert.rejects(db.exec(sql('29_event_address.sql')), /already exists/);
});
