> Datierte Einrichtungs-/Wiederherstellungsnachweise. Aktueller Betriebsstand: [PROJECT_STATUS.md](PROJECT_STATUS.md). Historische Schritte nicht erneut ausführen.

# Spots: Produktionsbackup und vorbereitete SQL-Freigabe

**Fortschreibung 08.11.2026 18:01:54 UTC:** Nach erneuter Prüfung des unten beschriebenen Backups (30 Manifestdateien) wurden SQL 09 und 10 separat freigegeben und ausschließlich produktiv erfolgreich ausgeführt. Alle 31 Eventdaten/UUIDs sowie Event-Sicherheitsregeln unverändert, Backend-Berechtigungen korrekt. Das Backup bleibt der geprüfte Stand **vor** diesen Ergänzungen; keine weitere Backup-/Restore-Wiederholung durchgeführt. Produktive Function/App unverändert, kein Deployment/Function-Aufruf/POST/Cron. [Tatsächlicher Ausführungsbericht](docs/history/PRODUCTION_09_10_APPROVAL.md).

## Aktualisierung 08.11.2026: frisches Backup und Backend-09/10-Probe erfolgreich

- Tatsächliches Produktionsziel **Spots. / yhnxdeypkbzyjappuzmv** geprüft. Neues geschütztes, Git-ignoriertes Backup: `supabase/backups/production-backup-2026-11-08T17-46-21-621Z/`. Vorheriges Backup bleibt erhalten. Erstellung Datenbankarchiv **17:46:26–17:46:42 UTC**, abschließende rein lesende Produktionsprüfung **17:55:41 UTC**. Keine produktive Daten-/SQL-/Policy-/Deployment-/Import-/Cron-Änderung; App unverändert, CLI weiterhin Test.
- Vollständiges logisches pg_dump-17.11-Archiv ohne Schemaausschlüsse, Rollen ohne Passwort-Hashes und vollständig dekodierte SQL. **43 Tabellen-Datenabschnitte**, davon public.events=31, private Lease=1, Quellversionen=0; auth.users/storage.objects/storage.buckets/vault.secrets jeweils 0. Archiv-SHA-256 **`50a9c3f3b19453652a793174a5165451bf2f21e0460ca62e14d977f0ad15da0c`**. Insgesamt **30 gesicherte Dateien per Manifest nachgeprüft**. Temporäre Zugangsdaten nur im RAM; keine API-/Edge-Secrets exportiert.
- Aktuell produktiv bereitgestellte **import-goabase ACTIVE/Version 2/verify_jwt=false/auth:secret** heruntergeladen, Quellcode mit Deno-Konfiguration/Lockdatei und passende Function-Konfiguration separat gesichert. Unveränderter Server-Bundle-Fingerprint `f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c`; kein deploybares Binary-Bundle gesichert und kein Rollback-Deployment getestet.
- **public und spots_sync_private tatsächlich in eigener lokaler PostgreSQL-17.11-Instanz wiederhergestellt**, einschließlich Eigentümern/Daten/PK/Unique/RLS/ACLs. Alle **31 vollständigen Eventzeilen einschließlich UUIDs identisch zum frischen Produktionssnapshot**. Anschließend die unveränderten SQL-Erweiterungen 09 und 10 als postgres nur lokal ausgeführt: beide erfolgreich, nach jeder Datei alle 31 Events unverändert. Vier private RLS-Tabellen, fünf öffentliche Backend-RPCs/zwei private Core-Funktionen und Rechte erfolgreich geprüft.
- Lokale Restore-Anläufe zunächst auf Schemaauswahl, JSON-Schlüsselreihenfolge im Vergleich und Datenbank-/Migrationsrollenabgleich korrigiert: eigener Schema-TOC-Eintrag wird explizit mitrestauriert, semantischer Objektvergleich, lokale Datenbank postgres-eigen wie tatsächlich produktiv, SQL als postgres. Erforderliche lokale ADMIN-Mitgliedschaften für Supabase-Grantor separat ergänzt; Originalarchive/Rollen/Kandidaten unverändert. Abschließender Restore erfolgreich, lokale Server beendet. Diese Anpassungen betreffen ausschließlich die isolierte Testumgebung und den [Restore-Ablauf](scripts/prepare-goabase-production-upgrade.cjs).
- **Kein vollständiger verwalteter Supabase-Plattformrestore nachgewiesen**, keine unabhängige Kopie auf anderem Gerät. Storage-Dateiinhalte, API-/Edge-Secrets, Rollenpasswörter und externe Projekt-/Providerkonfiguration liegen außerhalb dieses Backups. Originalarchiv enthält verwaltete Schemas; deren Dienste/Extensions benötigen einen kompatiblen Supabase-Restore. Ausführliche Anleitung/Grenzen und Rückweg im geschützten Backup unter RESTORE.md und upgrade-report.json.
- Produktive RLS prüft nur is_published. Isoliert bestätigt: source_removed/source_unconfirmed mit false unsichtbar, mit true sichtbar. Korrigierte Backend-Funktionen setzen false; separate Statushärtung empfohlen, keine Policyänderung vorgenommen. **Konkrete nächste SQL-Freigabe mit eingefrorenen Hashes und Befehlen: [PRODUCTION_09_10_APPROVAL.md](docs/history/PRODUCTION_09_10_APPROVAL.md).** Expo-Lint und App-Typecheck erfolgreich. Bereits bestandene Import-/Integrationstests nicht wiederholt.

