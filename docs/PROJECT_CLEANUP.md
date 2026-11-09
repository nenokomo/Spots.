# Lokale Projektbereinigung – 09.11.2026

## Umfang und Bestandsprüfung

Branch: `Jacint-branch`. Projektstruktur, Git-Status, Einstieg/Router, App-Datenzugriff, Importer, SQL, Tests, Dokumentationslinks und Betriebshelfer lokal geprüft. Vorhandene uncommittete Supabase-Änderungen gehören zum bisherigen Arbeitsstand und wurden nicht zurückgesetzt. Keine Remote-Zugriffe oder Produktionsänderungen während der Bereinigung.

## Gelöscht

- `src/data/events.ts`: 180 Zeilen alte fiktive Veranstaltungen, Demo-Typ und ausschließlich dort verwendeter Kategoriefilter. Keine Codeverwendung oder Importe außerhalb der Datei. Die App lädt echte Events über den gemeinsamen Supabase-Service.
- Die nur für diese Bereinigung erzeugten lokalen Hilfsdateien `supabase/.temp/cleanup-project.cjs`, `supabase/.temp/write-clean-docs.cjs`, `supabase/.temp/audit-cleanup.cjs` und `supabase/.temp/finalize-cleanup.cjs` wurden beim Abschluss entfernt. Bestehende Betriebshelfer und Einmalmarker bleiben erhalten.

## Verschoben und konsolidiert

15 historische Berichte liegen jetzt unter `docs/history/`: GOABASE_AUTOMATION_APPROVAL, GOABASE_AUTOMATION_RESULTS, GOABASE_BUNDLE_ANALYSIS, GOABASE_FAILURE_ANALYSIS, GOABASE_FROZEN_RELEASE_RESULTS, GOABASE_REMOVALS_TEST_PLAN, GOABASE_REMOVALS_TEST_RESULTS, GOABASE_STATUS_ANALYSIS, GOABASE_STATUS_TEST_RESULTS, GOABASE_VAULT_RESUME_RESULTS, PRODUCTION_09_10_APPROVAL, PRODUCTION_PREFLIGHT, PRODUCTION_V3_DEPLOYMENT, PRODUCTION_V3_IMPORT_RESULTS und SUPABASE_INTEGRATION_RESULTS (jeweils .md).

Vollständige vorherige PROJECT_STATUS.md und GOABASE_SYNC.md bleiben als *_HISTORY.md erhalten. Deren wiederholte Zwischenstände werden in den aktuellen Einstiegsdokumenten durch eine konsistente Zusammenfassung ersetzt. Relative Markdown-Links wurden an neue Orte angepasst. Historische Berichte sind ausdrücklich als solche gekennzeichnet.

Die vollständige frühere Importer-Review-Chronik ist zusätzlich als IMPORT_GOABASE_REVIEW_HISTORY.md archiviert; REVIEW.md verweist kompakt auf aktuelle Sicherheitsregeln und Abnahmen.

## Bewusst erhalten

- Sämtliche SQL-Dateien und Backend-Definitionen, bestehende Function samt Lockdatei, Deno-Konfiguration und Release-Manifest.
- Alle vorhandenen Tests sowie Backup-, Restore-, Build-, Diagnose-, Deployment- und Integrationstools. Mehrere Skripte teilen Helfer und lokale Nachweise; abgeschlossene Nutzung allein rechtfertigt keine Löschung. Einordnung im [Index](README.md).
- Geschützte lokale Backups, Snapshots, CLI-Projektverknüpfung, Einmalmarker und Prüfsummen: wichtig für Wiederherstellung und Schutz vor Wiederholungen. Nicht rekursiv gelöscht oder auf Git vorbereitet.
- App.tsx und Design-Assets: vorsorglich erhalten, auch wenn der aktive Expo-Router-Einstieg index.ts ist. Mögliche Design-/Wiederverwendungsabsicht des Kollegen ist nicht eindeutig geklärt.
- Plattformvarianten wie .web/.ios und gemeinsame Typdateien: über Plattformauflösung benötigt; nicht als ungenutzt aussortiert.
- package.json und Lockdatei: keine Dependencies entfernt oder ergänzt. Die bereits vorhandene Supabase-CLI-Abhängigkeit bleibt erhalten.

