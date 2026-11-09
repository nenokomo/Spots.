> Datierte Einrichtungs-/Wiederherstellungsnachweise. Aktueller Betriebsstand: [PROJECT_STATUS.md](PROJECT_STATUS.md). Historische Schritte nicht erneut ausführen.

# Supabase-Testprojekt: CLI und Freigaben

Stand: 06.11.2026. CLI-Anmeldung erfolgreich. Lokal ist ausschließlich das vom Nutzer bestätigte Projekt **spots. testproject** verbunden (im Gespräch „Spots-Test“): **`nfomkdvotqtlyymomksb`**. Das produktive **Spots.** (`yhnxdeypkbzyjappuzmv`) bleibt für diese Testläufe und alle Schreiboperationen ausgeschlossen. Eine nachfolgend separat freigegebene rein lesende Produktionsprüfung ist in [PRODUCTION_PREFLIGHT.md](docs/history/PRODUCTION_PREFLIGHT.md) dokumentiert. Die App-Datei `.env.local` bleibt unverändert und wird nicht für die CLI-Anmeldung verwendet.

## Aktuell: verbleibende Integrationstests bestanden

Separat freigegebene Tests abgeschlossen: zwei echte überlappende POSTs **200/409**, elf isolierte Fixture-Fälle mit echten RPCs und vollständigem Rollback, acht kontrollierte API-Fehler mit lokalem Handler und echten Lease-RPCs. Alle 34 ursprünglichen Events/UUIDs/Quellversionen unverändert, keine Duplikate, keine verbliebenen Fixtures/Leases. Keine Produktions-/App-Änderung, kein Deployment, kein Cron.

Vollständige tatsächliche Statuscodes, Testmethoden, lokaler CLI-Argumentfehler samt Korrektur und Grenzen: [SUPABASE_INTEGRATION_RESULTS.md](docs/history/SUPABASE_INTEGRATION_RESULTS.md). Konkreter noch nicht ausgeführter Übernahme-/Automatisierungsplan: [PRODUCTION_ROLLOUT.md](PRODUCTION_ROLLOUT.md). Aktuell **35 lokale Tests**, Lint, App-/Deno-Typecheck erfolgreich. Die folgenden Abschnitte dokumentieren frühere Testphasen und deren damalige Freigabegrenzen.

## Vorher: einmaliger Wiederholungsimport erfolgreich

Nach ausdrücklicher eigener Freigabe genau **ein weiterer POST** gegen Testprojekt **nfomkdvotqtlyymomksb**, Function-Version 1. Durchführung **05.11.2026, 22:53:10.426–22:53:17.102 UTC**. Projektname, ID, lokale Verknüpfung und Function-Konfiguration unmittelbar davor erneut geprüft. Gültiger Default Secret Key nur im Backend-Prozessspeicher; keine Schlüssel ausgegeben oder gespeichert.

**HTTP 200**, tatsächliche Antwort:

```json
{
  "run_id": "77143ed5-120e-4cc0-a16d-52becf7faf9c",
  "inserted": 0,
  "updated": 0,
  "unchanged": 34,
  "rejected_versions": 0,
  "cancelled": 0,
  "postponed": 0,
  "discovered": 34,
  "checked": 34
}
```

| Vergleich | Tatsächliches Ergebnis |
| --- | --- |
| Zeilen vorher → nachher | **34 → 34** |
| Bestehende UUIDs erhalten | **34 von 34** |
| Unveränderte Events, alle gespeicherten Spalten verglichen | **34** |
| Neue Quell-IDs / neu angelegte Events | **0** |
| Geänderte / entfernte Events | **0 / 0** |
| Doppelte Quellpaare / gewechselte UUIDs | **0 / 0** |
| Quellversionen vorher → nachher | **34 → 34**, keine Versionsregression oder widersprüchlich gleiche Version |
| Zurückgebliebene Importsperren | **0**, Ablauf `-infinity` |

