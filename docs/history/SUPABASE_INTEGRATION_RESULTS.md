> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Goabase-Integrationstests und verbleibende Grenzen

Stand: 06.11.2026 (Europe/Berlin). Ausschließlich **spots. testproject / nfomkdvotqtlyymomksb**, Function-Version 1. Produktion **yhnxdeypkbzyjappuzmv** wurde nicht abgefragt oder verändert; keine App-/Environment-Änderung, kein Deployment, kein Cron. Die folgenden Zeiten sind UTC.

## Zwei echte gleichzeitige Import-POSTs

Testzeit 05.11.2026, 22:59:39–22:59:50 UTC. Beide Requests wurden gemeinsam gestartet, ihre Laufzeiten überlappten:

| Aufruf | Start UTC | Ende UTC | Tatsächliche Antwort |
| --- | --- | --- | --- |
| 1 | 22:59:44.763 | 22:59:47.336 | **409**, `sync_already_running` |
| 2 | 22:59:45.449 | 22:59:47.647 | **200**, 0 eingefügt / 0 geändert / 34 unverändert |

Der später am Client gestartete Request kann am Server zuerst die Lease erhalten; die Reihenfolge ist kein Fehler. Genau ein Aufruf wurde angenommen, der andere kontrolliert abgewiesen. Kein Retry.

Vorher-/Nachher-Snapshots: **34 → 34 Events**, alle 34 UUIDs unverändert, keine Feldänderung, keine neuen/entfernten Quell-IDs, **0 Duplikate**, **0 aktive/zurückgebliebene Sperren**, Ablauf `-infinity`. Default Secret Key ausschließlich im Backend-Arbeitsspeicher, keine Schlüsselwerte in Dateien/Logs/Argumenten.

Durchführung: [test-goabase-concurrency.cjs](../../scripts/test-goabase-concurrency.cjs). Lokale ignorierte Belege: [Vorher](../../supabase/.temp/goabase-concurrency-before.json), [Nachher](../../supabase/.temp/goabase-concurrency-after.json), [Antworten/Vergleich](../../supabase/.temp/goabase-concurrency-results.json).

## Elf kontrollierte Fixtures mit echten Datenbank-RPCs

Testzeit 05.11.2026, 23:05:47–23:05:51 UTC. Der tatsächliche TypeScript-Quellmapper/Detailabgleich erzeugte lokal synthetische Zustände aus künstlichen API-Antworten. Diese wurden über die **vorhandenen echten RPCs des Testprojekts** innerhalb einer PostgreSQL-Untertransaktion geprüft.

Die IDs `999990000000001` bis `999990000000003` wurden vor Verwendung auf Kollision geprüft. Keine bestehenden Events wurden als Fixtures umfunktioniert. Sämtliche synthetischen Events, Metadaten und Lease-Änderungen wurden durch einen absichtlich ausgelösten, abgefangenen Rollback zurückgenommen. Die RPCs wurden nicht ersetzt oder neu bereitgestellt.

| Tatsächlich geprüfter Fall | Ergebnis |
| --- | --- |
| Geplantes Fixture einfügen | `scheduled`, veröffentlicht, neue UUID |
| Identisches Fixture wiederholen | unverändert, dieselbe UUID |
| Titel, Stadt, Start/Ende und GPS ändern | korrekt aktualisiert, dieselbe UUID |
| Explizite Absage | `cancelled`, unveröffentlicht; DB korrigiert auch versehentlich wahres Eingangsflag |
| Alte Version / gleiche Version mit anderem Inhalt | beide zurückgewiesen, keine Wiederveröffentlichung |
| Explizite Verschiebung | `postponed`, unveröffentlicht, dieselbe UUID |
| Bestätigter neuer geplanter Termin | neuer Zeitpunkt, wieder veröffentlicht, dieselbe UUID |
| Leerer Schreibbatch | keine Bestandslöschung/-absage |
| Doppelte IDs im Batch | Batch zurückgewiesen |
| Gemischter gültiger/ungültiger Batch | vollständig atomar zurückgerollt |
| Abgelaufener Besitzer nach Lease-Übernahme | alter Commit abgewiesen; alter Release kann Nachfolger nicht freigeben |

Alle elf Fälle bestanden. Danach vollständiger Gleichheitsvergleich aller echten Events samt UUIDs, Quellversionen und ursprünglicher Lease: **unverändert, 34 Events, keine verbliebenen Fixtures**. Es war kein DELETE und keine manuelle Bereinigung nötig.

Vor dem erfolgreichen Lauf scheiterten zwei lokale CLI-Versuche, **bevor SQL ausgeführt wurde**: `UnrecognizedOption`, weil ein führender SQL-Kommentar `-- TEST ONLY` als CLI-Flag interpretiert wurde. Das lokale Werkzeug wurde auf `--file` umgestellt; davor/danach unveränderter Datenbankbestand bestätigt. Kein Fehler der bereitgestellten Function und keine entfernte Codeänderung. Der erste Fehlbericht bleibt lokal erhalten.

