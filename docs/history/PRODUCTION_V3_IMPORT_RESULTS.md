> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: kontrollierter produktiver Goabase-Import erfolgreich

Stand: **08.11.2026 18:38:12 UTC**. Ausschließlich Produktion **Spots. / yhnxdeypkbzyjappuzmv**. Nach ausdrücklicher Freigabe **genau ein POST**, keine automatische Wiederholung. Kein Deployment, keine zusätzliche SQL-/Policyänderung, kein Cron und keine Frontend-/App-Konfigurationsänderung.

## Vor dem Aufruf geprüft und gesichert

- Produktions-ID/Name sowie Function **ACTIVE/Version 3/verify_jwt=false** mit dem bekannten Fingerprint `54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8` vor dem Import und nochmals unmittelbar vor dem POST bestätigt. Erfolgreichen Test mit bytegleichem vollständigem Artefakt geprüft; kein erneutes Deployment nötig.
- Vorhandenes vollständiges logisches Backup unter `supabase/backups/production-backup-2026-11-08T17-46-21-621Z/` weiterhin vorhanden: **alle 30 Manifestdateien per SHA-256 verifiziert**, erfolgreicher isolierter Restore-/SQL-Probe-Nachweis vorhanden. Bekannte Grenze bleibt: kein vollständiger verwalteter Supabase-Plattformrestore. Keine unnötige Wiederholung des Backups oder der unabhängigen Integrationstests.
- Frischen Snapshot mit **allen 31 vollständigen Eventzeilen einschließlich UUIDs, Quell-IDs und created_at** gesichert und gegen den Backupbestand verglichen: identisch. Lease frei, 0 Quellversionen, keine Entfernungs-/Quarantänemetadaten oder Duplikate.
- Default Secret ausschließlich geschützt im Prozessspeicher verwendet. Keine Schlüssel/Request-Header ausgegeben oder gespeichert.

## Tatsächliche HTTP-Antwort

**HTTP 200**, Run-ID `d7f91507-e30f-4b97-ba77-ba0ff57e54e3`.

| Ergebnisfeld | Wert |
| --- | ---: |
| discovered / checked | 29 / 36 |
| inserted | 4 |
| updated | 30 |
| unchanged | 0 |
| rejected_versions | 0 |
| cancelled / postponed | 0 / 0 |
| removed / removed_unchanged / removed_unknown | 1 / 0 / 0 |
| quarantined / quarantined_unchanged | 0 / 0 |
| skipped_unconfirmed | 1 |

Der zurückgegebene ungeklärte Eintrag ist **118652, Grund moved**, Quellzeit `2026-11-07T20:08:27.000Z`. Nicht neu angelegt und nicht als scheduled/Absage interpretiert. Vollständige erwartete Antwortfelder geprüft und geschützt im Ergebnisbericht gesichert.

## Datenvergleich

**31 → 35 echte gespeicherte Events. Alle 31 ursprünglichen UUIDs und created_at erhalten**, keine fehlenden Originalevents, keine doppelten Quellpaare.

- Vier neue Quell-IDs: **118641, 118655, 118637, 118646**.
- 30 vorhandene normale Events aktualisiert, insbesondere bisherige kurze Goabase-Links auf bestätigte Original-URLs aktualisiert. Bei drei dieser Events auch Bilder geändert. Namen, Zeit- und GPS-Felder der bestehenden Events in diesem Lauf unverändert.
- Bestehende **118240** nach bestätigter Quell-Entfernung als **source_removed/is_published=false** geführt. UUID und sämtliche übrigen gespeicherten Daten unverändert; keine falsche Absage und kein Löschen der Zeile.
- Insgesamt sieben zuvor sichtbare Events ausgeblendet: die entfernte Veranstaltung sowie **sechs inzwischen abgelaufene scheduled-Events** (118556, 118469, 118633, 118497, 118454, 117895). Abgelaufene Termine wurden nicht als abgesagt umgedeutet.
- Endbestand **34 scheduled + 1 source_removed**, **28 veröffentlicht, 7 ausgeblendet**. Alle 35 Events mit gültigem GPS; Namen, Zeitangaben, Status, Veröffentlichungen und Quellenlinks ohne Validierungsfehler.
- **34 tatsächliche Quellversionsdatensätze**, ein Entfernungsmetadatensatz, keine Quarantänemetadaten. Für das alte entfernte Event wurde bewusst keine erfundene Quellversion angelegt; 35 Events bei 34 Quellversionen ist hier korrekt.
- **Importsperre vollständig freigegeben**, keine Duplikate, Event-RLS unverändert. App-Umgebungsdatei per Hash und lokale CLI-Verknüpfung zu Test unverändert.