**Vor dem POST** sämtliche 19 Eventspalten einschließlich `id` (Event-UUID), `source`, `source_event_id` und aktuelle Zeilenzahl als JSON gespeichert. Der Vergleich identifiziert Events anhand des stabilen Quellpaars, nicht anhand möglicherweise gleicher Titel. Eine neue Quell-ID würde separat als neues Event ausgewiesen, eine mehrfach gespeicherte gleiche Quellidentität als Duplikat.

Lokale Vergleichsdateien ohne Zugangsdaten:

- [Vorher mit allen Event-UUIDs/Quell-IDs](supabase/.temp/goabase-repeat-before.json)
- [Nachher](supabase/.temp/goabase-repeat-after.json)
- [HTTP-Antwort und vollständiger Vergleich](supabase/.temp/goabase-repeat-results.json)

Diese Dateien liegen im ignorierten lokalen CLI-Verzeichnis, nicht in Git. [run-repeat-goabase-import.cjs](scripts/run-repeat-goabase-import.cjs) enthält den nachvollziehbaren Vergleich und schützt den einmaligen Lauf durch exklusive Snapshot-/Versuchsdateien und eine einzige POST-Stelle ohne Retry. Nicht nochmals ausführen.

Zusätzlich **alle 34 Goabase-Detailantworten** unabhängig erneut gelesen: Titel, Stadt, Start-/Endzeit, GPS, Status, Bild-/Quelllink und Quelländerungszeit stimmen mit dem Nachher-Bestand überein. Es gab tatsächlich keine beobachteten Quelländerungen; daher ist dies ein erfolgreicher Idempotenznachweis für diesen Bestand, **kein zusätzlicher Live-Nachweis für eine tatsächliche Änderung oder Absage**. Dafür sind getrennte kontrollierte Fälle nötig.

Keine weiteren POSTs/Paralleltests, kein Cron, kein Redeployment oder manuelle Datenänderung, keine Produktions-/App-Änderung. `.env.local` vor/nach Test per SHA-256 identisch. Lint und App-Typecheck anschließend erfolgreich. Parallele Importe sowie Änderungs-/Absage-Fixtures bleiben gesondert freizugeben.

## Vorher: erster echter POST-Import erfolgreich

Nach separater ausdrücklicher Erstimport-Freigabe genau **eine** POST-Anfrage an die bereitgestellte `import-goabase`, Function-Version 1, ausschließlich im Testprojekt **nfomkdvotqtlyymomksb**. Projektidentität/Verknüpfung und Function-Konfiguration vorher erneut geprüft. Ausgangsbestand 0 Events, 0 Quellversionen, keine Importsperre. Gültigen Default Secret Key nur im geschützten Backend-Prozessspeicher verwendet; keine Werte ausgegeben oder gespeichert.

**HTTP 200**, tatsächlicher Antwortinhalt:

```json
{
  "run_id": "053eff1e-c8ce-48b6-af8b-a834b01698c3",
  "inserted": 34,
  "updated": 0,
  "unchanged": 0,
  "rejected_versions": 0,
  "cancelled": 0,
  "postponed": 0,
  "discovered": 34,
  "checked": 34
}
```

Lesend nachgeprüft, unabhängig von den Antwortzählern:

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Gespeicherte Events | **34** |
| Gespeicherte Quellversionen | **34** |
| Status / Veröffentlichung | **34 scheduled, 34 veröffentlicht** |
| Gültige GPS-Paare | **34** |
| Doppelte Quellpaare | **0**, Unique-Index vorhanden |
| Feldvalidierungsfehler | **0** |
| Aktive/zurückgebliebene Importsperren | **0**, Ablauf wieder `-infinity` |
| Importfehler / Paginationgrenze | **Keine**, keine volle letzte Seite |

Alle gespeicherten Namen auf Nichtleere, Zeiten auf gültige Zeitpunkte und Ende nach Start, GPS auf gültige numerische Bereiche, Status/Veröffentlichung auf Konsistenz, Quellversionen auf Vorhandensein sowie Quellenlinks auf HTTPS-Goabase-Host und passende Quell-ID geprüft. Zusätzlich drei Quellantworten unabhängig direkt erneut gelesen:

