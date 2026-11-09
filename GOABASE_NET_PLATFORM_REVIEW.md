# Spots: pg_net-Plan an offizielle Supabase-Vorgaben angepasst

Stand: **09.11.2026, 21:02 Europe/Berlin**. Produktion **yhnxdeypkbzyjappuzmv** ausschließlich lesend geprüft. Keine produktiven Berechtigungs-/Owner-/Triggeränderungen, keine Vault-Einträge, keine Jobs/Imports oder Deployments. App und produktive Function unverändert.

## Dokumentation und tatsächliche Rechte

Die [offizielle Supabase-KB](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16) bestätigt genau den beobachteten Fall:

- supabase_admin besitzt net-Schema und pg_net-Objekte.
- PUBLIC erhält standardmäßig Schema-USAGE sowie Tabellen-/Sequenzrechte. Explizites Schema-USAGE für Plattformrollen und häufig PUBLIC-EXECUTE auf Funktionen sind vorgesehen.
- postgres kann diese von supabase_admin vergebenen Rechte nicht individuell entziehen. Die Anweisung kann ohne SQL-Fehler enden, obwohl sie nichts bewirkt. Ein erzwungener Entzug kann zudem den pg_net-Worker und Cron-Aufrufe beeinträchtigen.

Aktueller Katalogbefund entspricht diesen Defaults: net gehört supabase_admin; beide Tabellen besitzen PUBLIC-Rechte. anon/authenticated/service_role können auf SQL-Ebene net verwenden, besitzen aber **kein direktes Login**. Die alte Nullrechte-Anforderung des Einrichtungs-Runners war daher für diese Plattform falsch und wurde lokal korrigiert.

## Data API tatsächlich geprüft

Die aktuelle Management-Konfiguration nennt ausschließlich **public, graphql_public** als exponierte Schemas. Zusätzlich wurde ein nicht schreibender Data-API-Aufruf mit dem bestehenden Publishable Key, Accept-Profile net und limit=0 ausgeführt: **HTTP 406 / PGRST106**. Kein Queue-Inhalt abgefragt oder zurückgegeben. net ist somit aktuell nicht über diesen Data-API-Zugang exponiert; die Schemafreigabe gilt serverseitig für die API-Rollen.

Die veröffentlichten Supabase-Standards schützen hier über die API-Grenze und die vertrauenswürdigen direkten DB-Logins, nicht über einen selektiven PUBLIC-Entzug.

## Direkte Login-Rollen

Gefunden wurden: authenticator, pgbouncer, postgres, supabase_admin, supabase_auth_admin, supabase_etl_admin, supabase_functions_admin, supabase_read_only_user, supabase_replication_admin, supabase_storage_admin sowie cli_login_postgres.

- Die ersten zehn sind bekannte Plattform-/Backend-/Administrationsrollen; keine zusätzliche benutzerdefinierte Loginrolle gefunden.
- cli_login_postgres hat eine bereits abgelaufene Gültigkeit (08.11.2026 17:51:26 UTC).
- anon, authenticated und service_role sind NOLOGIN.

**Keine unklassifizierte aktive Loginrolle gefunden.** Diese Katalogprüfung bestätigt Rolleneigenschaften, nicht, an wen administrativ DB-Passwörter weitergegeben wurden. Direkte DB-Zugänge bleiben für vertrauenswürdige Betreiber vorgesehen; zusätzliche Loginrollen erfordern erneute Bewertung, da PUBLIC-Rechte auch für sie gelten.

## Ausschließlich lokale Korrektur

In [11_goabase_automation_backend.sql](supabase/ops/11_goabase_automation_backend.sql) wurden **nur vier nicht unterstützte REVOKE-Anweisungen für net** entfernt. Keine Ersatz-GRANTs, keine Ownerwechsel und keine Plattform-Triggeränderung. Die Cron-Berechtigungseinschränkungen und die private Dispatch-Tabelle samt Index/RLS/Client-Sperren bleiben unverändert.

Neue lokale SHA-256 der Datei 11: `9c39ce96368116a5b8d383550b9e3bd8301a275b0cd1e83a63382423e7a2da95`. Der zuvor tatsächlich ausgeführte Stand hatte `4a42b3011a7b92c4710fffae041ee30d7e919a79f9860a6ecc5558680d20b02a`; sein Original bleibt im geschützten Ausführungsverzeichnis erhalten. **Datei 11 nicht erneut auf Produktion ausführen:** Extensions und Tabelle existieren bereits.

