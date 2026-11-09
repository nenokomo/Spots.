# Spots – Dokumentation und Betriebsdateien

## Aktuelle Einstiege

- [Design-/Datenintegration](DESIGN_INTEGRATION.md): lokaler Integrationsbranch, Konfliktentscheidungen und tatsächliche Browser-/Testnachweise.

- [Projektstatus](../PROJECT_STATUS.md): aktueller Funktions- und Betriebsstand, Grenzen, nächste Schritte.
- [Supabase-App-Anbindung](../SUPABASE_SETUP.md): Schema, öffentliche Client-Konfiguration und Lesezugriff.
- [Goabase-Synchronisierung](../GOABASE_SYNC.md): Importer, Statusbehandlung, SQL und lokale Tests.
- [Cron-Abnahme](../GOABASE_CRON_ACCEPTANCE.md): aktiver Job, kontrollierter Test und Prüfung regulärer Läufe.
- [pg_net-Plattformvorgaben](../GOABASE_NET_PLATFORM_REVIEW.md): systemverwaltete Rechte und Sicherheitsgrenzen.
- [Testprojekt](../SUPABASE_TEST_SETUP.md), [Backup/Wiederherstellung](../PRODUCTION_BACKUP.md), [Rollout/Rückfall](../PRODUCTION_ROLLOUT.md): datierte Ablaufnachweise und Wiederherstellungshilfen. Historische Einrichtungsanweisungen nicht erneut ausführen.
- [Bereinigungsbericht](PROJECT_CLEANUP.md): entfernte und bewusst erhaltene Dateien sowie Prüfungen.

## Bewusst erhaltene Betriebsmittel

Alle Skripte unter [scripts](../scripts) werden lokal bei Bedarf ausgeführt. Kein Skript dort ist für die Ausführung des bereits eingerichteten Supabase-Cron-Jobs erforderlich. Ein fehlender täglicher Aufruf bedeutet nicht, dass ein Skript überflüssig ist.

| Gruppe | Dateien | Grund für Erhalt |
| --- | --- | --- |
| Backup/Restore | backup-spots-*, finalize-spots-backup, restore-spots-backup-local | Wiederherstellung und zugehörige Nachweise |
| Build/Bundle | build-goabase-production-v3, compare-goabase-bundles, download-goabase-bundles-readonly, deploy-goabase-frozen-test | Nachvollziehbare Release-Artefakte und Dependency-Abgleich |
| Einrichtung/Deployment | apply-goabase-*, deploy-goabase-production*, prepare-goabase-production-upgrade | Historische geprüfte Rollout-Schritte und Prüfsummen; keine allgemeine Wiederholungsfreigabe |
| Diagnose | inspect-*, probe-goabase-source-readonly, read-goabase-runtime-logs | Fehlerklärung und gezielte Betriebsprüfung |
| Integration/Einmalimporte | test-goabase-*, run-*-goabase-import, run-production-goabase-v3-import | Reproduzierbare Integrationsnachweise; können Remote-Daten verändern, nur gezielt nach Freigabe |
| Cron | finish-goabase-automation.cjs/.ps1, inspect-goabase-automation | Einrichtung, Zustandsprüfung und bestehende Sicherheitsprüfungen; keine lokale Dauerüberwachung starten |
| Gemeinsame Helfer | goabase-integration-support | Von mehreren Betriebs-/Testskripten benötigt |

SQL unter [supabase/ops](../supabase/ops) bleibt vollständig erhalten: 00/01/04/07 für Prüfungen, 05/06 für isolierte Testvorbereitung/Fixtures, 03/09/10 für Importer-Backend, 11/11b/12/13/14 für Cron/Vault. **02 ist eine überholte, standardmäßig gesperrte Vorlage**, durch 12–14 abgelöst. Auch sie bleibt als historischer Entwurf erhalten; nicht parallel zum vorhandenen Job ausführen.

## Historie

Unter [history](history) liegen 15 abgeschlossene Analyse-, Freigabe- und Ergebnisberichte sowie vollständige frühere Fassungen von [Projektstatus](history/PROJECT_STATUS_HISTORY.md), [Sync-Dokumentation](history/GOABASE_SYNC_HISTORY.md) und [Importer-Review](history/IMPORT_GOABASE_REVIEW_HISTORY.md). Fehlerursachen, Hashes, UUID-/Datenintegritätsnachweise, Einschränkungen und Rückfallentscheidungen bleiben nachvollziehbar. Frühere Aussagen wie „Cron aus“ beschreiben ausschließlich den damaligen Zeitpunkt.

Lokale Backups, Snapshots und Einmalmarker bleiben unter `supabase/backups/` und `supabase/.temp/` geschützt und Git-ignoriert. Sie sind keine normalen wegwerfbaren Caches. Für eine neue Entwicklerumgebung sind diese lokalen Nachweise nicht Bestandteil des Git-Checkouts.
