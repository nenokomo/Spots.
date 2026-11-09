# Goabase-Importer – Review und Nachweise

Aktueller technischer Einstieg: [Goabase-Synchronisierung](../../../GOABASE_SYNC.md). Betriebsstand: [Projektstatus](../../../PROJECT_STATUS.md) und [Cron-Abnahme](../../../GOABASE_CRON_ACCEPTANCE.md).

- Handler: Secret-Authentifizierung, nur POST, Lease/Fencing, atomarer Apply-v3 und Freigabe der eigenen Lease.
- Datenintegrität: stabile UUIDs, UNIQUE-Quellidentität, monotone Quellversionen; keine pauschalen Absagen oder Löschungen bei Quellenfehlern.
- Quellenstatus: bestätigte Absagen/Verschiebungen getrennt von source_removed und source_unconfirmed. Unbekannte Werte werden nie automatisch scheduled.
- Sichere Detailredirects, begrenzte Pagination, Fetch-/Body-/Gesamtzeitlimits und bereinigte Fehlerdiagnose; keine sensiblen Header oder Rohantworten in Logs.
- Authentifizierung bleibt auth:secret/Default Secret mit verify_jwt=false. App verwendet ausschließlich Publishable Key; Vault bleibt im Backend.
- Produktions-v3 wurde als identisches Bundle in Spots-Test geprüft. [Release-Manifest](production-v3.release.json), [Dependency-Abnahme](../../../docs/history/GOABASE_FROZEN_RELEASE_RESULTS.md). Ein neuer Quellbuild ist nicht automatisch byteidentisch; Build-/Freeze-Verfahren beachten.

Alle 67 lokalen Tests einschließlich SQL-/Cron-Fixtures bei der Bereinigung erfolgreich, nichts übersprungen. Sie ersetzen keine erneute Live-Abnahme nach künftigen Backend-Änderungen.

Vollständige frühere Review-, Fehler- und Testchronik bleibt im [Archiv](../../../docs/history/IMPORT_GOABASE_REVIEW_HISTORY.md) erhalten. Keine Function-, SQL- oder Konfigurationsänderung im Zuge der Bereinigung.
