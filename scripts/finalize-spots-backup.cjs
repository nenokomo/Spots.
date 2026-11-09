const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const pointer = JSON.parse(fs.readFileSync(path.join(root, 'supabase/.temp/production-backup-latest.json'), 'utf8'));
if (pointer.production_ref !== 'yhnxdeypkbzyjappuzmv') throw new Error('Wrong backup project.');
const dir = pointer.directory;
const bin = path.join(process.env.LOCALAPPDATA, 'Temp/vscode-agent-codex-sandbox-UOeaJh/spots-postgres-tools/pgsql/bin');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const restore = JSON.parse(fs.readFileSync(path.join(dir, 'local-restore-report.json'), 'utf8'));
if (!restore.results.public_schema_restore_passed || !restore.results.candidate_preserved_all_event_data_and_uuids)
  throw new Error('Required isolated restore checks missing.');
// Read every archive entry, including the managed schemas, without executing SQL.
execFileSync(path.join(bin, 'pg_restore.exe'), ['--file', path.join(dir, 'database.full.sql'), path.join(dir, 'database.full.dump')],
  { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
const sql = fs.readFileSync(path.join(dir, 'database.full.sql'), 'utf8');
const tables = [...sql.matchAll(/^COPY (\S+) \([^\n]+\) FROM stdin;\r?\n([\s\S]*?)^\\\.$/gm)]
  .map(m => ({ table: m[1], rows: m[2].split(/\r?\n/).filter(Boolean).length }));
fs.writeFileSync(path.join(dir, 'archive-data-counts.json'), JSON.stringify(tables, null, 2) + '\n', { flag: 'wx' });
fs.copyFileSync(path.join(root, 'supabase/ops/03_goabase_sync_backend.sql'), path.join(dir, 'candidate-03_goabase_sync_backend.sql'), fs.constants.COPYFILE_EXCL);
if (hash(path.join(dir, 'candidate-03_goabase_sync_backend.sql')) !== restore.candidate_sha256) throw new Error('Candidate changed.');
fs.writeFileSync(path.join(dir, 'deployed-function/supabase/config.toml'),
  '[functions.import-goabase]\nverify_jwt = false\nentrypoint = "./functions/import-goabase/index.ts"\n', { flag: 'wx' });
fs.writeFileSync(path.join(dir, 'RESTORE.md'), `# Spots Produktionsbackup\n\nProjekt: yhnxdeypkbzyjappuzmv (Spots.).\n\nVollständiges logisches PostgreSQL-17.11-Archiv: database.full.dump, zusätzlich vollständig dekodiertes database.full.sql. Keine Schemas beim Export ausgeschlossen. Rollen separat ohne Passwort-Hashes. Datenbankarchive enthalten sensible Backend-Daten; dieses Verzeichnis bleibt lokal, zugriffsbeschränkt und Git-ignoriert.\n\n## Verifiziert\n\n- Archiv vollständig gelesen/dekodiert; Tabellenzahlen: archive-data-counts.json.\n- Public-Schema einschließlich Eigentümern, Daten, PK/Unique, RLS und ACLs in eigenem lokalen PostgreSQL wiederhergestellt. Alle 31 Events einschließlich sämtlicher Felder und UUIDs identisch zum vorhandenen Produktionsnachweis.\n- Getestete Ergänzung candidate-03_goabase_sync_backend.sql nur lokal angewendet; alle 31 Events unverändert.\n- Lokaler Server beendet. Details: local-restore-report.json.\n\n## Grenzen\n\nKeine vollständige Wiederherstellung der Supabase-Plattformdienste behauptet. Stock-PostgreSQL besitzt nicht die Supabase-Vault-Erweiterung; für lokal wiederhergestellte Rollen wurden explizite ADMIN-Mitgliedschaften für den Supabase-Grantor benötigt (roles.local-restore-compat.sql). Originalarchiv und Originalrollen sind unverändert. Vollständiger Plattformrestore benötigt eine kompatible Supabase-Umgebung und deren administratives Restore-Verfahren.\n\nStorage-Dateiinhalte außerhalb PostgreSQL, Projektkonfiguration, API-/Edge-Secrets und Rollenpasswörter sind keine Bestandteile dieses Datenbankbackups. Vault-Daten sind ggf. an den ursprünglichen Plattformschlüssel gebunden; Entschlüsselung nach Projektwechsel nicht verifiziert.\n\nDie bereitgestellte Function liegt als heruntergeladener Quellcode unter deployed-function/supabase/functions/import-goabase/. Originalmetadaten einschließlich Version, Verify-JWT und Server-Bundle-Hash: edge-function-metadata.json. Keine Secrets gesichert. Die historische Abhängigkeit npm:@supabase/server@1 ist nicht exakt gepinnt; ein erneutes Deployment kann Abhängigkeiten neu auflösen und ist deshalb kein garantierter byteidentischer Bundle-Restore. Kein Deployment oder Function-Aufruf zum Test ausgeführt.\n\n## Rückfallplan\n\nBei späteren Problemen zunächst Importaufrufe/Cron nach eigener Freigabe stoppen. Vor Änderungen erneut betroffene Eventdaten sichern. Für die reine Ergänzung 03 bleibt die alte Function unverändert und nutzbar; vorhandene Events benötigen keinen Restore, da die Ergänzung sie nicht schreibt. Das zusätzliche private Backend kann zunächst unbenutzt bestehen bleiben. Kein blindes DROP oder Überschreiben einer weiterentwickelten produktiven Datenbank.\n\nEin Wiederherstellen in Produktion oder ein Rollback-Deployment braucht eine eigene konkrete Freigabe. Funktion für einen genehmigten Rückfall ausschließlich aus deployed-function bereitstellen und verify_jwt=false/auth:secret beibehalten; Default Secret bleibt im Backend. Vollständiges DB-Archiv zuerst in einer kompatiblen isolierten Supabase-Umgebung wiederherstellen und vergleichen, bevor ein produktiver Komplettrestore erwogen wird.\n`, { flag: 'wx' });
const reportFile = path.join(dir, 'database-backup-report.json');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
report.archive_fully_decoded = true;
report.public_schema_restore_verified = true;
report.full_managed_platform_restore_verified = false;
report.candidate_rehearsed_locally = true;
report.restore_report = 'local-restore-report.json';
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
}
const manifest = Object.fromEntries(files(dir).filter(file => !file.includes(`${path.sep}.temp${path.sep}`) &&
  path.basename(file) !== 'sha256-manifest.json').map(file => [path.relative(dir, file).replaceAll('\\', '/'), hash(file)]));
fs.writeFileSync(path.join(dir, 'sha256-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
for (const [name, expected] of Object.entries(manifest)) if (hash(path.join(dir, name)) !== expected) throw new Error('Manifest verification failed.');
console.log(JSON.stringify({ project: pointer.production_ref, directory: dir, archive_tables: tables.length,
  table_counts: tables.filter(t => /public\.events|auth\.users|storage\.objects|storage\.buckets|vault\.secrets/.test(t.table)),
  all_files_hash_verified: Object.keys(manifest).length, candidate_sha256: restore.candidate_sha256 }));
