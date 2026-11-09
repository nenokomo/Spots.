> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots-Test: Status- und Redirect-Korrektur erfolgreich abgenommen

Stand: 08.11.2026, Abschluss 17:36:45 UTC. Ausschließlich **spots. testproject / nfomkdvotqtlyymomksb**. Produktion, App-Konfiguration und Cron unverändert.

## Freigegebene Schritte und Nachweise

Vor jedem Schritt wurde die tatsächliche Projekt-ID geprüft. Keine automatischen Wiederholungen. Ablauf: [Test-Runner](../../scripts/test-goabase-status-remote.cjs), geschützt und Git-ignoriert gespeicherte Snapshots/Ergebnisse unter `supabase/backups/test-source-status-2026-11-08T17-34-47-201Z/`.

1. Ausschließlich [Backend-Erweiterung 10](../../supabase/ops/10_goabase_unconfirmed_status.sql) ausgeführt, SHA-256 `380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a`. Backend 09 war bereits installiert. Alle 34 vollständigen Eventzeilen inklusive UUIDs, Quellversionen, Entfernungsmetadaten, Lease und Events-Sicherheitsregeln unverändert. `status` ist text ohne einschränkenden CHECK; `source_unconfirmed` wird unterstützt. Vier private RLS-Tabellen, fünf öffentliche Backend-RPCs und zwei private Core-Funktionen geprüft: kein PUBLIC-/Client-Zugriff; service_role nur öffentliche RPCs, kein direkter Core-/Tabellenzugriff. SECURITY DEFINER/Eigentümer/leerer search_path geprüft; übernommener Core-Code unverändert.
2. Nur `import-goabase` deployt: **ACTIVE, Version 3, verify_jwt=false**, weiterhin `auth: "secret"`. Tatsächlich heruntergeladene Quellen stimmen mit dem geprüften Kandidaten überein. Bundle-SHA-256 `ef6e9148dd99db9c1a372b4d5e6531e6208ea84de826b0391c6e3d6b2249ff6a`. Daten vor/nach Deployment identisch.
3. Genau **ein POST**, **HTTP 200**, Run-ID `2bf8a183-0487-4640-83f2-16b8d50278f5`. Default Secret Key ausschließlich im Arbeitsspeicher. Kein weiterer POST und kein Paralleltest.

## Tatsächliches Importergebnis

| Zähler | Ergebnis |
| --- | ---: |
| discovered | 29 |
| checked | 36 |
| inserted | 1 |
| updated | 7 |
| unchanged | 26 |
| rejected_versions | 0 |
| cancelled / postponed | 0 / 0 |
| removed / removed_unchanged / removed_unknown | 1 / 0 / 0 |
| quarantined / quarantined_unchanged | 0 / 0 |
| skipped_unconfirmed | 1 |

**34 → 35 gespeicherte Events**, davon **28 veröffentlicht und 7 ausgeblendet**. Statusverteilung: 34 scheduled, 1 source_removed. Veröffentlichung ausschließlich für scheduled und zeitlich noch gültige Events. Alle 34 ursprünglichen UUIDs und created_at erhalten, kein ursprüngliches Event fehlt, keine doppelten Quellpaare, Lease wieder frei. 35 Quellversionsdatensätze; alle nicht entfernten Events haben eine Quellversion.

- **118240:** bestätigter Löschungsredirect korrekt als `source_removed`, `is_published=false`; UUID und sämtliche übrigen Eventfelder erhalten. Ein Entfernungsmetadatensatz. Der bisherige Redirect-Batchfehler tritt in diesem Lauf nicht mehr auf.
- **118652 / Moved:** kontrollierter Grund `moved`, tatsächliches `source_modified_at=2026-11-07T20:08:27.000Z`. Diese ID war vorher nicht importiert und wurde deshalb übersprungen; weder als scheduled angelegt noch als abgesagt interpretiert. Die anderen 34 gültigen Details wurden verarbeitet. Keine Quarantänemetadaten für eine nicht gespeicherte Veranstaltung.

