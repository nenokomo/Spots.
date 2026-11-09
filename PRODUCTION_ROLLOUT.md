> Datierte Einrichtungs-/Wiederherstellungsnachweise. Aktueller Betriebsstand: [PROJECT_STATUS.md](PROJECT_STATUS.md). Historische Schritte nicht erneut ausführen.

# Spots: Produktionsübernahme und automatische Synchronisierung

**Aktuell 08.11.2026 18:38:12 UTC: kontrollierter Produktionsimport erfolgreich, genau ein POST HTTP 200.** 4 neu/30 aktualisiert/1 source_removed/1 ungeklärter Moved-Eintrag übersprungen; **35 Events, 28 veröffentlicht/7 ausgeblendet**. Alle 31 ursprünglichen UUIDs erhalten, keine Duplikate, Lease frei. App liest veröffentlicht/Explore jeweils 28 und Live 0 erfolgreich. [Tatsächlicher Importbericht und nächster Automatisierungsschritt](docs/history/PRODUCTION_V3_IMPORT_RESULTS.md). Noch kein Cron/pg_net vorhanden, Vault-Namen fehlen; Einrichtung und Aktivierung benötigen gesonderte Freigabe. Keine weitere allgemeine Testserie oder erneutes Deployment notwendig, keinen zweiten manuellen POST ausführen.

**Neuester Stand 08.11.2026 18:30:09 UTC:** Dependency-Abnahme abgeschlossen. Test-v4 verwendet dasselbe vollständige eingefrorene ESZIP wie unveränderte Produktions-v3 (13 Pakete/807 Einträge, bytegleich). Auth 401/401/401/405 und genau ein Testimport HTTP 200 bestanden; alle 35 Testevents vollständig unverändert, keine Duplikate/freie Lease. **Kein erneutes Produktionsdeployment erforderlich.** Nächster Schritt: [konkret vorbereitete Freigabe für genau einen produktiven POST](docs/history/GOABASE_FROZEN_RELEASE_RESULTS.md). Jetzt kein Produktionsaufruf/DB-Schreiben/Cron.

**Neueste rein lesende Diagnose 08.11.2026:** Bundle-Abweichung ist realer Abhängigkeits-Codeunterschied: Test jose 6.2.15 / Produktion 6.2.16, fünf JS-Dateien unterschiedlich; eigener Importer und Auth-Konfiguration identisch. **Kein produktiver Import als vollständig identisch abgenommen.** Zuerst reproduzierbaren vollständigen Abhängigkeits-/Artefaktstand festlegen und gezielt in Test prüfen; noch keine erneute Veröffentlichung/Function-Aufrufe/DB-Änderung/Cron. [Belege und Grenzen](docs/history/GOABASE_BUNDLE_ANALYSIS.md).

**Neuester Stand nach Deploymentfreigabe 08.11.2026:** import-goabase genau einmal produktiv bereitgestellt, **ACTIVE/v3/verify_jwt=false**, auth:secret und heruntergeladene Quellen wie Test. **Server-Bundle-Hash weicht vom getesteten Bundle ab; Abschlussprüfung fehlgeschlagen, sofort gestoppt.** Alle 31 Eventdaten/UUIDs und Backendzustände unverändert, kein Function-Aufruf/Import/Cron, keine weitere Änderung. [Deploymentbefund](docs/history/PRODUCTION_V3_DEPLOYMENT.md). Zunächst lesende Diagnose der Bundle-Abweichung; keine Produktionsabnahme als vollständig bestanden behandeln, kein Deployment wiederholen.

**Neuester Stand 08.11.2026 18:01:54 UTC:** SQL **09 und danach 10** nach ausdrücklicher Freigabe ausschließlich produktiv erfolgreich ausgeführt und nach jedem Schritt geprüft. Alle 31 vollständigen Events/UUIDs sowie Events-Schema/RLS/Grants unverändert. Vier private RLS-Tabellen, fünf öffentliche Backend-RPCs/zwei private Core-Funktionen mit korrekten Rechten; keine Duplikate/freie Lease/0 Quellversionen. Produktive Function weiterhin unverändert ACTIVE/v2, kein Deployment/Function-Aufruf/POST/Cron. [Ausführungsbericht](docs/history/PRODUCTION_09_10_APPROVAL.md). Backend 03/09/10 **nicht wiederholen**. Nächster separat freizugebender Schritt: denselben in Spots-Test geprüften Importer deployen; GET-Tests und kontrollierter POST danach separat.

