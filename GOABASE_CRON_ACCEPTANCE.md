# Spots: Cron-Abnahme

Stand: **09.11.2026, 21:37 Europe/Berlin**. Ziel ausschließlich yhnxdeypkbzyjappuzmv. **Job aktiv, kontrollierter Scheduler-Test bestanden; lokale Überwachung auf ausdrücklichen Nutzerwunsch beendet. Erster regulärer Lauf durch Codex noch nicht abgenommen.**

## Aktuell bestätigt: Supabase läuft unabhängig von VS Code

Der lokale Node-Prozess für die dauerhafte Beobachtung wurde gezielt beendet. Kein Supabase-Job wurde pausiert, erneut aktiviert oder aufgerufen. Anschließende rein lesende Live-Prüfung um **21:37 Europe/Berlin** bestätigt:

- Genau ein Job **ID 1 / spots-import-goabase-2h**, **active=true**.
- Zeitplan **0 */2 * * *** gespeichert, Cron-Zeitzone GMT/UTC.
- Vault-Namen je einmal vorhanden; produktive Function ACTIVE/v3 unverändert.
- 35 Events, 0 Duplikate, Lease frei. Keine zusätzlichen Importaufrufe oder Remote-Mutationen.

**VS Code/Codex darf geschlossen werden.** Der lokale Prozess hat ausschließlich beobachtet; Ausführung übernimmt Supabase pg_cron/pg_net im Backend. Der nächste reguläre Termin ist heute **23:00 Europe/Berlin / 22:00 UTC**. Der Nutzer überprüft diesen anschließend selbst in der Supabase-Job-Historie.

## Bisher tatsächlich abgeschlossen

- Produktions-ID/Name und unveränderte import-goabase ACTIVE/v3/verify_jwt=false mit abgenommenem Fingerprint vor Aktionen geprüft. Bestehende Extensions/private Tabelle und Vault-Einträge wiederverwendet; weder Neuinstallation noch net-Rechte-/Secret-/Function-/Appänderung.
- Vor Jobanlage 0 Jobs bestätigt, aktuelle API-/NOLOGIN-Grenzen und private Tabelle geprüft. Ausschließlich lesender Vault-Check als berechtigte Rolle postgres. Kein neuer Key erstellt oder ausgegeben.
- Genau ein Job **ID 1, spots-import-goabase-2h**, Eigentümer postgres/Datenbank postgres, zunächst inaktiv erstellt. Vollständiger hinterlegter Befehl per MD5 gegen die geprüfte SQL-Quelle verglichen; fester Produktions-URL-Guard und Vault-Lookup statt Secret-Literal. Event-/UUID-/Importmetadaten dabei unverändert.
- Echter kontrollierter Cron-Aufruf am **09.11.2026 21:19 Europe/Berlin**: Job pausierte sich selbst, Request-ID **1**, **HTTP 200**, zugehörige Cron-Historie succeeded. Run-ID f6d59b32-5412-408b-9669-af45f4311762. Eindeutige Zuordnung anhand Job-ID, Request-ID und passendem Zeitintervall, keine bloße Annahme aus erfolgreicher Queue-Einreihung.
- Ergebnis: **35 → 35 Events**, UUIDs/created_at erhalten, keine Duplikate, Lease frei; 28 veröffentlicht. Importbericht: discovered=29, checked=36, unchanged=34, removed_unchanged=1, skipped_unconfirmed=1; alle übrigen Zähler 0.
- Erst nach diesem Nachweis denselben einzigen Job auf **0 */2 * * * / aktiv** gestellt. Prüfung der Live-Konfiguration erfolgreich. Erster regulärer Termin **09.11.2026 22:00 UTC / 23:00 Europe/Berlin**. Job läuft danach im Zwei-Stunden-Takt weiter.

## Erster regulärer Nachweis an den Nutzer übergeben

Die dauerhafte lokale Abnahme wurde auf Nutzerwunsch beendet; es wird nicht bis zum Termin weiter gepollt. Bis zur echten HTTP-/Historien-/Datenprüfung wird nicht behauptet, dass der erste reguläre Lauf bereits erfolgreich war. Kein zweiter Probejob und keine zusätzlichen manuellen Imports. Der Job bleibt aktiv.

Zur Kontrolle im Dashboard: Integrationen → Cron → spots-import-goabase-2h → History. Ein neuer Eintrag nach 23:00 Europe/Berlin sollte den regulären Scheduler-Lauf zeigen. History succeeded allein beweist noch nicht die asynchrone HTTP-Antwort. Die eindeutige Zuordnung liefert die private Request-ID-Tabelle; folgenden reinen SELECT bei Bedarf im SQL Editor ausführen (keine Header/Secrets werden gelesen):

```sql
select d.phase, d.created_at, d.request_id,
       r.status_code, r.timed_out,
       (r.error_msg is not null) as network_error
from spots_sync_private.goabase_cron_dispatches d
left join net._http_response r on r.id = d.request_id
order by d.created_at desc
limit 5;
```

Erwartung für die erste phase scheduled: HTTP 200, timed_out=false und network_error=false. pg_net-Antworten bleiben standardmäßig nur sechs Stunden erhalten; die Cron-Historie und die privaten Request-IDs sind getrennte Nachweise. Es findet kein erneuter Import durch diese SELECT-Abfrage statt.

Gesicherte Belege im bestehenden geschützten/Git-ignorierten Verzeichnis `supabase/backups/automation-2026-11-09T19-55-27-529Z/`: Jobkonfiguration, Vorher-/Nachher-Snapshots, monitor-controlled.json, monitor-scheduled.json und result.json. Frühere Berechtigungs-/Prüfrollenstopps bleiben als historische Berichte erhalten; diese wurden nicht durch wiederholte Extension-/Vault-Einrichtungen umgangen. Verwaltung/History werden nun mit ausschließlich lesendem SQL als postgres geprüft; es werden keine zusätzlichen Objektberechtigungen vergeben.