Der vorhandene [Einrichtungs-Runner](scripts/finish-goabase-automation.cjs) behandelt die dokumentierten net-Standardrechte nicht mehr als Abweichung. Stattdessen prüft er vor dem Abruf eines Schlüssels:

1. Private Tabelle/RLS und Cron-Zugriffsgrenzen weiterhin gesperrt.
2. Aktuelle Data-API-Schemas enthalten net nicht.
3. Clientrollen NOLOGIN; keine unklassifizierten aktiven Loginrollen.

Der heutige reine Prüfmodus bestätigt diese Grenzen und verändert keinen Einrichtungszustand. Der alte Fehler-/Einmalmarker bleibt erhalten und verhindert einen unkontrollierten Neustart. Eine Fortsetzung muss nach Freigabe gezielt ab dem bereits bestehenden Backend erfolgen, nicht durch erneutes Ausführen von setup/Datei 11.

Die vorhandenen SQL-Dateien **11b, 12, 13 und 14 sind unverändert**: gebundene Vault-Parameter, fester Produktions-URL-Guard, genau ein zunächst inaktiver Job, einmaliger Scheduler-Probelauf mit Selbstpause, danach Zwei-Stunden-Takt und echte HTTP-Abnahme. Keine zusätzliche Funktion entwickelt.

## Schlüssel, Daten und Git

- Heute kein Default Secret gelesen oder in Vault gespeichert. Keine Rohheader/Queue-Daten ausgegeben.
- Vault-Einrichtung bleibt über gebundene Parameter im Speicher vorgesehen. Kein Key wird in SQL-Literale, Dateien oder Prozessargumente geschrieben; Ausgaben enthalten nur sichere Metadaten/Anzahlen. Der Cron-Befehl liest Vault intern, statt einen Key im Jobtext abzulegen.
- .env.local, supabase/.temp und supabase/backups sind Git-ignoriert und nicht im aktuellen versionierten Dateibestand. Schlüsselmusterschau im versionierten Stand ohne echte Treffer; in den Vorbereitungsskripten zwei ausdrücklich ungültige Testschlüssel-Fixtures gefunden, keine produktiven Keys. Kein vollständiger historischer Git-Forensikscan behauptet.
- Vollständiger frischer Snapshotvergleich mit dem Ausgangsstand der gestoppten Einrichtung: **alle 35 Events/UUIDs, Importmetadaten, Lease und Event-Policies unverändert**. 0 Jobs, 0 Dispatches, keine vorgesehenen Vault-Namen; App-Umgebung per Hash unverändert, Lease frei.

Geschützter Nachweis: `supabase/backups/automation-2026-11-09T19-55-27-529Z/platform-review.json`; sichere Zusammenfassung unter `supabase/.temp/goabase-net-platform-review.json`. Management-Konfiguration nur als Schema-Allowlist ausgewertet; keine anderen möglicherweise sensiblen Konfigurationsfelder gespeichert/ausgegeben.

## Prüfung und Fortsetzung

Vier gezielte lokale Cron-Steuerungstests bestanden, diesmal mit **beibehaltenen PUBLIC-net-Standardrechten** und NOLOGIN-Clientrollen. Private Tabellen-/Cron-Sperren, Vault-Zielschutz, Selbstpause und HTTP-Fehlerbehandlung bleiben geprüft. Expo-Lint, fokussiertes Skript-/Test-Lint und App-Typecheck erfolgreich. Keine Wiederholung unabhängiger Importer-/Bundle-/Frontendtests. Native Scheduler-/Netzwerkabnahme weiterhin ausstehend.

**Der überarbeitete Plan entspricht unter den bestätigten API-/Login-Grenzen den dokumentierten Supabase-Vorgaben.** Die unterbrochene Einrichtung kann nach ausdrücklicher Fortsetzungsfreigabe ab der Plattformprüfung weitergehen: Vault → genau ein inaktiver Job → kontrollierter Scheduler-Lauf → tatsächliches HTTP-/Daten-Ergebnis → Zwei-Stunden-Aktivierung → erster regulärer Lauf. Kein neues Deployment und kein Wiederanlegen der vorhandenen Extensions/Tabelle nötig.

**Aktuell weiterhin kein Cron-Job angelegt oder aktiv.** Die automatische Synchronisierung wurde heute weder gestartet noch als funktionierend bestätigt.