Durchführung: [test-goabase-fixtures.cjs](../../scripts/test-goabase-fixtures.cjs), [SQL-Testvorlage](../../supabase/ops/06_test_goabase_fixtures.sql). Die SQL-Vorlage enthält einen Platzhalter und ist nicht direkt auszuführen. Lokaler erfolgreicher Beleg: [Fixture-Ergebnisse](../../supabase/.temp/goabase-fixture-cli-fixed-results.json). Derselbe Fixture-Test läuft zusätzlich in der lokalen PostgreSQL-WASM-Testsuite.

## Acht kontrollierte API-Fehler mit echten Lease-RPCs

Testzeit 05.11.2026, 23:06:53–23:07:24 UTC. **Wichtige Abgrenzung:** Die unveränderten Handler-/Quellmodule laufen für die Fehler-Injektion lokal in Node. Der Auth-Wrapper wird im Harness ersetzt; dessen echte Authentifizierung war bereits separat mit 401/401/401/405 geprüft. Die Lease-RPCs werden über den echten Backend-SDK-Client des Testprojekts ausgeführt. Nur die Goabase-Antworten werden simuliert. Es wurden keine weiteren Aufrufe an den bereitgestellten Import-Endpunkt gesendet und kein realer Goabase-Ausfall erzeugt.

| Simulierter Quellenfehler | Tatsächlicher lokaler Handler-Status | Fehlercode |
| --- | --- | --- |
| HTTP 503 | **502** | `source_http_503` |
| HTTP 429 | **502** | `source_http_429` |
| Netzwerkfehler | **502** | `source_network_or_json_error` |
| Ungültiges JSON | **502** | `source_network_or_json_error` |
| Fehlende/falsche Eventliste | **502** | `invalid_source_page` |
| Fehler auf Folgeseite | **502** | `source_http_503` |
| Fehlender Detaildatensatz 404 | **502** | `source_http_404` |
| Hängender Abruf | **504** | `source_timeout` |

In **jedem** Fall ausschließlich echte Aufrufe von `spots_goabase_begin` und `spots_goabase_release`, **kein Aufruf von `spots_goabase_apply`**. Ein unerwarteter Schreibversuch wäre vom Harness blockiert und als Testfehler gewertet worden; es gab keinen solchen Versuch. Vor/nach jedem Fall vollständige Gleichheit der 34 echten Events einschließlich Status/Veröffentlichung und Metadaten bestätigt, keine Massenabsage/-löschung, keine zurückgebliebene Lease. Nach der Suite `.env.local` per SHA-256 identisch.

Durchführung: [test-goabase-source-failures.cjs](../../scripts/test-goabase-source-failures.cjs). Beleg: [API-Fehler-Ergebnisse](../../supabase/.temp/goabase-source-failures-results.json).

## Gesamtbewertung und Grenzen

- Parallelität am echten bereitgestellten Endpunkt, echte DB-Zustandswechsel/atomare Fehlerbehandlung mit Rollback und Fehler-Injektion mit echten Lease-RPCs **bestanden**.
- Lokale Testsuite anschließend **35 bestanden, 0 fehlgeschlagen, 0 übersprungen**, einschließlich PostgreSQL-Tests. Expo-Lint, App-Typecheck und Deno-Typecheck erfolgreich.
- Keine persistierten künstlichen Events, keine manipulierten realen Goabase-Daten, keine Änderungen am bereitgestellten Importer. Letzter Testbestand **34 Events und 34 Quellversionen**, alle ursprünglichen UUIDs erhalten, kein Duplikat und keine aktive Lease.
- Absage-/Verschiebungsfälle wurden nicht über die echte Goabase-Website oder einen zusätzlichen Fixture-Edge-Endpunkt erzeugt. Nachgewiesen sind die reale Quelltransformation mit simulierten Daten und die realen Datenbank-RPCs. Echte Goabase-Absagen können nicht kontrolliert erzwungen werden.
- Quellenfehler wurden nicht als tatsächlicher Netzwerkausfall der gehosteten Edge Runtime erzwungen. Deren Infrastruktur-/Gateway-Timeouts sowie der echte 90-/120-Sekunden-Grenzfall eines hängenden Workers bleiben außerhalb dieses Nachweises. Abgelaufene Lease-Tokens sind auf Datenbankebene geprüft.
- Die dokumentierte Paginationgrenze (`offset <= 40`, `limit <= 500`) bleibt bestehen. Volle letzte Seite führt zu `source_pagination_limit` ohne Event-Schreibbatch. Eine unbegrenzte vollständige Quelle wird nicht behauptet. [Goabase OpenAPI](https://www.goabase.net/api/schema/goabase.json)
- Fehlende Details/Quellversionen blockieren konservativ den ganzen Lauf. `dateModified` ist keine zugesicherte monotone Quellversion; widersprüchlich gleich alte Daten werden abgewiesen. Maximal 5.000 IDs, 90 Sekunden Quellenbudget; Skalierung erfordert einen gesonderten Queue-Entwurf.
- Vault/pg_net/Cron-Ende-zu-Ende ist noch nicht getestet oder aktiviert. Produktionsschema, produktive RLS/Schreiber und Backups wurden in diesem Testauftrag nicht geprüft.

Der nächste Schritt ist die getrennt freizugebende Übernahme nach [PRODUCTION_ROLLOUT.md](../../PRODUCTION_ROLLOUT.md), einschließlich vorheriger Bestandsprüfung und einer eigenen Freigabe für automatische Aufrufe. Keine Produktionsfreigabe durch diese Tests impliziert.