**Aktueller Stand 08.11.2026:** Test-Function Version 3 mit Redirect-/Moved-Behandlung erfolgreich abgenommen. Frisches vollständiges Produktionsbackup und aktuelle produktive Function v2 gesichert; public/privates Importschema isoliert wiederhergestellt, alle 31 Eventdaten/UUIDs erhalten. SQL 09 danach 10 auf diesem Restore als postgres erfolgreich erprobt; Backend-Rechte geprüft. Produktion anschließend rein lesend unverändert bestätigt. [Aktueller Backupbericht](PRODUCTION_BACKUP.md), [konkrete ausstehende SQL-Freigabe 09+10](docs/history/PRODUCTION_09_10_APPROVAL.md), [erfolgreiche Testabnahme](docs/history/GOABASE_STATUS_TEST_RESULTS.md).

Nächste Reihenfolge: **gesondert freigegebene SQL 09 → prüfen → SQL 10 → prüfen**, danach separat Deployment desselben Test-Kandidaten/GET-Tests, danach separat genau ein produktiver POST. Produktive RLS ist flagbasiert; Statusprüfung nur als eigene Policyänderung nach separater Freigabe. Jetzt keine produktive Erweiterung, kein Deployment/Function-Aufruf und kein Cron. Die nachfolgenden älteren Rollout-Stände sind historisch; Backend 03 nicht wiederholen.

**Neuester Stand 08.11.2026:** Genau ein separat freigegebener produktiver POST wurde ausgeführt und mit **HTTP 502 `source_network_or_json_error`** abgebrochen. Keine Wiederholung. Alle 31 vollständigen Events/UUIDs unverändert, 0 neue/geänderte/neu abgesagte Events, keine Duplikate oder aktive Lease, 0 Quellversionen. App-Publishable-Lesezugriff weiterhin erfolgreich (31 veröffentlicht/geplant, 25 Explore, 0 Live). Lokale spätere Goabase-GET-Stichproben gültig; genaue Ursache in der Edge Runtime noch unbelegt. Kein erfolgreicher Produktivimport und keine Cron-Freigabe. Details: [PROJECT_STATUS.md](PROJECT_STATUS.md).

Stand: 08.11.2026. **Backend-Ergänzung 03 und danach separat freigegebenes Deployment ausschließlich von import-goabase in Produktion erfolgreich geprüft.** Function ACTIVE/Version 2/verify_jwt=false, auth:secret unverändert, Server-Bundle-Hash exakt identisch zur integrationsgetesteten Test-Version 1. Alle 31 vollständigen Events/UUIDs, freie Lease/0 Quellversionen unverändert. Keine weiteren Functions verändert, kein Function-Aufruf/Import/Cron. Nachweise: [PROJECT_STATUS.md](PROJECT_STATUS.md). Authentifizierungs- und Importtests brauchen eigene Freigaben. Testergebnisse: [SUPABASE_INTEGRATION_RESULTS.md](docs/history/SUPABASE_INTEGRATION_RESULTS.md).

**Fortschreibung nach separater GET-Freigabe, 08.11.2026:** Vier tatsächliche produktive GET-Tests bestanden: ohne/falscher/Publishable Key jeweils **401**, gültiger Default Secret Key **405**, exakter Handlertext und Allow-Header bestätigt. Alle 31 vollständigen Events/UUIDs, freie Lease und 0 Quellversionen unverändert; keine POST-Anfrage. Produktive Authentifizierung damit geprüft, erster POST-Import weiterhin nicht freigegeben. Einzelbelege im [Projektstatus](PROJECT_STATUS.md).

