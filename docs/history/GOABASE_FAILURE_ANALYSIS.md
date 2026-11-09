> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: Diagnose des produktiven Goabase-Fehlers

**Fortschreibung 08.11.2026:** Die nachfolgend vorgeschlagene fachliche Behandlung ist inzwischen lokal implementiert und mit 52 Tests geprüft, aber nicht auf Supabase bereitgestellt. Aktueller Kandidat, Beobachtungszaun/Status `source_removed` und konkrete Freigabe für Spots-Test: [GOABASE_REMOVALS_TEST_PLAN.md](GOABASE_REMOVALS_TEST_PLAN.md). Der folgende Bericht bleibt historischer Nachweis des ursprünglichen Fehlers und des damaligen Diagnosekandidaten.

Stand: 08.11.2026. Ausschließlich lesende entfernte Untersuchungen; keine weiteren Function-Aufrufe, POST-Importe, Deployments, SQL-Schreiboperationen oder Cron-Änderungen. Die ursprünglichen 31 Produktions-Events bleiben unverändert.

## Befund

**Der Fehler lässt sich lokal mit dem unveränderten bereitgestellten Abrufcode reproduzieren:**

```text
GET https://www.goabase.net/api/party/json/118240
HTTP 301
Location: https://www.goabase.net/party/deleted/118240
Content-Type: text/html; charset=UTF-8
```

Der vorhandene Importer prüft auch bereits gespeicherte Quell-IDs erneut. ID `118240` ist in Produktion und Spots-Test gespeichert. `fetch` verwendet in der bereitgestellten Fassung `redirect: "error"`; der Redirect verursacht deshalb eine Fetch-Ausnahme, bevor der Code den HTTP-Status prüfen oder JSON parsen kann. Der Catch-Block ersetzt diese Ausnahme durch `source_network_or_json_error`, die Function antwortet 502.

Dies ist die **konkret reproduzierte und mit Abstand plausibelste Ursache des produktiven Abbruchs**. Die damaligen Logs enthalten die Quell-ID/URL nicht; eine rückwirkend eindeutige Zuordnung der ursprünglichen Invocation zu genau dieser Anfrage ist damit nicht möglich. Die beobachtete Weiterleitung bezeichnet einen entfernten Goabase-Eintrag, belegt aber keine Veranstaltungsabsage.

## Tatsächlich gelesene Produktionslogs und Invocation

Dashboard war abgemeldet. Deshalb die offizielle Management-API mit der vorhandenen, ausschließlich im Prozessspeicher verwendeten CLI-Anmeldeinformation genutzt: GET auf das Logs-Endpoint, festes Zeitfenster **08.11.2026, 16:39–16:42 UTC**, nur `function_logs` und `function_edge_logs`. Keine Anmeldeinformation ausgegeben, gespeichert oder als Prozessargument übergeben. Keine Request-Header oder vollständigen API-/Log-Antworten persistiert; nur freigegebene Metadatenfelder übernommen.

| Zeitpunkt UTC | Quelle | Tatsächlicher Befund |
| --- | --- | --- |
| 16:40:12.936 | Function Runtime | Boot, Version 2 |
| 16:40:13.906 | Handler-Log | `source_network_or_json_error`, Laufdauer **921 ms** |
| 16:40:14.086 | Invocation | **POST / HTTP 502**, Ausführungszeit **1422 ms** |
| 16:41:27.952 | Runtime | Shutdown; zeitlich nach der Fehlerantwort, kein Beleg für einen Timeout während des Imports |

Execution-ID: `8a64de0a-447f-4e2d-9c25-f6976ea6fbff`.

Run-/Lease-ID aus dem Handler-Log: `226acf77-6b96-41ae-9081-dc9e67081b8b`.

Die Fehlerantwort an den Client enthielt nur den Fehlercode, keine Run-ID. Die vorhandenen Logs enthalten keine upstream URL, keine Abrufphase, keinen Goabase-Status oder ursprüngliche Exception. Daher aus ihnen allein keine bestimmte Detailanfrage ableiten.

## Abgrenzung anderer Ursachen