| Goabase-ID | Event | Direkter Quellenabgleich |
| --- | --- | --- |
| 117895 | Psychedelic Injection 4, Hamburg | Titel, Start/Ende, GPS, Status und kanonischer Link identisch; Originalseite 200 |
| 118533 | INCEPTION w/ Luminatix, Berlin | Dieselben Felder identisch; Originalseite 200 |
| 118646 | PSY Floorest, Hamburg | Dieselben Felder identisch; Originalseite 200 |

Gespeicherte UTC-Zeitstempel und Quellzeitstempel mit deutschem Offset bezeichnen dieselben Zeitpunkte. Die Stichproben prüfen Quelltreue, nicht die unabhängige Richtigkeit der Veranstalterangaben. Alle drei Backend-RPCs sind vorhanden; Events/Quellversionen und zurückgesetzte Lease belegen ihren erfolgreichen gemeinsamen Importpfad. Der Erstimport und vorhandene Unique-Index belegen **noch keine getestete Wiederholungs- oder Parallelitätssicherheit** am echten Endpunkt.

Durchführung mit [run-first-goabase-import.cjs](scripts/run-first-goabase-import.cjs): feste Test-ID, ausdrücklicher Opt-in, eine einzige POST-Stelle ohne Retry, exklusive lokale Versuchsmarkierung gegen versehentlichen zweiten Lauf. Nicht erneut ausführen. Der lokale ignorierte Bericht `supabase/.temp/goabase-first-import-results.json` enthält Antwort, Audit und öffentliche Quellstichproben, keine Schlüssel.

Kein zweiter Import, kein Paralleltest, keine zusätzlichen SQL-Schreiboperationen, kein Deployment/Cron und keine Produktions-/App-Änderung. `.env.local` per SHA-256 identisch. Lint und App-Typecheck nach dem Test erfolgreich. Nächste Schritte erst nach eigener Freigabe: kontrollierter zweiter Import mit UUID-Vergleich, anschließend Parallelität und getrennte Änderungs-/Absage-Fixtures. Die darunter dokumentierten leeren Bestände gehören zu den jeweiligen früheren Prüfphasen.

## Aktuell: Deployment im Testprojekt erfolgreich

Nach separater ausdrücklicher Nutzerfreigabe ausschließlich `import-goabase` bereitgestellt. Projektname/ID und lokale Verknüpfung unmittelbar davor erneut verifiziert. Anschließende Metadatenprüfung: **ACTIVE, Version 1, verify_jwt = false**, Function-ID `ccedcf0f-1c2b-4973-8b4a-ec46ce2091cc`.

Handler unverändert `withSupabase({ auth: "secret" })`; der Default-Secret-Key wird durch den offiziellen Wrapper im `apikey`-Header geprüft. Während des Deployments keine Schlüssel abgerufen und keine Endpunktaufrufe vorgenommen. Die anschließend separat freigegebenen GET-Authentifizierungstests sind im nächsten Abschnitt dokumentiert. ACTIVE allein beweist keinen erfolgreichen Import.

## Echte Authentifizierungstests erfolgreich, 05.11.2026

Ausdrückliche Freigabe ausschließlich für diese Authentifizierungstests im Testprojekt **nfomkdvotqtlyymomksb**. Ausgeführt am **05.11.2026 von 22:41:51.826 bis 22:42:00.101 UTC**, Function **Version 1**, serverseitig `verify_jwt=false`. Vorab Projektname/ID, lokale Verknüpfung und ACTIVE-Status erneut geprüft.

| Test am echten Function-Endpunkt | Methode | Tatsächlicher Status | Ergebnis |
| --- | --- | --- | --- |
| Ohne API-Key | GET | **401** | Abgewiesen, bestanden |
| Absichtlich falscher API-Key | GET | **401** | Abgewiesen, bestanden |
| Gültiger Publishable Key des Testprojekts | GET | **401** | Für diesen Secret-Handler abgewiesen, bestanden |
| Gültiger Default Secret Key des Testprojekts | GET | **405** | Authentifiziert, POST erforderlich, bestanden |

Beim gültigen Secret-Key zusätzlich den Handler-Body `{"error":"POST erforderlich"}` und `Allow: POST` geprüft. Somit stammt das erwartete 405 aus dem authentifizierten Handler, vor dem ersten RPC-/Quellenabruf.

