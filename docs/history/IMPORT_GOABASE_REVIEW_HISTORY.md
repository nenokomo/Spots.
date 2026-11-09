> Historische Review- und Testchronik. Aktueller Stand: [Projektstatus](../../PROJECT_STATUS.md). Keine Ausführungsfreigabe.

# Lokale Prüfung des Goabase-Importers

Aktuelle Produktionsabnahme 08.11.2026 18:38:12 UTC: identische Bundle-Fassung nach ausdrücklicher Freigabe mit genau einem produktiven POST **HTTP 200** bestätigt. 31 → 35 Events, alle alten UUIDs erhalten, source_removed/Moved korrekt, keine Duplikate/freie Lease; App liest echte veröffentlichte Events erfolgreich. Keine Deployments/zusätzlichen SQL-Änderungen/Cron. [Tatsächliche Ergebnisse](PRODUCTION_V3_IMPORT_RESULTS.md). Nächster separat freizugebender Schritt: Automatik vorbereiten.

Neuester Abschluss 08.11.2026: Vollständiges Produktions-v3-Artefakt (13 Pakete/807 Einträge, jose 6.2.16) hashfixiert und offline reproduzierbar verpackt. Tatsächlich bereitgestellte Test-v4 vollständig bytegleich, Sicherheitskonfiguration gleich. Auth 401/401/401/405 und genau ein Test-POST HTTP 200 bestanden; 35 vollständige Eventdaten/UUIDs unverändert, 0 Duplikate/freie Lease. Produktion unverändert, kein Produktionsaufruf/Cron. [Release-Manifest](../../supabase/functions/import-goabase/production-v3.release.json), [Abschlussnachweis](GOABASE_FROZEN_RELEASE_RESULTS.md). Das reproduzierbare Verfahren verpackt das eingefrorene kompilierte Artefakt; kein neuer Quellbuild/keine Paketauflösung. Historische deno.lock nicht als Remote-Garantie verwenden.

Neueste rein lesende Bundleanalyse 08.11.2026: Test enthält jose 6.2.15, Produktion 6.2.16; fünf ausführbare jose-JS-Dateien unterscheiden sich. Eigener Importer und Auth-Konfiguration identisch, vollständiger ausführbarer Dependency-Stand jedoch nicht. API-Build/Lock-Reproduzierbarkeit vor Importfreigabe klären und denselben Stand gezielt abnehmen. Keine erneute Veröffentlichung oder Function-Aufrufe. [Belege](GOABASE_BUNDLE_ANALYSIS.md).

Neuester Produktionsstand nach Deploymentfreigabe 08.11.2026: Function **ACTIVE/v3/verify_jwt=false**, Quellen identisch zu Test, aber **Server-Bundle-Hash abweichend**; Abnahme gestoppt, Ursache ungeklärt. Alle 31 Eventdaten/UUIDs unverändert, keine Function-Aufrufe/Imports/Cron oder weiteren Änderungen. [Tatsächlicher Deploymentbefund](PRODUCTION_V3_DEPLOYMENT.md). Ältere Versionsstände unten historisch.

Neuester Produktionsstand 08.11.2026: Backend 09+10 nach separater Freigabe erfolgreich produktiv eingerichtet; alle 31 vollständigen Eventdaten/UUIDs und Eventrechte unverändert, private Tabellen/Core-/RPC-Rechte geprüft. **Produktive Function bleibt ACTIVE/v2 mit altem Quellstand**, korrigierter Kandidat nur in Test bereitgestellt. Kein produktiver Function-Aufruf/POST/Cron durch diese Einrichtung. [Ausführungsbericht](PRODUCTION_09_10_APPROVAL.md).

Neuester Remote-Stand 08.11.2026: Nach Freigabe Backend 10/Function **ACTIVE/Version 3** nur in Spots-Test erfolgreich eingerichtet und mit genau einem POST **HTTP 200** geprüft. 35 Events, 28 veröffentlicht, gelöschte ID 118240 source_removed, neue Moved-ID 118652 sicher übersprungen. Alle 34 bisherigen UUIDs erhalten, keine Duplikate/Lease. Lint/App-Typecheck erneut erfolgreich, Kandidat gegenüber den 63 lokalen Tests unverändert. Produktion unverändert, kein Cron. [Tatsächliche Ergebnisse und Grenzen](GOABASE_STATUS_TEST_RESULTS.md). Die folgenden Stände sind historisch.