Die 31 geänderten bestehenden Zeilen ergeben sich aus **30 normalen Aktualisierungen plus 1 gezielten Entfernung**. Sie sind keine 31 neu importierten Veranstaltungen. Antwortzähler und Vorher-/Nachher-Vergleich stimmen überein.

## Tatsächlicher App-Lesezugriff

Mit der unveränderten produktiven App-URL und ihrem Publishable Key über den tatsächlichen SDK-/Eventprojektionspfad geprüft, keine Secret Keys im Frontend:

| Abfrage | HTTP | Treffer | Mit Datenbanksnapshot identisch |
| --- | ---: | ---: | --- |
| Veröffentlicht / scheduled | 200 | 28 | ja |
| Explore / zukünftige Events | 200 | 28 | ja |
| Live / laufend mit gültigem GPS | 200 | 0 | ja |

Keine Live-Events erfunden. Das belegt den Datenzugriff der App; kein zusätzlicher visueller UI-Test behauptet. Source-RLS bleibt unverändert flagbasiert.

Belege geschützt/Git-ignoriert unter `supabase/backups/production-v3-import-2026-11-08T18-38-01-792Z/`: vollständige Vorher-/Nachher-Snapshots, Feldvergleich, HTTP-Status/alle Importzähler und App-Leseergebnisse. [Einmaliger Produktionslauf](../../scripts/run-production-goabase-v3-import.cjs) mit persistentem Marker gegen Wiederholungen. **Expo-Lint und App-Typecheck erfolgreich**, keine unabhängigen Tests wiederholt.

## Können wir jetzt die Zwei-Stunden-Automatik einrichten?

**Ja, als nächsten separat freizugebenden Konfigurationsschritt.** Importer-/Dependency-Abnahme und kontrollierter Produktionsimport sind erfolgreich. Keine weitere allgemeine Import-Testserie nötig. Der geplante Aufrufweg selbst ist noch nicht eingerichtet oder abgenommen.

Tatsächlich in diesem Lauf rein lesend festgestellt:

- pg_cron nicht installiert, cron.job nicht vorhanden: aktuell kein Supabase-Cron-Job in diesem Projekt.
- pg_net nicht installiert.
- Supabase Vault vorhanden, die vorgesehenen Namen spots_project_url und spots_import_goabase_secret_key fehlen.

Nächster konkreter Umfang nach Freigabe:

1. Notwendige Extensions pg_cron und pg_net gezielt einrichten. Danach vorhandene Jobs nochmals lesen, damit kein doppelter oder inzwischen extern angelegter Job entsteht.
2. Exakte Produktions-URL und vorgesehenen Default Secret geschützt in Vault ablegen. Keine Werte in SQL-Dateien/Chat/Logs; nur kontrollierte Namen/Anzahl prüfen. Vault-Zugriffsrechte prüfen.
3. Vorhandene [inaktive Jobvorlage](../../supabase/ops/02_prepare_disabled_job.sql) anhand des bestätigten Produktionsziels fertig prüfen; der aktuelle Schutzschalter blockiert ihre Ausführung weiterhin. Einen Job spots-import-goabase-2h mit Zeitplan **0 */2 * * *** vorbereiten, Ziel fest auf yhnxdeypkbzyjappuzmv prüfen. Erst inaktiv anlegen, keine zweite Function-Version deployen und keine zusätzliche manuelle Importschleife starten.
4. Aktivierung separat konkret freigeben. Erste tatsächliche geplante HTTP-Antworten und Function-Ergebnisse überwachen; bloße Cron-/pg_net-Einreihung ist noch kein Importerfolg. Bei Fehler gezielt Job pausieren und Ursache untersuchen, keine blinden Wiederholungen außerhalb des vorgesehenen Takts.

Das Vorgehen folgt der [offiziellen Supabase-Anleitung für geplante Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions). **In diesem Auftrag wurden weder Extensions/Vault-Einträge noch Jobs angelegt oder aktiviert.**
