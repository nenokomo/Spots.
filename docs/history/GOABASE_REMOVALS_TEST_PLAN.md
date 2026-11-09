> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: Quell-Entfernungen und nächster Test

**Ausgeführt nach Freigabe, 08.11.2026:** SQL 09 und Test-Deployment erfolgreich, danach genau ein POST mit **502 unknown_source_status** fehlgeschlagen. Weiterhin 34 vollständige Events/UUIDs/Quellversionen unverändert, freie Lease, 0 Entfernungsmetadaten. Keine Produktionsänderung und kein Retry. Der folgende Freigabeplan ist historisch; Einmal-POST-Freigabe verbraucht. Ergebnisse und weitere Grenze: [GOABASE_REMOVALS_TEST_RESULTS.md](GOABASE_REMOVALS_TEST_RESULTS.md).

Stand: 08.11.2026. **Ausschließlich lokal entwickelt und getestet. Noch keine entfernte SQL-Ausführung, kein Deployment/Import dieses Kandidaten, kein Cron. Produktion unverändert.**

## Implementiert

[sync.ts](../../supabase/functions/import-goabase/sync.ts) erkennt ausschließlich Detail-Redirects 301/302/303/307/308 auf HTTPS-Origin `https://www.goabase.net` mit exaktem Pfad `/party/deleted/{angefragte numerische ID}`. Relative same-origin Ziele sind erlaubt. Credentials, Query, Fragment, Backslashes, Prozentkodierung, Dot-Segmente, falsche ID/Domain/Pfad sowie Feed-Redirects sind ausgeschlossen. Das Ziel wird nicht abgerufen. 404, Netzwerk-/JSON-Fehler und unerwartete Redirects brechen den gesamten Batch weiterhin ab.

Bestätigte Entfernungen werden getrennt von normalen Events zurückgegeben; andere gültige Details werden weiter verarbeitet. Der Handler nutzt atomar `spots_goabase_apply_v2`. `auth: "secret"`, Default Secret im Backend, POST-Prüfung und bedingte Lease-Freigabe bleiben erhalten. `checked` umfasst normale und entfernte Details.

[09_goabase_source_removals.sql](../../supabase/ops/09_goabase_source_removals.sql) ergänzt die private RLS-Tabelle `goabase_removed`. Sie speichert die Beobachtungszeit und, falls vorhanden, die letzte bestätigte Quellversion; kein erfundenes `dateModified`. Bestehende entfernte Events erhalten **`status='source_removed'` und `is_published=false`**. Alle anderen Spalten inklusive UUID, `created_at`, Titel, Links und Termine bleiben erhalten. Unbekannte entfernte IDs erzeugen weder Events noch Entfernungsmetadaten.

Der bisherige geprüfte Apply-Code wird unverändert als private Funktion `spots_sync_private.goabase_apply_core` weiterverwendet. Neuer Apply-v2-RPC und kompatibler alter Apply-Zugang stehen davor. Auch ältere Aufrufer berücksichtigen somit Entfernungssperren. Core/Tabelle haben keine direkten Rechte für PUBLIC/anon/authenticated/service_role. Normale Upserts und Entfernungen erfolgen in derselben Transaktion unter derselben Lease; ungültige/mehrfache IDs und abgelaufene Lease führen zum atomaren Rollback.

Wiederholte Entfernungen erhalten Daten und Beobachtungszaun. Eine Wiederherstellung benötigt eine gültige Quellversion **nach der Entfernungsbeobachtung und nach der letzten bestätigten Quellversion**, zusätzlich zur alten Versionsprüfung. Erst dann wird die Sperre aufgehoben. Das ist bewusst konservativ: ohne neueren Quellzeitstempel oder bei rückständiger Quelluhr bleibt das Event unveröffentlicht und zählt als `rejected_versions`. Kein Umgehen dieses Schutzes.

Neue Zähler: `removed` (neu markiert), `removed_unchanged` (bereits entfernt), `removed_unknown` (nicht vorhanden/nicht angelegt). `cancelled` bleibt echten Absagen vorbehalten. Die App blendet entfernte Events mit ihrem vorhandenen Filter auf veröffentlichte `scheduled`-Events aus; keine Frontendänderung.

