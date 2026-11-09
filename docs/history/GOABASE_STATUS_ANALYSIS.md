> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: unknown_source_status – Befund und lokale Behandlung

Aktueller Stand: 08.11.2026. Nach separater Freigabe Backend 10 und Function Version 3 ausschließlich in Spots-Test bereitgestellt. Genau ein POST **HTTP 200**: 35 Events, 28 veröffentlicht, 1 source_removed, Moved-ID sicher übersprungen, alle 34 bisherigen UUIDs erhalten, keine Duplikate/Lease. Produktion unverändert, kein Cron. Tatsächliche Ergebnisse und nächste Freigaben: [Testbericht](GOABASE_STATUS_TEST_RESULTS.md). Die folgende Analyse dokumentiert die vorherige lesende Untersuchung und lokale Entwicklung; deren damalige Freigabehinweise sind historisch.

## Konkreter Auslöser

**ID 118652: PSYNIGHT VI – ESCAPE TO NOWHERE.** Beobachtet am 08.11.2026 um 17:22:45 UTC:

| Quelle | Antwort | nameStatus |
| --- | --- | --- |
| DE/club-Liste, limit=500, offset=0 | HTTP 200, gültiges JSON | `Moved` |
| Detail `/api/party/json/118652` | HTTP 200, gültiges JSON, passende ID | `Moved` |

Der Status ist vorhanden, vom Typ String und in Liste/Detail identisch. Er ist weder ein fehlender Wert noch eine Schreibvariante eines bisher unterstützten Status, sondern ein zusätzlicher Wert.

