// Holt Clubs, Live-Musik-Orte und Eventlocations aus OpenStreetMap, pro Bundesland, nur lesend.
// Daten: © OpenStreetMap-Mitwirkende, ODbL. Speichert lokal nach supabase/.temp/osm/ (nicht im Git).
// Höflich: eine Anfrage nach der anderen, Pausen, Ausweich-Server bei Überlastung, vorhandene Dateien werden
// nicht erneut geladen (zum Neuladen die Datei löschen).
// Aufruf: node scripts/fetch-osm-venues.cjs [DE-BW DE-BY ...]
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.resolve(__dirname, '../supabase/.temp/osm');
const STATES = ['DE-BW', 'DE-BY', 'DE-BE', 'DE-BB', 'DE-HB', 'DE-HH', 'DE-HE', 'DE-MV', 'DE-NI', 'DE-NW',
  'DE-RP', 'DE-SL', 'DE-SN', 'DE-ST', 'DE-SH', 'DE-TH'];
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const query = (code) => `[out:json][timeout:240];
area["ISO3166-2"="${code}"]["admin_level"="4"]->.state;
nwr["amenity"~"^(nightclub|music_venue|events_venue)$"](area.state);
out tags center qt;`;

async function fetchState(code) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const mirror = MIRRORS[attempt % MIRRORS.length];
    const started = Date.now();
    try {
      const response = await fetch(mirror, {
        method: 'POST', signal: AbortSignal.timeout(300_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SpotsVenueImport/0.1' },
        body: new URLSearchParams({ data: query(code) }),
      });
      const text = await response.text();
      if (response.ok) {
        const json = JSON.parse(text);
        // Bei Zeitüberschreitung liefert Overpass Teildaten mit „remark“: nie als vollständig speichern.
        if (Array.isArray(json.elements) && !json.remark) return { elements: json.elements, mirror, ms: Date.now() - started };
        console.warn(`${code}: unvollständige Antwort von ${new URL(mirror).host}`);
      } else {
        console.warn(`${code}: HTTP ${response.status} von ${new URL(mirror).host}`);
      }
    } catch (error) {
      console.warn(`${code}: ${error.name} bei ${new URL(mirror).host}`);
    }
    await sleep(15_000 * (attempt + 1));
  }
  throw new Error(`${code}: keine vollständige Antwort nach 6 Versuchen`);
}

async function main() {
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : STATES;
  for (const code of wanted) if (!STATES.includes(code)) throw new Error(`Unbekanntes Bundesland: ${code}`);
  fs.mkdirSync(OUT, { recursive: true });
  const summary = {};
  for (const code of wanted) {
    const file = path.join(OUT, `${code}.json`);
    if (fs.existsSync(file)) {
      summary[code] = JSON.parse(fs.readFileSync(file, 'utf8')).elements.length;
      continue;
    }
    const result = await fetchState(code);
    fs.writeFileSync(file, JSON.stringify({ region: code, fetched_at: new Date().toISOString(),
      attribution: '© OpenStreetMap-Mitwirkende, ODbL', elements: result.elements }));
    summary[code] = result.elements.length;
    console.log(`${code}: ${result.elements.length} Orte (${new URL(result.mirror).host}, ${Math.round(result.ms / 1000)} s)`);
    await sleep(5_000);
  }
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ total, by_state: summary }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
