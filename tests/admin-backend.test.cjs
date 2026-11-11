// Echte SQL von 22_admin_review.sql in PGlite (nie Supabase): Rechte, Entwürfe, Freigabe, Orte, Meldungen.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');
const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const MEMBER = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002';
const GOABASE = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000101';

test('admin SQL: only admins review; approval creates editorial events at a venue', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key,email text);
  create function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
  grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['05_create_test_events.sql', '03_goabase_sync_backend.sql']) await db.exec(sql(file));
  await db.exec(`insert into auth.users(id,email) values('${ADMIN}','admin@example.invalid'),('${MEMBER}','member@example.invalid');
    insert into events(id,title,source,source_event_id,starts_at,status,is_published)
    values('${GOABASE}','Goabase party','goabase','1',now()+interval '1 day','scheduled',true);`);
  for (const file of ['15_organizer_accounts.sql', '21_venues.sql', '22_admin_review.sql', '22_admin_review.sql']) await db.exec(sql(file));
  await db.exec(`insert into spots_admin_private.admins(user_id, note) values ('${ADMIN}', 'Fixture')`);
  const osm = (id, tags) => ({ type: 'node', id, lat: 49.0094, lon: 8.3994, tags });
  await db.query('select public.spots_venues_apply_osm($1,$2,false)', ['DE-BW', JSON.stringify([
    osm(1, { amenity: 'nightclub', name: 'Club Eins' }), osm(2, { amenity: 'events_venue', name: 'Halle ohne Website' })])]);
  const venueId = (await db.query(`select id from venues where source_ref='node/1'`)).rows[0].id;
  const pendingVenue = (await db.query(`select id from venues where source_ref='node/2'`)).rows[0].id;

  const as = async (user, statement, params) => {
    await db.exec(user ? `set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`
      : `set role anon;select set_config('request.jwt.claim.sub','',false);`);
    try { return await db.query(statement, params); } finally { await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false);`); }
  };
  const one = async (user, statement, params) => (await as(user, statement, params)).rows[0];
  const draft = (overrides = {}) => ({ venue_id: venueId, title: 'Techno im Club Eins', starts_at: '2099-06-01T21:00:00Z',
    ends_at: '2099-06-02T04:00:00Z', genre: 'Techno', category: 'club', ticket_url: 'https://club-eins.example/tickets',
    source_url: 'https://club-eins.example/programm', provenance: 'Programm auf der Website, Zustimmung per Mail', ...overrides });
  const insertDraft = (user, values) => one(user, `insert into event_drafts(venue_id,title,starts_at,ends_at,genre,category,ticket_url,source_url,provenance)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, created_by`, [values.venue_id, values.title, values.starts_at, values.ends_at,
    values.genre, values.category, values.ticket_url, values.source_url, values.provenance]);

  await t.test('non-admins see and change nothing', async () => {
    assert.equal((await one(MEMBER, 'select public.spots_is_admin() as v')).v, false);
    await assert.rejects(as(null, 'select public.spots_is_admin()'), /permission denied/);
    await assert.rejects(insertDraft(MEMBER, draft()), /row-level security/);
    assert.equal((await one(MEMBER, 'select count(*)::int as n from event_drafts')).n, 0);
    assert.equal((await one(MEMBER, 'select count(*)::int as n from venues where not is_published')).n, 0);
    assert.equal((await one(MEMBER, 'select count(*)::int as n from venue_reports')).n, 0);
    await assert.rejects(as(MEMBER, `select public.spots_admin_set_venue_status($1,'approved')`, [pendingVenue]), /Not allowed/);
    await assert.rejects(as(null, 'select * from event_drafts'), /permission denied/);
  });

  let draftId;
  await t.test('admins create drafts with provenance; invalid drafts are rejected', async () => {
    assert.equal((await one(ADMIN, 'select public.spots_is_admin() as v')).v, true);
    const created = await insertDraft(ADMIN, draft());
    draftId = created.id;
    assert.equal(created.created_by, ADMIN);
    for (const bad of [{ provenance: '  ' }, { ticket_url: 'http://insecure.example' }, { ends_at: '2099-06-01T20:00:00Z' },
      { title: ' ' }, { category: 'festival' }]) {
      await assert.rejects(insertDraft(ADMIN, draft(bad)), /violates check constraint/, JSON.stringify(bad));
    }
    const noVenue = await insertDraft(ADMIN, draft({ venue_id: null, title: 'Ohne Ort' }));
    await assert.rejects(as(ADMIN, 'select public.spots_admin_approve_draft($1)', [noVenue.id]), /needs a venue/);
    await as(ADMIN, 'select public.spots_admin_reject_draft($1, $2)', [noVenue.id, 'Kein Ort angegeben']);
    await assert.rejects(as(ADMIN, 'select public.spots_admin_reject_draft($1)', [noVenue.id]), /not open/);
  });

  await t.test('approval creates exactly one editorial event with venue data, visible to everyone', async () => {
    await assert.rejects(as(MEMBER, 'select public.spots_admin_approve_draft($1)', [draftId]), /Not allowed/);
    const eventId = (await one(ADMIN, 'select public.spots_admin_approve_draft($1) as id', [draftId])).id;
    const event = (await db.query('select * from events where id=$1', [eventId])).rows[0];
    assert.deepEqual([event.source, event.source_event_id, event.organizer_id, event.venue_id, event.venue_name, event.latitude,
      event.status, event.is_published, event.source_url, event.genre],
      ['redaktion', draftId, null, venueId, 'Club Eins', 49.0094, 'scheduled', true, 'https://club-eins.example/programm', 'Techno']);
    const reviewed = (await db.query('select status, event_id, reviewed_by from event_drafts where id=$1', [draftId])).rows[0];
    assert.deepEqual([reviewed.status, reviewed.event_id, reviewed.reviewed_by], ['approved', eventId, ADMIN]);
    await assert.rejects(as(ADMIN, 'select public.spots_admin_approve_draft($1)', [draftId]), /not open/);
    await assert.rejects(as(ADMIN, `update event_drafts set title='Nachträglich' where id=$1`, [draftId]), /row-level security/,
      'approved drafts are frozen');
    assert.equal((await one(null, 'select count(*)::int as n from events where id=$1', [eventId])).n, 1, 'anon sees the event');
    await as(ADMIN, 'select public.spots_admin_set_event_published($1,false)', [eventId]);
    assert.equal((await one(null, 'select count(*)::int as n from events where id=$1', [eventId])).n, 0);
    await assert.rejects(as(ADMIN, 'select public.spots_admin_set_event_published($1,false)', [GOABASE]), /Only editorial/,
      'imports are never switched here');
  });

  await t.test('venue review and reports', async () => {
    assert.equal((await one(ADMIN, 'select count(*)::int as n from venues where not is_published')).n, 1, 'admins see pending venues');
    await as(ADMIN, `select public.spots_admin_set_venue_status($1,'approved')`, [pendingVenue]);
    assert.equal((await db.query('select is_published from venues where id=$1', [pendingVenue])).rows[0].is_published, true);
    await as(ADMIN, `select public.spots_admin_set_venue_status($1,'hidden')`, [pendingVenue]);
    assert.equal((await db.query('select is_published from venues where id=$1', [pendingVenue])).rows[0].is_published, false);
    await assert.rejects(as(ADMIN, `select public.spots_admin_set_venue_status($1,'auto')`, [pendingVenue]), /Not allowed/);
    await as(null, `select public.spots_report_venue($1,'closed','Seit Mai zu')`, [venueId]);
    const report = await one(ADMIN, 'select id, reason, note from venue_reports');
    assert.deepEqual([report.reason, report.note], ['closed', 'Seit Mai zu']);
    await assert.rejects(as(MEMBER, `select public.spots_admin_resolve_report($1,'resolved')`, [report.id]), /Not allowed/);
    await as(ADMIN, `select public.spots_admin_resolve_report($1,'resolved')`, [report.id]);
    await assert.rejects(as(ADMIN, `select public.spots_admin_resolve_report($1,'dismissed')`, [report.id]), /not open/);
    // Ein ausgeblendeter Ort nimmt keine neuen Freigaben an.
    const hiddenDraft = await insertDraft(ADMIN, draft({ venue_id: pendingVenue, title: 'In ausgeblendeter Halle' }));
    await assert.rejects(as(ADMIN, 'select public.spots_admin_approve_draft($1)', [hiddenDraft.id]), /hidden/);
  });

  await t.test('admins cannot be added through the API', async () => {
    await assert.rejects(as(ADMIN, `insert into spots_admin_private.admins(user_id) values ('${MEMBER}')`), /permission denied/);
  });
});