## Git-Schutz und Grenzen

.gitignore schützt .env/.env.*, .env.local, pws, Supabase-Backups und CLI-Zustand. Ergänzt: Root-.temp/tmp/logs, *.log, *.dump, *.backup, *.sql.gz und *.eszip. SQL-Definitionen bleiben versionierbar. Keine Zugangsdaten in neue Dateien übernommen.

Backups mit eingeschränkten Dateirechten wurden weder geöffnet noch verändert. Die Schutzprüfung bezieht sich auf den aktuellen Git-Kandidaten und die Ignore-Regeln; keine nachträgliche Garantie über die gesamte frühere Git-Historie.

## Prüfung

- Expo-Lint und TypeScript-Typecheck erfolgreich (Exit 0).
- Vollständige lokale Suite: **67 Tests bestanden, 0 Fehler, 0 übersprungen**, einschließlich tatsächlicher SQL-Dateien in isoliertem PGlite 0.5.15, Event-Leseabfragen, Importer und Cron-Steuerung.
- Relative Codeimporte und lokale Markdown-Links geprüft: keine fehlenden Ziele. Keine externen Links oder entfernten Dienste für diese Prüfung aufgerufen.
- Git-Diff ohne Whitespace-Fehler. Ignore-Proben für .env.local, pws, Backups, CLI-Zustand, temporäre Dateien, Logs und Exporte erfolgreich; diese lokalen Schutzdateien sind nicht versioniert.
- Musterprüfung der Git-Kandidaten: keine konkreten Zugangsdaten gefunden. Zwei ausdrücklich ungültige Schlüssel-Fixtures in Auth-Testskripten als solche geprüft und erhalten. Dies ist keine vollständige forensische Geheimnisprüfung der Git-Historie.

Kein neuer echter Import, kein Deployment und kein Test gegen eine entfernte Datenbank. Lokaler Stand ist für einen Review und anschließenden Commit vorbereitet; noch nichts gestaged, committet, gepusht oder gemergt.

Ein Merge mit dem Design-Branch wurde ausdrücklich nicht durchgeführt. Ein sauberer lokaler Prüfstand garantiert keine Konfliktfreiheit mit noch nicht verglichenen Branch-Änderungen.

## Abschluss nach dem VS-Code-Hänger

Gespeicherten Git-Stand und Dateien erneut geprüft: einzig beabsichtigt gelöschte versionierte Datei ist src/data/events.ts. Alle 15 verschobenen Berichte und drei vollständigen historischen Dokumentfassungen sind vorhanden; sämtliche 15 SQL-Dateien und 34 Betriebsskripte erhalten. Keine versehentlich fehlenden relativen Codeimporte oder Markdown-Ziele gefunden. Keine laufenden Node-Testprozesse vorgefunden. Nichts gestaged.

Lint, Typecheck und alle 67 lokalen Tests waren in der vorherigen Ausführung bereits erfolgreich abgeschlossen (jeweils Exit 0, keine übersprungenen Tests). Danach ausschließlich Dokumentation bearbeitet und lokale Bereinigungshelfer entfernt; die bestandenen Tests deshalb nicht erneut gestartet. Git-/Verweis-/Ignore-Prüfungen beim Abschluss nochmals lesend durchgeführt.

Keine entfernte Datenbank geprüft oder verändert, kein Import/Deployment/Cron-Aufruf. App-Datenzugriff, Importer-Code, SQL und Cron-Konfiguration durch diese Abschlussarbeiten unverändert. Der letzte belegte Remote-Stand bleibt der im Projektstatus datierte Stand; keine neue Live-Abnahme behauptet.

**Ergebnis: lokale Bereinigung vollständig, Branch für den Commit vorbereitet.** Unversionierte fachliche Dateien (docs, scripts, Supabase und Tests) müssen beim späteren Commit bewusst mit aufgenommen werden. Noch kein Commit, Push oder Merge.
