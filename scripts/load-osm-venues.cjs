/* global __dirname:readonly */
// Lädt die mit fetch-osm-venues.cjs geholten Orte über spots_venues_apply_osm in Supabase (eine Anfrage pro Bundesland).
// Der Secret Key kommt nur aus der Umgebung (SPOTS_SECRET_KEY), wird nie gespeichert oder ausgegeben.
// Aufruf Spots-Test:  node scripts/load-osm-venues.cjs test [DE-BW ...]
// Aufruf Produktion:  node scripts/load-osm-venues.cjs produktion [DE-BW ...]   (nur mit Freigabe von Jacint und Noyan)
// Probelauf ohne Netz: node scripts/load-osm-venues.cjs probe
const fs = require('node:fs');
const path = require('node:path');

const PROJECTS = { test: 'https://nfomkdvotqtlyymomksb.supabase.co', produktion: 'https://yhnxdeypkbzyjappuzmv.supabase.co' };
const dir = path.resolve(__dirname, '../supabase/.temp/osm');

async function main() {
  const [target, ...regions] = process.argv.slice(2);
  if (!['test', 'produktion', 'probe'].includes(target)) throw new Error('Ziel angeben: test, produktion oder probe');
  const files = fs.readdirSync(dir).filter((f) => /^DE-[A-Z]{2}\.json$/.test(f)).sort()
    .filter((f) => !regions.length || regions.includes(f.slice(0, 5)));
  if (!files.length) throw new Error('Keine passenden OSM-Dateien in supabase/.temp/osm/');
  const key = process.env.SPOTS_SECRET_KEY ?? '';
  if (target !== 'probe' && !/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) throw new Error('SPOTS_SECRET_KEY fehlt oder hat das falsche Format.');
  for (const file of files) {
    const { region, elements } = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (target === 'probe') { console.log(`${region}: ${elements.length} Elemente`); continue; }
    const response = await fetch(`${PROJECTS[target]}/rest/v1/rpc/spots_venues_apply_osm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_region: region, p_elements: elements, p_complete: true }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${region}: HTTP ${response.status} ${text.slice(0, 200)}`);
    const r = JSON.parse(text);
    console.log(`${region}: ${r.accepted} übernommen (neu ${r.inserted ?? '?'}, geändert ${r.updated ?? '?'}, gleich ${r.unchanged ?? '?'}), ` +
      `ausgeblendet weil fehlend ${r.unpublished_missing ?? 0}, aussortiert ${JSON.stringify(r.skipped)}, Prüfung ${r.stale_check}`);
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