**Backup erstellt und geprüft:** vollständiger logischer Datenbankexport und bereitgestellter Function-Quellcode lokal gesichert. Public-Schema mit sämtlichen 31 Eventdaten/UUIDs isoliert wiederhergestellt und Backend 03 darauf erfolgreich geprobt. Vollständiger verwalteter Plattformrestore nicht verifiziert; konkrete Grenzen und inzwischen ausgeführte SQL-Freigabe mit Kandidaten-Hash: [PRODUCTION_BACKUP.md](PRODUCTION_BACKUP.md). Die Bestandsprüfung nicht erneut ausführen. Weitere produktive Änderungen benötigen eine eigene Freigabe.

## Bestätigter Ausgangsbefund

Produktion **Spots. / yhnxdeypkbzyjappuzmv** mit **31 unveränderten Events/UUIDs**. Lokale CLI bleibt Test. Beide Events-Tabellen besitzen 19 kompatible Spalten und dieselben PK-/Unique-Constraints; produktiver `source`-Default `'manual'` bleibt erhalten. Das zunächst fehlende private Schema, zwei Metadatentabellen und drei RPCs aus Backend 03 sind seit 08.11.2026 auch in Produktion eingerichtet. Keine bestehende Eventtabelle oder Quellindex neu anlegen.

Produktive RLS-Policy prüft nur `is_published`; Test zusätzlich `status = 'scheduled'`. Empfohlene Angleichung der **bestehenden** produktiven Policy separat freigeben, nicht eine zusätzliche permissive Policy anlegen. Keine Client-Schreibrechte gefunden. Beide Functions ACTIVE/Version 1 und Verify JWT false, aber unterschiedliche Artefakte. Produktiver Code und vollständiger logischer Datenbankexport inzwischen gesichert; Public-Restore geprüft, Plattformrestore-Grenzen dokumentiert. Vault vorhanden, geplante Vault-Namen fehlen, Cron/pg_net nicht installiert; externe Schreiber nicht vollständig ausschließbar.

| Umgebung | Bestätigter Name | Projekt-ID |
| --- | --- | --- |
| Test, derzeit lokal verknüpft | spots. testproject | `nfomkdvotqtlyymomksb` |
| Produktion, vor Übernahme erneut zu bestätigen | Spots. | `yhnxdeypkbzyjappuzmv` |

Die lokale Verknüpfung bleibt auf Test. Für eine später genehmigte Produktionsoperation immer die Produktions-ID explizit als `--remote=...` angeben und vorher anhand der Projektliste verifizieren. Keine App-`.env.local` ändern, keine Testschlüssel oder Fixtures nach Produktion übernehmen.

## 1. Kandidat und Testnachweise festhalten

- Geprüfte Importer-/SQL-Version im Git-Verlauf festhalten, Source-Hashes und Testberichte zuordnen. Aktueller Stand ist noch uncommitted; kein Commit/Push Teil dieses Testauftrags.
- `index.ts`, `sync.ts`, Deno-Konfiguration/Lockdatei und [03_goabase_sync_backend.sql](supabase/ops/03_goabase_sync_backend.sql) als Kandidat einfrieren. Keine Versions-/Abhängigkeitsänderung zwischen Abnahme und Deployment; sicherstellen, dass die verwendete serverseitige Bündelung die erwartete Deno-Abhängigkeitsauflösung verwendet. Bei anderer Auflösung erneut testen.
- Nachweise: vier echte Authentifizierungsfälle, Erst-/Wiederholungsimport, zwei überlappende echte POSTs (200/409), elf DB-Fixtures mit Rollback, acht kontrollierte Quellenfehler mit echten Leases, 35 lokale Tests. Grenzen stehen ausdrücklich im Ergebnisbericht.

## 2. Produktion zunächst ausschließlich lesend prüfen – eigene Freigabe

Nach gesonderter Freigabe Projektname/ID/Organisation, Function-Version und Verify-JWT-Konfiguration prüfen. Beispiel für die spätere CLI-Bestandsprüfung:

```powershell
npx supabase db query --remote=yhnxdeypkbzyjappuzmv --read-only --file supabase/ops/04_inspect_test_schema.sql --output-format json
npx supabase functions list --remote=yhnxdeypkbzyjappuzmv --output-format json
```

Die Datei 04 enthält nur ein kataloglesendes SELECT und keine Test-Fixtures; ihr ursprünglicher Testname ist kein Zielschutz. Maßgeblich sind Freigabe und explizite ID. Ergebnisse gegen das bekannte Produktionsschema abgleichen, keine aktuellen Eventzahlen aus dem Test ableiten.