## Verifikation

**52 Tests bestanden, 0 Fehler, 0 übersprungen:** alle bestehenden App-/Importer-/SQL-Tests plus neue Entfernungsfälle. Echte SQL-Dateien in isoliertem PGlite einschließlich wiederholter Installation geprüft. Kompletter Handler-/Quellen-/SQL-Ablauf zweimal mit Fixtures: andere Events verarbeitet, Wiederholung ohne Daten-/UUID-Wechsel, Lease freigegeben.

Geprüft: strikte Redirectziele, Löschung mit anderen gültigen Events, Fehler trotz parallelem Löschhinweis, Daten-/UUID-/Versionsschutz, unbekannte IDs, Legacy-Zeilen ohne Version, bestätigte Wiederherstellung, Schutz über alten/neuen RPC, Rollback, Duplikate, Fencing und Rechte. Ein anfänglicher Date/String-Testvergleich wurde korrigiert; abschließender vollständiger Lauf erfolgreich.

**Expo-Lint, App-Typecheck und Deno-Typecheck mit eingefrorener Lockdatei erfolgreich.** Design/Navigation/App-Konfiguration unverändert.

## Konkrete nächste Freigabe – ausschließlich Spots-Test

Die frühere Vorgabe, vor jeder entfernten Datenbankänderung und jedem Deployment den konkreten Schritt vorzulegen und Bestätigung einzuholen, gilt weiterhin. Deshalb noch keine Remote-Schreibschritte nach den lokalen Tests.

**Ziel `nfomkdvotqtlyymomksb`, Name `spots. testproject`. Nicht Produktion `yhnxdeypkbzyjappuzmv`.** Vor Ausführung Projekt-ID bestätigen und alle aktuellen 34 Test-Events/UUIDs, Backend-Definitionen sowie freie Lease sichern. Bei abweichendem Bestand/aktiven Importen stoppen.

1. Nur Kandidat 09 in seiner vorhandenen Transaktion ausführen. **SHA-256 `c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318`**. Umfang: eine private Tabelle, bisheriger Apply-Code als private Implementierung, neuer Apply-v2-RPC und geschützter kompatibler Apply-Wrapper. SQL-Einrichtung ändert keine Eventdaten. Danach Rechte/Definitionen und unveränderte Events prüfen.

```powershell
# NACH FREIGABE BEREITS AUSGEFÜHRT – nicht wiederholen
npx supabase db query --remote=nfomkdvotqtlyymomksb --file supabase/ops/09_goabase_source_removals.sql --yes --output-format json
```

2. Nur korrigierte `import-goabase` in Spots-Test bereitstellen; `verify_jwt=false`/`auth: secret` beibehalten. Tatsächlich bereitgestellten Code/Metadaten prüfen.

```powershell
# NACH FREIGABE BEREITS AUSGEFÜHRT – nicht wiederholen
npx supabase functions deploy import-goabase --remote=nfomkdvotqtlyymomksb --use-api --no-verify-jwt --yes --output-format json
```

3. Nach ebenfalls ausdrücklicher Freigabe **genau einen Test-POST**, ohne Retry, mit Test-Default-Secret im RAM. Originale Test-UUIDs müssen erhalten bleiben; ID 118240 darf bei weiterhin bestätigtem Redirect nur in Status/Veröffentlichung geändert werden. Andere legitime Quelländerungen/neue Events getrennt vergleichen. Zähler, Entfernungsmetadaten, Duplikate, Versionsschutz und freie Lease prüfen. Keine feste neue Eventanzahl versprechen.

Bei Fehlern stoppen. Kein weiterer echter Import, Produktionsschritt oder Cron aus dieser Freigabe ableiten. Wiederholungsimporte sind zunächst nur lokal geprüft. Reihenfolge: Backend 09 prüfen, dann Test-Deployment, dann freigegebener Testimport; die neue Function setzt Backend 09 voraus und führt selbst keine Migration aus.