| Möglichkeit | Bewertung anhand von Code und Befunden |
| --- | --- |
| Expliziter Abruf-Timeout | Hätte `source_timeout`/504 geliefert; Handler nach 921 ms statt 8 Sekunden abgebrochen. Kein Anhaltspunkt dafür. |
| Gesamtlaufzeitbudget | Hätte `sync_deadline_exceeded`/504 geliefert; kein Anhaltspunkt. |
| Goabase 4xx/5xx | Ein gelesener HTTP-Fehler hätte `source_http_<Status>` geliefert. Der konkret gefundene 301 kommt bei `redirect:error` gar nicht bis zu dieser Prüfung. |
| Ungültiges JSON | Grundsätzlich im Sammelfehler enthalten. Die konkrete Reproduktion scheitert bereits beim Fetch wegen des Redirects; HTML der Löschseite darf nicht als JSON eingelesen werden. |
| Netzwerk-/TLS-/DNS-Problem | Ursprünglicher Logcode allein könnte dazu passen. Nicht bewiesen und wegen der reproduzierbaren 301-Detailanfrage deutlich weniger naheliegend. |
| Paginationlimit | Hätte `source_pagination_limit` geliefert. Lokale gezielte Reproduktion: Feed erfolgreich, 29 Treffer bei Limit 500, kein zweiter Seitenabruf nötig. |
| Detailabfrage | **Konkret reproduziert:** Detail `118240` liefert 301 auf die Löschseite. |
| Authentifizierung/DB-Einrichtung | GET-Authentifizierung bereits bestanden; der Handler hatte eine Lease-ID und scheiterte beim Quellenabruf, nicht mit einem Backend-Fehlercode. Nicht erneut getestet. |

Die lokale Reproduktion führte ausschließlich Goabase-GETs mit den vorhandenen 31 Quell-IDs aus, keine Supabase-RPCs und keinen Function-Aufruf. Nach erfolgreichem Feed-Abgleich wurde der bestehende Sammelfehler an Detail `118240` reproduziert. Danach genau diese Anfrage mit manueller Redirect-Prüfung gelesen; der HTML-Löschseite wurde nicht gefolgt. Keine vollständigen Goabase-Antworten protokolliert.

## Vergleich mit Spots-Test

Erfolgreiche Test-Invocation am 05.11.2026, 22:59:49.803 UTC: HTTP 200, Handlerdauer 861 ms, 34 unveränderte Events. Der parallel abgewiesene Testaufruf ist separat als HTTP 409 sichtbar; kein erneuter Paralleltest durchgeführt.

| Merkmal | Produktion | Spots-Test |
| --- | --- | --- |
| Projekt | `yhnxdeypkbzyjappuzmv` | `nfomkdvotqtlyymomksb` |
| Function-Version | 2 | 1 |
| Bereitstellungsstatus / Verify JWT | ACTIVE / false | ACTIVE / false |
| Region im Projekt und Runtime-Log | eu-central-1 | eu-central-1 |
| Runtime im jeweiligen Invocation-Log | supabase-edge-runtime-1.77.9 / Deno v2.1.4 | identisch |
| Server-Bundle-SHA-256 | `f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c` | identisch |
| Aktueller Eventbestand, lesend verglichen | 31 | 34 |
| Gespeicherte Quell-ID 118240 | vorhanden, scheduled/veröffentlicht, Start 20.11.2026 | ebenfalls vorhanden, gleiche Quelldaten, eigene UUID |

Somit kein Hinweis auf unterschiedlichen Code oder eine andere Runtime als Ursache. Die vorherigen Erfolge fanden drei Tage früher statt. **Der veränderte Zustand des externen Quelleintrags erklärt den Unterschied wesentlich besser.** Ein heutiger Testprojekt-POST wurde bewusst nicht durchgeführt; der gespeicherte Eintrag würde auch dort erneut abgefragt.

## Lokal vorbereitete Diagnoseverbesserung – nicht deployt

Geändert: [sync.ts](../../supabase/functions/import-goabase/sync.ts) und [index.ts](../../supabase/functions/import-goabase/index.ts). Die bereitgestellten Functions bleiben unverändert auf dem geprüften Bundle.

- Redirects **manuell erkennen und weiterhin niemals verfolgen**. 301 wird künftig lokal als `source_http_301` unterscheidbar, weiterhin HTTP 502 und vollständiger Abbruch ohne Apply.
- Fehlerdiagnose als fest typisierte, freigegebene Metadaten: `stage` feed/detail; `offset` oder numerische öffentliche `event_id`; `phase` fetch/body/json/record; `kind`; gelesener `http_status` oder null.
- Für Redirects ausschließlich Klassifikation `goabase_deleted`, `goabase_other` oder `external_or_invalid`. Keine Location-/Request-/Response-Header, URLs mit Parametern, Roh-Exceptions, Stacks oder API-Antworten loggen.
- Handler protokolliert diese sicheren Metadaten zusätzlich zur bestehenden Run-ID und Dauer; die Antwort an den Aufrufer enthält weiterhin nur einen kontrollierten Fehlercode.
- Diagnose patcht **keine fachliche Behandlung gelöschter Einträge**: keine automatische Absage, kein Löschen/Unpublish, kein Überspringen von Quellenfehlern, keine neuen Retries. Mit diesem reinen Diagnosekandidaten würde der bekannte 301 weiterhin den Gesamtlauf abbrechen.

