// Wertet die mit fetch-osm-venues.cjs geladenen OSM-Daten lokal aus: dieselbe SQL (21_venues.sql) in PGlite,
// keine Verbindung zu Supabase. Ausgabe: nur Zahlen pro Bundesland und Filtergrund.
// Aufruf: SPOTS_PGLITE_MODULE=<pfad>/@electric-sql/pglite node scripts/analyze-osm-venues.cjs
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'supabase/.temp/osm');

async function main() {
  if (!process.env.SPOTS_PGLITE_MODULE) throw new Error('SPOTS_PGLITE_MODULE fehlt.');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^DE-[A-Z]{2}\.json$/.test(f)).sort() : [];
  if (!files.length) throw new Error('Keine OSM-Daten gefunden. Zuerst node scripts/fetch-osm-venues.cjs ausführen.');
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    await db.exec(fs.readFileSync(path.join(root, 'supabase/ops/21_venues.sql'), 'utf8'));
    const states = {};
    const skipped = {};
    for (const file of files) {
      const { region, elements } = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const result = (await db.query('select public.spots_venues_apply_osm($1,$2,true) as v', [region, JSON.stringify(elements)])).rows[0].v;
      states[region] = { received: result.received, accepted: result.accepted };
      for (const [reason, n] of Object.entries(result.skipped)) skipped[reason] = (skipped[reason] ?? 0) + n;
    }
    const one = async (q) => (await db.query(q)).rows;
    const byKind = await one(`select kind, count(*) filter (where is_published)::int as published,
      count(*) filter (where not is_published)::int as pending from venues group by kind order by kind`);
    // Karlsruhe, ca. 15 km (Rechteck um 49.0069 / 8.4037).
    const karlsruhe = await one(`select kind, count(*)::int as n from venues where is_published
      and latitude between 48.872 and 49.142 and longitude between 8.198 and 8.609 group by kind order by kind`);
    const summary = {
      states, skipped, by_kind: byKind,
      total_published: byKind.reduce((sum, r) => sum + r.published, 0),
      total_pending_review: byKind.reduce((sum, r) => sum + r.pending, 0),
      karlsruhe_15km_published: Object.fromEntries(karlsruhe.map((r) => [r.kind, r.n])),
      with_website: (await one(`select count(*)::int as n from venues where is_published and website is not null`))[0].n,
      with_opening_hours: (await one(`select count(*)::int as n from venues where is_published and opening_hours is not null`))[0].n,
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally { await db.close(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
