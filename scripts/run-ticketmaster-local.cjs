// Lokaler Ende-zu-Ende-Lauf: echter Ticketmaster-Abruf (nur GET, ca. 5–10 Anfragen) mit dem Code der
// Edge Function, übernommen in eine flüchtige PGlite-Datenbank mit der echten SQL. Kein Supabase-Zugriff.
// Aufruf: SPOTS_PGLITE_MODULE=<pfad>/@electric-sql/pglite node scripts/run-ticketmaster-local.cjs
// Ausgabe: nur Zahlen und Verteilungen, keine Eventdaten und nie der Schlüssel.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sql = (name) => fs.readFileSync(path.join(root, 'supabase/ops', name), 'utf8');

function readKey() {
  const file = path.join(root, '.env.ticketmaster.local');
  const line = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => l.startsWith('TICKETMASTER_API_KEY=')) : null;
  const key = line ? line.slice('TICKETMASTER_API_KEY='.length).trim() : '';
  if (!/^[A-Za-z0-9]{16,64}$/.test(key)) throw new Error('Kein gültiger Schlüssel in .env.ticketmaster.local.');
  return key;
}

function loadSync() {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'supabase/functions/import-ticketmaster/sync.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams, AbortController, setTimeout,
    clearTimeout, fetch, Response }, { filename: 'sync.ts' });
  return module.exports;
}

async function main() {
  if (!process.env.SPOTS_PGLITE_MODULE) throw new Error('SPOTS_PGLITE_MODULE fehlt (siehe GOABASE_SYNC.md).');
  const apiKey = readKey();
  const { synchronize } = loadSync();
  const { PGlite } = require(process.env.SPOTS_PGLITE_MODULE);
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role;');
    for (const file of ['05_create_test_events.sql', '20_ticketmaster_sync_backend.sql']) await db.exec(sql(file));
    const rpc = async (name, args = []) => (await db.query(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as v`, args)).rows[0].v;

    const lease = await rpc('spots_ticketmaster_begin');
    const started = Date.now();
    const result = await synchronize(lease.ids, { apiKey });
    const applied = await rpc('spots_ticketmaster_apply', [lease.token, JSON.stringify(result.rows),
      JSON.stringify(result.removed), JSON.stringify(result.unconfirmed)]);
    await rpc('spots_ticketmaster_release', [lease.token]);

    // Zweiter Lauf mit denselben Daten muss „unverändert“ ergeben (ohne neuen Abruf).
    const again = await rpc('spots_ticketmaster_begin');
    const repeat = await rpc('spots_ticketmaster_apply', [again.token, JSON.stringify(result.rows), '[]', '[]']);
    await rpc('spots_ticketmaster_release', [again.token]);

    const one = async (q) => (await db.query(q)).rows;
    const summary = {
      duration_ms: Date.now() - started, requests: result.requests, windows: result.windows,
      discovered: result.discovered, rows: result.rows.length, skipped: result.skipped, applied,
      repeat_apply: repeat,
      published: (await one(`select count(*)::int n from events where is_published`))[0].n,
      published_with_coordinates: (await one(`select count(*)::int n from events where is_published and latitude is not null`))[0].n,
      running_now: (await one(`select count(*)::int n from events where is_published and starts_at <= now()`))[0].n,
      by_status: Object.fromEntries((await one(`select status, count(*)::int n from events group by 1 order by 2 desc`)).map((r) => [r.status, r.n])),
      by_genre: Object.fromEntries((await one(`select coalesce(genre,'(leer)') g, count(*)::int n from events group by 1 order by 2 desc limit 12`)).map((r) => [r.g, r.n])),
      top_cities: Object.fromEntries((await one(`select coalesce(city,'(leer)') c, count(*)::int n from events where is_published group by 1 order by 2 desc limit 8`)).map((r) => [r.c, r.n])),
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally { await db.close(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
