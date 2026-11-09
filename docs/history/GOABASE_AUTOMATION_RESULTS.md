> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: Automatisierungseinrichtung bei Berechtigungsabweichung gestoppt

**Neuer Zwischenstand nach Fortsetzungsfreigabe 09.11.2026:** Plattformgrenzen erneut bestätigt; SQL 11b ausgeführt, Vault-Einträge korrekt gespeichert. Falsche Prüfrollenwahl führte danach zu Stopp vor Jobanlage. Geschützter reiner SELECT unter postgres bestätigt inzwischen beide Werte, Prüfcode lokal korrigiert. **Weiterhin 0 Jobs/Dispatches und kein automatischer Import.** [Aktueller Bericht und Fortsetzungspunkt](GOABASE_VAULT_RESUME_RESULTS.md). Frühere Angaben „keine Vault-Einträge“ unten sind historisch.

**Lesende Aufklärung und lokale Plankorrektur 09.11.2026:** Die beobachteten Rechte sind dokumentierter Supabase-Standard, nicht durch postgres selektiv entziehbar. Aktuelle Data-API-Konfiguration und Probe schließen net aus; Clientrollen NOLOGIN, keine unklassifizierte aktive Loginrolle gefunden. Unwirksame net-REVOKEs nur lokal entfernt und Prüfmaßstab korrigiert. Keine produktiven Änderungen oder Fortsetzung ausgeführt. [Prüfbericht](../../GOABASE_NET_PLATFORM_REVIEW.md). Der nachfolgende ursprüngliche Stoppbericht bleibt als historischer Nachweis erhalten.

Stand: **09.11.2026**. Ziel ausschließlich **Spots. / yhnxdeypkbzyjappuzmv**. Einmalige Gesamtfreigabe für [den vorbereiteten Plan](GOABASE_AUTOMATION_APPROVAL.md) lag vor. **Automatik nicht aktiv und nicht als funktionierend nachgewiesen.**

## Tatsächlich ausgeführt

- Produktions-ID/Name über Management-API vor jeder Mutation geprüft; Function weiterhin ACTIVE/v3/verify_jwt=false mit dem abgenommenen Fingerprint bestätigt.
- Vorhandenes Backup gegen **alle 30 Manifestdateien** erfolgreich geprüft und frischen vollständigen Snapshot mit 35 Events/UUIDs sowie Importmetadaten/RLS gesichert.
- Exakt die freigegebene [SQL 11](../../supabase/ops/11_goabase_automation_backend.sql), SHA-256 `4a42b3011a7b92c4710fffae041ee30d7e919a79f9860a6ecc5558680d20b02a`, einmalig ausgeführt: **pg_cron und pg_net installiert**, private Tabelle spots_sync_private.goabase_cron_dispatches einschließlich Index/RLS angelegt.
- Danach erwartete effektive Rechte geprüft. Prüfung **fehlgeschlagen**: private Protokolltabelle für Clients gesperrt und Cron-Schema für Clients gesperrt, aber **net-Schema-USAGE und SELECT auf net.http_request_queue für anon/authenticated weiterhin true**. Sofort gestoppt, kein Retry und keine nachträgliche Rechte-/Owner-Korrektur.
- Vorsorglicher Pausebefehl gezielt für spots-import-goabase-2h hatte keine Jobzeile zu ändern: **cron.job enthält 0 Jobs**. Die private Dispatch-Tabelle ist leer.

## Lesender Befund zur Abweichung

Die gesicherten ACLs zeigen:

- net-Schema: Eigentümer/Grantor **supabase_admin**, PUBLIC-USAGE und explizites USAGE für anon/authenticated weiterhin vorhanden.
- Request-Queue: Eigentümer **supabase_admin**, PUBLIC-Grant `arwdDxtm` weiterhin vorhanden.
- Vorhandener Plattform-Trigger issue_pg_net_access ruft beim CREATE EXTENSION die bereits vorhandene Funktion extensions.grant_pg_net_access auf. Deren gelesene Definition vergibt unter anderem net-Schema-USAGE an anon/authenticated.

