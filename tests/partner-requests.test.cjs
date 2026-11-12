// Echte SQL von 23_partner_requests.sql in PGlite (nie Supabase): Prüfungen, Grenzen, Rechte.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('partner requests: anonymous insert with validation and limits, never readable', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  // Wie in Supabase: Die Service-Rolle umgeht Zeilenrechte (RLS).
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase/ops/23_partner_requests.sql'), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // wiederholbar
  const request = (overrides = {}) => {
    const v = { name: 'Alex', organization: 'Fixture Club', email: 'booking@fixture.example', city: 'Karlsruhe', kind: 'Club',
      phone: null, website: null, message: null, ...overrides };
    return db.query('select public.spots_partner_request($1,$2,$3,$4,$5,$6,$7,$8) as ok',
      [v.name, v.organization, v.email, v.city, v.kind, v.phone, v.website, v.message]);
  };
  const count = async () => (await db.query('select count(*)::int as n from spots_partner_private.partner_requests')).rows[0].n;

  await t.test('anon can send a valid request; values are trimmed and the e-mail lower-cased', async () => {
    await db.exec('set role anon');
    try {
      assert.equal((await request({ name: '  Alex  ', email: ' Booking@Fixture.Example ', website: ' ', message: '  Hallo  ' })).rows[0].ok, true);
    } finally { await db.exec('reset role'); }
    const row = (await db.query('select * from spots_partner_private.partner_requests')).rows[0];
    assert.deepEqual([row.name, row.email, row.website, row.message, row.status], ['Alex', 'booking@fixture.example', null, 'Hallo', 'new']);
  });

  await t.test('invalid input is rejected', async () => {
    for (const bad of [{ name: ' ' }, { organization: '' }, { city: null }, { email: 'kein-mail' }, { email: 'a@b' },
      { kind: 'Hochzeit' }, { message: 'x'.repeat(2001) }, { phone: '1'.repeat(41) }]) {
      await assert.rejects(request(bad), /Invalid partner request/, JSON.stringify(bad));
    }
  });

  await t.test('the same address is stored at most three times a day; further tries look the same', async () => {
    const before = await count();
    for (let i = 0; i < 5; i++) assert.equal((await request({ email: 'repeat@fixture.example' })).rows[0].ok, true);
    assert.equal(await count(), before + 3);
  });

  await t.test('global hourly limit stops floods', async () => {
    await db.exec(`insert into spots_partner_private.partner_requests(name, organization, email, city, kind)
      select 'Flood', 'Flood', 'flood' || g || '@fixture.example', 'Karlsruhe', 'Club' from generate_series(1, 60) g`);
    await assert.rejects(request({ email: 'late@fixture.example' }), /Too many partner requests/);
  });

  await t.test('nobody can read or write the table directly, only the service role', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        await assert.rejects(db.query('select * from spots_partner_private.partner_requests'), /permission denied/);
        await assert.rejects(db.query(`insert into spots_partner_private.partner_requests(name, organization, email, city, kind)
          values ('x','x','x@x.de','x','Club')`), /permission denied/);
      } finally { await db.exec('reset role'); }
    }
    await db.exec('set role service_role');
    try { assert.ok((await db.query('select count(*)::int as n from spots_partner_private.partner_requests')).rows[0].n > 0); }
    finally { await db.exec('reset role'); }
  });
});