## Historischer Backupstand vom 06.11.2026

Stand: 06.11.2026. Ziel ausschließlich **Spots. / yhnxdeypkbzyjappuzmv**. Die abgeschlossene Bestandsprüfung wurde nicht wiederholt. Keine produktiven Event-/Schema-/Policyänderungen, Deployments, Function-Aufrufe oder Cron-Aktivierungen ausgeführt. Lokale CLI bleibt mit Test **nfomkdvotqtlyymomksb** verbunden; App-`.env.local` unverändert.

**Fortschreibung 08.11.2026:** Die unten dokumentierte Backend-Ergänzung 03 wurde inzwischen separat freigegeben und genau einmal in Produktion ausgeführt. Alle 31 Eventdaten/UUIDs und das Events-Schema einschließlich Rechten unverändert, zwei private Tabellen/drei RPCs erfolgreich geprüft. Keine weitere produktive Änderung, kein Deployment/Import/Cron. Vollständiger Ausführungsnachweis: [PROJECT_STATUS.md](PROJECT_STATUS.md). Der ursprüngliche Backup-Bericht bleibt als historischer Nachweis erhalten.

## Gesichertes Backup

Lokales, Git-ignoriertes Verzeichnis: `supabase/backups/production-backup-2026-11-05T23-31-22-437Z/`. Windows-Zugriff auf den aktuellen Benutzer begrenzt. Es gibt bisher keine unabhängige Kopie auf einem anderen Gerät.

