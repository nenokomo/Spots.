> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: zusammengefasste Freigabe für die Zwei-Stunden-Automatik

**Aktueller Ausführungsstand 09.11.2026:** Nach erneuter Fortsetzungsfreigabe **Vault-Einträge eingerichtet und geschützt als korrekt bestätigt**. Einrichtung wegen falscher Prüfrollenwahl vor SQL 12 gestoppt; Prüfcode lokal korrigiert. Kein Cron-Job/Import/keine Aktivierung. Ab SQL 12 mit bestehenden Secrets fortsetzen, **SQL 11 und 11b nicht wiederholen**. [Aktueller Bericht](GOABASE_VAULT_RESUME_RESULTS.md).

**Aktuelle Plankorrektur 09.11.2026:** Die [offizielle Supabase-KB](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16) bestätigt nicht veränderbare net-Standardrechte. Vier net-REVOKEs ausschließlich lokal aus Datei 11 entfernt; Cron-/private Rechte bleiben. Data API aktuell nur public/graphql_public, net-Probe 406/PGRST106, Clientrollen NOLOGIN, keine unklassifizierten aktiven Loginrollen. [Vollständige Prüfung und Fortsetzungsplan](../../GOABASE_NET_PLATFORM_REVIEW.md). Keine produktiven Änderungen bei dieser Prüfung. Datei 11 nicht wiederholen; vorhandene Objekte erhalten und nach neuer ausdrücklicher Fortsetzungsfreigabe ab Plattformprüfung/Vault weiterarbeiten.

**Ausführungsstand nach erteilter Gesamtfreigabe:** SQL 11 produktiv einmalig ausgeführt, danach bei weiterhin vorhandenen pg_net-Clientrechten gestoppt. Extensions/private Protokolltabelle vorhanden, **kein Vault-Eintrag/Job/Import und keine Aktivierung**. [Aktueller Fehler-/Ausführungsbericht](GOABASE_AUTOMATION_RESULTS.md). Die folgenden Vorbereitungsangaben sind historisch; SQL 11 nicht erneut ausführen.

Stand: **09.11.2026**. **Nur vorbereitet, noch nicht produktiv ausgeführt.** Einziges Ziel: bestehende import-goabase automatisch alle zwei Stunden aufrufen. Produktion ausschließlich **yhnxdeypkbzyjappuzmv / Spots.** Keine neue Edge Function, keine eigene zusätzliche Datenbankfunktion und keine andere externe API. Expo-App/Umgebung bleiben unverändert.

## Heutiger rein lesender Befund

09.11.2026 **20:45 Uhr Europe/Berlin** (19:45 UTC), Ziel über CLI-Projektliste vor den Abfragen bestätigt:

| Bestandteil | Tatsächlicher Stand |
| --- | --- |
| import-goabase | ACTIVE/v3/verify_jwt=false, abgenommener Bundle-Fingerprint unverändert |
| Events | 35, davon 28 veröffentlicht; 0 Duplikate, Lease frei |
| pg_cron | verfügbar 1.6.4, nicht installiert; cron.job fehlt |
| pg_net | verfügbar 0.20.4, nicht installiert |
| Vault | 0.3.1 installiert |
| Benötigte Vault-Namen | beide fehlen |
| Vault-Lesezugriff | anon/authenticated gesperrt; bestehender privilegierter service_role-Zugriff vorhanden |
| Cron-Zeitzone | GMT, entspricht UTC |

Mangels cron.job existiert aktuell kein Supabase-Cron-Job in diesem Projekt. Das ist keine Behauptung über externe Scheduler außerhalb Supabase; vor der Einrichtung vorhandene manuelle/externe Aufrufer ausschließen und nach Extension-Installation alle Jobs erneut prüfen. Aktueller Beleg: `supabase/.temp/goabase-automation-inventory.json`, [lesendes Prüfskript](../../scripts/inspect-goabase-automation.cjs). Erster Sandbox-Aufruf scheiterte am Zugriff; die ausschließlich lesende Ausführung außerhalb der Sandbox war erfolgreich. Keine produktive Mutation oder Importanfrage.

## Konkrete produktive Änderungen nach einer einzigen Freigabe