**Bestand vorher und nachher identisch:** 0 Events, 0 Quellversionen, eine technische Lease-Zeile, 0 Tokens/aktive Sperren, Ablauf `-infinity`, `cron.job` nicht vorhanden. App-`.env.local` vor/nach Tests per SHA-256 identisch. Keine POST-Aufrufe an die Function, keine Import-/RPC-Schreibtests, keine Cron- oder Produktionsänderung. Diese vier GET-Tests beweisen die Authentifizierungsfälle, noch keinen erfolgreichen Datenimport oder Schutz bei tatsächlich parallelen Importen.

Durchführung über [scripts/test-goabase-auth.cjs](scripts/test-goabase-auth.cjs). Secret- und Publishable-Werte nur in der geschützten Backend-Prozessspeicherverarbeitung aus der angemeldeten CLI übernommen; nicht als Argumente, Environment-Dateien, Logs oder Chat ausgegeben. Kein Key angelegt/geändert. Das Skript gibt nur redigierte Fallnamen/Statuscodes/Bestandszahlen aus und stoppt bei unerwarteter Antwort. Der lokale ignorierte Bericht `supabase/.temp/goabase-auth-results.json` enthält keine Schlüssel. Lint und App-Typecheck anschließend erfolgreich.

Für spätere Wiederholung ist eine erneute passende Nutzerfreigabe erforderlich. Nicht automatisch mit gewöhnlichen Unit-Tests ausführen:

```powershell
node scripts/test-goabase-auth.cjs --confirmed-test-project
```

## Eingerichtet und geprüft

- Offizielle Supabase CLI **3.0.0**, exakt als Entwicklungsabhängigkeit in [package.json](package.json) fixiert; Aufruf `npx supabase`. Installation über Expo, keine global installierte CLI erforderlich.
- Anmeldung über den VS-Code-Task **Supabase: Einmalig anmelden** in [tasks.json](.vscode/tasks.json). Zugangstoken nicht in Projektdateien/Chat gespeichert.
- [config.toml](supabase/config.toml) mit lokalem Projektbezeichner `spots-test`. Dieser Bezeichner ist keine entfernte Projekt-ID. Die tatsächliche Verknüpfung liegt in der ignorierten Datei `supabase/.temp/project-ref`.
- Function-Konfiguration `verify_jwt = false` für `import-goabase`, passend zu `withSupabase({ auth: "secret" })`. Inzwischen nach gesonderter Freigabe ausschließlich im Testprojekt wirksam und serverseitig bestätigt; der Handler prüft weiterhin den Default-Secret-Key.
- `supabase/.temp` wird durch [supabase/.gitignore](supabase/.gitignore) ausgeschlossen. Kein produktiver Schlüssel oder App-Environment-Wert wurde geändert.
- Projektname und ID über `projects list` verifiziert; der Nutzer hat den abweichenden Namen ausdrücklich bestätigt.

Die CLI bezeichnet den Hauptzweig auch dieses separaten Testprojekts als `production`. Entscheidend ist die explizite Ziel-ID `nfomkdvotqtlyymomksb`, nicht diese Zweigbezeichnung.

## Bestand vor der freigegebenen Einrichtung, nur lesend geprüft

- PostgreSQL 17.11.
- `public.events` fehlt; somit noch keine Eventspalten, Constraints, Event-RLS oder Eventdaten.
- Keine Edge Functions und keine Importer-RPCs vorhanden.
- Kein `cron.job` und keine installierten Erweiterungen `pg_cron`/`pg_net` gefunden. Vault 0.3.1 ist vorhanden.
- Keine SQL-Schreiboperation, kein Import-Aufruf und kein Deployment vorgenommen. Externe Scheduler außerhalb von Supabase wurden nicht geprüft.

Reproduzierbare Bestandsprüfung:

```powershell
npx supabase projects list --output-format json
npx supabase db query --remote=nfomkdvotqtlyymomksb --read-only --file supabase/ops/04_inspect_test_schema.sql --output-format json
npx supabase functions list --remote=nfomkdvotqtlyymomksb --output-format json
```