- **database.full.dump:** vollständiges logisches Archiv der Datenbank `postgres`, erstellt mit offiziellem PostgreSQL **17.11**, passend zur Quelle. Keine Schemas ausgeschlossen, einschließlich `auth`, `storage`, `realtime` und `vault`. Ein einzelner `pg_dump` erzeugt einen konsistenten Datenbanksnapshot; Rollen separat gesichert.
- **database.full.sql:** sämtliche Archiveinträge erfolgreich vollständig dekodiert. **601 TOC-Einträge, 41 Tabellen-Datenabschnitte**; 31 Events, 0 Auth-Benutzer, 0 Storage-Buckets/-Objekte, 0 Vault-Secrets. Zählungen aus dem Backup, keine erneute Remote-Bestandsprüfung.
- **roles.no-passwords.sql:** Rollenattribute, Mitgliedschaften und Rollenrechte; Passwort-Hashes absichtlich ausgeschlossen. Original bleibt unverändert.
- **deployed-function/**: tatsächlich heruntergeladener produktiver Quellcode, getrennt vom verbesserten lokalen Importer; Konfiguration `verify_jwt=false`. Originalmetadaten: ACTIVE, Version 1, Function-ID `d1e82fa9-2874-487a-9a9c-15fb8adf6b83`; serverseitiger Bundle-Hash `533190a2c6690a52fbdf0e2773ea897cf3e00e462692b6b5a006b1f7683dd868`. `auth: "secret"` vorhanden, keine eingebetteten Secret-Key-Muster gefunden. Keine Secrets exportiert.
- **sha256-manifest.json:** Prüfsummen der gesicherten Dateien, lokal nachgerechnet. Restore-Anleitung und Einzelberichte im selben Verzeichnis.

SHA-256 des Datenbankarchivs: `2ef2c4edf9ad87161414ac3207a9e4128bf4d36743bb2be2d01ea89b01f2db49`.

SHA-256 des heruntergeladenen Function-Quellcodes: `ec3285abcc5242e47bfd25d61ae7cf7373e9f6f76ad7b44139c6a6238e93d732`.

Der normale CLI-Docker-Export konnte wegen einer nicht antwortenden lokalen Docker-Schnittstelle nicht abgeschlossen werden. Stattdessen offizielle portable PostgreSQL-Werkzeuge außerhalb des App-Projekts verwendet. Die CLI lieferte projektbezogene temporäre Datenbank-Zugangsdaten ausschließlich im Prozessspeicher; keine Passwortänderung und keine Speicherung/Ausgabe dieser Zugangsdaten. Export-Sitzungen mit `default_transaction_read_only=on`.

## Tatsächlicher Restore-Nachweis

Eigene lokale PostgreSQL-17.11-Instanz, nur `127.0.0.1:55439`, ohne Remote-Verbindungen. **Public-Schema einschließlich Eigentümern, Daten, PK/Unique, RLS und Grants erfolgreich aus dem Archiv wiederhergestellt. Alle 31 vollständigen Eventzeilen und UUIDs stimmen mit dem vorhandenen Produktionsnachweis überein.**

Bestätigt: 19 Eventspalten, PK auf `id`, UNIQUE auf `(source, source_event_id)`, RLS aktiv, bestehende Policy `Read published events` mit `is_published = true`, Client-SELECT und keine Client-INSERT-Rechte, Backend-Schreibrecht vorhanden.

Anschließend den unveränderten Kandidaten [03_goabase_sync_backend.sql](supabase/ops/03_goabase_sync_backend.sql) ausschließlich auf diesem lokalen Restore angewendet: erfolgreich, zwei private Tabellen mit RLS und drei RPCs erstellt, Backend-EXECUTE vorhanden, Client-EXECUTE auf Begin verweigert. **Alle 31 Events mit sämtlichen Feldern und UUIDs unverändert.** Keine unnötige Wiederholung der bereits bestandenen Import-/Parallel-/Quellenfehlertests. Lokalen Datenbankserver danach beendet.

### Grenzen des Nachweises

- Der **vollständige Supabase-Plattformrestore ist nicht getestet**. Normales Windows-PostgreSQL besitzt die Supabase-Vault-Erweiterung nicht. Geprüft wurde das für diese Ergänzung relevante Public-Schema; verwaltete Schemas sind vollständig im Archiv enthalten, wurden lokal nicht eingespielt.
- Beim ersten lokalen Rollenrestore verlangte PostgreSQL explizite ADMIN-Mitgliedschaften für `GRANTED BY supabase_admin`. Für den erfolgreichen lokalen Versuch wurde deshalb eine separate Kompatibilitätsdatei erstellt; Originalrollen und Originalarchiv unverändert. Die vollständige Plattform-Rollenhierarchie wird damit nicht als unverändert wiederhergestellt behauptet. Ein vorheriger lokaler Prozessstart-Timeout durch geerbte Windows-Pipes wurde ebenfalls lokal behoben.
- Ein Datenbankbackup umfasst keine Storage-Dateiinhalte außerhalb PostgreSQL, API-/Edge-Secrets, Rollenpasswörter oder Projekt-/Providerkonfiguration. Die gesicherten Daten weisen aktuell keine Benutzer, Storage-Objekte oder Vault-Secrets auf. Für einen späteren Komplettrestore braucht es eine kompatible Supabase-Zielumgebung und deren Plattformkonfiguration.
- Die alte Function referenziert `npm:@supabase/server@1` ohne exakten Versions-Pin. Gesicherter Quellcode plus Server-Bundle-Hash ermöglichen einen nachvollziehbaren Rückfall; ein erneutes Deployment ist ohne gesichertes identisches Abhängigkeitspaket nicht garantiert byteidentisch. Es fand kein Rollback-Deployment oder Function-Aufruf statt.
- App-Typecheck um `supabase/backups` als Ausschluss ergänzt, damit archivierter Deno-Code nicht als App-Code kompiliert wird. Keine Laufzeit-/Design-/Navigationsänderung. **Expo-Lint und Typecheck erfolgreich**, neue Backup-/Restore-Skripte syntaktisch geprüft, keine Editor-Diagnosen.

## Backend-Ergänzung 03: am 08.11.2026 freigegeben und ausgeführt

**Erfolgreich ausgeführt und geprüft. Ziel: Spots. / yhnxdeypkbzyjappuzmv. Nicht wiederholen.**

Genau der lokal auf dem Produktionsrestore erfolgreich geprüfte SQL-Kandidat [03_goabase_sync_backend.sql](supabase/ops/03_goabase_sync_backend.sql), zusätzlich unverändert im Backup eingefroren:

`SHA-256: 205b02360cd29bd2d958ba94a1cea739c46d72a022e280b239ef406c8ffd3cd3`

Nach ausdrücklicher Freigabe unmittelbar Projekt-ID und Kandidaten-Hash bestätigen, frischen Event-Vergleichsstand sichern und ausschließlich diese Datei in ihrer vorhandenen Transaktion ausführen:

```powershell
# BEREITS ERFOLGREICH AUSGEFÜHRT – nicht wiederholen
npx supabase db query --remote=yhnxdeypkbzyjappuzmv --file supabase/ops/03_goabase_sync_backend.sql --yes --output-format json
```

Umfang: Schema `spots_sync_private`, Tabellen `goabase_lease` und `goabase_versions`, genau eine anfängliche freie Lease-Zeile, Funktionen `spots_goabase_begin`, `spots_goabase_apply`, `spots_goabase_release` und die zugehörigen Backend-Rechte/RLS. Kein Aufruf dieser RPCs während der Einrichtung.

**Keine Event-Datenänderung, kein Ersetzen der Events-Tabelle, keine Event-UUID-/Index-/Default-/Policyänderung; keine Extensions/Vault-Einträge, kein Deployment, kein Import und kein Cron.** Die zuvor vorgeschlagene Verschärfung der bestehenden Event-Lesepolicy bleibt ein separater Freigabeschritt.

Danach ausschließlich lesend Eventdaten/UUIDs gegen den unmittelbar vorher gesicherten Bestand und neue Objekte/Rechte kontrollieren; bei Fehlern stoppen, nicht blind erneut ausführen. Die SQL-Datei enthält `BEGIN`/`COMMIT`, sodass SQL-Fehler die Ergänzung zurückrollen. Die alte produktive Function bleibt bereitgestellt.

Rückweg für diese reine Ergänzung: alte Function und Events unverändert lassen; bei Problemen keine weiteren Übernahmeschritte ausführen. Die zusätzlichen unbenutzten Metadaten zunächst bestehen lassen. Kein Datenrestore oder pauschales Löschen nötig. Jeder spätere selektive Datenrestore, jede Entfernung des Backends und jedes Rückfall-Deployment braucht eine konkrete eigene Freigabe. Weitere Übernahmeschritte: [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md).

Offizielle Verfahren: [Supabase Backup/Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [CLI-Dump und seine Schemaausschlüsse](https://supabase.com/docs/reference/cli/supabase-db-dump), [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [offizielle PostgreSQL-Windows-Binärpakete](https://www.postgresql.org/download/windows/).