Aktueller lokaler Kandidat 08.11.2026: Zusätzlich sichere Quarantäne für `Moved`/fehlende/unbekannte Status, neuer Backend-10-/Apply-v3-Entwurf. **63 Tests/Lint/App-/Deno-Typecheck erfolgreich, nicht deployt.** Aktueller Test-Remote-Abbruch bleibt bis zur separaten Freigabe bestehen. [Statusanalyse und Lösung](GOABASE_STATUS_ANALYSIS.md).

Aktueller Remote-Stand nach Freigabe vom 08.11.2026: Backend 09/Function-Kandidat ausschließlich in Spots-Test erfolgreich eingerichtet (ACTIVE/v2); genau ein POST danach **502 unknown_source_status**, kein Retry. Alle 34 Test-Events/UUIDs und Quellversionsdaten unverändert, freie Lease, noch keine erfolgreiche Remote-Abnahme der Quell-Entfernung. Produktion unverändert; neuer Status muss zuerst lesend eingegrenzt werden. [Ergebnisbericht](GOABASE_REMOVALS_TEST_RESULTS.md). Frühere Stände unten sind historisch.

Aktueller lokaler Kandidat vom 08.11.2026: sichere Quell-Entfernungen mit `source_removed` und atomarem Backend 09 implementiert; alle 52 Tests/Lint/App-/Deno-Typecheck erfolgreich. **Noch nicht auf Spots-Test oder Produktion bereitgestellt.** Bisherige Remote-Deployments bleiben unverändert. Details und konkrete Freigabe für Test-SQL/Deployment/einen POST: [GOABASE_REMOVALS_TEST_PLAN.md](GOABASE_REMOVALS_TEST_PLAN.md). Die folgenden älteren Angaben sind historisch.

Stand: 06.11.2026. Die frühere Originalversion ist im Git-Verlauf gesichert. [index.ts](../../supabase/functions/import-goabase/index.ts) und [sync.ts](../../supabase/functions/import-goabase/sync.ts) enthalten die überarbeitete Version. Ausschließlich im Testprojekt `nfomkdvotqtlyymomksb` bereitgestellt: ACTIVE, Version 1, verify_jwt=false. Vier echte Authentifizierungsfälle, Erstimport, Wiederholung und echte parallele POSTs (200/409) bestanden. Zusätzlich elf rückgerollte Fixture-Fälle mit echten DB-RPCs sowie acht simulierte Quellenfehler mit lokalem Handler und echten Leases bestanden. Alle ursprünglichen 34 Events/UUIDs/Quellversionen unverändert, keine Duplikate/Fixtures/Leases verblieben. **Keine Produktionsbereitstellung, kein Cron.**

## Verbessert und lokal geprüft

- Pagination mit `limit=500`, Datensatz-Offsets und Deduplizierung; dokumentierte Offset-Grenze 40 wird eingehalten. Volle letzte Seite führt zum sichtbaren Fehler statt behaupteter Vollständigkeit.
- Jeder gespeicherte Goabase-Datensatz wird unabhängig von der Zukunftsliste über den Detailendpunkt überprüft.
- Explizite Statuspflege (`scheduled`, `cancelled`, `postponed`) zusammen mit `is_published`, exklusive Endzeit und keine erfundenen Endtermine.
- Validierung von Quellidentität, Titel, Zeitstempeln/Zeitzone, `dateModified`, Status und Original-Link. Keine falschen Nullkoordinaten durch Whitespace/Booleans.
- Acht Sekunden pro Quellenabruf einschließlich Body, 90 Sekunden Gesamtbudget, drei parallele Detailabrufe.
- Kontrollierte Fehlerantworten ohne interne DB-Fehler/Secrets. POST-Beschränkung. Auth bleibt `withSupabase({ auth: 'secret' })`, also Key namens `default`.
- Bei irgendeinem fehlgeschlagenen Quellenabruf wird kein Eventbatch geschrieben. Kein Löschen oder Absagen wegen fehlender IDs.
- [Separater Datenbankentwurf](../../supabase/ops/03_goabase_sync_backend.sql): backendexklusive Lease-RPCs mit Tokenprüfung und Zeilensperre bis Commit, atomarer Upsert auf vorhandenem UNIQUE-Index, Schutz vor älteren Quellversionen und widersprüchlichen gleich alten Payloads. Keine Änderung am öffentlichen Eventschema, bestehende UUIDs bleiben erhalten.
- Der neue Handler bricht ohne diese RPCs mit 503 ab; niemals auf einen ungesicherten Upsert ausweichen.