Die späteren freigegebenen REVOKE-Anweisungen haben diese effektiven Rechte nicht entfernt. Die Plattform-Eigentümer-/Grantor-Konstellation ist ein konkreter Unterschied zur lokalen Mock-Testumgebung; **die genauen administrativen Rechte und der unterstützte Korrekturweg müssen vor einer Fortsetzung geprüft werden**. Keine unbelegte Behauptung, dass nachträglich ein Trigger alle REVOKEs erneut überschrieben habe: der gefundene Trigger ist ausdrücklich auf CREATE EXTENSION beschränkt.

Das ist eine fehlgeschlagene Härtungsprüfung, kein Nachweis, dass ein Secret offengelegt wurde: Es wurde **noch kein Key in Vault angelegt und keine authentifizierte Anfrage in pg_net eingereiht**. Laut [offizieller Dokumentation](https://supabase.com/docs/guides/database/extensions/pg_net) sind solche Standardrechte nicht automatisch gleichbedeutend mit einer öffentlichen Data-API-Exposition. Trotzdem wurde die strengere freigegebene Bedingung nicht erfüllt und nicht stillschweigend abgeschwächt.

## Nicht ausgeführt

- SQL 11b: keine Vault-Einträge angelegt, kein Default Secret abgerufen oder übertragen.
- SQL 12: kein Cron-Job angelegt.
- SQL 13: kein kontrollierter Scheduler-/HTTP-Aufruf.
- SQL 14: keine Zwei-Stunden-Aktivierung.
- Kein manueller oder automatischer Import, kein Deployment, keine produktive Edge-/Frontend-/Event-RLS-Änderung.

## Datenprüfung nach dem Stopp

Erneut ausschließlich lesend die komplette Vergleichsmenge abgefragt:

- **Alle 35 vollständigen Events einschließlich UUIDs und created_at identisch.**
- Quellversionen, Entfernungs-/Quarantänemetadaten, Lease und Event-Policies ebenfalls identisch zum frischen Ausgangssnapshot.
- **0 Duplikate, Lease frei.**
- App-Umgebungsdatei per SHA-256 unverändert; produktive Function weiterhin unverändert.
- **0 Jobs, 0 Dispatches, weiterhin keine beiden vorgesehenen Vault-Namen.**

Geschützte, Git-ignorierte Belege: `supabase/backups/automation-2026-11-09T19-55-27-529Z/` mit result.json, before-setup.json, after-stop.json, backend-access.json und permission-diagnosis.json. [Einrichtungs-Runner](../../scripts/finish-goabase-automation.cjs), [Credential-Übergabe ausschließlich über stdin](../../scripts/finish-goabase-automation.ps1). Kein Token in Dateien/Argumenten/Ausgaben. Keine neuen unabhängigen Importertests durchgeführt.

## Fortsetzung

Zunächst lesend den unterstützten Rechte-Korrekturweg für die von supabase_admin verwalteten net-Objekte klären. Keine Owner-Wechsel, Plattform-Triggeränderungen, zusätzlichen privilegierten Funktionen oder gelockerten Abnahmekriterien ohne konkret geprüften und freigegebenen Umfang. Die Extensions/private Tabelle nicht blind löschen oder SQL 11 erneut ausführen.

Nach geklärter Berechtigung müsste die Einrichtung **ab der Rechteprüfung** kontrolliert fortgesetzt werden: Vault → ein inaktiver Job → echter Scheduler-Probelauf mit Selbstpause/HTTP-Prüfung → Aktivierung → erster regulärer Lauf. Die unerwartete Abweichung wurde entsprechend der Nutzeranweisung als Stopp behandelt; keine eigenständige Ersatzlösung produktiv umgesetzt.

**Eindeutiger Schlussstand: Cron-Job nicht angelegt, nicht aktiv; automatische Synchronisierung noch nicht nachgewiesen.**
