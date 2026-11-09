> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots-Test: tatsächliche Abnahme der Quell-Entfernungskorrektur

**Fortschreibung:** Nachfolgende rein lesende Untersuchung identifizierte `Moved` bei ID 118652 in Liste und Detail als konkreten Auslöser. Eine sichere Behandlung ist inzwischen lokal implementiert, aber noch nicht auf Supabase bereitgestellt: [GOABASE_STATUS_ANALYSIS.md](GOABASE_STATUS_ANALYSIS.md). Der folgende Bericht bleibt der historische Nachweis des fehlgeschlagenen Testlaufs.

Stand: 08.11.2026. Ziel ausschließlich **spots. testproject / nfomkdvotqtlyymomksb**. Produktionsprojekt `yhnxdeypkbzyjappuzmv` nicht verändert. App, `.env.local` und Cron unverändert. Projekt-ID vor jedem freigegebenen Schritt erneut bestätigt.

## 1. SQL-Erweiterung erfolgreich

Kandidat [09_goabase_source_removals.sql](../../supabase/ops/09_goabase_source_removals.sql) mit SHA-256 `c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318` genau einmal ausgeführt. Vorher aktuelle 34 Test-Events vollständig mit UUIDs, Daten, Quellversionen und Backend-Funktionsdefinitionen gesichert. Alte Test-Function für Rückweg heruntergeladen.

Nachher unverändert: sämtliche 34 Eventzeilen, Quellversionsdaten, freie Lease und Event-RLS/Grants. Backend geprüft: drei private RLS-Tabellen, vier öffentliche Backend-RPCs und eine private Core-Funktion. Core-Funktionskörper identisch zum vorherigen geprüften Apply-Code. Owner postgres, SECURITY DEFINER/leerem search_path bei Funktionen, keine PUBLIC-/Client-Ausführungsrechte; service_role nur öffentliche Backend-RPCs, keine direkten Core-/Tabellenrechte. Keine Events durch die Einrichtung geändert.

## 2. Test-Deployment erfolgreich

Ausschließlich `import-goabase` mit explizitem Testziel bereitgestellt: **ACTIVE, Version 2, verify_jwt=false**. `auth: "secret"` beibehalten. Heruntergeladenen bereitgestellten Quellcode gegen eingefrorenen lokalen Kandidaten geprüft: identisch. Keine andere Function deployed.

Server-Bundle-SHA-256: `b33a70db4ab9b343a38535d33f4dc97a9dd1f4c82a13c490adcbcbcc4f4d3475`.

Datenbank-Snapshot vor/nach Deployment identisch; weiterhin 34 Events.

## 3. Genau ein POST – fehlgeschlagen

Gesamtablauf **08.11.2026, 17:14:37–17:16:01 UTC**. Genau ein POST, ausschließlich Testprojekt, gültiger Test-Default-Secret nur im Prozessspeicher. Keine Schlüssel ausgegeben, gespeichert oder als Prozessargument übergeben.

Tatsächliche Antwort:

```text
HTTP 502
{"error":"unknown_source_status"}
```

Daraufhin sofort weitere entfernte Schritte gestoppt. Kein zweiter POST, keine automatische Wiederholung, kein weiteres Deployment oder SQL. Die erfolgreichen Schritte 1/2 bleiben in Spots-Test eingerichtet; kein ungefragter Rollback.

Der vorhandene Detailmapper akzeptiert nach Kleinschreibung nur `scheduled`, `cancelled`, `postponed` und wirft diesen Fehler bei jedem anderen `nameStatus`. **Der konkrete Quellwert und die betroffene ID sind aus dieser Antwort nicht erkennbar.** Sie wurden im erlaubten Testlauf nicht ungefiltert gespeichert. Keine Behauptung über einen bestimmten zusätzlichen Status und kein pauschales Mapping auf Absage/Löschung.

## Nachkontrolle nach dem Abbruch

Die im Fehlerpfad ausschließlich lesend gesicherten Vorher-/Nachher-Snapshots anschließend lokal vollständig verglichen:

- **34 → 34 Events**, alle UUIDs, `created_at` und sämtliche Eventfelder exakt identisch.
- Keine fehlenden Original-Events, keine neuen Events oder Duplikate.
- Alle **34 Quellversions-Datensätze inklusive Payload unverändert**.
- Importsperre frei und identisch zum Ausgangszustand: Token NULL, Ablauf `-infinity`.
- Keine `source_removed`-Zeilen und keine Entfernungsmetadaten angelegt. Der Quellenfehler hat den gesamten Batch vor Apply gestoppt; die Live-Verarbeitung der Entfernung konnte daher noch nicht erfolgreich abgenommen werden.
- Andere gültige Events wurden in diesem Lauf ebenfalls nicht übernommen. Keine Erfolgs-/Entfernungszähler zurückgegeben; keine solchen Zähler erfinden. Datenbankseitig 0 neue/aktualisierte/entfernt markierte Events.
- App-`.env.local` per SHA-256 unverändert; CLI weiter mit Test verbunden.

Die Lokaltests für die Quell-Löschungsbehandlung bestanden zuvor vollständig (52 Tests, 0 übersprungen). Das ersetzt keine erfolgreiche Remote-Abnahme. Für den neuen Ablauf-Runner Syntaxprüfung, Expo-Lint und App-Typecheck erfolgreich; keine unnötige Wiederholung der bestehenden Tests.

## Entscheidung

**Noch nicht zur Produktionsübernahme empfehlen.** Die Redirectkorrektur und das Backend sind lokal geprüft und in Spots-Test bereitgestellt; der echte Import ist aber an einer weiteren Quelleigenschaft gescheitert. Dass die ursprüngliche konkrete Löschung live erfolgreich verarbeitet wird und alle übrigen Quellenfälle passen, ist noch nicht nachgewiesen.

Nächster sinnvoller Auftrag: gezielte rein lesende Diagnose von `unknown_source_status`, betroffene Quell-ID und tatsächlich gelieferten Status feststellen; danach dokumentierte Statusabbildung oder weiterhin konservative Ablehnung lokal mit Fixtures prüfen. Keine automatische Interpretation eines unbekannten Status als abgesagt/gelöscht. Ein neues Test-Deployment beziehungsweise ein weiterer POST benötigt nach Untersuchung eine neue Freigabe. Die aktuelle Einmal-POST-Freigabe ist verbraucht. Produktion und Cron bleiben ausgeschlossen.

Nachweise: `supabase/backups/test-source-removals-2026-11-08T17-14-37-627Z/` mit SQL-Antwort, originalem/geändertem Backend, altem und neuem Function-Code, Deployment-Antwort, vier Datenbank-Vergleichsphasen, Versuchmarkierungen und `result.json`. Git-ignoriert und Windows-Zugriff auf aktuellen Benutzer begrenzt. Ausführungs-Runner: [test-goabase-removals-remote.cjs](../../scripts/test-goabase-removals-remote.cjs), festes Testziel und einmalige Marker je Schritt; nicht ungefragt erneut starten.