## Nachweise und Grenzen

35 lokale Tests erfolgreich, nichts übersprungen: acht App-Tests, 17 Handler-/Quellentests, eine SQL-Suite mit neun Untertests. Tatsächliche Bootstrap-/Backend-/Fixture-SQL in einer flüchtigen PostgreSQL-WASM-Datenbank (PGlite) ausgeführt, einschließlich Wiederinstallation, Versionen, Lease-Ablauf, atomarem Rollback und Rollenrechten. Expo-Lint, App-Typecheck und Deno-Typecheck erfolgreich. Keine App-Runtime-Abhängigkeiten für die Tests ergänzt; Backend-Auflösung in [deno.lock](../../supabase/functions/import-goabase/deno.lock) gespeichert.

Die lokalen Handler-Tests ersetzen den Auth-Wrapper; echte Authentifizierung und Parallelität sind zusätzlich separat am bereitgestellten Endpunkt geprüft. Kontrollierte Quellenfehler laufen mit lokalem unverändertem Handler und echten Lease-RPCs, die elf Zustands-Fixtures mit tatsächlicher Quelltransformation und echten DB-RPCs innerhalb vollständigen Rollbacks. Keine echte Goabase-Veranstaltung wurde für Absagen/Fehler manipuliert. Schlüssel nur im Backend-Arbeitsspeicher, keine Werte ausgegeben/gespeichert. Infrastruktur-Timeouts/Skalierung sowie Vault-/Cron- und Produktionsabnahme bleiben gesondert. Vollständige Methoden, Fehler und Grenzen in [SUPABASE_INTEGRATION_RESULTS.md](SUPABASE_INTEGRATION_RESULTS.md); [Übernahmeplan](../../PRODUCTION_ROLLOUT.md) noch nicht ausgeführt.

Goabase garantiert weder unbegrenzte Pagination noch einen konsistenten Snapshot/Löschfeed. Unter der dokumentierten Grenze können höchstens 539 Feedtreffer vollständig bestätigt werden; eine volle finale Seite stoppt den Lauf. Fehlende `dateModified`, ungültige Details oder 404 stoppen konservativ den gesamten Lauf. Gleiche Version mit anderem Inhalt bleibt unverändert und erscheint als `rejected_versions`; diese Zahl muss überwacht werden. Die Erstübernahme besitzt noch keine historische Quellversion. Die bisherige Kategorie `club` und nicht synchronisierte Zusatzfelder bleiben unverändert; eine vollständige Kategorie-/Inhaltsintegration ist ein eigener Schritt.

Alte Importerversionen und andere Schreiber beachten die neue Lease nicht. Vor späterem produktivem Umstieg alle alten Aufrufe pausieren und abwarten. Das 90-Sekunden-Budget und 5.000 IDs sind feste Grenzen; bei Wachstum ist ein geprüftes Queue-Modell nötig.

Konkrete Testbefehle, API-Einschränkungen, Vault-Vorgaben und der vollständige gestufte Veröffentlichungsplan stehen in [GOABASE_SYNC.md](../../GOABASE_SYNC.md).

## Quellen

- [Goabase OpenAPI 1.1.1](https://www.goabase.net/api/schema/goabase.json)
- [Goabase API und vorgeschriebener Backlink](https://www.goabase.net/api/party/)
- [Supabase Auth: Secret-Modus und Default-Key](https://supabase.com/docs/guides/functions/auth)
- [Supabase: Datenbankfunktionen und Berechtigungen](https://supabase.com/docs/guides/database/functions)