1. **Ziel und Vergleichsstand sichern.** Vor jeder Remote-Aktion Projekt-ID/Name bestätigen, ausschließlich explizites Produktionsziel verwenden. Vorhandenen Backupnachweis prüfen, aktuellen vollständigen Event-/UUID-/Lease-Stand sichern. Function muss weiterhin dem abgenommenen Stand entsprechen. Bei Abweichung stoppen.
2. **Extensions und Backendzugriff vorbereiten:** [11_goabase_automation_backend.sql](../../supabase/ops/11_goabase_automation_backend.sql) enthält die Erstinstallation, die produktiv bereits erfolgt ist: nicht wiederholen. Cron-/private Rechte bleiben eingeschränkt. Die von supabase_admin verwalteten net-Standardrechte werden ausdrücklich beibehalten; vor Vault-Nutzung stattdessen net-Ausschluss aus der Data API und vertrauenswürdige direkte DB-Logins/NOLOGIN-Clientrollen prüfen. Keine Events-/Importer-/App-Rechte ändern.
3. **Eine private Protokolltabelle anlegen:** spots_sync_private.goabase_cron_dispatches mit RLS, ohne Client-/service_role-Rechte. Sie enthält nur interne UUID, Job-ID, Phase, Zeitpunkt, Request-ID und ggf. SQLSTATE. **Keine Schlüssel, Header, URLs oder Eventdaten.** Damit wird jeder Cron-Aufruf exakt seiner tatsächlichen HTTP-Antwort zugeordnet; keine neue RPC/Edge Function nötig.
4. **Zwei Vault-Einträge anlegen:** spots_project_url mit exakt https://yhnxdeypkbzyjappuzmv.supabase.co und spots_import_goabase_secret_key mit dem bereits verwendeten Default Secret. [11b_goabase_store_vault_parameters.sql](../../supabase/ops/11b_goabase_store_vault_parameters.sql) verwendet gebundene Parameter über die bereits genutzte Supabase-Management-Datenbankverbindung. Schlüssel nur im RAM, nicht in SQL-Literalen, Dateien, Prozessargumenten oder Ausgaben. Bei schon vorhandenen Namen nicht überschreiben, sondern stoppen/prüfen. Rückgabe nur Anzahlen, keine Secret-Werte.
5. **Genau einen zunächst inaktiven Job anlegen:** [12_goabase_prepare_inactive_job.sql](../../supabase/ops/12_goabase_prepare_inactive_job.sql), Name spots-import-goabase-2h, Zielzeitplan **`0 */2 * * *`**, Rolle postgres. Der Job liest Vault intern und stellt den authentifizierten POST mit apikey-Header/JSON-Body an die bestehende Function über net.http_post, Timeout 120 Sekunden. Die Ziel-URL wird exakt auf Produktion geprüft. Ein bereits vorhandener Job verhindert das Anlegen; nichts gleichnamiges überschreiben. Alte Vorlage 02 wird nicht zusätzlich ausgeführt.
6. **Einen echten kontrollierten Cron-Lauf durchführen:** [13_goabase_arm_controlled_cron.sql](../../supabase/ops/13_goabase_arm_controlled_cron.sql) stellt **denselben einzigen Job kurzzeitig auf `* * * * *`**. Beim nächsten tatsächlichen Scheduler-Aufruf pausiert sich der Job atomar selbst. Ein eindeutiger controlled-Datensatz verhindert die Wiederholung dieser Probe. Es gibt keinen zusätzlichen Probejob und keinen separaten manuellen POST. Bei Queue-/Vaultfehler wird die Pause zusammen mit einem sicheren Fehlercode gespeichert.
7. **Erfolg prüfen und denselben Job endgültig aktivieren:** Erst nach erfolgreichem Cron-History-Eintrag, zugeordneter tatsächlicher HTTP-200-Antwort, vollständigem Importergebnis und Daten-/UUID-/Duplikat-/Lease-Prüfung [14_goabase_activate_two_hour_cron.sql](../../supabase/ops/14_goabase_activate_two_hour_cron.sql) ausführen. Endzeitplan **`0 */2 * * *` in UTC**, aktiv; anschließend weiterlaufen lassen. GMT/UTC-Takt bedeutet derzeit 01, 03, 05 … Uhr deutscher Winterzeit, im Sommer entsprechend verschoben.
8. **Ersten regulären Lauf wirklich abwarten und prüfen.** Nächster gerader UTC-Stundenbeginn, je nach Freigabe bis knapp zwei Stunden später. Job-History, private Request-ID, tatsächliche pg_net-HTTP-Antwort samt vollständigem Importbericht sowie Eventzahl/Original-UUIDs/Duplikate/Lease prüfen. Kein künstlicher zusätzlicher Import, keine Änderung der Uhr zur Beschleunigung. Bericht/PROJECT_STATUS erst dann als „Automatik nachweislich erfolgreich“ kennzeichnen. Bis dahin ehrlich „aktiv, regulärer Lauf noch ausstehend“.

Diese eine Freigabe umfasst Einrichtung, einmaligen kontrollierten Scheduler-Aufruf, anschließende dauerhafte Aktivierung, Beobachtung des ersten regulären Laufs und gezieltes Pausieren genau dieses Jobs bei unerwarteten Fehlern. Für normale geplante Aufrufe danach keine erneute Freigabe pro Lauf erforderlich. Es werden keine bereits bestandenen allgemeinen Importer-/Abhängigkeits-/Frontendtests wiederholt.

## Fehlerbehandlung und Prüfmaßstab