Die direkt gelesene [offizielle Goabase-OpenAPI 1.1.1](https://www.goabase.net/api/schema/goabase.json) nennt bei `EventBase.properties.nameStatus` nur **Scheduled, Cancelled, Postponed**. `nameStatus` steht zudem nicht in `EventBase.required`. Der reale Wert **Moved** liegt außerhalb des dokumentierten Enums. Daraus weder eine Absage noch einen neuen Termin oder weiterhin planmäßiges Stattfinden ableiten.

Gezielt untersucht: 29 Feed-Einträge und insgesamt 36 unterschiedliche IDs aus aktuellem Feed plus gespeichertem Testbestand. Genau eine Detailantwort mit unbekanntem Status gefunden: 118652/Moved. Die bereits bekannte ID 118240 lieferte separat den bestätigten 301-Löschungsredirect. Kein anderer HTTP-Fehler in diesem Leseabgleich. Keine vollständigen API-Antworten oder sensiblen Header protokolliert.

Der bisherige Mapper akzeptiert nach Trim/Kleinschreibung nur scheduled/cancelled/postponed und wirft bei Moved `unknown_source_status`. Dieser Fehler hatte den gesamten Batch gestoppt. Die Beobachtung reproduziert die relevante Eigenschaft des fehlgeschlagenen Testlaufs; dessen alte Antwort enthält selbst keine Quell-ID.

Belege: `supabase/.temp/goabase-status-investigation.json`, erstellt durch [inspect-goabase-status-readonly.cjs](../../scripts/inspect-goabase-status-readonly.cjs). Keine Supabase-Aufrufe in diesem Skript.

## Lokal implementierte Behandlung

[sync.ts](../../supabase/functions/import-goabase/sync.ts) trennt drei Gruppen: bestätigte normale Events, bestätigte Quell-Entfernungen und ungeklärte Status. Nur der gezielte `unknown_source_status` wird isoliert. Identität, Titel, Zeiten, tatsächliches `dateModified` und kanonischer Link werden vorher geprüft. Ungültige Datensätze, falsche Status-Datentypen, Netzwerk-/JSON-Fehler und unerwartete Redirects bleiben echte Batchfehler.

- Bekannte Werte werden wie bisher nur durch Trim/Kleinschreibung normalisiert. Kein unscharfes Mapping oder Default auf scheduled.
- Moved erhält den kontrollierten Grund `moved`; fehlend/null/leer `missing`; andere unbekannte Strings `unrecognized`. Keine beliebigen Roh-Statuswerte in Logs oder Datenbank übernehmen.
- **Neue ungeklärte Events werden übersprungen und nicht angelegt.** Sie werden bei späteren Läufen erneut geprüft. Andere gültige Events werden weiterverarbeitet.
- **Bereits importierte ungeklärte Events erhalten `status='source_unconfirmed'`, `is_published=false`.** UUID, `created_at` und sämtliche anderen Eventfelder bleiben unverändert. Keine automatische Absage/Quell-Löschung.
- Eine bereits bestätigte Quell-Entfernung behält Vorrang (`source_removed` bleibt bestehen). Ein unbekannter Status macht daraus kein normales oder lediglich ungeklärtes Event.
- Beobachtung und tatsächlicher Quellzeitstempel werden getrennt von der zuletzt übernommenen Event-Payload in privaten Quarantänemetadaten gesichert. Es wird kein `dateModified` erfunden. Der Zeitstempel-Wasserstand kann nur steigen.
- Wiederveröffentlichung nur bei wieder bekanntem Status und nachweislich neuerer Quellversion als Quarantäne-Beobachtung und gespeichertem Quellversions-Wasserstand. Unveränderte/ältere Zeitstempel bleiben konservativ gesperrt. Das kann bei rückständigen Quelluhren oder unverändertem `dateModified` eine manuelle Prüfung erfordern; kein stiller Schutz-Bypass.

[index.ts](../../supabase/functions/import-goabase/index.ts) nutzt den neuen RPC `spots_goabase_apply_v3`, meldet ungeklärte IDs mit kontrollierten Gründen und zählt sie in `checked`. Neue Backend-Zähler: `quarantined`, `quarantined_unchanged`, `skipped_unconfirmed`. `auth: secret` und die bedingte Lease-Freigabe bleiben unverändert.

## Erforderliche Backend-Erweiterung – nur lokal vorbereitet

[10_goabase_unconfirmed_status.sql](../../supabase/ops/10_goabase_unconfirmed_status.sql) setzt Backend 09 voraus. Eine neue private RLS-Tabelle `goabase_unconfirmed`, neuer Apply-v3-RPC, vorhandener Apply-v2-Code unverändert als private Implementierung. Öffentliche v2-/Legacy-Zugänge bleiben kompatibel und berücksichtigen ebenfalls Quarantänesperren. Keine direkten privaten Core-/Tabellenrechte für PUBLIC, Clients oder service_role; Backend-Zugriff nur über die kontrollierten RPCs.

Normale Upserts, Quell-Entfernungen und Statusquarantäne erfolgen atomar unter derselben Lease. Doppelte/überlappende IDs, ungültige Gründe oder abgelaufene Lease stoppen ohne Teilübernahme. Neu unbekannte IDs erzeugen auch keine Quarantänezeilen; ihre kontrollierten Hinweise bleiben im Laufbericht sichtbar.

**SHA-256 des SQL-Kandidaten: `380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a`. Noch nicht auf Supabase ausgeführt.**

## Tests und tatsächlicher Stand

**63 lokale Tests bestanden, 0 Fehler, 0 übersprungen.** Enthalten: Moved und gültige Events im selben Lauf, fehlende/leere/unbekannte Status, bekannte Schreibvarianten, keine Interpretation von Canceled als scheduled, weiterhin fehlschlagende ungültige Datensätze, reale SQL-Quarantäne in PGlite, UUID-/Daten-/Versions-Erhalt, Wiederholungen, alter/neuer RPC, bestätigte Wiederherstellung, neu beobachtete unbekannte Quellversion, Vorrang von Quell-Entfernung, atomarer Rollback, Rechte und bestehende Handler-/App-Tests.

Expo-Lint, App-Typecheck und Deno-Typecheck mit eingefrorener Lockdatei erfolgreich. Keine App-/Design-/Navigationsänderung, keine neuen Abhängigkeiten.

Der lokale Kandidat benötigt Backend 10. Die Test-Function läuft weiterhin auf dem zuletzt bereitgestellten, bei Moved abbrechenden Bundle. Die Produktionsfassung wurde nicht verändert. **Remote-Abnahme des neuen Statusverhaltens noch offen.**

## Nächster kontrollierter Schritt nach neuer Freigabe

Nur Spots-Test **nfomkdvotqtlyymomksb**: Projekt-ID/aktuellen Bestand/freie Lease und eingefrorenen Kandidaten bestätigen, Testdaten/Backend-Definitionen sichern, SQL 10 ausführen und unveränderte Events/Rechte prüfen; ausschließlich korrigierte import-goabase deployen; erst dann genau einen erneut freigegebenen Test-POST. Bei Fehlern stoppen, kein Retry.

```powershell
# PLAN – erfordert neue ausdrückliche Freigabe
npx supabase db query --remote=nfomkdvotqtlyymomksb --file supabase/ops/10_goabase_unconfirmed_status.sql --yes --output-format json
npx supabase functions deploy import-goabase --remote=nfomkdvotqtlyymomksb --use-api --no-verify-jwt --yes --output-format json
```

Kein Produktionsschritt, kein Cron. Zunächst muss der neue Testlauf nachweisen, dass gelöschte und ungeklärte Quell-Events sicher isoliert und die übrigen gültigen Veranstaltungen übernommen werden. Die bisherige Einmal-POST-Freigabe ist verbraucht.