[04_inspect_test_schema.sql](supabase/ops/04_inspect_test_schema.sql) ist ein einziges SELECT und funktioniert auch ohne Events/Cron. CLI v3 erlaubt bei `--read-only` kein explizites BEGIN/COMMIT; die Management API liefert bei mehreren Statements nur das letzte Ergebnis. Die älteren SQL-Editor-Dateien [00](supabase/ops/00_inspect_environment.sql) und [01](supabase/ops/01_inspect_jobs.sql) daher nicht unverändert als CLI-Read-only-Datei verwenden; sie haben explizite Transaktionen und setzen weitere Tabellen voraus.

## Erledigt: ausdrücklich freigegebene atomare Datenbankeinrichtung

Am 05.11.2026 vom Nutzer ausdrücklich freigegeben und ausschließlich auf **nfomkdvotqtlyymomksb** erfolgreich ausgeführt. Unmittelbar davor Projektname/ID/Verknüpfung erneut geprüft, Zieltabellen und RPCs noch nicht vorhanden. Der Snapshot war unverändert, SHA-256 `E52E7E584D6ED6B8818A8E370B171BCB032A60B80710FE6DA3D8FDF4C1240796`. Keine bestehenden Daten gelöscht; keine weiteren SQL-Schreiboperationen vorgenommen.

Nach Ausführung ausschließlich lesend verifiziert:

- Events mit allen 19 Spalten und erwarteten Defaults, Primärschlüssel und eindeutigem Quellpaar vorhanden.
- Beide privaten Tabellen und alle drei RPCs vorhanden; RLS auf allen drei Tabellen aktiv.
- Events-SELECT-Policy erlaubt nur `is_published AND status = 'scheduled'`. `anon`/`authenticated` dürfen Events lesen, jedoch nicht schreiben, ändern oder löschen. Kein Zugriff dieser Rollen auf privates Schema/Tabellen.
- RPCs mit Eigentümer `postgres`, SECURITY DEFINER und leerem `search_path`; EXECUTE für `service_role`, nicht für PUBLIC/anon/authenticated.
- Eventbestand **0**, keine Edge Functions, kein Cron. Keine Function oder RPC zur Datenänderung testweise aufgerufen. `.env.local` mittels SHA-256-Vergleich vor/nach Einrichtung unverändert bestätigt.

Der folgende Plan dokumentiert die bereits ausgeführte Freigabe. Nicht erneut ausführen: Der Bootstrap verweigert die Ersetzung einer vorhandenen Events-Tabelle.

Vor Ausführung den konkreten Plan bestätigen lassen. Vorgesehener Umfang ausschließlich im Testprojekt:

1. [05_create_test_events.sql](supabase/ops/05_create_test_events.sql): Events-Tabelle mit den 19 bereitgestellten Spalten, UUID-/Zeit-/Statusdefaults und UNIQUE `(source, source_event_id)`. RLS aktiv, anonyme/angemeldete Clients dürfen ausschließlich veröffentlichte `scheduled`-Events lesen. Keine Client-Schreibrechte. Bei bereits vorhandener Events-Tabelle Abbruch statt Ersetzung.
2. [03_goabase_sync_backend.sql](supabase/ops/03_goabase_sync_backend.sql): privates Schema, Lease-/Versionstabelle und drei ausschließlich backendseitige RPCs. Keine Änderung am öffentlichen Eventschema durch diesen zweiten Teil.

Die beiden äußeren Transaktionshüllen werden für den lokalen Review-Snapshot `supabase/.temp/spots-test-setup.sql` entfernt und durch **eine gemeinsame Transaktion** ersetzt. Dadurch scheitert die gesamte Einrichtung atomar. Der Snapshot enthält den vollständigen SQL-Text beider Quellen, keine Includes und keine Secrets. Vor Freigabe lokal prüfen; bei geändertem Inhalt erneut bestätigen lassen.

Freigegebener und erfolgreich ausgeführter Befehl:

```powershell
npx supabase db query --remote=nfomkdvotqtlyymomksb --file supabase/.temp/spots-test-setup.sql --yes --output-format json
```