Prüfen: Spalten/Defaults, zulässige Statuswerte, UUID-Erzeugung, vollständiger UNIQUE-Index `(source, source_event_id)`, fehlende/doppelte Quell-IDs, aktuelle RLS/Grants, eventuelle vorhandene Objekte `spots_sync_private`/RPCs, andere Schreiber. Bestehende RLS nicht blind ersetzen. Die früher im Dashboard gesehenen Einstellungen/fehlende Cron-Installation sind kein heutiger Nachweis.

Alle internen und externen Scheduler, manuelle Aufrufer und indirekte SQL-Wrapper prüfen. Bei vorhandenen Cron-/Vault-Tabellen [01_inspect_jobs.sql](supabase/ops/01_inspect_jobs.sql) im SQL Editor lesen; keine geheimen Jobbefehle/Vault-Werte exportieren. Nicht auf fehlende Texttreffer als Beweis fehlender indirekter Scheduler vertrauen.

**Abbruchkriterien:** andere Projekt-ID, ungeklärte Schemaabweichung, ungeklärte Duplikate/fehlender Konfliktindex, unbekannte gleichnamige RPCs/Tabellen, unkontrollierte aktive Schreiber oder ungeklärte Authentifizierung.

## 3. Backup, Rückweg und Schreibfenster vorbereiten

- Aktuelles Schema/RLS/Grants, vollständigen Eventbestand mit UUID/Quell-ID und aktuelle produktive Function-Fassung gesichert ablegen. Schlüssel nie in Bericht/Backups kopieren. Zugriff auf Backups begrenzen; Speicherort/Restore-Verfahren prüfen.
- Alte automatische/manuelle Importaufrufe kontrolliert pausieren und ihre Beendigung abwarten. **Der alte Importer beachtet die neue Lease nicht.** Ein laufender alter Aufruf darf die neue Version nicht nachträglich überschreiben.
- Jeder folgende entfernte Schreibschritt braucht seine konkrete vorherige Freigabe. Keine globale CLI-Autobestätigung oder unkontrollierte Wiederholung nach Timeout.

## 4. Nur das Backend ergänzen – eigene SQL-Freigabe

**Am 08.11.2026 nach ausdrücklicher Freigabe erfolgreich abgeschlossen; nicht erneut ausführen.** Kandidaten-Hash und Projekt-ID unmittelbar vorher bestätigt, nachher alle 31 Eventdaten/UUIDs, Events-Rechte und neue Backend-Objekte geprüft. Der folgende Befehl dokumentiert den abgeschlossenen Schritt; er ist keine Freigabe zur Wiederholung.

Nach sauberer Bestandsprüfung ausschließlich [03_goabase_sync_backend.sql](supabase/ops/03_goabase_sync_backend.sql) in einer Transaktion bereitstellen. Vorher den unveränderten Inhalt/Hash konkret zeigen.

```powershell
# BEREITS ERFOLGREICH AUSGEFÜHRT – nicht wiederholen
npx supabase db query --remote=yhnxdeypkbzyjappuzmv --file supabase/ops/03_goabase_sync_backend.sql --yes --output-format json
```

**Nicht** den Bootstrap 05, den kombinierten Test-Setup-Snapshot oder Fixture-Test 06 auf Produktion ausführen. Vorhandene Events/UUIDs/Indices behalten; keine Tabellen löschen und keinen zweiten Quellindex anlegen. Der Entwurf ergänzt ein dediziertes privates Schema und drei backendexklusive RPCs. Existieren gleichnamige Objekte bereits, vor `CREATE OR REPLACE` gezielt abgleichen.

Danach rein lesend bestätigen: bestehender Eventbestand identisch, RLS/Grants unverändert, private RLS aktiv, RPC-Eigentümer/leerem search_path prüfen, kein EXECUTE für PUBLIC/anon/authenticated, EXECUTE für service_role. Keine Produktiv-Fixtures.

## 5. Ausschließlich import-goabase bereitstellen – eigene Deployment-Freigabe

