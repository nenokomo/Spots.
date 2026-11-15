// Echte SQL von 28_organizer_signup.sql in PGlite (nie Supabase): getrennte Kontoarten, Club-Registrierung,
// private Ansprechperson, Prüfliste und Aufräumen beim Konto löschen.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const ADMIN = 'dddddddd-dddd-4ddd-8ddd-000000000001';
const CLUB = 'dddddddd-dddd-4ddd-8ddd-000000000002';
const PRIVATE = 'dddddddd-dddd-4ddd-8ddd-000000000003';
const BROKEN = 'dddddddd-dddd-4ddd-8ddd-000000000004';
const SECOND = 'dddddddd-dddd-4ddd-8ddd-000000000005';

const club = (overrides = {}) => ({
  name: 'Club Eins', street: 'Kaiserstraße', house_number: '12a', postcode: '76133', city: 'Karlsruhe',
  website_url: 'https://club-eins.example', social_url: 'https://www.instagram.com/clubeins',
  contact_name: 'Alex Beispiel', phone: '+49 721 123456', ...overrides,
});

test('organizer signup SQL: account type fixed at signup, club registered with private contact', {
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
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${ADMIN}','admin@example.invalid',now());`);
  for (const file of ['15_organizer_accounts.sql', '17_content_tickets.sql', '21_venues.sql', '22_admin_review.sql', '25_account_lifecycle.sql',
    '26_organizer_review_stats.sql', '27_organizer_public_media.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id) values ('${ADMIN}')`);
  const eventsBefore = (await db.query(`select to_jsonb(e) data from events e order by id`)).rows;
  await db.exec(sql('28_organizer_signup.sql'));
  assert.deepEqual((await db.query(`select to_jsonb(e) data from events e order by id`)).rows, eventsBefore, 'SQL 28 must not change events');

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const one = async (user, statement, params) => (await as(user, statement, params)).rows[0];
  const signUp = (id, meta) => db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`, [id, `${id.slice(-4)}@example.invalid`, JSON.stringify(meta)]);

  await signUp(CLUB, { account_type: 'organizer', organizer: club() });
  await signUp(PRIVATE, {});
  await signUp(BROKEN, { account_type: 'organizer', organizer: club({ postcode: '7613', phone: 'abc' }) });
  const organizer = (await db.query(`select organizer_id from organizer_memberships where user_id=$1`, [CLUB])).rows[0].organizer_id;

  await t.test('signup creates the account type and, for clubs, a pending organizer with address', async () => {
    assert.equal((await one(CLUB, `select public.spots_my_account_type() t`)).t, 'organizer');
    assert.equal((await one(PRIVATE, `select public.spots_my_account_type() t`)).t, 'private');
    assert.equal((await one(ADMIN, `select public.spots_my_account_type() t`)).t, 'private', 'older accounts without profile are private');
    const row = await one(CLUB, `select slug, display_name, street, house_number, postcode, city, social_url, review_status, is_published from organizers where id=$1`, [organizer]);
    assert.deepEqual(row, { slug: 'club-eins', display_name: 'Club Eins', street: 'Kaiserstraße', house_number: '12a', postcode: '76133',
      city: 'Karlsruhe', social_url: 'https://www.instagram.com/clubeins', review_status: 'pending', is_published: false });
    const meta = (await db.query(`select raw_user_meta_data m from auth.users where id=$1`, [CLUB])).rows[0].m;
    assert.deepEqual(meta, { account_type: 'organizer' }, 'contact data does not stay in auth metadata');
  });

  await t.test('account type cannot be changed by the user; private accounts can never become organizers', async () => {
    await assert.rejects(as(PRIVATE, `update user_profiles set account_type='organizer' where id=$1`, [PRIVATE]), /permission denied/);
    await assert.rejects(as(PRIVATE, `insert into user_profiles(id,account_type) values($1,'organizer')`, [PRIVATE]), /permission denied/);
    await assert.rejects(as(PRIVATE, `select public.spots_register_organizer($1::jsonb)`, [JSON.stringify(club({ name: 'Fake' }))]), /Organizer account required/);
    await assert.rejects(as(PRIVATE, `select public.create_organizer('fake-club','Fake')`), /Organizer account required/);
  });

  await t.test('invalid club data does not block signup; the app completes it later, once', async () => {
    assert.equal((await one(BROKEN, `select public.spots_my_account_type() t`)).t, 'organizer');
    assert.equal((await as(BROKEN, `select * from organizer_memberships`)).rows.length, 0);
    await assert.rejects(as(BROKEN, `select public.spots_register_organizer($1::jsonb)`, [JSON.stringify(club({ postcode: '1' }))]), /Invalid organizer data/);
    await assert.rejects(as(BROKEN, `select public.spots_register_organizer($1::jsonb)`, [JSON.stringify(club({ website_url: 'http://insecure.example' }))]), /Invalid organizer data/);
    const id = (await one(BROKEN, `select public.spots_register_organizer($1::jsonb) id`, [JSON.stringify(club({ website_url: '', social_url: null }))])).id;
    assert.equal((await one(BROKEN, `select slug from organizers where id=$1`, [id])).slug.startsWith('club-eins-'), true, 'second Club Eins gets a suffix');
    await assert.rejects(as(BROKEN, `select public.spots_register_organizer($1::jsonb)`, [JSON.stringify(club())]), /already registered/);
  });

  await t.test('contact person is private: members read it, owners change it, the team sees it in the queue', async () => {
    assert.deepEqual(await one(CLUB, `select * from public.spots_organizer_contact($1)`, [organizer]), { contact_name: 'Alex Beispiel', phone: '+49 721 123456' });
    await assert.rejects(as(PRIVATE, `select * from public.spots_organizer_contact($1)`, [organizer]), /Member required/);
    await assert.rejects(as(null, `select * from public.spots_organizer_contact($1)`, [organizer]), /permission denied/);
    await assert.rejects(as(CLUB, `select * from spots_accounts_private.organizer_contacts`), /permission denied/);
    await as(CLUB, `select public.spots_organizer_set_contact($1,'Sam Beispiel','0721 654321')`, [organizer]);
    await assert.rejects(as(CLUB, `select public.spots_organizer_set_contact($1,'X','no phone')`, [organizer]), /check constraint/);
    const queue = (await as(ADMIN, `select id, contact_name, phone, street, email_confirmed, review_status from public.spots_admin_organizer_queue()`)).rows;
    assert.deepEqual(queue.find((row) => row.id === organizer),
      { id: organizer, contact_name: 'Sam Beispiel', phone: '0721 654321', street: 'Kaiserstraße', email_confirmed: false, review_status: 'pending' });
    await assert.rejects(as(CLUB, `select * from public.spots_admin_organizer_queue()`), /Not allowed/);
    const publicRow = await one(null, `select * from organizers where id=$1`, [organizer]);
    assert.equal(publicRow, undefined, 'pending club is not public');
  });

  await t.test('after approval the club is public, but never with contact data; address columns are editable by members', async () => {
    await as(ADMIN, `select public.spots_admin_review_organizer($1,'approved')`, [organizer]);
    const publicRow = await one(null, `select * from organizers where id=$1`, [organizer]);
    assert.ok(publicRow && !('contact_name' in publicRow) && !('phone' in publicRow));
    assert.equal((await as(CLUB, `update organizers set street='Neue Straße', postcode='76131' where id=$1 returning id`, [organizer])).rows.length, 1);
    await assert.rejects(as(CLUB, `update organizers set postcode='abc' where id=$1`, [organizer]), /check constraint/);
  });

  await t.test('deleting the account removes the contact and withdraws an open request', async () => {
    await signUp(SECOND, { account_type: 'organizer', organizer: club({ name: 'Zweiter Club' }) });
    const second = (await db.query(`select organizer_id from organizer_memberships where user_id=$1`, [SECOND])).rows[0].organizer_id;
    await as(SECOND, `select public.spots_delete_my_account()`);
    assert.equal((await db.query(`select count(*)::int n from spots_accounts_private.organizer_contacts where organizer_id=$1`, [second])).rows[0].n, 0);
    assert.deepEqual((await db.query(`select review_status, is_published from organizers where id=$1`, [second])).rows[0], { review_status: 'draft', is_published: false });
    assert.equal((await as(ADMIN, `select id from public.spots_admin_organizer_queue() where id=$1`, [second])).rows.length, 0);
  });

  await assert.rejects(db.exec(sql('28_organizer_signup.sql')), /already exist/);
});