`--yes` darf erst nach der ausdrücklichen Nutzerfreigabe verwendet werden. Es ersetzt nur die zusätzliche CLI-Abfrage, nicht die Freigabe im Gespräch. Kein `db push`, `db reset`, `config push`, Extension-Setup, Cron, Produktionszugriff, Seed oder Import gehört zu diesem Schritt.

## Deployment separat freigegeben und ausgeführt

Nach Einrichtung Spalten/Constraints/RLS/RPC-Rechte lesend geprüft. Anschließend gesonderte Deployment-Freigabe erhalten und exakt diese Function mit folgendem Befehl bereitgestellt:

```powershell
npx supabase functions deploy import-goabase --remote=nfomkdvotqtlyymomksb --use-api --no-verify-jwt --yes --output-format json
```

Kein Deployment aller Functions, kein `--prune`. Server-seitige Bündelung benötigt keinen lokalen Docker-Stack. Die App bleibt weiter mit ihrer bisherigen Umgebung verbunden.

## Historischer Testplan vor Freigabe der verbleibenden Integrationstests

Dieser Plan wurde inzwischen nach eigener Freigabe einschließlich Parallelaufrufen und isolierten Fixture-/Fehlerfällen abgearbeitet. Der aktuelle Ergebnisbericht oben unterscheidet echte Endpunktaufrufe, echte Datenbank-RPCs und simulierte Quellantworten. Kein zusätzlicher Schreibtest oder Cron ist automatisch freigegeben.

1. Ohne Key, mit falschem Key und mit Publishable Key: Authentifizierung muss 401/403 liefern, ohne Sperre oder Eventdaten zu verändern.
2. Mit Default-Secret-Key zunächst **GET**: erwartetes 405 vom Handler belegt durchlaufene Authentifizierung, ohne Import/RPC-Aufruf. Nicht versehentlich POST als Verbindungstest verwenden.
3. Erst nach ausdrücklicher Schreibtestfreigabe **POST** für einen echten Goabase-Import. Ergebnis und Datenbankbestand vergleichen; keine unbestätigte Erfolgsmeldung allein anhand des HTTP-Status.
4. Identischen POST wiederholen: stabile UUIDs, keine Duplikate, passende Zähler. Echte parallele Aufrufe: aktiver Lauf und kontrolliertes 409 bzw. sauber nacheinander abgeschlossene Läufe, keine veralteten Überschreibungen.
5. Absagen, Verschiebungen, ältere Versionen und Fehlerfälle benötigen einen gesonderten konkreten Fixture-/RPC-Testplan mit freigegebenen Datenänderungen. Isoliert von echten importierten Events prüfen; keine Testdaten in Produktion.

Schlüssel ausschließlich geschützt im Backend und nur im Arbeitsspeicher verwenden, niemals im Chat, App-Frontend, Log oder einer neuen Datei. Für diese Tests keine Schlüsselrotation/-anlage ohne eigene Freigabe. Vor/nach jedem Schreibtest Bestand und Rechte prüfen. Kein Cron ohne eigene spätere Freigabe.

## Lokal verifiziert

35 lokale Tests einschließlich neun SQL-Untertests erfolgreich, nichts übersprungen. SQL-Tests nutzen die tatsächlichen Bootstrap-/Fixture-Dateien. Im Testprojekt zusätzlich echte Auth-/Erst-/Wiederholungs-/Parallelaufrufe, rückgerollte Fixture-RPCs und kontrollierte Fehlerfälle mit echten Leases erfolgreich. Lint, App-Typecheck und Deno-Typecheck erfolgreich. Infrastruktur-/Skalierungsgrenzen und Vault-/Cron-Abnahme stehen im aktuellen Ergebnisbericht.

## Offizielle Dokumentation

- [Supabase CLI installieren und Version fixieren](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [CLI v3: lokale und entfernte Zielauswahl](https://supabase.com/docs/guides/local-development/local-and-hosted-projects)
- [CLI-Befehlsreferenz](https://supabase.com/docs/reference/cli/introduction)
- [Edge-Function-Authentifizierung](https://supabase.com/docs/guides/functions/auth)