**Am 08.11.2026 separat freigegeben und erfolgreich abgeschlossen; nicht erneut ausführen.** Explizite Produktions-ID, Quellcode und Server-Bundle gegen integrationsgetestete Test-Version abgeglichen; unveränderte 31 Eventzeilen, Test-Functions und andere produktive Functions nachgewiesen. Anschließend vier separat freigegebene GET-Authentifizierungstests erfolgreich (401/401/401/405); noch kein POST-Import.

```powershell
# BEREITS ERFOLGREICH AUSGEFÜHRT – nicht wiederholen
npx supabase functions deploy import-goabase --remote=yhnxdeypkbzyjappuzmv --use-api --no-verify-jwt --yes --output-format json
```

Kein `--prune`, kein Deployment aller Functions, kein `config push` für die gesamte App/Plattform. `auth: "secret"` bleibt erhalten; erwartet wird der **produktive** Secret Key namens `default` im `apikey`-Header. Verify JWT muss serverseitig false sein, damit der offizielle Wrapper moderne Secret Keys selbst prüft. Den Handler niemals auf `auth: none` umstellen. [Supabase Auth](https://supabase.com/docs/guides/functions/auth)

Metadaten ACTIVE/Version/verify_jwt/Entrypoint prüfen. Nach eigener Testfreigabe zunächst dieselben GET-Authentifizierungstests auf dem genehmigten Produktionsziel durchführen (401/401/401/405), bevor ein POST erlaubt wird. Kein Key im Frontend, Chat, Log oder einer neuen Datei.

## 6. Einen kontrollierten Produktionsimport abnehmen – eigene Schreibtest-Freigabe

**Freigegebener Erstversuch am 08.11.2026 durchgeführt, aber fehlgeschlagen (HTTP 502).** Die Freigabe für genau einen POST ist verbraucht. Gesicherten Bestand/Belege erhalten, vor erneutem POST Ursache lesend eingrenzen und neue ausdrückliche Freigabe einholen. Keine zusätzlichen Änderungen, Retries oder Cron-Aktivierung aus diesem Plan ableiten.

- Snapshot aller vorhandenen UUIDs, Quell-IDs, Felder und Zeilenzahlen vor dem Aufruf sichern.
- Genau einen POST aus geschützter Backend-Umgebung senden; keine automatische Wiederholung nach unklarem Timeout.
- Echte Quelle darf zwischenzeitlich wachsen: neue Quell-IDs sind legitime Neuzugänge, dieselbe Quell-ID muss dieselbe UUID behalten. Änderungen und bestätigte Absagen/Verschiebungen prüfen; keine feste Zielzahl 34 erwarten.
- HTTP-Antwort **und** tatsächlichen Bestand prüfen: eingefügt/geändert/unverändert/abgewiesene Versionen, keine Duplikate, korrekte Veröffentlichungsflags/Links/Zeiten/GPS, freie Lease. `rejected_versions > 0` oder fehlerhafte Details gezielt untersuchen, nicht allein HTTP 200 als Freigabe werten.
- Erste Übernahme besitzt für alte Produktionszeilen noch keine historischen `dateModified`-Metadaten. Den Erstabgleich deshalb anhand Quelle/Backup prüfen. Bestehende UUIDs bleiben erhalten; Metadaten werden erst jetzt aufgebaut.
- App ohne Konfigurations-/Designänderung prüfen: Explore zeigt nur geplante kommende Events, Radar nur tatsächlich laufende Events mit Endzeit/GPS im Radius; keine zukünftigen Events als live erfinden. Quellen-/Goabase-Backlink erhalten.

## 7. Vault und Zeitplan zunächst im Testprojekt abnehmen

Die reine Importer-Abnahme ersetzt noch **keinen Vault-/pg_net-/Cron-Ende-zu-Ende-Test**. Vor Produktionsautomatisierung gesonderte Freigaben für die fehlenden Testprojekt-Einstellungen einholen:

1. Cron-/pg_net-/Vault-Bestand prüfen; nur fehlende notwendige Erweiterungen nach Freigabe einrichten. Keine vorhandenen Erweiterungen neu installieren/löschen.
2. Vault im richtigen Projekt mit genau einem Eintrag pro Name konfigurieren: `spots_project_url` = dessen Projekt-URL; `spots_import_goabase_secret_key` = dessen Default Secret Key. Werte ausschließlich geschützt im Backend/Vault, nicht als gespeicherte SQL-Literale oder Datei. Test- und Produktionswerte strikt getrennt.
3. [02_prepare_disabled_job.sql](supabase/ops/02_prepare_disabled_job.sql) prüfen. Standard-Sperre `inventory_reviewed=false` bleibt im Repository erhalten; erst in einer konkret freigegebenen Ausführung nach Bestandsprüfung freigeben. Die Vorlage erstellt höchstens **einen inaktiven** Job und verändert vorhandene Kandidaten nicht.
4. Nach separater Freigabe einen manuellen Vault-/pg_net-Aufruf abnehmen. Tatsächlichen HTTP-Status/Handler-Zähler und freigegebene Lease prüfen. Erfolgreiche Einreihung oder Cron-History allein beweist keinen Importerfolg. Keine entschlüsselten Header oder Queue-Inhalte exportieren.

[Offizielle Scheduling-Anleitung mit Vault](https://supabase.com/docs/guides/functions/schedule-functions)

## 8. Produktionsautomatik vorbereiten und getrennt aktivieren

- Erst nach erfolgreicher vorheriger Abnahme und eigener Produktionsfreigabe die projektrichtigen Vault-Werte/Erweiterungen bereitstellen. Keine Testschlüssel übernehmen.
- Jobbestand unmittelbar vorher erneut vollständig prüfen. Existiert bereits ein passender Job, genau diesen weiterverwenden und dessen Befehl gezielt abgleichen; keinen zweiten anlegen. Indirekte/externe Scheduler berücksichtigen.
- Zielname `spots-import-goabase-2h`, Zeitplan **`0 */2 * * *`**, geprüfte Cron-Zeitzone **UTC/GMT**, geplanter HTTP-Timeout 120 Sekunden. Deutsche Ortszeit verschiebt sich mit Sommer-/Winterzeit. Handler-Quellenbudget 90 Sekunden, Lease 120 Sekunden.
- Der Job liest URL und Default Secret Key erst zur Laufzeit aus Vault, sendet POST mit `apikey` und Body `{}`. Bei falschem Vault-Ziel/Key keine Authentifizierung umgehen.
- Genau einen inaktiven Job vorbereiten; Inhalt und exakte Job-ID zeigen. **Aktivierung ist eine eigene spätere Nutzerfreigabe**, nicht durch diesen Plan gedeckt.
- Nach Aktivierung mindestens zwei tatsächliche geplante Läufe abnehmen: HTTP 200, plausible Zähler, keine Duplikate oder Sperren, Ereignisalter/Aktualität, Laufdauer und Fehlercodes. Aktuelle Function-Logs sind der Laufnachweis; dauerhafte Historie/Alarmierung ist bislang kein eigenes Datenbankfeature.

## 9. Fehlerfall und Rücknahme

Bei fehlgeschlagener Abnahme **keine weitere automatische Ausführung**. Genau den geprüften Scheduler pausieren und manuelle Aufrufe verhindern; bereits eingereihte Requests können noch laufen. Keine Events, Versionstabellen, Jobs oder Vault-Einträge blind löschen.

Bei unklarem Request-Ausgang zuerst nur Bestand/Lease/Logs lesen, nicht automatisch erneut POST senden. Eine ältere Function nur nach eigener Freigabe und Kompatibilitätsprüfung zurückspielen, Scheduler dabei pausiert halten: Die Originalversion nutzt die neue Lease nicht. Kein pauschales Zurückspielen alter Eventzeilen, das korrekte neue Absagen wieder veröffentlichen könnte.

Freigabeblockierend bleiben ungeklärte Schema-/Auth-/Schreiberabweichungen, Quellenfehler oder erreichte Paginationgrenzen. Bekannte API-/Kapazitätsgrenzen aus dem Testbericht bewusst abnehmen; bei größerem Bestand zuerst eine getestete Partitionierungs-/Queue-Strategie entwickeln. Dieser Plan behauptet keine unbegrenzte vollständige Goabase-Abdeckung.