- Vor jedem produktiven Schritt die feste Projekt-ID prüfen. Unerwarteter Fehler: sofort stoppen und den Job, falls bereits aktiviert, gezielt pausieren. Kein blindes Retry, kein DROP von Extensions oder bestehenden Daten.
- Cron-History „succeeded“ kann nur die erfolgreiche Einreihung bedeuten. **Erfolg erfordert zusätzlich die HTTP-Antwort zur gespeicherten Request-ID**, keinen Timeout/Netzwerkfehler, HTTP 200, plausibles vollständiges Importergebnis und intakte Daten. Keine Rohheader/Secret-Werte oder ungefilterten Fehlertexte protokollieren.
- Der Job kontrolliert vor dem nächsten Versand das vorherige HTTP-Ergebnis. Bei fehlender Antwort, Nicht-200 oder vorherigem Dispatchfehler pausiert er ohne neuen Import. pg_net hält Antworten standardmäßig sechs Stunden; nach langer Unterbrechung mit bereits abgelaufener Antwort wird ebenfalls angehalten und eine Prüfung nötig. Bei asynchronem HTTP-Fehler pausiert die laufende Abnahme sofort nach Beobachtung; außerhalb der Abnahme spätestens beim nächsten vorgesehenen Joblauf. Keine sofortigen automatischen Wiederholungen.
- Vault-Key bleibt Backend-only. Die bestehende Authentifizierung auth:secret/default und verify_jwt=false werden nicht verändert. Kein Deployment, keine Event-RLS-Änderung und keine neue Provider-API.

## Bereits lokal geprüft – echte Schedulerabnahme noch ausstehend

**Vier gezielte Tests bestanden, keine übersprungenen Tests**, ausschließlich isoliertes PGlite mit Scheduler-/HTTP-/Vault-Mocks; Expo-Lint und Typecheck erfolgreich:

1. Inaktive Einrichtung → Probe mit Selbstpause → Zuordnung Request-ID → Aktivierung → fehlende vorherige HTTP-Antwort blockiert weiteren Versand; Daten unverändert und Rechte gesperrt.
2. Falsches Vault-Projekt erzeugt keinen HTTP-Aufruf, pausiert und speichert nur SQLSTATE; reguläre Aktivierung gesperrt.
3. Vorhandener Job wird nicht überschrieben; HTTP 500 verhindert Aktivierung.
4. Gebundene Vault-Parameter akzeptieren nur das Produktionsziel, geben keine Werte zurück und überschreiben keine vorhandenen Namen.

Die SQL-Dateien laufen dabei unverändert, abgesehen von den beiden nativen CREATE-EXTENSION-Anweisungen, die PGlite nicht unterstützt. Die Mocks existieren nur in der flüchtigen lokalen Testdatenbank. **Native Extension-Installation, echtes pg_cron-Timing, echter pg_net-Versand und Vault-Integration werden erst nach Freigabe in Produktion abgenommen**; dazu keine unzutreffende Vorab-Erfolgsaussage. Tests: [goabase-automation.test.cjs](../../tests/goabase-automation.test.cjs).

Offizielle Grundlagen: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [pg_net und HTTP-Antworten](https://supabase.com/docs/guides/database/extensions/pg_net), [Vault](https://supabase.com/docs/guides/database/vault).

## Prüfsummen der vorbereiteten SQL-Dateien

Vor der späteren Ausführung erneut mit den freigegebenen Dateien vergleichen; geänderte Kandidaten nicht stillschweigend ausführen.

| Datei | SHA-256 |
| --- | --- |
| 11, lokal plattformkonform korrigiert; produktiv nicht wiederholen | 9c39ce96368116a5b8d383550b9e3bd8301a275b0cd1e83a63382423e7a2da95 |
| 11b | 8c4616c406bbe661e1087384caee012e7e66ed93ee92ad67d870cc3305b6b507 |
| 12 | cdb771b42ffddd1055026583f3d74fb9a745f25ab22ef8e1b8dbeaaf6f278971 |
| 13 | f626aded1b6141a90d8eedc92bdc15f3208fed82cb6d9c4ed623aeb2339ae1f0 |
| 14 | 22193732dc2aa2b308fbe29d4c6aeabc355ef9120027775cf094521dc293fbc9 |

## Zusammengefasste Freigabevorlage

> Ich gebe die oben beschriebenen Änderungen ausschließlich für yhnxdeypkbzyjappuzmv frei: pg_cron/pg_net, private Dispatch-Protokolltabelle und Backend-Berechtigungen, zwei geschützte Vault-Einträge, genau einen zunächst inaktiven Job, einmaligen kontrollierten Cron-Lauf mit Selbstpause und nach erfolgreicher Prüfung dauerhafte Aktivierung mit 0 */2 * * *. Prüfe auch den ersten regulären Lauf einschließlich tatsächlicher HTTP-Antwort und Datenintegrität. Bei unerwartetem Fehler stoppen und genau diesen Job pausieren. Keine App-/Function-Deployments, weiteren APIs oder sonstigen Event-/Schemaänderungen.

**Aktueller Stand: Cron nicht eingerichtet oder aktiv; automatische Synchronisierung noch nicht nachgewiesen.** Diese Datei dokumentiert die Vorbereitung und fragt die geforderte einzige Freigabe ab; sie erteilt sie nicht.
