// Echte SQL von 21_venues.sql in PGlite (nie Supabase): Filter, Übernahme, Melden, Rechte.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'supabase/ops', name), 'utf8');

let nextId = 1000;
function osm(tags, { type = 'node', id = nextId++, lat = 49.0094, lon = 8.3994, center } = {}) {
  return type === 'node' ? { type, id, lat, lon, tags } : { type, id, center: center ?? { lat, lon }, tags };
}

test('venues SQL: filters, import decisions, stale handling, reports and permissions', {
  skip: !process.env.SPOTS_PGLITE_MODULE && 'Set SPOTS_PGLITE_MODULE for actual SQL tests',
}, async (t) => {
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(sql('21_venues.sql'));
  await db.exec(sql('21_venues.sql')); // wiederholbar
  const value = async (query, params) => (await db.query(query, params)).rows[0]?.v;
  const classify = (el) => value('select spots_venues_private.osm_venue($1) as v', [JSON.stringify(el)]);
  const skip = async (el) => (await classify(el)).skip;
  const row = async (el) => { const result = await classify(el); assert.ok(result.row, JSON.stringify(result)); return result.row; };
  const apply = (region, elements, complete = true) =>
    value('select public.spots_venues_apply_osm($1,$2,$3) as v', [region, JSON.stringify(elements), complete]);
  const venue = (ref) => db.query('select * from venues where source_ref=$1', [ref]).then((r) => r.rows[0]);

  await t.test('filter: names, adult venues, closed venues, locations', async () => {
    assert.equal(await skip(osm({ amenity: 'nightclub' })), 'no_name');
    assert.equal(await skip(osm({ amenity: 'nightclub', name: '   ' })), 'no_name');
    assert.equal(await skip(osm({ amenity: 'bar', name: 'Bar' })), 'other_amenity');
    for (const tags of [{ name: 'Club X', erotic: 'yes' }, { name: 'Club X', nightclub: 'striptease' },
      { name: 'Club X', swingerclub: 'yes' }, { name: 'Erotik Lounge' }, { name: 'Laufhaus Mitte' },
      { name: 'Table Dance Bar' }, { name: 'FKK Oase' }, { name: 'Sexy Nights' }, { name: 'Club X', shop: 'erotic' },
      { name: 'Club X', theme: 'bdsm' }, { name: 'Club X', theme: 'fetish' }]) {
      assert.equal(await skip(osm({ amenity: 'nightclub', ...tags })), 'adult', JSON.stringify(tags));
    }
    for (const tags of [{ name: 'Club X', disused: 'yes' }, { name: 'Club X', opening_hours: 'closed' },
      { name: 'Club X', end_date: '2019-05' }, { name: 'Club X (geschlossen)' }, { name: 'Ehemaliger Club X' }]) {
      assert.equal(await skip(osm({ amenity: 'nightclub', ...tags })), 'closed', JSON.stringify(tags));
    }
    assert.equal(await skip(osm({ amenity: 'nightclub', name: 'Club X', end_date: 'unbekannt' })), undefined,
      'odd end_date values do not break the import');
    assert.equal(await skip(osm({ amenity: 'nightclub', name: 'Club X' }, { type: 'way', center: {} })), 'no_location');
    assert.equal(await skip({ type: 'node', id: 'x', tags: {} }), 'invalid_element');
  });

  await t.test('filter keeps queer venues, normalises websites, uses centers and publishes by kind', async () => {
    const queer = await row(osm({ amenity: 'nightclub', name: 'Queer Club', lgbtq: 'primary', 'lgbtq:gay': 'primary' }));
    assert.equal(queer.publish, true);
    const way = await row(osm({ amenity: 'music_venue', name: '  Substage  ', website: 'www.example.org/programm',
      'addr:street': 'Alter Schlachthof', 'addr:housenumber': '19', 'addr:postcode': '76131', 'addr:city': 'Karlsruhe',
      opening_hours: 'Fr-Sa 23:00-05:00' }, { type: 'way', id: 77, center: { lat: 49.01, lon: 8.42 } }));
    assert.deepEqual(way, { source_ref: 'way/77', name: 'Substage', kind: 'live', street: 'Alter Schlachthof',
      house_number: '19', postcode: '76131', city: 'Karlsruhe', latitude: 49.01, longitude: 8.42,
      website: 'https://www.example.org/programm', opening_hours: 'Fr-Sa 23:00-05:00', publish: true });
    assert.equal((await row(osm({ amenity: 'nightclub', name: 'A', website: 'https://a.de;https://b.de' }))).website, null);
    assert.equal((await row(osm({ amenity: 'nightclub', name: 'A', website: 'kein link' }))).website, null);
    assert.equal((await row(osm({ amenity: 'events_venue', name: 'Halle' }))).publish, false, 'event venues need a website or review');
    assert.equal((await row(osm({ amenity: 'nightclub', name: 'A', opening_hours: '"Nach Absprache"' }))).opening_hours, 'Nach Absprache');
    assert.equal((await row(osm({ amenity: 'events_venue', name: 'Halle', website: 'https://halle.de' }))).publish, true);
  });

  const club = osm({ amenity: 'nightclub', name: 'Club Eins' }, { id: 1 });
  const live = osm({ amenity: 'music_venue', name: 'Live Zwei' }, { id: 2 });
  const hall = osm({ amenity: 'events_venue', name: 'Halle Drei' }, { id: 3 });
  const adult = osm({ amenity: 'nightclub', name: 'Laufhaus' }, { id: 4 });

  await t.test('import: insert, unchanged, update; team decisions survive re-imports', async () => {
    const first = await apply('DE-BW', [club, live, hall, adult]);
    assert.deepEqual([first.inserted, first.accepted, first.skipped], [3, 3, { adult: 1 }]);
    assert.deepEqual([(await venue('node/1')).is_published, (await venue('node/3')).is_published, (await venue('node/3')).review_status],
      [true, false, 'pending']);
    const id = (await venue('node/1')).id;
    assert.equal((await apply('DE-BW', [club, live, hall])).unchanged, 3);
    const renamed = { ...club, tags: { ...club.tags, name: 'Club Eins Neu' } };
    assert.equal((await apply('DE-BW', [renamed, live, hall])).updated, 1);
    assert.equal((await venue('node/1')).id, id, 'stable UUID');
    // Team blendet Club aus und gibt die Halle frei: beides bleibt bei neuen Importen bestehen.
    await db.exec(`update venues set review_status='hidden', is_published=false where source_ref='node/1';
      update venues set review_status='approved', is_published=true where source_ref='node/3';`);
    const again = await apply('DE-BW', [renamed, live, hall]);
    assert.equal(again.kept_hidden, 1);
    assert.deepEqual([(await venue('node/1')).is_published, (await venue('node/3')).is_published], [false, true]);
    await assert.rejects(db.query(`update venues set is_published=true where source_ref='node/1'`), /venues_hidden_unpublished/);
  });

  await t.test('venues missing from a complete answer are hidden, not deleted; partial answers change nothing', async () => {
    assert.equal((await apply('DE-BW', [live], false)).stale_check, 'not_requested');
    assert.equal((await venue('node/2')).is_published, true);
    const complete = await apply('DE-BW', [live]);
    assert.deepEqual([complete.stale_check, complete.unpublished_missing], ['done', 0], 'approved hall stays, hidden club stays hidden');
    const others = Array.from({ length: 30 }, (_, i) => osm({ amenity: 'nightclub', name: `Club ${i}` }, { id: 500 + i }));
    await apply('DE-HE', others);
    const tiny = await apply('DE-HE', others.slice(0, 5));
    assert.equal(tiny.stale_check, 'skipped_suspicious_response', 'a suspiciously small answer never hides many venues');
    assert.equal((await value(`select count(*)::int as v from venues where region='DE-HE' and is_published`)), 30);
    const shrink = await apply('DE-HE', others.slice(0, 20));
    assert.deepEqual([shrink.stale_check, shrink.unpublished_missing], ['done', 10]);
    assert.equal(await value(`select count(*)::int as v from venues where region='DE-HE'`), 30, 'rows are kept');
    await assert.rejects(apply('Baden', [live]), /Invalid region/);
    await assert.rejects(apply('DE-BW', {}), /Invalid OSM batch/);
  });

  await t.test('reports: anonymous, fixed reasons, short notes, only published venues, capped', async () => {
    const id = (await venue('node/2')).id;
    const hidden = (await venue('node/1')).id;
    const report = (venueId, reason, note = null) =>
      value('select public.spots_report_venue($1,$2,$3) as v', [venueId, reason, note]);
    await db.exec('set role anon');
    try {
      assert.equal(await report(id, 'closed', '  Seit Mai zu  '), true);
      await assert.rejects(report(id, 'spam'), /Invalid venue report/);
      await assert.rejects(report(id, 'other', 'x'.repeat(501)), /Invalid venue report/);
      await assert.rejects(report(hidden, 'closed'), /Unknown venue/);
      await assert.rejects(db.query('select * from venue_reports'), /permission denied/);
      await assert.rejects(db.query(`insert into venue_reports(venue_id, reason) values ('${id}', 'other')`), /permission denied/);
      for (let i = 0; i < 60; i++) await report(id, 'other');
    } finally { await db.exec('reset role'); }
    assert.equal(await value(`select note as v from venue_reports where reason='closed'`), 'Seit Mai zu');
    assert.equal(await value(`select count(*)::int as v from venue_reports where venue_id=$1`, [id]), 50);
  });

  await t.test('public read only for published venues; import only for the service role', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        assert.equal(await value('select count(*)::int as v from venues where not is_published'), 0);
        assert.ok(await value('select count(*)::int as v from venues') > 0);
        await assert.rejects(db.query(`select public.spots_venues_apply_osm('DE-BW','[]',false)`), /permission denied/);
        await assert.rejects(db.query(`update venues set name='x'`), /permission denied/);
        await assert.rejects(db.query(`select spots_venues_private.osm_venue('{}')`), /permission denied/);
      } finally { await db.exec('reset role'); }
    }
    await db.exec('set role service_role');
    try {
      assert.equal((await value(`select public.spots_venues_apply_osm('DE-SL','[]',false) as v`)).accepted, 0);
    } finally { await db.exec('reset role'); }
  });
});