Beispiel des künftig unterscheidbaren internen Diagnosefelds, ausschließlich aus kontrollierten Fixtures geprüft:

```json
{"stage":"detail","phase":"fetch","kind":"redirect","http_status":301,"event_id":"118240","redirect_target":"goabase_deleted"}
```

**Sechs neue fokussierte lokale Tests bestanden** in [goabase-diagnostics.test.cjs](../../tests/goabase-diagnostics.test.cjs): gelöschter Detailredirect ohne Folgeabruf, untrusted Redirect-Metadaten ohne Datenabfluss, Netzwerk/Body/JSON-Unterscheidung, fehlerhafte Folgeseite mit Offset, Fetch-/Body-Timeouts mit Phase sowie sicheres Handler-Logging ohne Apply bei freigegebener Lease. Alte Auth-/Import-/Paralleltests nicht unnötig wiederholt. Deno-Typecheck mit unveränderter eingefrorener Lockdatei, Expo-Lint und App-Typecheck erfolgreich.

## Konkreter Lösungsvorschlag vor einem weiteren Import

1. Diagnosekandidaten als lokale Änderung reviewen. Ein Deployment – zunächst in Spots-Test – benötigt eine eigene Freigabe. Ein reines Diagnose-Deployment allein behebt den blockierenden 301 noch nicht.
2. Fachliche Behandlung **bestätigter einzelner Quell-Löschungen** vorbereiten: nur bekannter gespeicherter Goabase-ID und exakter same-origin `/party/deleted/{dieselbe ID}`-Hinweis. Keine pauschale Behandlung beliebiger Redirects, 404, fehlender Feedtreffer oder Netzwerkfehler als Löschung/Absage.
3. Betroffene Event-UUID und bestehende Daten behalten; Quellenverfügbarkeit separat erfassen und nach Freigabe die Veröffentlichung gezielt deaktivieren. **Nicht** `cancelled` oder ein fiktives `dateModified` erfinden. Das derzeitige Versionsmodell verlangt eine bestätigte Quellversion und kennt keine eigene Quell-Löschungsmarkierung; deshalb einen kleinen expliziten Metadaten-/RPC-Entwurf zur Review vorlegen, statt heimlich das vorhandene Modell zu umgehen.
4. Verfügbare Events und bestätigte Quell-Löschungsmarkierungen atomar übernehmen. Sonstige unvollständige/fehlgeschlagene Quellenabrufe müssen weiterhin den Batch stoppen. Isolierte neue Fixtures für Löschungsfälle, falsche Redirectziele und Transaktionsschutz testen, ohne echte Events zu manipulieren.
5. Erst nach separater SQL-/Deployment-/Testfreigabe in Spots-Test abnehmen und anschließend kontrolliert nach Produktion übernehmen. **Kein erneuter produktiver POST aus der bisherigen, bereits verbrauchten Einmalfreigabe; kein Cron.**

## Nachweise und Quellen

- Gefilterte Logs/Invocations: `supabase/.temp/production-runtime-log-investigation.json`; reproduzierender GET-Ablauf: `supabase/.temp/goabase-source-focused-probe.json`; konkreter Redirect: `supabase/.temp/goabase-failing-detail-redirect.json`; lesender Umgebungsvergleich: `supabase/.temp/goabase-environment-comparison.json`. Keine Rohantworten/Schlüssel enthalten.
- [Lesender Log-Abruf](../../scripts/read-goabase-runtime-logs.ps1), [lokale Quellenreproduktion](../../scripts/probe-goabase-source-readonly.cjs).
- [Supabase Logs-API](https://supabase.com/docs/reference/api/v1-get-project-logs), [Logquellen und Felder](https://supabase.com/docs/guides/observability/log-field-reference), [ClickHouse-Logabfragen](https://supabase.com/docs/guides/observability/advanced-log-filtering).
- [Goabase OpenAPI 1.1.1](https://www.goabase.net/api/schema/goabase.json): Detail-JSON ist dokumentiert, der hier beobachtete 301-Löschungsredirect jedoch nicht als eigener Antwortfall. Nicht als zugesicherte vollständige Löschschnittstelle behandeln.