Keine neuen Fehler beobachtet. SHA-256 der App-Umgebungsdatei vor/nach identisch; keine App- oder Produktionsänderungen.

## Prüfungen und Grenzen

Expo-Lint und `tsc --noEmit` in diesem Arbeitsschritt erfolgreich. Der unveränderte Funktions-/SQL-Kandidat hatte bereits **63 lokale Tests ohne Fehler/übersprungene Tests** sowie Deno-Typecheck mit eingefrorener Lockdatei bestanden; keine unnötige Wiederholung dieser Suite. Syntax des neuen Test-Runners geprüft.

Der reale Moved-Fall prüft den Pfad für eine neue ID. Die Quarantäne eines bereits gespeicherten Events, Wiederholungen, Versionsschutz und Rollback sind durch lokale isolierte SQL-/Handler-Tests belegt; sie wurden nicht durch Manipulation echter Remote-Events nachgestellt. Kein zweiter Remote-Import dieser Fassung. Paginationgrenze in diesem Lauf nicht erreicht. Andere Netzwerk-/JSON-/ungültige Detailfehler bleiben atomare Batchfehler. Goabase dokumentiert Moved weiterhin nicht; keine Deutung als bestätigte Verschiebung. Details: [Statusanalyse](GOABASE_STATUS_ANALYSIS.md).

## Nächste Schritte für Produktion – noch nicht freigegeben oder ausgeführt

Ziel ausschließlich **yhnxdeypkbzyjappuzmv**; CLI-Verbindung bleibt Test. Produktion hat Backend 03 und die ältere Function-Version 2. Test-Erfolg allein autorisiert keine produktiven Änderungen.

1. Vor einer Änderung vorhandenes geprüftes Backup/Restore-Nachweis verifizieren und einen frischen vollständigen Event-Snapshot sowie die aktuell bereitgestellte Function sichern. Die 31 bestehenden produktiven UUIDs/Daten bilden die Vergleichsbasis; keine erneute allgemeine Bestandsprüfung nötig.
2. Separate Freigabe für genau [Backend 09](../../supabase/ops/09_goabase_source_removals.sql) (SHA-256 `c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318`) und [Backend 10](../../supabase/ops/10_goabase_unconfirmed_status.sql) (SHA-256 oben), in dieser Reihenfolge. Vor jedem Schritt Ziel/Hash prüfen; danach Daten-/UUID-Erhalt und Rechte prüfen, bei Fehler stoppen. Keine bestehenden Events durch SQL ändern.
3. Separate Freigabe zum Deployment ausschließlich desselben geprüften Importer-Quellstands mit explizitem Produktionsziel; Quellen, auth:secret und verify_jwt=false nachprüfen. Anschließend gezielt GET-Authentifizierung und unveränderten Bestand prüfen.
4. Separate Freigabe für genau einen produktiven POST mit frischem Vorher-/Nachher-Vergleich, Quellstatus-/Veröffentlichungsprüfung und tatsächlichem App-Lesezugriff. Bei Fehler kein Retry.

Rückfall: gesicherte frühere Function wieder bereitstellen, falls dafür eine Freigabe vorliegt. Backend-Ergänzungen nicht vorschnell entfernen: ältere öffentliche Apply-Zugänge sind kompatibel und berücksichtigen Schutzmetadaten. Eine Wiederherstellung von Eventdaten wäre ein gesondert zu prüfender, ausdrücklich freizugebender Eingriff; nicht pauschal den Bestand überschreiben.

**Cron bleibt aus.** Automatisierung alle zwei Stunden mit Backend-Schlüssel in Supabase Vault erst als eigenen Schritt nach erfolgreicher produktiver Abnahme vorbereiten/freigeben. Keine Secret Keys ins Frontend, Repository oder Ergebnisprotokoll.
