> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

﻿# Projektstatus

Stand: 09.11.2026

## Aktuell: Cron aktiv bestätigt, lokale Überwachung auf Nutzerwunsch beendet

- Nutzer hat die dauerhafte Überwachung ausdrücklich beendet und übernimmt die Kontrolle des ersten regulären Laufs selbst. Genau den lokalen Node-Prozess der scheduled-Überwachung beendet; **kein Job pausiert/reaktiviert, kein zusätzlicher Import**. Supabase läuft unabhängig von VS Code/Codex.
- Anschließende rein lesende Produktionsprüfung **09.11.2026 21:37 Europe/Berlin**, Projekt yhnxdeypkbzyjappuzmv: **genau ein Job ID 1 / spots-import-goabase-2h, active=true, schedule=0 */2 * * ***, Zeitzone GMT/UTC. Je ein vorhandener Vault-Name, unveränderte Function ACTIVE/v3. 35 Events, 0 Duplikate, Lease frei. Keine Remote-Mutationen.
- Kontrollierter echter Scheduler-/HTTP-Test bleibt erfolgreich (Request-ID 1/HTTP 200/Selbstpause), regulärer Job ist aktiviert. **Erster regulärer Termin 09.11.2026 23:00 Europe/Berlin / 22:00 UTC noch nicht durch Codex abgenommen**; nicht als bereits erfolgreich darstellen. Nutzer prüft Integrationen → Cron → Job → History; optional tatsächlichen HTTP-Status anhand privater Request-ID nachsehen. [Aktueller Abnahmebericht und lesende HTTP-Abfrage](../../GOABASE_CRON_ACCEPTANCE.md).

## Vorher: Cron aktiv, echter Probelauf bestanden – erster regulärer Lauf wird überwacht

- Nach neuer Freigabe ausschließlich **yhnxdeypkbzyjappuzmv / Spots.** ab Jobanlage fortgesetzt. Existierende Extensions/private Tabelle/Vault unverändert verwendet, keine Neuinstallation/net-ACL-/Key-/Edge-/Appänderung. Vorher 0 Jobs, API-/Rollen-/privaten Tabellenzugriff geprüft, frischen vollständigen Snapshot gesichert.
- Genau ein zunächst inaktiver Job **ID 1 / spots-import-goabase-2h** erstellt; postgres/Postgres-DB, vorbereiteten Befehl per Hash geprüft. Einrichtungsdaten/UUIDs unverändert. Kein zusätzlicher Job oder direkter POST.
- Kontrollierter echter Scheduler-Lauf **09.11.2026 21:19 Europe/Berlin**, Request-ID 1, **HTTP 200**, Cron-Historie succeeded und Selbstpause bestätigt. Run f6d59b32-5412-408b-9669-af45f4311762; **35 Events/UUIDs erhalten**, 0 Duplikate/Lease frei, 28 veröffentlicht. unchanged=34, removed_unchanged=1, skipped_unconfirmed=1, übrige Änderungszähler 0.
- Danach den einzigen Job auf **0 */2 * * * (UTC), aktiv** gestellt. **Erster regulärer Lauf 09.11.2026 23:00 Europe/Berlin / 22:00 UTC noch ausstehend**; Überwachung läuft, kein vorschneller regulärer Erfolgsnachweis. [Laufender Abnahmebericht](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Stopp-/Prüfrollenberichte unten historisch; aktueller Job ist aktiviert.

## Vorher: Vault-Fortsetzung erfolgreich gespeichert, Prüfung korrigiert – vor Jobanlage gestoppt

- Nach neuer Fortsetzungsfreigabe Produktions-ID **yhnxdeypkbzyjappuzmv / Spots.** sowie aktuelle API-/LOGIN-Grenzen und unveränderte ACTIVE/v3-Function bestätigt. Vorhandene Extensions/private Tabelle wiederverwendet, **keine Neuinstallation oder net-ACL-Änderung**. Frischer 35-Event-/UUID-Snapshot mit bisherigen Daten/Importmetadaten identisch.
- **SQL 11b einmalig mit gebundenen Parametern ausgeführt**, beide vorgesehenen Vault-Namen jetzt vorhanden. Nachfolgender Vergleich unter supabase_read_only_user scheiterte HTTP 400/SQLSTATE 42501 an _crypto_aead_det_decrypt; falsche Prüfrollenwahl im Skript. **Entsprechend Stopp-Anweisung vor SQL 12 angehalten**, kein Job/Import und keine Aktivierung. Kein Vault-Insert wiederholt.
- Ausschließlich lesende Aufklärung: SELECT unter berechtigter Rolle postgres bestätigt **values_match=true** für exakte Produktions-URL und bestehenden Default Secret (09.11.2026 21:13 Europe/Berlin). Nur Boolean/Rollenname zurückgegeben, keine Werte/Parameter gespeichert. Keine GRANT-/Owneränderung. Prüfrollenwahl ausschließlich lokal korrigiert; alter Fehler-/Einmalmarker bleibt bestehen.
- Neuer vollständiger Lesevergleich: **alle 35 Eventdaten/UUIDs, Quellversionen, Entfernungs-/Quarantänemetadaten, Lease und Event-RLS unverändert**. 0 Duplikate/freie Lease, 0 Jobs/Dispatches; App-Umgebung und produktive Function unverändert. [Tatsächlicher Fortsetzungs-/Fehlerbericht](GOABASE_VAULT_RESUME_RESULTS.md), Nachweise im bestehenden geschützten Ausführungsverzeichnis einschließlich vault-check.json.
- **Vault eingerichtet/geprüft; Cron nicht angelegt oder aktiv, Automatik nicht nachgewiesen.** Nächster Fortsetzungspunkt SQL 12 mit bestehenden geprüften Secrets, danach Probe/Selbstpause, Aktivierung und erster regulärer Lauf. SQL 11/11b nicht erneut ausführen; Resume nicht blind wiederholen. Keine unabhängigen Tests wiederholt.

## Vorher: pg_net-Plattformvorgaben geprüft, Plan lokal korrigiert – keine produktive Fortsetzung

- Die verlinkte offizielle Supabase-KB bestätigt supabase_admin-Eigentum und vorgesehene PUBLIC-net-Rechte; postgres kann diese nicht individuell entziehen. Heutiger lesender Befund **09.11.2026 21:02 Europe/Berlin**, Ziel yhnxdeypkbzyjappuzmv: vorhandene ACLs entsprechen diesen Defaults. Kein Owner-/Trigger-/Grant-Umbau.
- Tatsächliche Data-API-Schemas **public, graphql_public**; zusätzliche net-Probe mit bestehendem Publishable Key und limit=0 liefert **406/PGRST106**. anon/authenticated/service_role NOLOGIN. Nur bekannte Plattform-/Admin-LOGIN-Rollen plus abgelaufener cli_login_postgres; keine unklassifizierte aktive Loginrolle. Passwortweitergabe lässt sich aus Katalogdaten nicht beweisen; direkte DB-Zugänge bleiben vertrauenswürdigen Betreibern vorbehalten.
- Ausschließlich lokal vier nicht unterstützte net-REVOKEs aus SQL 11 entfernt. Cron-/private Rechte, Tabelle/RLS/Eventschutz unverändert. Neuer Datei-11-Hash `9c39ce96368116a5b8d383550b9e3bd8301a275b0cd1e83a63382423e7a2da95`; Originalausführung bleibt historisch belegt. **Datei 11 produktiv nicht wiederholen.** Vor Vault-Nutzung Prüfmaßstab im Runner auf API-/LOGIN-Grenzen korrigiert; bestehender Stopp-/Einmalmarker bleibt bestehen. SQL 11b/12/13/14 unverändert.
- Vier gezielte lokale Cron-Steuerungstests mit realistischen beibehaltenen PUBLIC-net-Rechten bestanden; Expo-Lint, fokussiertes Runner-/Test-Lint und App-Typecheck erfolgreich, keine unabhängigen Importertests wiederholt. Prüfung aktueller versionierter Dateien/Vorbereitungsskripte ohne produktive Secret-Key-Funde; .env.local/.temp/Backups nicht versioniert und ignoriert, gebundene Vault-Parameter bleiben vorgesehen. Keine neuen Funktionen/Deployments oder App-Änderungen.
- Neuer vollständiger Lesevergleich: alle **35 Eventdaten/UUIDs/Importmetadaten/Event-RLS unverändert**, Lease frei, 0 Jobs/Dispatches und keine vorgesehenen Vault-Namen. **Kein produktives SQL/keine Vault-Einträge/kein Cron/kein Import in diesem Schritt.** [Plattform-Prüfbericht und Fortsetzungsplan](../../GOABASE_NET_PLATFORM_REVIEW.md). Unter bestätigten API-/Login-Grenzen kann nach ausdrücklicher Fortsetzungsfreigabe ab bestehendem Backend/Vault fortgesetzt werden; Automatik weiterhin nicht aktiv/nicht nachgewiesen.

## Vorher: Gesamtfreigabe erhalten, Einrichtung bei pg_net-Rechteprüfung gestoppt

- Nach ausdrücklicher Gesamtfreigabe Produktions-ID **yhnxdeypkbzyjappuzmv / Spots.** vor produktiven Aktionen geprüft, unveränderte ACTIVE/v3-Function bestätigt. Backup gegen alle 30 Manifestdateien geprüft und frischen vollständigen 35-Event-/UUID-/Importmetadaten-Snapshot gesichert. [Freigegebener Umfang](GOABASE_AUTOMATION_APPROVAL.md).
- **SQL 11 genau einmal ausgeführt:** pg_cron/pg_net installiert und private goabase_cron_dispatches mit RLS/Index angelegt. Nachprüfung ergibt unerwartet weiterhin effektives net-USAGE/Queue-SELECT für anon/authenticated. Net-Schema/Queue gehören supabase_admin; gelesene ACLs und vorhandener CREATE-EXTENSION-Plattformtrigger erklären die Plattform-Abweichung gegenüber lokalen Mocks, unterstützter Rechte-Korrekturweg noch offen. Keine nicht freigegebene Owner-/Triggeränderung oder Abschwächung vorgenommen. **Sofort gestoppt, kein Retry.**
- **Keine Vault-Einträge und kein Cron-Job angelegt**, 0 Dispatches, kein kontrollierter/regulärer HTTP-Aufruf/Import, keine Aktivierung. Vorsorglicher Pausebefehl fand 0 Jobzeilen. SQL 11b/12/13/14 nicht ausgeführt. Kein Secret-Key abgerufen/ausgegeben; Management-Zugang ausschließlich im RAM.
- Rein lesende Prüfung nach dem Stopp: **alle 35 vollständigen Eventdaten/UUIDs sowie Quellversionen, Entfernungs-/Quarantänemetadaten, Lease und Event-RLS identisch**. 0 Duplikate/Lease frei, App-Umgebung unverändert und produktive Function unverändert. Geschützte/Git-ignorierte Belege unter `supabase/backups/automation-2026-11-09T19-55-27-529Z/`.
- [Tatsächlicher Ausführungs- und Fehlerbericht](GOABASE_AUTOMATION_RESULTS.md). **Cron nicht angelegt oder aktiv; Automatik noch nicht nachgewiesen.** Als Nächstes ausschließlich unterstützte Berechtigungskorrektur klären, danach gezielte Fortsetzung ab Rechteprüfung; nicht gesamte Einrichtung/alte Importertests wiederholen.

## Vorher: Zwei-Stunden-Cron vorbereitet, zusammengefasste Produktionsfreigabe ausstehend

- Gestern begonnene fünf Cron-Dateien gelesen und gezielt weitergeführt; keine Wiederholung bestandener Importer-/Dependencytests. Neuer rein lesender Check **09.11.2026 20:45 Europe/Berlin** bestätigt Produktion **yhnxdeypkbzyjappuzmv / Spots.**, unveränderte ACTIVE/v3/verify_jwt=false, 35 Events/28 veröffentlicht, 0 Duplikate/freie Lease. pg_cron 1.6.4 und pg_net 0.20.4 verfügbar, nicht installiert, cron.job fehlt; Vault 0.3.1 vorhanden, beide geplanten Namen fehlen. Anon/authenticated ohne Vault-Leserechte. Keine produktive Mutation/Function-Aufrufe.
- Lokale Kandidaten 11 (Extensions/private Dispatch-Tabelle/Rechte), 11b (gebundene Vault-Parameter, keine Secret-Literale), 12 (genau ein inaktiver Job), 13 (echter einmaliger Scheduler-Probelauf mit Selbstpause) und 14 (danach 0 */2 * * * aktivieren) vorbereitet. Keine eigene neue Datenbank-/Edge Function oder Provider-API. Private Protokolltabelle enthält ausschließlich Request-/Job-ID, Phase, Zeitpunkt und Fehlercode, keine Secrets oder Events. Vor jeder Remote-Aktion erneut feste Produktions-ID prüfen.
- **Vier gezielte lokale SQL-Steuerungstests bestanden, 0 übersprungen**: Probelauf/Selbstpause und Ergebniszuordnung, HTTP-/Vaultfehler blockieren Versand/Aktivierung, bestehende Jobs werden nicht überschrieben, gebundene Vault-Parameter/Zielschutz, Daten-/Zugriffsrechte geprüft. Expo-Lint und App-Typecheck erfolgreich (Windows-Aufruf über npx.cmd, keine Änderung der PowerShell-Ausführungsrichtlinie). Native Extensions und echtes Scheduler-/Netzwerkverhalten ausdrücklich noch nicht produktiv getestet. [Tests](../../tests/goabase-automation.test.cjs).
- Konkrete vollständige Änderungen, Grenzen, Prüfablauf einschließlich erstem regulärem Lauf und **eine zusammengefasste Freigabevorlage**: [GOABASE_AUTOMATION_APPROVAL.md](GOABASE_AUTOMATION_APPROVAL.md). Nutzerfreigabe noch ausstehend. **Cron nicht aktiv/nicht eingerichtet; Automatik noch nicht nachgewiesen.** Kein SQL-Kandidat auf Produktion ausgeführt, keine Vault-Einträge/Jobs erstellt, App unverändert.

## Aktuell: kontrollierter Produktions-v3-Import vollständig erfolgreich

- Nach ausdrücklicher Freigabe Produktions-ID **yhnxdeypkbzyjappuzmv / Spots.**, ACTIVE/v3/verify_jwt=false und abgenommenen Artefaktstand unmittelbar vor POST geprüft. Vorhandenes Restore-geprüftes Backup weiterhin vorhanden, alle 30 Manifestdateien verifiziert. Frische vollständige Sicherung der bisherigen 31 Eventdaten/UUIDs/Quell-IDs mit Backup identisch, Lease frei. Kein Deployment/zusätzliches SQL/Policyänderung/Cron.
- **Genau ein POST, HTTP 200**, Abschluss **08.11.2026 18:38:12 UTC**, Run d7f91507-e30f-4b97-ba77-ba0ff57e54e3. discovered=29, checked=36, inserted=4, updated=30, unchanged=0, removed=1, skipped_unconfirmed=1; übrige Änderungs-/Absage-/Verschiebungs-/Rejectzähler 0. Neue Quell-IDs 118641/118655/118637/118646. **31 → 35 echte Events**, alle 31 bisherigen UUIDs/created_at erhalten, keine fehlenden Originale/keine Duplikate.
- 30 vorhandene Events regulär aktualisiert (insbesondere bestätigte Original-URLs, drei Bilder); 118240 gezielt source_removed/unveröffentlicht, alle übrigen Daten/UUID erhalten. Zusätzlich sechs abgelaufene scheduled-Events ausgeblendet; insgesamt sieben bisher veröffentlichte Events jetzt unsichtbar. 118652/Moved sicher übersprungen, nicht als scheduled angelegt. Endbestand **34 scheduled/1 source_removed, 28 veröffentlicht/7 ausgeblendet, alle 35 mit gültigem GPS**, keine Datenvalidierungsfehler.
- **Lease frei**, 34 echte Quellversionen/1 Entfernungsmetadatensatz/0 Quarantänemetadaten. Entferntes Legacy-Event ohne erfundene Quellversion: 34 Versionszeilen bei 35 Events korrekt. App-Publishable-Zugriff mit echter Projektion erfolgreich: veröffentlicht **28**, Explore **28**, Live **0**, jeweils HTTP 200 und identisch zum Datenbanksnapshot. Event-RLS/App-Umgebung/Frontend unverändert, CLI bleibt Test; keine Schlüssel ausgegeben.
- **Expo-Lint/App-Typecheck erfolgreich**, keine unnötige Wiederholung unabhängiger Tests. Vollständige Antwort/UUID-/Feld-/Veröffentlichungs-/App-Lesekontrollen: [Produktiver Importbericht](PRODUCTION_V3_IMPORT_RESULTS.md), geschützt/Git-ignoriert unter `supabase/backups/production-v3-import-2026-11-08T18-38-01-792Z/`. Einmalmarker gesetzt, keinen zweiten POST ausführen.
- **Zwei-Stunden-Automatik kann jetzt als nächster separat freizugebender Schritt eingerichtet werden.** Rein lesend aktuell: kein pg_cron/cron.job, kein pg_net; Vault vorhanden, benötigte Vault-Namen fehlen. Noch keine Extensions/Vault-Einträge/Jobs angelegt oder aktiviert. Gezielte Vorbereitung eines einzigen inaktiven Jobs 0 */2 * * * mit geschütztem Vault-Key und festem Produktionsziel, danach eigene Aktivierungsfreigabe und Überwachung der tatsächlichen HTTP-Ergebnisse. Kein erneutes Deployment nötig.

## Vorher: Produktionsartefakt identisch in Spots-Test geprüft – Dependency-Abnahme bestanden

- Vollständigen Produktions-v3-Body erneut lesend bestätigt und eingefroren: **13 konkrete Pakete/807 Bundle-Einträge**, einschließlich jose **6.2.16** und ursprünglicher Deno-Konfiguration. [Release-Manifest](../../supabase/functions/import-goabase/production-v3.release.json) mit vollständigem Paketgraph/Modulhashes/Toolchain. [Offline-Packager](../../scripts/build-goabase-production-v3.cjs) verpackt das hashfixierte kompilierte ESZIP reproduzierbar ohne Paketauflösung; kein neuer TypeScript-Quellbuild behauptet, historische deno.lock unverändert und nicht als Remote-Lockgarantie genutzt.
- Nur Test verändert: erster Artefakt-Upload HTTP 500 mit falschem Content-Type; lesend Test-v3 unverändert bestätigt. Anfrage entsprechend offiziellem Vertrag auf application/vnd.denoland.eszip mit Metadaten korrigiert; danach HTTP 200, **Test ACTIVE/v4/verify_jwt=false**. Tatsächlich heruntergeladenes Test-Bundle **vollständig bytegleich mit Produktion ACTIVE/v3**, Raw-SHA-256 `e160bae41b3fb10e614339720ce2606b67e8d8d9f078ee0a9102d6f153396743`. Produktionsmetadaten/Body unverändert. Auth-Konfiguration secret/default, Importmap und eingebettete Deno-Konfiguration gleich.
- Jetzt unterschiedliche komprimierte Fingerprints (Produktion `54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8`, Test `e2c83d155896bd84d9311e24e5be486d6330d6e84996a22f8251a6c1d48962ad`) sind bei nachgewiesener vollständiger Raw-Bytegleichheit lediglich unterschiedliche Verpackung. Die frühere echte jose-Abweichung ist durch dieses Test-Artefakt beseitigt; Produktion nicht erneut deployt.
- Auth-GETs auf Test-v4 **401/401/401/405**, Bestand unverändert. Danach **genau ein POST HTTP 200**, Abschluss 08.11.2026 18:30:09 UTC: discovered=29, checked=36, unchanged=34, removed_unchanged=1, skipped_unconfirmed=1, übrige Zähler 0. **35 → 35**, alle vollständigen Eventdaten/UUIDs und Quellversionen/Entfernungsmetadaten identisch, 28 veröffentlicht/7 ausgeblendet, 0 Duplikate, Lease frei. 118240 bleibt source_removed, 118652/Moved übersprungen. Keine Fixtures oder Datenmanipulation, kein zweiter Import.
- Expo-Lint/App-Typecheck und lokale Audit-/Build-Prüfung erfolgreich; keine Wiederholung unabhängiger Integrationssuiten. Keine Produktionsschreiboperation/Produktions-Function-Aufrufe/Cron, keine Expo-/Frontend-/Umgebungsänderung, keine Schlüssel ausgegeben. [Abschlussbericht und nächste konkrete Produktions-POST-Freigabe](GOABASE_FROZEN_RELEASE_RESULTS.md). Die bereits produktive Version 3 ist für die hier untersuchte Dependency-Abweichung ausreichend in Test abgedeckt; erneutes Produktionsdeployment unnötig. Produktiver POST bleibt ausdrücklich freigabepflichtig.

## Vorher: Bundle-Ursache belegt – tatsächlicher jose-Versions-/Codeunterschied

- Ausschließlich lesende Management-API-GETs für Projektidentität, Function-Metadaten und tatsächliche Bodies beider Projekte; danach lokale statische Analyse, keine Ausführung von Bundle-Code. **Beide ACTIVE/v3/verify_jwt=false/import_map=true, gleicher eigener Importer-Code und auth:secret-Konfiguration.**
- Beide ESZIP2.3-Bundles mit 807 Einträgen vollständig gelesen, Modulmanifeste/Hashes verglichen: 800 Einträge identisch, sieben Payloads abweichend (Runtime-Metadaten, jose-package.json, fünf jose-JS-Dateien) plus npm-Auflösungstabelle. **Test jose 6.2.15, Produktion jose 6.2.16**; Änderungen unter anderem bei Kryptografie-Optionsvalidierung/JWS-Fehlerbehandlung. Keine harmlose reine Hash-/Verpackungsabweichung; vollständige ausführbare Gleichheit widerlegt.
- Tatsächlich eingebettetes @supabase/server 1.9.2 erlaubt jose ^6.2.0. Beide Deployments nutzten API-Build; lokale deno.lock mit 6.2.15 garantiert dessen Auflösung nicht (auch Peer-SDK remote 2.119.0 vs Lockfile 2.118.0). Direkter eigener Quellcode identisch reicht deshalb nicht. Ursache der Dependency-Drift belegt; historischer Registry-/Cacheauslöser nicht behauptet. Auth-Konfiguration identisch, keine vollständige Sicherheitsäquivalenz unterschiedlicher Kryptografie-Codefassungen behauptet.
- Raw-ESZIP-SHA-256 separat von Management-ezbr-Fingerprint dokumentiert. Original komprimierte Containerparameter nicht exponiert; lokale Brotli-Rekompression reproduziert Fingerprints nicht, diese Grenze offen benannt. Direkter unkomprimierter Codevergleich liefert den entscheidenden Nachweis.
- **Keine Deployments/Function-Aufrufe/Imports/DB-Zugriffe oder Änderungen/Cron**, Frontend und App-Umgebung unverändert, keine Secret Keys ausgegeben. Expo-Lint und App-Typecheck erfolgreich, keine Editor-Diagnosen; keine Wiederholung der funktionalen Integrationstests. [Vollständiger Befund und notwendiger nächster Schritt](GOABASE_BUNDLE_ANALYSIS.md); geschützte Git-ignorierte Rohartefakte unter `supabase/backups/bundle-inspection-2026-11-08T18-11-14-982Z/`. Produktiver Import bleibt ausstehend: zuerst denselben vollständigen Abhängigkeits-/Artefaktstand reproduzierbar festlegen und gezielt in Test abnehmen. Keine Freigabe als „identisch bestätigt“ vorbereiten.

## Vorher: Function v3 produktiv ACTIVE, Bundle-Hash abweichend – Abnahme gestoppt

- Nach eigener Freigabe explizites Produktionsziel **yhnxdeypkbzyjappuzmv / Spots.** unmittelbar bestätigt. Erfolgreichen Test-v3-Nachweis, lokale vier Kandidatdateien/Hashes sowie heruntergeladene Testquellen geprüft. Genau ein Deployment ausschließlich von import-goabase, keine SQL-Änderung oder Function-Aufrufe.
- Produktiv danach **ACTIVE/Version 3/verify_jwt=false**, auth:secret unverändert; heruntergeladene index.ts/sync.ts/deno.json entsprechen der getesteten Fassung. **Server-Bundle unterscheidet sich:** Test `ef6e9148dd99db9c1a372b4d5e6531e6208ea84de826b0391c6e3d6b2249ff6a`, Produktion `54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8`. Abschlussprüfung deshalb fehlgeschlagen und sofort gestoppt; Ursache ungeklärt, kein Retry/Rollback/Import.
- Alle **31 vollständigen Eventzeilen/UUIDs**, Lease, 0 Quellversionen, leere Entfernungs-/Quarantänemetadaten und Event-Policies vor/nach identisch. Andere produktive Functions und Test unverändert. Kein POST/GET-Function-Test/Cron, Frontend und App-Umgebungsdatei unverändert, CLI weiter Test. Keine Schlüssel ausgegeben.
- [Deploymentbericht mit Hashes und Prüfgrenzen](PRODUCTION_V3_DEPLOYMENT.md), geschützte/Git-ignorierte Belege unter `supabase/backups/production-function-v3-deploy-2026-11-08T18-05-59-675Z/`. Nächster Schritt: **rein lesende Bundle-/Build-Diagnose**, vor weiterem Deployment oder Function-Aufruf erst Abweichung klären. Produktionsabnahme ausdrücklich noch nicht vollständig erfolgreich.

## Vorher: SQL 09 und 10 produktiv erfolgreich eingerichtet und geprüft

- Nach ausdrücklicher Freigabe ausschließlich **Spots. / yhnxdeypkbzyjappuzmv**: vor jeder Ausführung Projekt-ID/Name und beide eingefrorenen SQL-Prüfsummen bestätigt. Backup weiterhin vorhanden, alle 30 Manifestdateien geprüft. Zuerst 09 einmalig ausgeführt und vollständig geprüft, danach 10 einmalig ausgeführt und geprüft. Zeitraum **08.11.2026 18:01:18–18:01:54 UTC**. Kein Fehler und keine unerwartete Abweichung.
- Nach **jedem** Schritt alle **31 vollständigen Eventzeilen einschließlich UUIDs/created_at identisch** zum unmittelbar vorherigen Zustand und frischen Backup. Eventspalten/Defaults/Indizes/Constraints/RLS/Grants unverändert. Keine Eventdaten geschrieben/gelöscht. Text-Statusfeld und Constraints unterstützen source_removed/source_unconfirmed; neue Apply-Definitionen enthalten gezielte Status-/Unpublish-Behandlung. Keine Testzeilen/Statusänderungen in Produktion erzeugt.
- Endzustand **vier private RLS-Tabellen, fünf öffentliche Backend-RPCs, zwei private Core-Funktionen**. Eigentümer postgres, SECURITY DEFINER/leerer search_path, kein PUBLIC-/anon-/authenticated-EXECUTE, service_role nur öffentliche RPCs, keine direkten privaten Core-/Tabellenrechte. Clients ohne Schema-USAGE/CREATE. Verschobene Core-Funktionskörper jeweils unverändert bestätigt. **0 Duplikate, Lease frei, 0 Quellversionen**, Entfernungs-/Quarantänemetadaten leer.
- Edge-Functions vor/nach beiden Schritten unverändert: produktive import-goabase weiterhin **ACTIVE/Version 2/verify_jwt=false** mit bisherigem Bundle. Kein Deployment/Function-Aufruf/POST/Cron, keine RLS-Härtung. App-Umgebungsdatei per SHA-256 unverändert, CLI bleibt Test. Ablauf/Nachweise: [SQL-Ausführungsbericht](PRODUCTION_09_10_APPROVAL.md), [einmaliger Runner](../../scripts/apply-goabase-production-09-10.cjs), geschützt/Git-ignoriert unter `supabase/backups/production-backend-09-10-2026-11-08T18-01-17-976Z/`.
- Neuer Runner syntaktisch geprüft, keine Editor-Diagnosen; Expo-Lint und App-Typecheck erfolgreich. Bereits bestandene Import-/Integrationstests nicht wiederholt.
- Als Nächstes separat freigeben: ausschließlich den in Spots-Test erfolgreich geprüften Importer bereitstellen, danach gezielte GET-Tests; produktiver POST und Cron weiterhin getrennte Freigaben. Die vorhandene flagbasierte Event-RLS bleibt unverändert; zusätzliche Statusprüfung wäre eigener Schritt.

## Vorher: Produktionsbackup aktualisiert, Wiederherstellung und SQL 09/10 lokal geprüft

- Ausschließlich lesend Produktion **yhnxdeypkbzyjappuzmv / Spots.**: frisches vollständiges logisches PG17.11-Backup ohne Schemaausschlüsse und aktuelle Function **ACTIVE/v2/verify_jwt=false/auth:secret** samt Quellen/Deno-Konfiguration/Lockdatei/Function-Konfiguration gesichert. Geschütztes Git-ignoriertes Verzeichnis `supabase/backups/production-backup-2026-11-08T17-46-21-621Z/`, Archiv-SHA-256 `50a9c3f3b19453652a793174a5165451bf2f21e0460ca62e14d977f0ad15da0c`, 30 Dateien per Manifest geprüft; vorheriges Backup erhalten.
- Archiv vollständig dekodiert (43 Tabellen-Datenabschnitte); public und spots_sync_private isoliert tatsächlich wiederhergestellt. **Alle 31 vollständigen Events einschließlich UUIDs unverändert/wiederhergestellt**. Exakt SQL 09 und danach 10 ausschließlich lokal als postgres angewendet: erfolgreich, Eventdaten nach jedem Schritt identisch, vier private RLS-Tabellen/fünf öffentliche Backend-RPCs/zwei private Core-Funktionen mit erwarteten Rechten. Lokale Schemaauswahl-/Vergleichs-/Rollenanpassungen und Plattformrestore-Grenzen transparent im [Backupbericht](../../PRODUCTION_BACKUP.md); lokale Server beendet. Vollständiger Supabase-Plattformrestore nicht geprüft, keine externe Backupkopie.
- RLS auf Produktionsrestore geprüft: source_removed/source_unconfirmed bei is_published=false unsichtbar; bei irrtümlichem true sichtbar, da bestehende Policy nur Flag prüft. Korrigierter Importer setzt false. Zusätzliche Statusprüfung wäre separate freizugebende Policyänderung; nicht Teil 09/10.
- Abschließender lesender Produktionsvergleich **08.11.2026 17:55:41 UTC**: alle 31 vollständigen Eventzeilen/UUIDs und Sicherheits-/Backenddaten unverändert, Lease frei, 0 Quellversionen, produktive Function unverändert. Keine produktive SQL-Erweiterung/Policyänderung, kein Deployment/Function-Aufruf/POST/Cron; App-Umgebungsdatei unverändert, CLI bleibt Test. Keine Schlüssel ausgegeben.
- Expo-Lint/App-Typecheck erfolgreich; bisherige Integrationssuite nicht wiederholt. Konkreter Umfang, Reihenfolge, Hashes, Befehle und Freigabevorlage für **SQL 09 und 10**: [PRODUCTION_09_10_APPROVAL.md](PRODUCTION_09_10_APPROVAL.md). Erst nach neuer ausdrücklicher Freigabe ausführen; spätere Deployment-/GET-/POST-Schritte separat.

## Vorher: Moved-/Redirect-Korrektur in Spots-Test erfolgreich geprüft

- Nach ausdrücklicher Freigabe ausschließlich **nfomkdvotqtlyymomksb**, Projekt-ID vor jedem Schritt geprüft: Backend 10 erfolgreich eingerichtet, alle 34 vollständigen Events/UUIDs dabei unverändert. Vier private RLS-Tabellen, fünf Backend-RPCs/zwei private Core-Funktionen und Berechtigungen geprüft; source_unconfirmed durch bestehendes text-Statusfeld ohne einschränkenden CHECK unterstützt.
- Ausschließlich import-goabase **ACTIVE/Version 3/verify_jwt=false**, auth:secret erhalten; heruntergeladener Quellcode identisch zum geprüften Kandidaten. Bundle-SHA-256 `ef6e9148dd99db9c1a372b4d5e6531e6208ea84de826b0391c6e3d6b2249ff6a`.
- **Genau ein POST, HTTP 200**, Abschluss 08.11.2026 17:36:45 UTC: discovered=29, checked=36, inserted=1, updated=7, unchanged=26, removed=1, skipped_unconfirmed=1; keine Absagen/Verschiebungen oder abgelehnten Versionen. **34 → 35 Events, 28 veröffentlicht/7 ausgeblendet**, alle 34 bisherigen UUIDs/created_at erhalten, keine Duplikate, Lease frei.
- ID **118240** korrekt source_removed/unveröffentlicht, sämtliche übrigen Daten/UUID erhalten. **118652/Moved** als vorher unbekannte ID sicher übersprungen; andere gültige Events weiterverarbeitet. Bestehende unbekannte Events werden lokal getestet quarantänisiert; dieser reale Lauf hatte keine solche bestehende ID. Kein zweiter POST. Keine Produktions-/App-/Umgebungs-/Cron-Änderung, keine Schlüssel ausgegeben.
- Neuer Runner-Syntaxcheck, Expo-Lint und App-Typecheck erfolgreich. Kandidat unverändert gegenüber bereits bestandenen 63 lokalen Tests und Deno-Typecheck; Suite nicht unnötig wiederholt. Vollständige tatsächliche Antwortzähler, Belege, Grenzen und konkreter Produktionsplan: [GOABASE_STATUS_TEST_RESULTS.md](GOABASE_STATUS_TEST_RESULTS.md). Produktiv fehlen weiterhin Backend 09+10 und korrigiertes Deployment; separate Freigaben erforderlich.

## Vorher: Moved als Auslöser gefunden; sichere Statusquarantäne lokal implementiert

- Ausschließlich Goabase-GETs: **ID 118652, „PSYNIGHT VI – ESCAPE TO NOWHERE“** liefert in Liste und Detail HTTP 200/gültiges JSON und vorhandenen String **`nameStatus: "Moved"`**. Offizielle direkt gelesene OpenAPI 1.1.1 nennt nur Scheduled/Cancelled/Postponed; nameStatus nicht Pflichtfeld. Kein fehlender Wert/keine bloße Schreibvariante, sondern undokumentierter Zusatzwert. 29 Feed-Einträge/36 verschiedene Details aus Feed plus Testbestand geprüft; genau ein solcher Status, zusätzlich bekannte gelöschte ID 118240 mit 301. Keine Supabase-Schreiboperationen/Function-Aufrufe in dieser Untersuchung.
- Lokal nur dieses Problem behandelt: unbekannte/missing Status getrennt von normalen Events und Quell-Entfernungen; keine Interpretation als scheduled/Absage. Neue ungeklärte IDs werden nicht angelegt, bestehende als **source_unconfirmed/unveröffentlicht** unter Erhalt aller anderen Daten/UUIDs gehalten. Kontrollierte Gründe moved/missing/unrecognized statt Rohwerten. Andere gültige Events laufen weiter. Identitäts-/Titel-/Zeit-/Quellversions-/Linkfehler, ungültige Datentypen und Netzwerk-/JSON-Fehler bleiben Batchfehler.
- Neuer lokaler SQL-Kandidat [10_goabase_unconfirmed_status.sql](../../supabase/ops/10_goabase_unconfirmed_status.sql), SHA-256 `380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a`: private Quarantänemetadaten, atomarer Apply-v3, vorhandener v2-Code privat weiterverwendet und kompatible alte Zugänge ebenfalls gesichert. Gleiche Lease, Duplikatschutz, keine Teilübernahme. Echte Quellzeitstempel als monotoner Wasserstand, keine erfundenen Versionen. Alte/gleiche Versionen können nicht wiederveröffentlichen, bestätigte Entfernung hat Vorrang.
- **Alle 63 lokalen Tests bestanden, 0 Fehler/0 übersprungen**, inklusive kompletter bisheriger Suite, Moved/missing/unbekannt/Schreibvarianten, valide Events trotz unbekanntem Nachbarn, echte SQL-Quarantäne mit UUID-/Datenerhalt, Wiederholungen, Legacy-RPC-Schutz, neu beobachteter unbekannter Version, atomarem Rollback und Rechten. **Expo-Lint, App-Typecheck, Deno-Typecheck mit eingefrorener Lockdatei erfolgreich.** Keine neuen Abhängigkeiten oder App-/Design-/Navigationsänderung.
- **Nicht deployt, keine entfernte SQL-Änderung und kein weiterer POST.** Spots-Test weiterhin letztes bereitgestelltes, bei Moved abbrechendes Bundle; Produktion unverändert, kein Cron. Vor Backend 10/Deployment/neuem Einmalimport ausschließlich in Test braucht es eine neue konkrete Freigabe. Belege, Grenzen und vorbereitete Schritte: [GOABASE_STATUS_ANALYSIS.md](GOABASE_STATUS_ANALYSIS.md).

## Vorher: Spots-Test SQL/Deployment erfolgreich; ein POST mit unknown_source_status abgebrochen

- Nach ausdrücklicher Freigabe drei Schritte ausschließlich in **spots. testproject / nfomkdvotqtlyymomksb**, Projekt-ID vor jedem Schritt geprüft. Zeitraum **08.11.2026 17:14:37–17:16:01 UTC**. Keine Produktionsänderung, keine App-/`.env.local`-/Cron-Änderung.
- **Schritt 1 erfolgreich:** geprüfte SQL-Erweiterung 09 mit SHA-256 `c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318` einmalig eingespielt. Alle 34 Eventzeilen/UUIDs, Quellversionsdaten, Lease und Event-Sicherheitsregeln vor/nach identisch. Drei private RLS-Tabellen, vier öffentliche Backend-RPCs und private Core-Funktion/Rechte geprüft; Core-Codekörper identisch zum alten Apply. PUBLIC/Clients gesperrt, service_role keine direkten Core-/Tabellenrechte.
- **Schritt 2 erfolgreich:** ausschließlich korrigierte `import-goabase` in Test bereitgestellt, **ACTIVE/Version 2/verify_jwt=false**, auth:secret unverändert. Tatsächlich bereitgestellte Fassung gegen Kandidat geprüft. Bundle `b33a70db4ab9b343a38535d33f4dc97a9dd1f4c82a13c490adcbcbcc4f4d3475`. Vor/nach Deployment alle Testdaten identisch.
- **Schritt 3 fehlgeschlagen:** genau ein POST lieferte **HTTP 502 `{"error":"unknown_source_status"}`**. Sofort keine weiteren entfernten Schritte; kein Retry/zweiter POST, keine Korrektur-/Rollback-Deployments oder SQL. Dieser Fehler kommt aus dem Detailmapper, der nur scheduled/cancelled/postponed akzeptiert; konkreter Quellwert/ID aus der Antwort nicht erkennbar. Kein unbekannter Status ungefragt als Absage/Entfernung interpretiert.
- Fehlerpfad-Snapshots rein lesend gesichert und danach lokal verglichen: **34 → 34**, alle ursprünglichen UUIDs, `created_at` und sämtliche Eventfelder unverändert, 0 Duplikate/fehlende Events, alle 34 Quellversionsdaten/Payloads unverändert. Lease frei und unverändert, 0 Entfernungsmetadaten, keine source_removed-Events. Somit keine Teilübernahme, aber auch keine erfolgreiche Live-Abnahme der Quell-Entfernung oder übrigen Events. Keine Importer-Erfolgszähler zurückgegeben. `.env.local` per SHA-256 identisch, CLI weiter Test.
- Nachweise unter `supabase/backups/test-source-removals-2026-11-08T17-14-37-627Z/` geschützt/Git-ignoriert, Ablauf durch [test-goabase-removals-remote.cjs](../../scripts/test-goabase-removals-remote.cjs) pro Schritt einmalig markiert. Runner-Syntax, Expo-Lint und App-Typecheck erfolgreich. **Noch nicht für Produktionsübernahme empfehlen.** Zunächst gezielte Lese-Diagnose des unbekannten Quellstatus, dann lokal geprüfte Behandlung und erneute ausdrückliche Freigabe vor neuem Deployment/POST. Vollständiger Bericht: [GOABASE_REMOVALS_TEST_RESULTS.md](GOABASE_REMOVALS_TEST_RESULTS.md).

## Vorher: Quell-Entfernungen lokal behoben und getestet; Spots-Test-Freigabe vorbereitet

- Ausschließlich lokal implementiert: sichere same-origin HTTPS-Detailredirects auf exakt `/party/deleted/{angefragte ID}` erkennen, nicht verfolgen, getrennt von normalen Zeilen verarbeiten. Andere gültige Events können weiterverarbeitet werden. Falsche Ziele/IDs, Feed-Redirects, 404, Netzwerk-/JSON-Fehler bleiben atomare Batchfehler; keine pauschale Löschung aus fehlenden Feedtreffern.
- Bestehende entfernte Events erhalten **`status='source_removed'`, `is_published=false`**; UUID, `created_at` und alle übrigen gespeicherten Felder unverändert. Unbekannte entfernte IDs werden nicht angelegt. Keine falsche Absage, kein erfundenes `dateModified`. Private Beobachtungsmetadaten und atomarer Apply-v2 im SQL-Kandidaten [09_goabase_source_removals.sql](../../supabase/ops/09_goabase_source_removals.sql), SHA-256 `c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318`.
- Bisheriger Versions-/Upsert-Code unverändert als private Core-Funktion weiterverwendet; alter öffentlicher Apply-Zugang wird kompatibler Wrapper und berücksichtigt ebenfalls Entfernungssperren. Kein direkter Core-/Tabellenzugriff für Clients/service_role, nur Backend-RPCs. Duplikatschutz und Lease-Fencing bleiben erhalten. Wiederveröffentlichung nur mit gültiger Quellversion nach Beobachtung und letzter bestätigter Version; bei unverändertem Zeitstempel konservativ gesperrt. Neue Zähler `removed`, `removed_unchanged`, `removed_unknown`; bestätigte Absagen bleiben getrennt.
- **Alle 52 Tests bestanden, 0 Fehler/0 übersprungen**, einschließlich echter SQL-Dateien in isoliertem PGlite, wiederholter Installation und komplettem Handler-/Quellen-/SQL-Fixture zweimal, Daten-/UUID-/Versionsschutz, falschen Redirects, Rollback, unbekannten/Legacy-IDs, abgelaufener Lease und Rechten. Anfangs Date/String-Testvergleich korrigiert, abschließender vollständiger Lauf erfolgreich. **Expo-Lint, App-Typecheck und Deno-Typecheck mit eingefrorener Lockdatei erfolgreich.**
- In diesem Arbeitsschritt keine entfernten SQL-Schreiboperationen, Deployments oder Function-Aufrufe. Produktion **yhnxdeypkbzyjappuzmv unverändert**, keine App-/Design-/Navigationsänderung und kein Cron. Konkreter nächster Testplan mit SQL-/Deploymentbefehlen und genau einem Test-POST: [GOABASE_REMOVALS_TEST_PLAN.md](GOABASE_REMOVALS_TEST_PLAN.md). Vor entfernten Änderungen wie früher vereinbart konkrete Bestätigung einholen; Ziel ausschließlich Spots-Test **nfomkdvotqtlyymomksb**. Testabnahme/Produktionsbehebung noch nicht abgeschlossen.

## Vorher: Fehler gezielt reproduziert; lokale Diagnose vorbereitet, nicht deployt

- Rein lesend die tatsächlichen Produktionslogs/Invocation zum fehlgeschlagenen POST über offizielle Management-API geprüft (Dashboard abgemeldet). **08.11.2026 16:40:13.906 UTC:** Handler `source_network_or_json_error` nach **921 ms**; **16:40:14.086:** Invocation POST/502, 1422 ms. Execution `8a64de0a-447f-4e2d-9c25-f6976ea6fbff`, Run `226acf77-6b96-41ae-9081-dc9e67081b8b`. Keine upstream URL/Phase/Exception im bisherigen Log. Schlüssel ausschließlich im RAM; nur freigegebene Metadaten gespeichert, keine Rohantworten/Headers.
- **Gezielt lokal mit unverändertem bereitgestelltem Abrufcode reproduziert:** `GET https://www.goabase.net/api/party/json/118240` liefert **301** auf `https://www.goabase.net/party/deleted/118240`. `redirect:error` wirft vor HTTP-/JSON-Prüfung eine Fetch-Ausnahme; Catch ersetzt sie durch den Sammelfehler. Feed erfolgreich (29 Einträge, keine Folgeseite nötig), Fehler beim Detail. Sehr starke Erklärung des produktiven Fehlers, historische Logs erlauben aber keine nachträglich eindeutige URL-Zuordnung. Löschhinweis bedeutet nicht bestätigte Veranstaltungsabsage.
- Produktions-/Testmetadaten und frühere erfolgreiche Test-Invocation lesend verglichen: gleiche Region eu-central-1, Edge Runtime 1.77.9/Deno 2.1.4, exakt gleicher Server-Bundle-Hash; Version 2 produktiv/1 Test. ID 118240 in beiden Beständen vorhanden. Frühere Test-Erfolge drei Tage älter; veränderte externe Quelle ist wesentlich plausibler als eine abweichende Umgebung. Expliziter 8-Sekunden-Timeout/504 oder Paginationlimit passt nicht zu 921 ms und Sammelfehler. Kein Testprojekt-POST ausgeführt.
- Lokal **nur Diagnose** vorbereitet in [sync.ts](../../supabase/functions/import-goabase/sync.ts)/[index.ts](../../supabase/functions/import-goabase/index.ts): Redirects manuell erkennen und weiterhin ablehnen, kontrollierter HTTP-Fehlercode, sichere Felder für Abrufschritt/Phase/Fehlerart/Status und öffentliche Quell-ID bzw. Offset; Redirectziel nur als Enum klassifizieren. Keine Rohtexte, URLs/Headers oder Schlüssel loggen. Keine fachliche Quell-Löschungs-/Absagebehandlung, kein automatisches Überspringen oder Unpublish, kein Retry. Bekannter 301 würde weiterhin sicher abbrechen; lokaler Kandidat ist **nicht bereitgestellt**.
- **6 neue fokussierte Diagnose-Tests bestanden**, Deno-Typecheck mit eingefrorener Lockdatei, Expo-Lint und App-Typecheck erfolgreich. Keine Wiederholung der bereits bestandenen Auth-/Import-/Paralleltests. Originale Remote-Functions, DB und App-Konfiguration unverändert; weiterhin 31 produktive Events/34 Testevents beim fokussierten Lesevergleich. Kein weiterer Function-Aufruf, produktiver POST oder Cron.
- Vollständige Belege, Grenzen und konkreter weiterer Lösungsentwurf: [GOABASE_FAILURE_ANALYSIS.md](GOABASE_FAILURE_ANALYSIS.md). Nächste fachliche Änderung müsste bestätigte einzelne Quell-Löschungen getrennt von Absagen/`dateModified` erfassen, UUID/Daten erhalten und Veröffentlichung gezielt/atomar deaktivieren. Metadaten-/RPC-Entwurf zuerst reviewen und isoliert testen; keine DB-/Deployment-/Importfreigabe daraus ableiten.

## Vorher: genau ein produktiver POST fehlgeschlagen; Bestand unverändert, keine Wiederholung

- Nach ausdrücklicher Freigabe ausschließlich **Spots. / yhnxdeypkbzyjappuzmv** und geprüfte Function **ACTIVE/Version 2/verify_jwt=false** bestätigt. Vorher Backup weiterhin vorhanden und gesamtes SHA-256-Manifest gültig, lokaler Public-Restore-Nachweis vorhanden. Aktuelle **31 Events mit allen Daten/UUIDs** vor dem POST vollständig lokal gesichert. Keine erneute Bestandsprüfung oder Wiederholung der bereits bestandenen Tests.
- **Genau ein POST am 08.11.2026, 16:40:07–16:40:15 UTC**, gültiger produktiver Default Secret Key ausschließlich im RAM. Tatsächliche Antwort **HTTP 502**, vollständiges zurückgegebenes Ergebnis **`{"error":"source_network_or_json_error"}`**. Keine Erfolgszähler/Run-ID in dieser Fehlerantwort; sie dürfen nicht als erfolgreiche Importstatistik dargestellt werden. Sofort gestoppt, kein weiterer POST/Retry, keine produktive Code-/DB-/Deployment-/Cron-Änderung zur Fehlerbehebung.
- Read-only Vorher-/Nachher-Vergleich nach Abbruch: **31 → 31**, alle 31 vollständigen Eventzeilen inklusive UUIDs und `created_at` exakt unverändert. Daher tatsächlich **0 neue, 0 aktualisierte, 0 neu abgesagte Events**, 31 unverändert. **0 Duplikate**, keine entfernten/ersetzten Original-UUIDs. Lease wieder frei (Token NULL, Ablauf `-infinity`), **0 Quellversionen**. Es wurde kein Teilbatch übernommen. Die Quelle liefert deshalb noch keine bestätigten Absage-/Verschiebungs-/Überspringzähler für diesen Lauf.
- Ausschließlich lesende Untersuchung danach, **kein weiterer Function-Aufruf**: reale App-Spaltenzuordnung mit tatsächlicher `.env.local` und Supabase-JS/Publishable Key geprüft. Veröffentlichte/geplante Events **HTTP 200, 31 Zeilen**, Explore mit künftigem Start **HTTP 200, 25**, Live mit tatsächlichem Zeitintervall/GPS **HTTP 200, 0**; Ergebnis-UUIDs jeweils vollständig gegen Datenbank-Snapshot abgeglichen. Kein visueller End-to-End-Test der mobilen Oberflächen behauptet.
- Lokale Goabase-GET-Stichproben um **16:41:46 UTC**: Feed DE/club/limit500/offset0 **HTTP 200, gültiges JSON, 29 Listeneinträge**; bekanntes Detail `117895` **HTTP 200, gültiges JSON**. Diese späteren lokalen Antworten belegen **nicht** die Ursache der vorherigen Edge-Runtime-Störung. Der Sammelfehler wird im bestehenden Quellcode bei Fetch-/Redirect-/JSON-Fehlern ausgelöst; betroffene URL/Phase/ursprüngliche Ausnahme werden von der vorhandenen Handler-Logausgabe nicht erfasst. Ohne gezielte weitere Diagnose keinen transienten Ausfall als bewiesene Ursache behaupten.
- Bestehender Altbestand: 6 Events sind inzwischen zeitlich abgelaufen, behalten aber ihr bereits vorher gesetztes `is_published=true`; keine Änderung durch diesen fehlgeschlagenen Lauf. Die App filtert sie über die Zeit aus Explore/Live heraus. Der Prüfbericht meldet außerdem fehlende Quellversionen für die 31 Altzeilen, weil der erste neue Import vollständig abbrach; dies ist **kein durch den Import verursachter Datenverlust**. Bei einer späteren erfolgreichen Synchronisierung sollen Versionen/zeitabhängige Veröffentlichung regulär aktualisiert werden, keine ungefragte manuelle Bereinigung.
- Nachweise: `supabase/backups/production-first-import-2026-11-08T16-40-09-274Z/` mit Vorher-/Nachher-Snapshots, vollständiger erlaubter Fehlerantwort, Feldvergleich und separatem `read-only-investigation.json` (Git-ignoriert, Windows-Zugriff auf aktuellen Benutzer begrenzt). [Einmaliger Produktionsimport](../../scripts/run-production-goabase-import.cjs) durch persistente Versuchsmarkierung gegen zweiten POST gesperrt. [Lesende Fehleruntersuchung](../../scripts/inspect-production-goabase-failure.cjs) ruft die Edge Function nicht auf. App-`.env.local` unverändert, lokale CLI bleibt Test. **Expo-Lint und Typecheck erfolgreich**, beide Runner syntaktisch geprüft.
- **Produktiver Import derzeit nicht vollständig erfolgreich. Gesamtzahl weiter 31 echte Events.** Vor einem erneuten POST zuerst Ursache weiter eingrenzen und eine ausdrückliche neue Freigabe einholen. Keine automatische Wiederholung, kein Cron; keine Function-/Datenbankänderung ohne eigene Freigabe.

## Vorher: alle vier produktiven GET-Authentifizierungstests bestanden; noch kein Import

- Nach ausdrücklicher Nutzerfreigabe am **08.11.2026, 16:33:27–16:33:34 UTC** ausschließlich **Spots. / yhnxdeypkbzyjappuzmv** geprüft. Produktionsname/ID und Function **ACTIVE/Version 2/verify_jwt=false** samt geprüftem Bundle-Hash vor den Tests bestätigt. Genau vier GET-Anfragen auf den expliziten produktiven Function-Endpunkt; keine POST-Anfrage, kein RPC-Aufruf, keine entfernte SQL-Schreiboperation, kein Deployment oder Cron.
- Tatsächliche HTTP-Ergebnisse: **ohne API-Key 401**, **falscher API-Key 401**, **Publishable Key 401**, **gültiger Default Secret Key 405**. Letzte Antwort zusätzlich exakt `{"error":"POST erforderlich"}` und `Allow: POST`. Alle vier Fälle bestanden, kein unerwartetes Verhalten. Schlüssel über authentifizierte CLI ausschließlich im Prozessspeicher verwendet, niemals ausgegeben, protokolliert, auf Datenträger gespeichert oder als Prozessargument übergeben.
- Vorher alle 31 vollständigen Events gegen ursprünglichen Produktionsnachweis abgeglichen und als Vergleichsstand gesichert. Nachher **31 → 31**, sämtliche UUIDs und Eventdaten unverändert. Lease-Zustand ebenfalls unverändert: genau eine freie Zeile, Token NULL, Ablauf `-infinity`; **0 Quellversionen** und keine zurückgebliebene Importsperre. Keine Aufräum-/Schreiboperation nötig oder ausgeführt.
- Tatsächliche Einzelresultate und vollständige Vorher-/Nachher-Snapshots: `supabase/backups/production-auth-get-2026-11-08T16-33-28-678Z/` (Git-ignoriert, Windows-Zugriff auf aktuellen Benutzer begrenzt). [GET-Test-Runner](../../scripts/test-goabase-production-auth.cjs) mit festem Produktionsziel, ausschließlich GET, strikten Statusprüfungen und einmaliger Versuchsmarkierung; nicht ungefragt wiederholen. App-`.env.local` per SHA-256 unverändert, lokale CLI weiterhin Testprojekt `nfomkdvotqtlyymomksb`. Keine Frontend-/Design-/Navigationsänderung. **Expo-Lint und Typecheck erfolgreich**, Runner-Syntax ebenfalls geprüft.
- Nächster möglicher Schritt nach eigener Freigabe: genau ein erster produktiver POST-Import mit gesichertem Vorher-/Nachher-Vergleich aller ursprünglichen UUIDs. Diese GET-Freigabe erlaubt weiterhin **keinen Import und keinen Cron**.

## Vorher: getestete import-goabase in Produktion bereitgestellt; noch kein Import

- Nach ausdrücklicher Deployment-Freigabe ausschließlich `import-goabase` im produktiven Projekt **Spots. / yhnxdeypkbzyjappuzmv** genau einmal mit explizitem `--remote=yhnxdeypkbzyjappuzmv --use-api --no-verify-jwt` bereitgestellt; Produktionsname/ID unmittelbar vorher bestätigt. Zeitraum **08.11.2026, 16:27:36–16:27:49 UTC**. Keine weiteren Functions deployed/verändert, Test-Functions-Metadaten vor/nach identisch, lokale CLI weiterhin Testprojekt `nfomkdvotqtlyymomksb`.
- Lokale Dateien vor Deployment gegen tatsächlich heruntergeladene, integrationsgetestete Test-Version 1 geprüft: `index.ts` und `sync.ts` identisch (nur Zeilenenden normalisiert). Keine Änderung am getesteten Handler/Sync-Code. Produktive bisherige Fassung nochmals separat für Rückweg heruntergeladen und mit vorherigem Backup-Quellhash übereinstimmend gesichert.
- Deployment erfolgreich: produktive Function **ACTIVE, Version 2, verify_jwt=false**, gleiche Function-ID `d1e82fa9-2874-487a-9a9c-15fb8adf6b83`. `withSupabase({ auth: "secret" })` und POST-Prüfung unverändert; keine Schlüssel abgerufen, ausgegeben oder gespeichert. Produktiver Default Secret bleibt Backend-Konfiguration. Neuer produktiver Quellcode nach Deployment nochmals heruntergeladen und gegen Testfassung geprüft. **Auch Server-Bundle-SHA-256 exakt identisch zur getesteten Test-Version:** `f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c`.
- Read-only Vorher-/Nachher-Vergleich: **31 → 31 Events mit allen UUIDs und Feldern unverändert**, Lease und Versionsbestand ebenfalls identisch (freie Lease, 0 Quellversionen). Kein Function-Aufruf, kein Partyimport, keine weiteren DB-/Vault-/Extension-/Cron-Änderungen. Authentifizierung in Produktion noch nicht durch Requests getestet; nächste mögliche Freigabe sind reine GET-Authentifizierungstests ohne Import.
- Nachweise einschließlich Deployment-Antwort, vorheriger und neuer produktiver Quellfassung, Test-Referenz, Metadaten und DB-Snapshots: `supabase/backups/production-function-deploy-2026-11-08T16-27-36-679Z/` (Git-ignoriert). [Deployment-Runner](../../scripts/deploy-goabase-production.cjs) mit festem Produktionsziel, Test-Artefaktvergleich und einmaliger Versuchsmarkierung; nicht erneut ausführen. App-`.env.local` per SHA-256 unverändert, keine Frontend-/Design-/Navigationsänderung. **Expo-Lint und Typecheck erfolgreich**, Runner-Syntax geprüft.

## Vorher: freigegebene Backend-Ergänzung 03 in Produktion erfolgreich geprüft

- Nach ausdrücklicher Nutzerfreigabe ausschließlich **Spots. / yhnxdeypkbzyjappuzmv**, Projektname/ID unmittelbar vor Ausführung über CLI bestätigt. Genau ein SQL-Ausführungsversuch am **08.11.2026, 16:21:29–16:21:37 UTC**. Freigegebenen Kandidaten [03_goabase_sync_backend.sql](../../supabase/ops/03_goabase_sync_backend.sql) gelesen, SHA-256 `205b02360cd29bd2d958ba94a1cea739c46d72a022e280b239ef406c8ffd3cd3` gegen lokalen Restore-Nachweis und eingefrorene Datei geprüft, Backup-Manifest vollständig verifiziert. Keine Wiederholung der abgeschlossenen Bestandsprüfung/Importer-Integrationstests.
- Vor der SQL-Ergänzung alle **31 vollständigen Eventzeilen einschließlich UUIDs/Quell-IDs** neu lokal gesichert und gegen ursprünglichen Produktionsnachweis verglichen: identisch. Backend-Objekte vorher nicht vorhanden. Danach **31 → 31**, sämtliche Eventdaten und UUIDs exakt unverändert; Spalten/Defaults, PK/Unique/Indices, Eigentümer, RLS/Policies und Grants der Events-Tabelle ebenfalls unverändert.
- Erstellt: Schema `spots_sync_private`, Tabellen `goabase_lease` und `goabase_versions`, RPCs `spots_goabase_begin`, `spots_goabase_apply`, `spots_goabase_release`. Beide Tabellen im Eigentum `postgres`, RLS aktiv und keine direkten Tabellenrechte für PUBLIC/anon/authenticated/service_role. Clients besitzen weder USAGE noch CREATE auf dem privaten Schema. Alle drei RPCs: Eigentümer postgres, SECURITY DEFINER, leerer search_path, EXECUTE nur für Backend service_role und privilegierten Eigentümer, nicht für PUBLIC/anon/authenticated.
- Initialzustand geprüft: genau **1 freie Lease-Zeile**, Token NULL, Ablauf `-infinity`, **0 Quellversionen**. Keinen RPC zum Test aufgerufen; es wurde kein Import gestartet. Produktive Edge-Function-Metadaten vor/nach identisch, kein Deployment, keine Extension-/Vault-/Cron-Änderung. Bestehende Event-Lesepolicy weiterhin unverändert; ihre vorgeschlagene Verschärfung benötigt eine separate Freigabe.
- Nachweise, kompletter Vorher-/Nachher-Stand, tatsächlich ausgeführte unveränderte SQL-Datei, SQL-Antwort und Rechteprüfungen: `supabase/backups/production-backend-03-2026-11-08T16-21-29-731Z/` (Git-ignoriert). Ausführungs-Runner [apply-goabase-production-backend.cjs](../../scripts/apply-goabase-production-backend.cjs) schützt mit Ziel-ID/Hash/Bestandsprüfung und einmaliger Versuchsmarkierung gegen versehentliche Wiederholung; nicht erneut ausführen.
- App-`.env.local` per SHA-256 unverändert, lokale CLI weiterhin Testprojekt `nfomkdvotqtlyymomksb`. **Expo-Lint und Typecheck erfolgreich**, Runner-Syntax geprüft. Keine Design-/Navigations-/App-Codeänderung. Nächster möglicher Schritt: separat freigegebenes Deployment ausschließlich der verbesserten `import-goabase` auf Produktion; Import-/Authentifizierungstests und Cron weiterhin separat freigeben.

## Vorher: Produktionsbackup und isolierter Public-Restore geprüft; SQL-Freigabe damals ausstehend

- Ohne Wiederholung der Bestandsprüfung vollständiges logisches Produktionsbackup **Spots. / yhnxdeypkbzyjappuzmv** mit PostgreSQL 17.11 erstellt: keine Schemas ausgeschlossen, konsistentes Custom-Archiv plus vollständig dekodierter SQL-Abzug, Rollen ohne Passwort-Hashes. 601 Archiveinträge/41 Tabellen-Datenabschnitte, darin 31 Events, keine Auth-Benutzer/Storage-Objekte/Vault-Secrets. Schutz: Windows-ACL aktueller Benutzer, Git-ignoriert, SHA-256-Manifest geprüft. Speicherort `supabase/backups/production-backup-2026-11-05T23-31-22-437Z/`; bisher nur lokale Kopie. Kein produktiver Daten-/Schema-/Policyeingriff, Function-Aufruf, Deployment oder Cron.
- Aktuell bereitgestellten produktiven Function-Quellcode separat heruntergeladen, ACTIVE/Version 1/Verify-JWT false und Original-Bundle-Hash gesichert; `auth: secret` vorhanden, keine eingebetteten Secret-Muster. Keine Schlüssel gespeichert/ausgegeben. Alte Abhängigkeit `npm:@supabase/server@1` nicht exakt gepinnt: erneutes Deployment nicht garantiert byteidentisch. Verbesserter lokaler Importer unverändert.
- Public-Schema aus Backup in eigener lokaler PostgreSQL-17.11-Instanz wiederhergestellt: **31 vollständige Events einschließlich UUIDs identisch** zum bestehenden Produktionsnachweis, 19 Spalten/PK/Unique/RLS/Policy und relevante Client-/Backend-Grants erhalten. Kandidat Backend 03 dort erfolgreich angewendet, zwei private RLS-Tabellen/drei RPCs eingerichtet, alle Eventdaten/UUIDs unverändert. Lokalen Server danach beendet. Keine alten Integrationstests unnötig wiederholt.
- Grenzen: vollständiger verwalteter Supabase-Plattformrestore nicht verifiziert; Vault-Erweiterung lokal nicht verfügbar. Stock-PG17 benötigte für Rollen-Grantor eine separate lokale ADMIN-Mitgliedschafts-Kompatibilitätsdatei; Originalbackup unverändert. Docker-Export wegen blockierter Engine durch native offizielle PG-Werkzeuge ersetzt. Exportverbindungen read-only; temporäre CLI-Zugangsdaten nur im RAM. Storage-Dateibytes/Projektkonfiguration/Secrets/Rollenpasswörter nicht Teil dieses Datenbankbackups.
- [PRODUCTION_BACKUP.md](../../PRODUCTION_BACKUP.md) dokumentiert Nachweise, Grenzen, Rückweg und konkrete **noch nicht erteilte SQL-Freigabe ausschließlich für Backend 03**, SHA-256 `205b02360cd29bd2d958ba94a1cea739c46d72a022e280b239ef406c8ffd3cd3`. Event-Lesepolicy-Angleichung separat; noch kein Deployment/Import/Cron freigegeben.
- App-`.env.local` unverändert, lokale CLI bleibt Test. TypeScript ignoriert jetzt auch `supabase/backups`, damit gesicherter Deno-Code außerhalb der App-Kompilierung bleibt. **Expo-Lint und Typecheck erfolgreich**, neue Backup-/Restore-Skripte syntaktisch geprüft, keine Editor-Diagnosen. Keine Wiederholung bereits bestandener Import-Integrationstests.

## Vorher: rein lesende Produktionsbestandsprüfung abgeschlossen

- Nach ausdrücklicher Freigabe Produktion **Spots. / yhnxdeypkbzyjappuzmv** und Test **spots. testproject / nfomkdvotqtlyymomksb** ausschließlich lesend geprüft/verglichen. Alle Produktions-SQL-Abfragen mit explizitem Ziel und CLI `--read-only`; keine Function-Aufrufe, Schlüsselabrufe, Deployments oder entfernten Schreiboperationen. Lokale CLI bleibt Test; `.env.local` per SHA-256 unverändert.
- Produktion weiterhin **31 Events mit 31 eindeutigen UUIDs**, keine fehlenden Quell-IDs/Duplikate; alle scheduled/veröffentlicht mit gültigem GPS und passendem Goabase-Link. Vollständige Eventdaten vor/nach Prüfung identisch. Alle 31 Identitäten, vollständiger Bestand, Schema/Rechte und SHA-256-Manifest lokal unter `supabase/backups/production-preflight-2026-11-05T23-19-10-290Z/` gesichert, von Git ausgeschlossen. Kein vollständiger DB-Backup/Restore behauptet.
- Events-Struktur beider Projekte kompatibel: 19 Spalten, gleiche Typen/NULL-Regeln, PK und vollständiger Unique-Quellindex vorhanden. Einziger Default-Unterschied: Produktion `source='manual'`, Test kein Default; für den Importer irrelevant und zu erhalten. Keine Event-Trigger oder verweisenden FKs gefunden, keine öffentlichen Produktions-RPCs.
- Produktion fehlen privates Schema `spots_sync_private`, Tabellen `goabase_lease`/`goabase_versions` sowie RPCs Begin/Apply/Release. Geplanter Zusatz ausschließlich Backend 03, niemals Test-Bootstrap 05/Fixture 06 auf Produktion. Bestehende Eventdaten/UUIDs bleiben bei diesem Zusatz unberührt.
- RLS in beiden aktiv und öffentliche Rollen nur SELECT. Produktive Policy `Read published events` erlaubt `is_published = true`; Test verlangt zusätzlich `status='scheduled'`. Separate Angleichung an getestete Regel empfohlen und noch nicht freigegeben/ausgeführt. Keine zusätzliche permissive Policy, die die alte Regel per OR offen lassen würde.
- Produktive `import-goabase` ACTIVE, Version 1, Verify JWT false; Test ebenfalls ACTIVE/v1/false, aber andere Function-ID und anderes Bundle. Aktueller produktiver Quellcode noch unabhängig für Rückweg zu sichern. Vault in beiden vorhanden; benötigte Vault-Namen fehlen. Weder pg_cron/pg_net noch cron.job vorhanden; externe Scheduler nicht vollständig durch DB-Leseprüfung ausschließbar.
- Aktueller Befund/Datenschutz-/UUID-Nachweis: [PRODUCTION_PREFLIGHT.md](PRODUCTION_PREFLIGHT.md). [Übernahmeplan](../../PRODUCTION_ROLLOUT.md) mit Tatsachen aktualisiert: vollständiges Backup/Function-Sicherung, Schreiberkontrolle, getrennte SQL-/RLS-/Deployment-/Importfreigaben, selektiver Rückweg, Cron-Abnahme zuerst Test. Keine produktive Änderung vor eigener Freigabe. Lint und Typecheck nach Inspektionsskript erfolgreich.

## Vorher: verbleibende Integrationstests bestanden; Produktionsplan vorbereitet

- Ausschließlich **spots. testproject / nfomkdvotqtlyymomksb**. Zwei echte überlappende Import-POSTs: **409 `sync_already_running`** und **200 mit 34 unveränderten Events**. Genau ein Lauf angenommen, kein Retry. Danach 34 Events/34 Quellversionen, dieselben UUIDs/Felder, keine neuen/entfernten IDs, keine Duplikate oder aktive Lease.
- **Elf Fixture-Fälle** mit der echten TypeScript-Quelltransformation und echten Datenbank-RPCs bestanden: Einfügen/Wiederholung, Titel-/Orts-/Termin-/GPS-Änderung, Absage, Verschiebung/Neuterminierung, alte/widersprüchliche Versionen, leerer Batch, Duplikate, atomarer Teilfehler und abgelaufener Lease-Besitzer. Ausschließlich neue kollisionsgeprüfte synthetische IDs in einer vollständig zurückgerollten Untertransaktion; keine echten Goabase-Events verändert, keine Fixtures verblieben.
- **Acht kontrollierte Quellenfehler** mit unverändertem lokal ausgeführtem Handler und echten Test-DB-Lease-RPCs bestanden: 503/429, Netzwerk, JSON, falsche Liste, Folgeseite, Detail-404, Timeout. Erwartete Handler-Statuscodes 502 bzw. 504, nur Begin/Release, kein Apply-Versuch, reale Events/Status/Metadaten nach jedem Fall unverändert. Diese Fehlerantworten stammen aus dem lokalen Harness, nicht aus einem erzwungenen Ausfall der gehosteten Edge Runtime. Authentifizierung war separat echt geprüft.
- Ein anfänglicher lokaler CLI-Argumentfehler (`--`-SQL-Kommentar als Option) wurde auf `--file` korrigiert; vor den fehlgeschlagenen Versuchen kein SQL ausgeführt und Datenbestand unverändert bestätigt. Kein Bugfix/Deployment der Edge Function nötig. Erfolgreiche Fixture-Ausführung danach auch auf echter Testdatenbank bestätigt.
- Abschließender vollständiger Vorher-/Nachher-Vergleich über alle Phasen: **34 ursprüngliche Events und 34 Quellversionen unverändert, 0 Duplikate, 0 aktive Leases, Ablauf -infinity, 0 verbliebene Fixtures, kein Cron**. `.env.local` in allen Testphasen per SHA-256 identisch. Keine Produktionsabfragen/-änderungen oder App-/Deployment-Änderungen.
- **35 lokale Tests bestanden, 0 übersprungen**, einschließlich neuer Regression für denselben Fixture-SQL-Test; Expo-Lint, App-Typecheck, Deno-Typecheck und Editor-Diagnosen erfolgreich. Nachweise: [SUPABASE_INTEGRATION_RESULTS.md](SUPABASE_INTEGRATION_RESULTS.md), lokale redigierte JSON-Berichte unter `supabase/.temp/`.
- [PRODUCTION_ROLLOUT.md](../../PRODUCTION_ROLLOUT.md) enthält den konkreten, noch nicht ausgeführten Übernahme-/Vault-/Zwei-Stunden-Cron-Plan mit Ziel-IDs, Bestands-/Backup-/Schreiberprüfung, separaten SQL-/Deployment-/Import-/Aktivierungsfreigaben und Rückweg. Lokale CLI-Verknüpfung bleibt Test. Keine Übernahme/Aktivierung durch diese Testfreigabe erlaubt.
- Verbleibende Grenzen: Quellenfehler/Absagen kontrolliert simuliert, keine manipulierte echte Goabase-Quelle; Edge-Infrastruktur-Timeouts und großer Bestand nicht Ende-zu-Ende erzwungen. Paginationlimit, fehlende Details/Versionen und Kapazitätsgrenzen bleiben dokumentiert. Vault/pg_net/Cron-Ende-zu-Ende sowie aktueller Produktionsbestand noch gesondert abnehmen.

## Vorher: einmaliger Wiederholungsimport erfolgreich, UUIDs stabil

- Nach eigener Nutzerfreigabe genau **einen weiteren POST** ausschließlich auf Testprojekt **nfomkdvotqtlyymomksb** ausgeführt, Version 1. Vorher alle 34 Events mit sämtlichen 19 Spalten (einschließlich UUID `id`, `source`, `source_event_id`) und die Quellversions-Metadaten dauerhaft als lokale JSON-Vergleichsdatei gespeichert: `supabase/.temp/goabase-repeat-before.json`. Ausgangsbestand 34 Events/Quellversionen, kein Duplikat, keine aktive Sperre; Projektidentität und Deploy-Konfiguration geprüft.
- Tatsächliche Antwort **HTTP 200**, Zeit **05.11.2026, 22:53:10–22:53:17 UTC**: `discovered=34`, `checked=34`, `inserted=0`, `updated=0`, `unchanged=34`, `rejected_versions=0`, `cancelled=0`, `postponed=0`; Lauf-ID `77143ed5-120e-4cc0-a16d-52becf7faf9c`.
- Unabhängiger Vorher-/Nachher-Vergleich nach stabilem Quellpaar: **34 → 34 Zeilen, alle 34 UUIDs identisch, alle Eventfelder unverändert, 0 neue/entfernte Events, 0 Duplikate und 0 zurückgesetzte Quellversionen**. Keine neuen Quellevents mit tatsächlichen Duplikaten verwechselt. Nachher-Snapshot `supabase/.temp/goabase-repeat-after.json`, vollständiger Vergleich `supabase/.temp/goabase-repeat-results.json`; keine Schlüssel enthalten.
- Zusätzlich alle **34 aktuellen Goabase-Details** unabhängig lesend abgeglichen: Titel, Stadt, Start-/Endzeit, GPS, Status, Bild-/Quelllink und `dateModified` stimmen mit den gespeicherten Werten überein. Somit tatsächlich keine beobachteten legitimen Quelländerungen; der Änderungs-/Absagepfad wurde durch diesen unveränderten Bestand nicht neu getestet und benötigt weiterhin gesonderte Fixtures/Freigabe.
- Lease freigegeben: 0 aktive Tokens, Ablauf wieder `-infinity`; 34 Quellversionen. Keine weiteren Importaufrufe, keine Paralleltests, kein Cron/Redeployment/zusätzliche SQL-Schreiboperation und keine Produktions-/App-Änderung. App-`.env.local` per SHA-256 identisch; Expo-Lint und Typecheck erfolgreich.
- [Einmaliger Wiederholungs-Runner](../../scripts/run-repeat-goabase-import.cjs) schützt mittels fester Test-ID, Snapshots vor POST, exklusiver Versuchsmarkierung und genau einer POST-Stelle ohne Retry vor versehentlichen Zusatzaufrufen. Nicht erneut ausführen. Nächste mögliche Schritte nur nach eigener Freigabe: echte parallele Aufrufe und getrennte Änderungs-/Absage-/Versions-Fixtures.

## Vorher: erster echter POST-Import im Testprojekt erfolgreich

- Nach ausdrücklicher Freigabe genau **einen** POST an `import-goabase` im bestätigten Testprojekt **nfomkdvotqtlyymomksb** ausgeführt, Function-Version 1, gültiger Default Secret Key ausschließlich im Backend-Prozessspeicher. Projektname/ID/Verknüpfung, ACTIVE/verify_jwt=false, leere Events-/Versionstabellen, freie Lease sowie UNIQUE-Index und drei RPCs unmittelbar davor geprüft. Keine Schlüssel ausgegeben oder in Dateien gespeichert.
- Tatsächliche Antwort **HTTP 200**: `discovered=34`, `checked=34`, `inserted=34`, `updated=0`, `unchanged=0`, `rejected_versions=0`, `cancelled=0`, `postponed=0`; Lauf-ID `053eff1e-c8ce-48b6-af8b-a834b01698c3`. Danach lesend bestätigt: **34 Events und 34 Quellversionen**, alle 34 `scheduled`/veröffentlicht, alle 34 mit gültigen GPS-Koordinaten, 0 doppelte Quellpaare, 0 Feldvalidierungsfehler.
- Namen, Start-/Endzeiten, GPS, Status, Quellversionen und Goabase-Links aller gespeicherten Zeilen geprüft. Drei zusätzliche direkte Goabase-Stichproben (117895, 118533, 118646) stimmen bei Titel, Zeitpunkten, GPS, Status und kanonischem Link überein; alle drei Originalseiten HTTP 200. Zeitangaben sind gleiche Zeitpunkte in UTC, keine lokale Zeitverschiebung.
- Keine zurückgebliebene Importsperre: 0 aktive Tokens, Lease-Ablauf wieder `-infinity`. Damit sind Begin/Apply/Release auf dem echten Erfolgsweg geprüft. Vollständiger Unique-Quellindex vorhanden, Erstimport ohne Duplikate. **Idempotenz bei Wiederholung und Parallelität wurden ausdrücklich noch nicht getestet.**
- Keine Paginationgrenze erreicht und keine Importfehler. Keine zweite POST-Anfrage, kein Paralleltest, kein Cron, kein Redeployment und keine Änderungen an Produktion oder Spots-App. `.env.local` vor/nach Import per SHA-256 identisch. Expo-Lint und App-Typecheck erfolgreich.
- [Einmaliger Import-Runner](../../scripts/run-first-goabase-import.cjs) mit fester Test-ID, ausschließlich einer POST-Stelle ohne Retry sowie exklusiver lokaler Versuchsmarkierung ergänzt. Redigierte Antwort/Bestandsbericht lokal ignoriert unter `supabase/.temp/goabase-first-import-results.json`; keine Schlüssel enthalten. Ergebnisse auch in [SUPABASE_TEST_SETUP.md](../../SUPABASE_TEST_SETUP.md).
- Nächster Schritt nach eigener Freigabe: gezielter zweiter Import zur Prüfung stabiler UUIDs/Zeilenzahl, danach separat freigegebene Parallelitäts- und Änderungs-/Absageprüfungen. Kein weiterer Schreibtest durch die Erstimport-Freigabe gedeckt.

## Vorher: echte Authentifizierungstests im Testprojekt bestanden

- Nach ausdrücklicher Testfreigabe ausschließlich GET-Aufrufe gegen `https://nfomkdvotqtlyymomksb.supabase.co/functions/v1/import-goabase` ausgeführt, Function-Version 1. Projektname/ID/Verknüpfung und ACTIVE/verify_jwt=false vorher geprüft. Testzeit **05.11.2026, 22:41:51–22:42:00 UTC**.
- Tatsächliche Antworten: **ohne Key 401**, **falscher Key 401**, **gültiger Publishable Key 401**, **gültiger Default Secret Key per GET 405**. Beim letzten Fall zusätzlich erwartete Handler-Antwort `POST erforderlich` und `Allow: POST` bestätigt. Damit ist die Ablehnung öffentlicher/unberechtigter Aufrufe und die Authentifizierung des Default-Keys am echten Endpunkt verifiziert.
- Vorher/nachher ausschließlich lesend bestätigt: **0 Events, 0 Quellversionen, 0 aktive Leases**, eine unveränderte technische Lease-Zeile mit Ablauf `-infinity`, kein Cron. App-`.env.local` per SHA-256 unverändert. Kein POST-Import, kein RPC-Schreibtest, keine Schlüsselanlage/-rotation und keine Produktionsänderung.
- Wiederholbares, nur ausdrücklich aufzurufendes Backend-Testskript [test-goabase-auth.cjs](../../scripts/test-goabase-auth.cjs) ergänzt: feste Testprojekt-ID, Projekt-/Deploy-Prüfung, ausschließlich GET, sofortiger Abbruch bei unerwarteten Antworten, abschließender Read-only-Bestandscheck. Schlüssel über die angemeldete CLI ausschließlich im Arbeitsspeicher gehalten; keine Werte in Prozessargumenten, Logs, Chat oder Dateien. Lokaler ignorierter Ergebnisbericht enthält ausschließlich Statuscodes/Bestandszahlen.
- Alle vier echten Endpunkttests bestanden. Expo-Lint und App-Typecheck anschließend erfolgreich. Ergebnisse und Grenzen in [SUPABASE_TEST_SETUP.md](../../SUPABASE_TEST_SETUP.md). Nächster Schritt nach eigener Freigabe: erster echter POST-Import im Testprojekt, danach kontrollierte Wiederholungs-/Parallelitätsprüfungen. Diese Schreibtests und Cron sind weiterhin nicht freigegeben oder ausgeführt.

## Vorher: import-goabase ausschließlich im Testprojekt bereitgestellt

- Nach ausdrücklicher Deployment-Freigabe Ziel **spots. testproject / nfomkdvotqtlyymomksb** erneut über CLI-Projektliste und lokale Verknüpfung bestätigt. Ausschließlich `import-goabase` mit `--remote=nfomkdvotqtlyymomksb --use-api --no-verify-jwt` bereitgestellt; keine anderen Functions, kein Prune und keine Datenbank-Schreiboperation.
- Anschließend über Function-Metadaten verifiziert: **ACTIVE**, **Version 1**, **verify_jwt = false**, erwarteter Importer-Entrypoint. Function-ID `ccedcf0f-1c2b-4973-8b4a-ec46ce2091cc`. Handler unverändert `withSupabase({ auth: "secret" })`, laut aktueller offizieller Dokumentation Default-Secret-Key im `apikey`-Header. Keine Schlüssel abgerufen/ausgegeben/als Datei gespeichert.
- Function bewusst nicht aufgerufen. Ausschließlich lesender Bestandscheck: **0 Events, 0 Quellversionen, eine initialisierte Lease-Zeile ohne Token/aktive Sperre, Cron nicht vorhanden**. Produktion unverändert. App-`.env.local` vor/nach Deployment per SHA-256 identisch bestätigt; Lint und App-Typecheck anschließend erneut erfolgreich.
- Vor Deployment Deno-Typecheck und 17 Importer-Tests erfolgreich. Echte serverseitige Authentifizierung, gültiger Schlüssel, Import/Idempotenz und Parallelität sind noch nicht durch Endpunktaufrufe verifiziert. **ACTIVE bestätigt das Deployment, keine erfolgreiche Importausführung.**
- Nächster Schritt nach gesonderter Testfreigabe: zuerst Authentifizierungsfälle ohne gültigen Key prüfen, anschließend Default-Key zunächst mit GET (405 ohne Import), danach gezielt freigegebene POST-Imports/Wiederholungen und Parallelität im Testprojekt. Secrets ausschließlich geschützt im Backend und im Arbeitsspeicher verwenden. Keine Cron-Aktivierung Teil der bisherigen Freigaben.

## Vorher: freigegebene Datenbankeinrichtung im Testprojekt abgeschlossen

- Nach ausdrücklicher Freigabe genau den zuvor getesteten SQL-Snapshot ausgeführt, ausschließlich gegen **nfomkdvotqtlyymomksb**. Projektzuordnung, fehlende Zieltabellen/RPCs und SHA-256 **E52E7E584D6ED6B8818A8E370B171BCB032A60B80710FE6DA3D8FDF4C1240796** unmittelbar davor erneut geprüft. Eine gemeinsame Transaktion erfolgreich abgeschlossen, keine Löschbefehle oder bestehenden Eventdaten betroffen.
- Anschließend rein lesend bestätigt: `public.events` mit 19 erwarteten Spalten/Defaults, Primärschlüssel und UNIQUE `(source, source_event_id)`; private Tabellen `goabase_lease` und `goabase_versions`; RLS auf allen drei Tabellen aktiv.
- Öffentliche Rollen `anon`/`authenticated` haben ausschließlich SELECT auf Events, mit Policy `is_published AND status = 'scheduled'`; keine INSERT-/UPDATE-/DELETE-Rechte. Keine Rechte auf private Tabellen und kein USAGE auf das private Schema. Alle drei RPCs gehören `postgres`, sind SECURITY DEFINER mit leerem search_path; EXECUTE für `service_role`, nicht für PUBLIC/anon/authenticated.
- Eventbestand im Testprojekt weiterhin **0**; keine Imports/Fixtures/RPC-Testaufrufe ausgeführt. Keine Edge Function bereitgestellt, Cron weiterhin nicht vorhanden. Produktion und App-`.env.local` unverändert. Nächster Schritt ist eine **separate Freigabe nur für das Deployment von import-goabase im Testprojekt**, danach gesondert freigegebene Import-/Integrationstests.
- `.env.local` vor/nach Einrichtung per SHA-256 identisch. Lint und App-Typecheck anschließend erneut erfolgreich; keine Code-/Designänderung Teil dieser Datenbankeinrichtung.

## Vorher: CLI verbunden und Datenbankeinrichtung vorbereitet

- Supabase CLI 3.0.0 exakt als Dev-Dependency installiert, Anmeldung über den neuen VS-Code-Task erfolgreich. Lokale CLI-Konfiguration und Ignore-Regeln angelegt. App-Design, Navigation und `.env.local` unverändert; keine Zugangswerte protokolliert oder in Projektdateien ergänzt.
- Tatsächlicher Testprojektname **spots. testproject**, ID **nfomkdvotqtlyymomksb**, vom Nutzer trotz Abweichung zu „Spots-Test“ bestätigt und ausschließlich dieses Projekt verknüpft. Produktion **Spots.** mit ID **yhnxdeypkbzyjappuzmv** ausgeschlossen. Jede weitere entfernte Änderung und jedes Deployment benötigt ausdrücklich eigene vorherige Freigabe.
- Rein lesend verifiziert: Testprojekt PostgreSQL 17.11, noch keine Events-Tabelle, keine Edge Functions/Importer-RPCs, kein Cron, Vault vorhanden. CLI zeigt den Hauptzweig des Testprojekts als `production`; das ist keine Verknüpfung zum produktiven Spots-Projekt.
- [Test-Setup-Anleitung](../../SUPABASE_TEST_SETUP.md), [CLI-Read-only-Inspektion](../../supabase/ops/04_inspect_test_schema.sql) und [Bootstrap der Test-Events-Tabelle](../../supabase/ops/05_create_test_events.sql) ergänzt. Gemeinsamer SQL-Review-Snapshot aus Bootstrap und bestehendem Backendentwurf liegt lokal ignoriert unter `supabase/.temp/spots-test-setup.sql`. Eine Transaktion, keine Daten/Seeds/Cron/Extensions. **Noch nicht entfernt ausgeführt.**
- Neuer Bootstrap mit allen 19 bereitgestellten Spalten, UNIQUE-Quellpaar, RLS und ausschließlich SELECT für öffentliche Clients; bei vorhandener Tabelle sicherer Abbruch. Die SQL-Tests verwenden jetzt diesen tatsächlichen Bootstrap. 34 Tests einschließlich SQL, Lint sowie App-/Deno-Typecheck erfolgreich.
- Nächster Schritt: ausdrückliche Freigabe für diesen konkreten SQL-Snapshot nur auf nfomkdvotqtlyymomksb einholen, dann ausführen und lesend überprüfen. Danach Deployment separat freigeben lassen; anschließend Testdatenänderungen/Import-Aufrufe konkret freigeben lassen. Kein aktiver Cron und kein Produktionszugriff Teil dieses Auftrags.

## Aktuell: Goabase-Importer lokal für automatische Synchronisierung verbessert

- Die bestehende App mit echten Supabase-Events, Design und Navigation bleibt unverändert. Produktive Datenbank/Edge Function wurden nicht verändert oder aufgerufen; kein Cron angelegt/aktiviert. Der vorherige Commit bleibt der Referenzstand der Originalfunktion.
- [Importer](../../supabase/functions/import-goabase/index.ts) behält Secret-Authentifizierung mit dem Key `default`, akzeptiert nur POST und nutzt ausschließlich backendseitige RPCs. [Quellenlogik](../../supabase/functions/import-goabase/sync.ts) ergänzt Pagination, Detailabgleich aller bekannten IDs, Status-/Veröffentlichungspflege, Quellversionen, Validierung und Timeouts. Keine Backend-Secrets in App/Git.
- Aktuelle Goabase-Dokumentation gelesen. `offset` ist ein Datensatzoffset; OpenAPI 1.1.1 begrenzt ihn auf 40, `limit` auf 500. Große überlappende Schlussseite, Deduplizierung und expliziter Abbruch bei voller letzter Seite statt unbewiesener Vollständigkeit. Bis 539 Feedtreffer vollständig bestätigbar; darüber Goabase-Grenze klären. Auch begonnene/vergangene/abgesagte gespeicherte Events werden unabhängig vom Feed einzeln geprüft.
- Absagen/Verschiebungen ändern `status` und `is_published` gemeinsam. Kein fehlendes Event wird automatisch gelöscht/abgesagt. Quellenfehler einschließlich 404, ungültiger Daten oder fehlender Quellversion brechen den gesamten Batch vor Event-Schreibzugriffen ab. Drei parallele Details, acht Sekunden je Fetch/Body, 90 Sekunden Quellenbudget, 5.000 IDs als explizite Kapazitätsgrenze.
- [Datenbankentwurf](../../supabase/ops/03_goabase_sync_backend.sql) außerhalb automatischer Migrationen: privates Schema, 120-Sekunden-Lease mit Tokenprüfung/Commit-Sperre, atomarer Upsert auf vorhandenem UNIQUE-Index, separate Quellversionen. Ältere und gleich alte widersprüchliche Payloads werden abgewiesen. Bestehende Event-UUIDs bleiben erhalten. Nur `service_role` darf RPCs ausführen. **Noch nicht gegen Supabase ausgeführt.** Neuer Handler benötigt diese Vorbereitung und meldet ohne RPCs sicher 503.
- Verifiziert: **34 erfolgreiche Tests, nichts übersprungen**, einschließlich tatsächlicher SQL-Ausführung in flüchtiger PGlite/PostgreSQL-Testdatenbank (acht SQL-Untertests: Wiederholungen/UUIDs, Änderungen/Status, Versionen, Lease-Takeover, Rollback, Rechte). 17 Handler-/Quellentests und acht bestehende App-Tests. Expo-Lint, App-Typecheck und echter Deno-Typecheck erfolgreich. Deno-Lockfile ergänzt; keine App-Abhängigkeiten geändert. PGlite ausschließlich temporär außerhalb des Projekts installiert.
- Zusätzlich rein lesender Lauf der neuen Quellenlogik gegen Goabase erfolgreich: **32 entdeckt, 32 gültige Details, alle scheduled und alle mit kanonischem Original-Link**. Keine Supabase-Abfrage/kein Event-Import bei diesem Lauf. Die zuvor 31 gespeicherten Produktionszeilen wurden heute nicht erneut abgefragt oder verändert.
- Offene Abnahme: Supabase-Testprojekt mit tatsächlichen Constraints/RLS, echte Default-Key-Ablehnungstests und parallele HTTP-Aufrufe. Fehlende `dateModified`/404 blockieren konservativ; gleiche Version mit verändertem Inhalt erscheint als `rejected_versions`. Erste Übernahme kann keine historischen Quellversionen prüfen. Vor Rollout alte Schreiber pausieren, da die alte Function die neue Lease nicht kennt. Kategorie bleibt bisher `club`, weitere Inhaltsfelder nicht neu synchronisiert. Bei Wachstum Queue-/Checkpoint-Modell separat entwickeln.
- Nächster konkreter Schritt: [GOABASE_SYNC.md](../../GOABASE_SYNC.md) abarbeiten: Entwurf zuerst im separaten Testprojekt prüfen/ausführen, dort Function bereitstellen und abnehmen. Erst anschließend gesondert Produktion freigeben. Danach Vault mit passendem Default-Key, Jobbestand prüfen und höchstens einen inaktiven Zwei-Stunden-Job vorbereiten. Cron-Aktivierung bleibt ein späterer Schritt.

## Historie bis 03.11.2026

Die folgenden Abschnitte dokumentieren frühere Zustände. Aussagen über die unveränderte Originalfunktion und damals fehlende Tests gelten für diese historischen Stände; maßgeblich ist der aktuelle Abschnitt oben.

## Übergabe für morgen

- Auf Nutzerwunsch den heutigen Stand lokal committen; kein Push, kein Deployment und keine automatische Aktivierung.
- Einstieg: diesen Abschnitt sowie `supabase/functions/import-goabase/REVIEW.md` und `GOABASE_SYNC.md` lesen. Echte Supabase-Events funktionieren bereits in Spots; zuletzt 31 kommende Events mit GPS und 0 laufende Events verifiziert. Lokale Zugangswerte stehen ausschließlich in der ignorierten `.env.local`; `pws` ebenfalls ignoriert. Keine Secret-Werte in Dokumentation oder Commit aufnehmen.
- Der Dashboard-Originalcode liegt unverändert in `supabase/functions/import-goabase/index.ts`. Nächste Entwicklungsaufgabe ist eine lokal korrigierte Version: Pagination/Abgleich gespeicherter Events, konsistente Status-/Absagepflege, Batch-Deduplizierung, Timeouts/Validierung und Schutz vor veralteten/gleichzeitigen Läufen. Aktuelle Originalversion nicht als fertige automatische Synchronisierung behandeln.
- Zuletzt im Dashboard ausschließlich lesend bestätigt: passender UNIQUE-Index auf `(source, source_event_id)`, Verify JWT aus, Vault installiert, Cron nicht installiert. Kein Import aufgerufen, keine entfernte Function/DB/Policy geändert, kein Cron angelegt. Externe Scheduler und Status-Default bei Bedarf noch prüfen; Dashboard-Sitzung morgen gegebenenfalls erneut anmelden.
- Vor einem Deployment korrigierten Handler mit Deno und einer Testdatenbank abnehmen. Erst danach gegebenenfalls Supabase bereitstellen und genau einen Vault-gestützten Zeitplan `0 */2 * * *` aktivieren. Die SQL-Vorlagen sind gesperrt und nicht ausgeführt. `auth: 'secret'` akzeptiert aktuell den Secret-Key-Namen `default`; ein separater Key verlangt passende Handler-Konfiguration.
- Letzte erfolgreiche Prüfungen: 20 isolierte Tests, Expo-Lint und App-Typecheck. Deno-/Produktionsintegrationstests fehlen. Die Handler-Tests reproduzieren ausdrücklich auch bekannte Fehler. Design und Navigation erhalten; keine Backend-Secrets im Frontend.

## Aktuell: Original-Importer lokal gesichert und isoliert geprüft

- Den vom Nutzer übergebenen vollständigen Code unverändert unter `supabase/functions/import-goabase/index.ts` gespeichert. Eigene `deno.json` ergänzt; Expo-Typecheck schließt das separate Deno-Verzeichnis aus. Keine Frontend-Abhängigkeiten, keine UI-/Navigationsänderungen, keine Secrets im Quellcode ergänzt. Kein Deploy und kein Import gegen Produktion ausgeführt.
- Zwölf neue isolierte Tests führen den gespeicherten Handler mit künstlicher Quelle und In-Memory-Datenbank aus: stabiler Upsert-Schlüssel/UUID-Erhalt bei Wiederholung und Änderung, Ausblenden gelieferter Absagen sowie reproduzierbare Lücken bei fehlenden Absagen, 50er-Limit, doppelten Batch-IDs, Statuspflege, Validierung/Fehlerbehandlung und veralteten Antworten. Auth-Wrapper ist im Test ersetzt, Unique-Constraint vorausgesetzt; keine echte Auth-/Constraint-/Deno-Abnahme behauptet.
- Bewertung: für vollständige automatische Synchronisierung noch nicht freigegeben. Der Handler schreibt `status` nicht, fragt nur eine Seite ab und gleicht gespeicherte Quell-IDs nicht nach. Keine Laufserialisierung/Quellversion, kein Fetch-Timeout, rohe DB-Fehler und keine POST-Beschränkung. Detailbericht in `supabase/functions/import-goabase/REVIEW.md`; Sync-Anleitung korrigiert.
- `auth: 'secret'` akzeptiert gemäß aktueller Supabase-Dokumentation den Key namens `default`, nicht den zuvor vorgeschlagenen separaten Key. Vault-Anleitung entsprechend berichtigt. Im nun angemeldeten Dashboard rein lesend verifiziert: Verify JWT mit Legacy Secret ist aus; Vault ist installiert; Cron-Jobs-Seite meldet `Cron is not installed`. Keine Einstellungen verändert, keine Integration installiert, kein Cron-Job angelegt. Externe Scheduler nicht geprüft.
- Duplikatschutz zusätzlich rein lesend im Dashboard bestätigt: `events_source_source_event_id_key` ist ein vollständiger UNIQUE-Btree-Index auf `(source, source_event_id)` und passt zum vorhandenen `onConflict`. Kein Index geändert. Das schützt wiederholte Inserts, nicht vor veralteten überschreibenden Updates oder doppelten IDs innerhalb desselben Batches.
- Verifiziert: alle 20 Tests (acht bestehende plus zwölf Handler-Tests), `npx expo lint` und `npx tsc --noEmit` erfolgreich. Die grünen Reproduktionstests dokumentieren auch fehlerhaftes Verhalten; sie sind keine Produktionsfreigabe. Deno-Typecheck und echte Testdatenbank-/Auth-Tests stehen aus.
- Nächste Schritte: Status-Default bei Bedarf prüfen; eine lokal korrigierte Importerversion separat vorbereiten und im Testprojekt auf Pagination, Änderungen/Absagen, Idempotenz und veraltete/gleichzeitige Läufe prüfen. Erst nach Freigabe bereitstellen und Zeitplan aktivieren. Bestehende Supabase-Function bleibt unverändert.

## Aktuell: Automatische Goabase-Synchronisierung vorbereitet, noch nicht aktiviert

- Bestehende App, Supabase-Dokumentation und Repository geprüft. Kein Quellcode von `import-goabase`, keine bisherige Cron-Konfiguration im Repository. Dashboard im integrierten Browser nicht angemeldet; entfernte Cron-Jobs, Vault-Einträge und Unique-Constraints sind deshalb nicht verifiziert. Keine Behauptung, dass dort kein Job existiert.
- Vollständigen Dashboard-Handler, eigene importierte Hilfsdateien, aktuelle Verify-JWT-Einstellung und erwarteten POST-Body angefragt; Secret-Werte werden nicht benötigt. Ohne diesen Code sind bestehender Upsert, Änderungs-/Absageverarbeitung und Authentifizierung nicht abgenommen.
- `GOABASE_SYNC.md` ergänzt: genaue Dashboard-Schritte, Bestandsprüfung, Backend-Vertrag, Vault-Aufrufe, Testfälle, Aktivierung und Pausieren. Ziel ist `0 */2 * * *` in UTC/GMT. Neue SQL-Dateien unter `supabase/ops/` liegen bewusst außerhalb von Migrationen: zwei rein lesende Prüfungen und eine standardmäßig gesperrte Vorlage, die nach Prüfung höchstens einen inaktiven Job vorbereitet. Vorhandene Kandidaten werden weder dupliziert noch verändert. Indirekte Wrapper/externe Scheduler benötigen zusätzliche manuelle Prüfung.
- Ausschließlich lokale Dateien geändert und öffentliche API lesend geprüft; kein Import aufgerufen, keine SQL-Vorlage gegen Supabase ausgeführt, keine Datenbank/Policies/Functions/Jobs verändert oder aktiviert. SQL-Vorlagen sind ohne PostgreSQL-Testlauf noch nicht als produktionsreif verifiziert. Es gibt hier weder psql noch Deno als verfügbare Prüfwerkzeuge.
- Rein lesender Audit der öffentlich sichtbaren Daten: 31 Goabase-Events, alle `scheduled`; keine doppelten/fehlenden Quell-IDs in diesen Zeilen. Alle 31 `source_url` sind HTTPS-Goabase-Links mit passender Quell-ID; zwei Stichproben (117895, 118240) liefern HTTP 200. Verdeckte/unveröffentlichte Zeilen sind damit nicht geprüft. Bestehender Goabase-Backlink in Details und Teilen bleibt erhalten.
- Datenzugriff zusätzlich abgesichert: Alle Ansichten laden nur `is_published = true AND status = 'scheduled'`; Adapter kontrolliert den Status ebenfalls. Abgesagte, entfernte oder noch unbestätigt verschobene Events werden selbst bei versehentlich wahrem Veröffentlichungsflag nicht angeboten. Backend muss Status und Flag weiterhin korrekt aktualisieren. Layout und Navigation unverändert.
- Verifiziert: acht automatisierte Tests inklusive Statusausschluss sowie Lint und Typecheck erfolgreich. Anforderungen an stabilen `(source, source_event_id)`-Upsert, UUID-Erhalt, korrekte Änderungen/Absagen, vollständige Quellabfragen und Schutz vor parallelen/veralteten Läufen dokumentiert, nicht fälschlich als im entfernten Importer umgesetzt bezeichnet.
- Nächste Schritte: Handler und Ergebnisse der rein lesenden Admin-Prüfungen bereitstellen; vorhandenen Job weiterverwenden; Importer/Constraints/Authentifizierung in einem Testprojekt abnehmen; erst dann Vault konfigurieren und genau einen geprüften Zwei-Stunden-Job aktivieren. Keine Backend-Secrets in Expo oder Git ergänzen.

## Aktuell: Supabase-Schema abgeglichen und reale Verbindung geprüft

- Das bereitgestellte Schema bestätigt UUID-IDs, `genre` als Text, `is_published` als Boolean sowie Start-/Endzeit mit Zeitzone. Die Zuordnung nutzt jetzt `genre` statt `genres` und `is_published = true` statt der vorläufigen Statusannahme. Nicht-UUIDs werden vor Detail-/Merkliste-Abfragen abgefangen. Tests entsprechend angepasst.
- Vorhandene `.env.local` enthielt `NEXT_PUBLIC_SUPABASE_*`; ausschließlich die Namen auf `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` korrigiert. Werte unverändert und nicht protokolliert. `.env.local` und `pws` werden ignoriert und sind nicht versioniert. Bestehende Expo-Web-Vorschau neu gestartet, damit sie die korrigierten Namen einliest.
- Echter Lesezugriff mit dem Supabase-SDK erfolgreich: 31 veröffentlichte kommende Events, alle 31 mit GPS, 0 laufende Events weltweit. Detail- und Merkliste-Abfrage für ein echtes Event liefern jeweils einen Datensatz. Alle 31 haben derzeit keine Genreangaben; keine Genre-Zuordnung erfunden. Keine Supabase-Daten, Policies oder Importfunktionen verändert.
- Verifiziert: Typecheck, sieben automatisierte Daten-/Abfragetests und Lint nach der Schemaanpassung erfolgreich. Browser bei 375 × 812 zeigt nach Serverneustart 31 echte Events in Entdecken; die direkt geöffnete Detailseite für Cosmic Drift Vol. V lädt Bild, Stadt, Start-/Endzeit und Goabase-Link. Einrichtungsdokumentation aktualisiert. Native Gerätetests und ein vollständiges RLS-Audit bleiben offen.

## Vorher: Supabase-Anbindung vorbereitet – reale Verbindung noch offen

- Bestehende Projektstruktur, Navigation, Datenquelle und SDK-Version geprüft. Expo SDK 58 sowie aktuelle Expo-/Supabase-Dokumentation gelesen. Nur `@supabase/supabase-js` und `react-native-url-polyfill` mit `npx expo install` ergänzt; keine nativen Projektverzeichnisse erzeugt.
- Gemeinsamer, verzögert initialisierter Supabase-Client unter `src/lib/supabase.ts`; ausschließlich `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Öffentliche Lesezugriffe ohne Anmeldung/Session; Secret-/Service-Role-Keys nicht vorgesehen. Leere `.env.example` ergänzt, lokale Env-Dateien ausgeschlossen; `/pws` bleibt ignoriert.
- Gemeinsamer Eventtyp, zentraler Schemaadapter und Eventprovider: Entdecken lädt veröffentlichte zukünftige Events; Radar und „Alle ansehen“ ausschließlich laufende Events mit gültigem GPS und bestätigter Endzeit (`Start <= jetzt < Ende`). Umkreis/Genre gelten ab aktueller Kartenmitte. Vorhandene Demo-Daten bleiben als Datei erhalten, werden aber nicht mehr von Ansichten importiert und dienen niemals als Fehler-Fallback.
- Bestehende Karten, Marker, Animationen, Tabs, Styling und lokale Merkfunktion weiterverwendet. Details laden nach ID, auch bei direktem Einstieg; Merkliste lädt veröffentlichte gespeicherte Events einschließlich vergangener Termine. Frühere Demo-IDs bleiben lokal erhalten, werden aber nicht als echte Events dargestellt. Originalgenres bleiben sichtbar; unbekannte Genres werden nicht künstlich als Techno/House klassifiziert.
- Lade-, Fehler- und Leerzustände mit Wiederholen, Pull-to-refresh auf Entdecken/Live-Liste, Zeitlimit und Abbruch veralteter Requests. Vordergrundaktualisierung ungefähr jede Minute und bei App-Rückkehr; Zeitgrenzen entfernen abgelaufene Einträge. Quell-/Ticketlinks nur für HTTP(S), Symbolfoto bei fehlendem Bild. Keine erfundenen Endzeiten oder Live-Zahlen.
- **Offen und ausdrücklich nicht verifiziert:** Das entfernte `public.events`-Schema und öffentliche Projektwerte fehlen. `src/services/eventSchema.ts` enthält eine als vorläufig markierte Zuordnung, aktuell unter anderem `status = 'published'`, `starts_at`, `ends_at`, `latitude`, `longitude`. Inhaltsfelder ebenfalls vorläufig. Vor realem Einsatz mit dem tatsächlichen Schema abgleichen; bestehende Tabelle/Importer nicht an die Annahmen anpassen. Das Schema wurde beim Nutzer angefragt. Der erfolgreiche Goabase-Import mit 31 Zeilen ist Nutzerangabe, kein in dieser Sitzung verifizierter API-Abruf.
- Keine bestehenden Dateien gelöscht; keine entfernten Supabase-Daten, RLS-Policies oder Edge Functions verändert. Keine Veröffentlichung, kein Import aus dem Client. Anonymous SELECT/RLS und Öffentlichkeit der Venue-/GPS-Daten müssen im vorhandenen Projekt geprüft werden. Rein lesende Schemaabfrage und Einrichtung/Testablauf in `SUPABASE_SETUP.md`.
- Verifiziert: `npx expo lint`, `npx tsc --noEmit` und sieben automatisierte Daten-/Abfragetests erfolgreich. Browser bei 375 × 812: Radar/Entdecken zeigen ohne Konfiguration den Einrichtungshinweis, Navigation funktioniert. Kein echter Datenabruf, keine erfolgreiche Darstellung der 31 Veranstaltungen und keine nativen Gerätetests behauptet.
- Grenzen/Nächste Schritte: tatsächliches Schema und Projektwerte ergänzen, RLS/anon prüfen, echte Events samt Bildern/Details/Merken auf iOS und Android testen. Bei ausschließlich zukünftigen Events bleibt Radar korrekt leer. Abfragen paginiert, Radius lokal; für größere Bestände räumliche Serverabfragen ergänzen. Anmeldung, Live-Snaps und Kontosynchronisierung bleiben separate Aufgaben.

## Aktuell: Sieben Testpartys für den 03.11.2026

- Fünf ausdrücklich fiktive Testpartys in Karlsruhe ergänzt: Fächernacht (21:00), House Glow (22:00), Südstadt Groove (20:00), Weststadt Club Night (23:00) und Oststadt Bass (22:30).
- Zwei ausdrücklich fiktive Testpartys in Berlin ergänzt: Spree Pulse (23:00) und Kreuzberg House Vibes (21:30).
- Feste Termine am 03.11.2026 mit Berliner Zeitzonenoffset; keine automatische tägliche Neudatierung. Bestehende Events und gespeicherte IDs bleiben erhalten. Die gemeinsame Eventquelle versorgt Radar, Heute, Entdecken und Detailseiten mit den bestehenden Datums-, Genre- und Entfernungsfiltern.
- Ausschließlich Beispielgebiete und vorhandene Symbolfotos; keine echten Veranstaltungen, bestätigten Locations oder privaten Adressen. Kein Backend und keine Veröffentlichung echter Events.
- Verifiziert: `npx expo lint`, `npx tsc --noEmit` und Editor-Diagnosen erfolgreich. Datenprüfung bestätigt genau sieben neue Testpartys am 03.11.2026 (fünf Karlsruhe, zwei Berlin), feste Termine mit CET-Offset, Testkennzeichnung und eindeutige IDs. Keine Browser- oder nativen Gerätetests dieser Ergänzung. Nächster Schritt: bei gewählter Stadt im Radar und Heute-Filter prüfen; echte Veranstaltungsdaten weiterhin separat anbinden.

## Aktuell: Glaskarten und Testpartys auf Gemerkt

- Nur die Eventkarten auf Gemerkt nutzen jetzt die bestehende GlassBackdrop-Komponente (Variante card): natives Liquid Glass auf unterstützten iOS-Geräten mit Berücksichtigung reduzierter Transparenz; bestehender statischer Glasverlauf auf Android/Web. Kopf- und Infobereich erhalten keinen zusätzlichen Glaseffekt. Herz oben rechts entfernt; ausgefülltes Herz ersetzt das Lesezeichen neben „Deine Spots. Für später.“.
- Drei ausdrücklich fiktive Testpartys mit festen Terminen ergänzt: Midnight Pulse (Karlsruhe, 02.11.2026), Velvet House (Karlsruhe, 06.11.2026) und Neon Club (Berlin, 07.11.2026). Sie stehen in Entdecken und den jeweils passenden Radar-/Datumsfiltern bereit. Keine echten Veranstaltungsorte oder privaten Adressen; Termine rollen nicht automatisch weiter.
- Alle drei Testpartys über die regulären Merkbuttons in der laufenden Browser-Vorschau auf Port 8081 gespeichert; keine automatische Befüllung anderer Geräte oder Wiederherstellung nach manuellem Entfernen.
- Verifiziert: drei gespeicherte Testpartys nach Neuladen, Suche und Detailnavigation bei 320/375 px. Lint und Typecheck erfolgreich. Native Liquid-Glass-Darstellung weiterhin auf einem iPhone zu prüfen.

## Aktuell: Gemerkt und lokale Merkfunktion

- Neuer Reiter „Gemerkt“ zwischen Entdecken und Profil: dunkle Eventliste im Spots-Design, Anzahl, Suche nach Name/Ort/Genre, Such-Leerzustand mit Zurücksetzen sowie initialer Leerzustand mit Link zu Entdecken. Eventkarten öffnen die bestehenden Detailseiten. Vergangene Termine sind anhand des Berliner Kalendertags gekennzeichnet; die Liste zeigt absolute Termine.
- Funktionierende Herzen auf Entdecken-Karten, der Heute-Liste und Eventdetails. Entfernen direkt in der Merkliste; zusätzlicher Zugang über das Profil. Radar bleibt unverändert, seine Events können über die Details gemerkt werden.
- Gemeinsamer SavedEventsProvider oberhalb des Router-Stacks; Speicherung ausschließlich von Event-IDs unter `spots.saved-events.v1` mit dem über `npx expo install` eingebundenen SDK-kompatiblen Async Storage 2.2.0. Keine Anmeldung, kein Backend und keine Synchronisation zwischen Geräten. Die frühere Aussage „Speicherung nicht implementiert“ in älteren Einträgen ist damit überholt.
- Speichervorgänge sind gegen parallele Betätigungen gesperrt; die sichtbare Auswahl wird erst nach erfolgreichem Schreiben geändert. Lade- und Schreibfehler erhalten sichtbare Hinweise und Wiederholungsmöglichkeiten. Gespeicherte Daten werden beim Laden validiert; unbekannte Event-IDs werden nicht als erfundene Events dargestellt.
- Browserprüfung bei 375 × 812 und 320 × 640: Merken in Entdecken, Wechsel zu Gemerkt, Erhalt nach Neuladen, Suche ohne Treffer/Zurücksetzen, Eventdetail öffnen, Entfernen/erneutes Merken in Details und Entfernen bis zum Leerzustand erfolgreich. `npx expo lint`, `npx tsc --noEmit` und Editor-Diagnosen erfolgreich.
- Grenzen: ausschließlich bestehende, fiktive Events; keine echten Veranstaltungsdaten. Native Geräte und native Speicherung noch nicht geprüft. Bestehende eigene Development Builds müssen für das neue native Modul neu gebaut werden. Als Nächstes native Bedienung/Persistenz und Speicherfehler auf Geräten prüfen; später echte Eventquelle und optional Kontosynchronisierung ergänzen.

## Aktuell: Radar startet mit 10 km

- Der Radar startet beim App-Start mit einem Umkreis von 10 km; der Radius ist weiterhin über den Filter einstellbar und wird an die „Alle ansehen“-Seite übergeben.

## Aktuell: Kartenraster für Entdecken

- Als Alternative zur einspaltigen Liste zeigt Entdecken Events in einem zweispaltigen, dunklen Kartenraster mit Bild und kompakten Informationen. Suche, Filter, Kalender und Eventlinks bleiben bestehen; einzelne letzte Karten bleiben halbbreit.

## Aktuell: Kalenderbutton in der Entdecken-Kopfzeile entfernt

- Das Kalender-Icon oben rechts ist entfernt; der Kalender bleibt über „Datum wählen“ erreichbar.

## Aktuell: Entdecken neu gestaltet

- Entdecken als ruhigere, einspaltige Eventliste überarbeitet: zurückhaltende dunkle Karten mit kleinen Symbolfotos, klaren Metadaten und dezenten Spots-Akzenten statt großformatiger, farbintensiver Kacheln.
- Suche, kompakter Genre-Filter, Zeitraum-Schnellfilter und Kalender mit exakter Datumsauswahl bleiben verfügbar. Inhalte scrollen als eine Liste; die untere Navigation und ihr Schutzabstand bleiben erhalten. Demo-Kennzeichnung und Event-Detailnavigation bleiben bestehen.
- Bestehende Demo-Daten und bestehende Filtersemantik unverändert; Speicherung ist weiterhin nicht implementiert.
- Browserprüfung bei 320 × 640 und 375 × 812: Suche, Genreauswahl, Datum 30.10., Eventdetail und Tabwechsel funktionieren. Lint, Typecheck und Editor-Diagnosen erfolgreich; native Gerätetests stehen aus.

## Aktuell: Überschrift leicht angehoben

- Überschrift und Unterzeile auf „Alle Spots“ um 8 px nach oben versetzt; die Position von Filter und Eventliste bleibt gleich.

## Aktuell: Vereinfachte obere Leiste

- Auf der „Alle Spots“-Seite wurden der kleine Text „Deine Nacht“ und der Kartenbutton rechts entfernt. Der Radar-Zurückbutton links bleibt erhalten.

## Aktuell: Filter an der Eventliste

- Abstand zum Titelbild liegt nun vor dem Filter statt zwischen Filter und Liste. Der Filter sitzt somit direkt über dem Demo-Hinweis und den Eventkarten; das Öffnen von Kategorie- und Umkreisauswahl bleibt unverändert.

## Aktuell: Mehr Platz für das Titelbild

- Die Eventliste inklusive Demo-Hinweis beginnt ungefähr eine Kartenhöhe weiter unten. Überschrift und Filter bleiben an ihrer Position; beim Scrollen bleibt die Liste vollständig erreichbar.

## Aktuell: Umkreis im Filterbereich

- Die ausgeschriebene Umkreiszeile auf „Alle Spots“ entfernt. Der bestehende Filter öffnet nun Kategorieauswahl und Umkreisregler gemeinsam; der Bereich bleibt nach einer Kategorieauswahl offen und lässt sich über den Filterbutton schließen. Auswahl und Umkreis wirken weiterhin auf die Liste.

## Aktuell: Feinschliff zurückgenommen

- Auf Nutzerwunsch die Änderungen des letzten Feinschliffs zurückgenommen: ursprüngliche Abstände, Kartenfarben und Anordnung von Umkreis und Filter wiederhergestellt. Das zuvor bestätigte DJ-Bild und alle Funktionen bleiben unverändert.

## Aktuell: Feinschliff für „Alle Spots“

- Bestehendes DJ-Foto, Bildausschnitt und grundsätzlichen Seitenaufbau beibehalten. Titel in der oberen Leiste unabhängig von den unterschiedlich breiten Tasten zentriert, Abstände und Kontraste verfeinert.
- Kategorie und Umkreis als kompakte nebeneinanderliegende Bedienelemente mit klaren 44-px-Touchflächen; bei wenig Platz umbrechend. Neue Listenüberschrift und separate Demo-Kennzeichnung verdeutlichen die Hierarchie.
- Eventkarten dezent abgedunkelt und Abstände optimiert, genreabhängige Akzentfarben und Herz bleiben erhalten. Bestehende Filter, Umkreis und Eventnavigation unverändert.

## Aktuell: DJ-Foto ohne Seitenränder

- Foto-Hintergrund passt seine Höhe proportional an das Seitenverhältnis des DJ-Bildes (768 × 960) an, sodass es bildschirmbreit und ohne seitliche Balken vollständig eingepasst wird. Die Liste liegt weiterhin darüber; dunkle Verläufe sorgen für Lesbarkeit.

## Aktuell: Tatsächliche Verkleinerung des DJ-Fotos

- Bildfläche explizit auf Breite und Höhe des Kopfbereichs begrenzt. Damit überschreiben im Browser die ursprünglichen Bildabmessungen die Einpassung nicht mehr; das vollständige Motiv wird mit `contain` skaliert. Die vorherige Änderung des Resize-Modus allein war im Browser nicht ausreichend.

## Aktuell: DJ-Foto vollständig eingepasst

- Das DJ-Foto im Kopfbereich der „Alle ansehen“-Seite wird proportional vollständig eingepasst, statt als stark vergrößerter Ausschnitt dargestellt. Der dunkle Hintergrund und der Verlauf für lesbare Schrift bleiben erhalten.

## Aktuell: Neues DJ-Bild im Kopfbereich

- Das neu vom Nutzer bereitgestellte DJ-Foto `today-hero-dj.png` wird probeweise im Kopfbereich der „Alle ansehen“-Seite verwendet. Layout, Abdunklung, Filter und Eventkarten unverändert; bisherige Fotos bleiben erhalten.

## Aktuell: Kompakter Kategoriefilter

- In „Alle Spots in deiner Nähe“ ist nur „Spots“ pink; der restliche Überschriftentext ist weiß.
- Die dauerhaft sichtbare Kategorie-Leiste wurde durch einen Filterbutton ersetzt. Ein aufklappbarer Bereich bietet weiterhin alle bestehenden Kategorien als Einzelauswahl; nach der Auswahl schließt er sich und der Button zeigt einen aktiven Filter. Umkreis und Radar-Kontext bleiben unabhängig erhalten.

## Aktuell: Herzsymbol auf Eventkarten

- Auf der „Alle ansehen“-Liste ersetzt ein Herz ohne Beschriftung das Lesezeichen mit „bald“. Die Anzeige ist weiterhin keine Speicherfunktion; die gesamte Karte öffnet wie bisher die Eventdetails.

## Aktuell: Überschrift und vorheriges Kartendesign

- Überschrift auf „Alle Spots in deiner Nähe“ geändert. Eventkarten verwenden auf Wunsch wieder ihre vorherigen genreabhängigen Verläufe und Akzent-Chips; das zuletzt ausgewählte Headerbild bleibt unverändert.

## Aktuell: Ruhigere „Deine Nacht“-Seite

- Das zuvor vom Nutzer bereitgestellte Partyfoto `today-hero.png` ersetzt das Symbolfoto im oberen Kopfbereich; die übrige Seite behält den dunklen Hintergrund der ursprünglichen Gestaltung.
- Eventkarten verwenden denselben zurückhaltenden dunklen Violettverlauf und neutrale Genre-Chips statt genreabhängig wechselnder Farben. Aufbau, Spots-Akzente, Filter und Eventfunktionen bleiben erhalten.

## Aktuell: Ursprüngliche „Alle ansehen“-Gestaltung wiederhergestellt

- Auf Nutzerwunsch die erste Gestaltung der neuen „Deine Nacht“-Seite wiederhergestellt: ursprüngliches `nightlife.jpg` nur im Kopfbereich, dunkle Verläufe und genreabhängig getönte Karten wie in der ersten Version. Ganzseitiges Foto und nachträglich hinzugefügte Glaskarten entfernt; die hochgeladenen Fotos bleiben als Assets erhalten.

## Aktuell: Hintergrundbild verschoben

- Das ganzseitige Foto auf „Alle ansehen“ ist nach links verschoben; es füllt den Hintergrund weiterhin ohne freie Ränder. Karten und Lesbarkeitsverlauf bleiben unverändert.

## Aktuell: Ganzseitiges Foto und Glaskarten auf „Alle ansehen“

- Nutzerfoto liegt bildschirmfüllend hinter der Heute-Unterseite und bleibt beim Scrollen fest stehen; durch proportionalen Cover-Zuschnitt können Bildränder abgeschnitten werden. Ein dunkler Verlauf schützt die Lesbarkeit.
- Eventkarten verwenden wiederverwendbares GlassBackdrop mit ruhiger, dunkler Tönung: natives Liquid Glass auf unterstützten iOS-Geräten, statischer Glaseffekt ohne Blur auf Android und im Browser. Inhalte, Genre-Chips und Eventnavigation unverändert.
- Browserprüfung: Hintergrund über vollständige 375 × 812 Ansicht, House-Filter drei Treffer und Eventdetails erreichbar. Lint und Typecheck erfolgreich; native Glasdarstellung und Performance noch nicht auf Geräten geprüft.

## Aktuell: Ruhigeres „Alle ansehen“-Design

- Headerfoto wird proportional eingepasst, sodass mehr vom gesamten Bild statt eines stark vergrößerten Ausschnitts sichtbar ist; der dunkle Lesbarkeitsverlauf bleibt erhalten.
- Eventkarten und ihre Genre-Chips auf ein einheitliches dunkles Farbschema umgestellt; genreabhängige bunte Hintergründe entfernt. Eventbilder, Inhalte und Aktionen bleiben unverändert.
- Browserprüfung: Headerfoto geladen und alle zehn Demo-Eventkarten mit derselben Hintergrundfarbe. Lint und Typecheck erfolgreich; native Darstellung nicht auf Geräten geprüft.

## Aktuell: Ausgetauschtes Headerbild

- Das neu vom Nutzer bereitgestellte Partyfoto `assets/events/today-hero-party.png` ersetzt das vorherige Headerbild auf der „Alle ansehen“-Seite; der dunkle Verlauf bleibt erhalten. Das vorherige Foto bleibt als Asset erhalten.

## Aktuell: Eigenes Headerbild für „Alle ansehen“

- Vom Nutzer bereitgestelltes Partyfoto als lokale `assets/events/today-hero.png` eingebunden, ausschließlich im Kopfbereich der Heute-Unterseite. Dunkle Lesbarkeitsverläufe bleiben erhalten; Eventbilder und Filter unverändert.
- Browser bestätigt erfolgreich geladenes Headerbild (564 × 847 Pixel). Lint und Typecheck erfolgreich. Bildherkunft in der Asset-Dokumentation separat von Unsplash vermerkt.

## Aktuell: Neue „Deine Nacht“-Liste nach Designvorlage

- Radar → „Alle ansehen“ öffnet eine neu gestaltete Heute-Seite mit vorhandenem Party-Symbolfoto als abgedunkeltem Hintergrund, eigener Safe-Area-Kopfleiste, Radar-Zurückknopf, Kartenknopf und „Die Nacht ruft.“ mit Spots-Akzentfarbe.
- Horizontale Genre-Chips mit SVG-Icons und aufklappbarer Umkreisregler (10–50 km). Änderungen bleiben in den URL-Parametern dieser Liste; Radar-Zentrum und anfängliche Filter werden weiterhin vom Radar übernommen. Heute-/05:00-Nachtregel unverändert, Demo-Hinweis und Leerzustand vorhanden.
- Eigene kompakte Eventkarten: Bild links, Kategorien oberhalb des Titels, Datum/Ort, dezente farbige Verläufe und Detailpfeil. Lesezeichen ausdrücklich als „bald“ markiert; keine nicht vorhandene Speicherfunktion vorgetäuscht. Bestehende Eventkarten auf Radar/anderen Seiten unverändert.
- Route delegiert an TodayEventsScreen außerhalb des Routenordners; TodayEventCard als kleine separate Komponente. Keine neuen Abhängigkeiten oder Eventdaten/Bilder ergänzt, statische Verläufe statt zusätzlicher Blur-Ebenen auf Android.
- Browserprüfung bei 320 × 640 und 375 × 812: Karten 108 px hoch, zehn Karlsruhe-Demos, House-Filter drei Treffer, Umkreis auf 10 km, Eventdetails und Kartenrückkehr erfolgreich. Lint und Typecheck erfolgreich; native Darstellung weiterhin ohne Gerätetest.

## Aktuell: Automatischer Radar-Standort und Suche schließen

- Radar fragt bei jedem Öffnen/Fokussieren einmalig den Vordergrundstandort ab und zentriert darauf, ohne neuen Radar-Scan oder laufendes Standorttracking. Vorhandene frische Positionen werden weiter genutzt; manuelle Stadtauswahl bleibt während des Radarbesuchs möglich.
- Erstmalige Standortfreigabe wird angefragt; abgelehnte Freigaben werden bei automatischen Tabbesuchen nicht erneut angefordert. Ohne Freigabe, ausgeschalteten Diensten oder bei Fehlern bleibt die bisherige Karte mit erklärendem Hinweis nutzbar. Manuelle Standorttaste weiterhin verfügbar; eine zwischenzeitliche Stadtauswahl wird nicht von alten Standortantworten überschrieben.
- Tippen außerhalb der Radar-Städtesuche schließt Tastatur und Ergebnisliste und leert die Suche. Touch-/Pointer-Ereignisse innerhalb der Suche bleiben geschützt, damit Eingabe und Ergebniswahl funktionieren. Auch Verlassen des Radar-Tabs schließt die Suche.
- Verifiziert im Browser: automatische Zentrierung bei Tab-Rückkehr mit vorübergehend simuliertem Karlsruhe-Standort (Browserfunktionen anschließend wiederhergestellt), Suchfokus und Ergebnisliste nach Klick auf Karte geschlossen. Lint, Typecheck und Editor-Diagnosen erfolgreich. Reale GPS-/Berechtigungsdialoge sowie Bildschirmtastaturen auf iOS/Android noch auf Geräten prüfen.

## Aktuell: Frei schwebende, kompakte Navigation

- Vollbreitenbalken hinter der Navigation entfernt: Die gemeinsame Glas-Kapsel liegt absolut über dem Inhalt, mit 24 px Seitenabstand, 60 px Höhe und sicherem Abstand zur unteren Systemleiste. Plattformgerechte Glas-Ersatzdarstellung bleibt erhalten.
- „Heute in deiner Nähe“ reicht auf dem Radar bis zum unteren Bildschirmrand; der bisherige Panelverlauf bleibt ohne Glas. Listeninhalt und Demo-Hinweis bleiben oberhalb der Navigation erreichbar.
- Iconflächen auf 30 × 28 px verkleinert, Beschriftungen direkt darunter. Gemeinsame Abstandsdefinition schützt auch die scrollbaren Inhalte in Entdecken und Profil vor Überdeckung.
- Verifiziert im Browser bei 375 × 812 und 320 × 640: Panel endet exakt am Bildschirmrand, Kapsel 60 px hoch, kein opaker Navigationsbalken. Alle drei Tabwechsel erfolgreich; Radar-Label rund 2,5 px unter dem Icon. Lint und Typecheck erfolgreich. Native Safe-Area-/Glasdarstellung noch ohne Gerätetest.

## Aktuell: Gemeinsame Glas-Kapsel der Navigation

- Radar, Entdecken und Profil liegen gemeinsam in einer abgerundeten Glas-Kapsel, statt jeweils in einem einzelnen Kreis. Icons und Beschriftungen bleiben getrennt anklickbar; aktive Auswahl weiterhin pink.
- Gemeinsame Fläche mit seitlichem Abstand und Safe-Area-Abstand unten. iOS verwendet bei Verfügbarkeit natives Liquid Glass, Android/Browser weiterhin die statische Variante ohne Blur.
- Einzelne Icon-Glasflächen und ihre Ringkonturen entfernt. Partydaten und die 05:00-Nachtregel unverändert.

## Aktuell: Glas-Iconkreise und Partynacht bis 05:00

- Untere Navigation mit je einer 44-px-Glasfläche direkt um Radar-, Entdecken- und Profilicon; aktive Auswahl mit Akzentkontur. Labels und restlicher Navigationshintergrund bleiben ohne Glas. Gemeinsame [GlassTabIcon](../../src/components/GlassTabIcon.tsx)-Komponente verwendet die vorhandene iOS-/Android-Ersatzlogik.
- Die zehn Karlsruhe-Demos haben feste neue Termine am **29.10.2026** um 21/22 Uhr, ohne doppelte Events. Sie bleiben ausdrücklich fiktive Beispiele und werden nicht automatisch täglich neu datiert.
- [partyWindowKey](../../src/utils/events.ts) definiert die Nachtregel in `Europe/Berlin`: zwischen 00:00 und 04:59 enthält die Heute-Auswahl zusätzlich den vorherigen Veranstaltungstag. Ab 05:00 entfällt der Vortag; Events des aktuellen Kalendertages bleiben enthalten.
- Radar, Heute-Unterseite und Heute-Schnellfilter in Entdecken nutzen dasselbe Partyfenster. Der normale Monatskalender filtert weiterhin nach exaktem Kalenderdatum. Aktualisierung alle 30 Sekunden und beim Zurückkehren in den Vordergrund.
- Verifiziert: zehn Karlsruhe-Pins und Listeneinträge, Tabwechsel ohne neuen Scan, Navigation in mobiler Browsergröße. Zeitchecks für Mitternacht, exakt 05:00, Sommer-/Winterzeitwechsel und Jahreswechsel erfolgreich. Lint und Typecheck erfolgreich; native Glasoptik weiterhin ohne Gerätetest.

## Aktuell: Glas-Ausnahmen auf Radar und Navigation

- „Heute in deiner Nähe“ auf dem Radar verwendet wieder den bisherigen violett-pinken Panelverlauf ohne Glas; auch die Eventkarten innerhalb dieses Panels nutzen keine Glasoptik.
- Untere Navigation (Radar, Entdecken, Profil) wieder mit normalem App-Verlauf statt GlassBackdrop.
- Kilometeranzeige und Standorttaste auf der Karte wieder mit ihren normalen dunklen Hintergründen, ohne native oder statische Glasdarstellung.
- Übrige Glasflächen unverändert, insbesondere Suche, Filter-/Kalenderdialoge, Eventdetails und Profil.

## Aktuell: Plattformgerechte Glasgestaltung

- SDK-kompatibles `expo-glass-effect` 58.0.5 über `expo install` ergänzt. Gemeinsame dekorative [GlassBackdrop](../../src/components/GlassBackdrop.tsx)-Schicht mit separater [iOS-Implementierung](../../src/components/GlassBackdrop.ios.tsx).
- Echtes natives Liquid Glass nur bei verfügbarer iOS-26-API/kompatiblem Build und erlaubter Transparenz. Ein zentraler [GlassProvider](../../src/components/GlassProvider.tsx) berücksichtigt „Transparenz reduzieren“ und Änderungen während der Laufzeit. Bei fehlender API/native Modul wird die statische Ersatzdarstellung genutzt.
- Android und Browser verwenden ausschließlich die statische [Glasoptik](../../src/components/GlassFallback.tsx) mit getönten Flächen, sanftem Verlauf und hellen Kanten – kein BlurView, Backdrop-Filter oder Glas-Animation. Die iOS-spezifische native Implementierung wird nicht in Android eingebunden.
- Eingesetzt in unterer Navigation, Städtesuche, Suchfeld/Kalenderknopf, inaktiven Genrefiltern, Radar-Panel, Radius-/Standorttaste, Filter-/Kalenderdialogen, Eventlisten, Event-Metadaten, Detail-Aktionen/Ticketbereich und Profil-Infokarte. Spots-Farben und sämtliche Interaktionen bleiben erhalten; „Alle ansehen“ bleibt ohne Buttonfläche.
- Animierte Eventkarten, gedimmte Aktionen und dichte Listen nutzen absichtlich nur die statische Variante. Kein Glas auf den Karten-Pins und keine neue Vollbild-Blur-Ebene.
- Browser geprüft: Kalenderdatum, Eventnavigation/Detailreiter, Profil, Radar-Filter und 10-km-Minimum. Android- und iOS-Produktionsbundles erfolgreich exportiert. Lint und Typecheck erfolgreich.
- Native Optik, Barrierefreiheitseinstellungen und FPS noch nicht auf echten Geräten gemessen; keine Garantie identischer Laufzeitperformance. Für native Glasfunktionen ggf. neuen Development-Build erstellen (oder eine passende Expo-Go-Version verwenden); ältere Builds fallen auf statische Flächen zurück.

## Aktuell: Monatskalender, neue Texte und Vorschau per Außentipp

- Kalenderknopf auf Entdecken öffnet einen echten Monatskalender mit Montag als Wochenbeginn, Monatsnavigation, markierten Demo-Eventtagen und deaktivierten vergangenen Tagen. Eigene Komponente [EventCalendar](../../src/components/EventCalendar.tsx), ohne neue Abhängigkeiten.
- Datumswahl filtert exakt nach dem Veranstaltungstag von `startsAt` in `Europe/Berlin`. Suchtext und Genre bleiben aktiv; der gewählte Tag ist sichtbar und entfernbar. Schnellfilter entfernen die exakte Datumswahl, „Alle Termine anzeigen“ setzt den Zeitraum zurück.
- Neuer Entdecken-Text: „Deine Nacht wartet. Finde den Beat, der dich rauszieht.“ Die Heute-Unterseite heißt „Die Nacht ruft.“ mit „Dein Abend. Dein Beat. Deine Spots.“; Heute/Radius bleiben als zusätzliche Orientierung sichtbar.
- Pin-Vorschau ohne X und ohne Chevron. Eine transparente Fläche hinter der anklickbaren Eventkarte schließt die Vorschau bei Außentipp, ohne das Event versehentlich zu öffnen. Position bleibt am Kartenbereich ausgerichtet; übrige Listen/Navigation unverändert.
- Browser geprüft: 30.10. → Neon Nights, 06.11. → Club Open Air, 29.10. → leer; Genre-/Suchschnittmenge und deaktivierte Vergangenheit. Kalender bei 320 px Breite bedienbar. Außentipp auf Kopfbereich schließt Vorschau; Tipp auf Vorschau öffnet Eventdetails.
- Kein nativer Gerätetest; keine Änderungen an den Demo-Terminen oder am einmaligen Startscan.

## Aktuell: Startscan nur einmal, identische Radar-/Heute-Auswahl

- Radar-Intro läuft nur einmal je App-Laufzeit. Kein Neustart bei Stadt-/Radiuswechsel, Tabwechsel, Rückkehr aus Eventdetails oder Hintergrund. Der Sitzungsstatus und bereits freigegebene/animierte Event-IDs bleiben ausschließlich im Arbeitsspeicher; ein vollständiger App-Neustart setzt sie zurück.
- Ein unterbrochenes Intro wird beendet statt später erneut gestartet. Neue Partys erscheinen weiterhin gestaffelt, ohne vorhandene Ergebnisse für einen neuen Scan zu leeren.
- Radar-Pins und Heute-Liste verwenden dieselbe nach Datum, Genre und Radius gefilterte Auswahl. Berliner Fixtures sind für 30./31.10. und 06.11.2026 terminiert; am 28.10. gibt es deshalb dort weder heutige Pins noch heutige Listeneinträge. Zukünftige Events bleiben in Entdecken.
- Karten-Vorschau ohne Chevron-Pfeil, nur mit separatem X. Die ganze Eventkarte bleibt ein Link zu den Details; übrige Listen behalten ihre Pfeile.
- Lint und Typecheck erfolgreich. Browser-Neuladen ohne Laufzeitfehler, Stadtwechsel nach Karlsruhe ohne neuen Scan und zehn heutige Partys geprüft. Keine nativen Gerätetests.

## Aktuell: Eventdetails und abgestimmte Radar-Einblendung

- Eventdetailseiten nach neuer Bildvorlage: großes Symbolfoto mit Verlauf, Demo-Badge, Titel/Genres, Datum und Ort, Snaps-Vorschau, Ticketbereich, Aktionszeile und funktionierende Reiter Infos/Line-up/Location/Snaps. Gestaltung bleibt in Spots-Farben.
- Keine erfundenen Besucherzahlen, Ticketpreise oder Snaps. Tickets/Speichern als noch nicht verfügbar gekennzeichnet; für Demo-Koordinaten wird keine echte Veranstaltungsroute angeboten. Teilen öffnet auf bewussten Druck die Systemfunktion mit ausdrücklich als Demo gekennzeichnetem Eventtext; Fehlerzustand vorhanden.
- Pin-Freigabe ist pro Event-ID statt pro gesamter Ergebnisliste gespeichert. Kartenverschiebung erhält bereits sichtbare Marker und fügt nur neue Events gestaffelt hinzu. Fertig eingeblendete Pins wiederholen ihren Effekt beim erneuten Eintritt in den Radius nicht; neue Stadt/Scan startet die Sequenz weiterhin bewusst neu.
- Browser-Marker werden nicht mehr nur wegen Überschreiten des sichtbaren Kartenrands ausgehängt; der Kartencontainer schneidet sie ab.
- „Heute in deiner Nähe“ nutzt dieselbe gestaffelte Freigabe wie die Pins und blendet jede neue Karte mit 280 ms Fade/Slide ein. Während des Scans erscheint ein Ladehinweis statt der fertigen Liste. Bewegungsreduktion überspringt die Effekte.
- „Alle ansehen“ ist wieder ein gut lesbarer Textlink ohne pinke Buttonfläche, mit 44 px Touchhöhe.
- Browser geprüft: Detailreiter und schmale Darstellung (320 px); gemessene Pin-/Listenanzahl während Einblendung jeweils identisch (0/0, 1/1, 2/2 usw.); nach Kartenverschiebung bleibt das DOM-Element eines sichtbaren Pins dasselbe. Transparenter Hintergrund von „Alle ansehen“ bestätigt. Native Darstellung und System-Teilen noch nicht auf Geräten geprüft.
- Prüfstand: Lint vor der abschließenden Pin-Wiederkehrkorrektur erfolgreich; der erneute Lint-Aufruf danach wurde als „rejected by user“ abgelehnt und nicht umgangen. Finaler Typecheck und Editor-Diagnosen erfolgreich.

## Aktuell: Spots, heutige Partys und Suche ab Kartenmitte

Dieser Abschnitt ersetzt die weiter unten dokumentierten älteren Zwischenstände.

- Der Markenname ist **Spots**: Radar-Logo, Browser-Titel, Expo-Anzeigename, Standort-Berechtigungstext und Projektanweisung angepasst. Technischer Slug und URL-Schema bleiben zur Wahrung bestehender Links unverändert. Der native Anzeigename erfordert einen neuen Build.
- „Heute in deiner Nähe“ ist wieder eine vertikale, scrollbar begrenzte Liste mit kompakten Eventkarten. „Alle ansehen“ ist ein kontrastreicher Akzent-Button mit mindestens 44 px Höhe.
- Radar-Liste, `/today` und Heute-Filter in Entdecken vergleichen `startsAt` mit dem tatsächlichen Datum in `Europe/Berlin`; keine dauerhaften `isToday`-Flags mehr. Aktualisierung nach Tageswechsel per Timer und bei Rückkehr aus dem Hintergrund.
- Zehn ausdrücklich fiktive Karlsruhe-Partys hinzugefügt, mit festen Terminen am **28.10.2026**, öffentlichen Gebietskoordinaten und Symbolfotos. Sie werden nicht täglich neu datiert und sind keine echten Veranstaltungen. Die drei Berlin-Beispiele haben feste zukünftige Termine.
- Radius überall 10–50 km, initial weiterhin 30 km; 5-km-Preset und 5-km-Reglergrenze entfernt.
- Ortsauswahl/GPS geben nur das anfängliche Kartenziel vor. Nach Verschieben gilt der Umkreis ab der aktuellen Kartenmitte; Kategorie/Entfernung aktualisieren die Kartenmarker und die heutige Liste. `/today` erhält exakt dieselbe Kartenmitte und Filter.
- iOS/Android melden die neue Mitte bei `onRegionChangeComplete`; Radiuswechsel bleiben an der verschobenen Kartenmitte. Browser-Kacheln bleiben derselbe Anbieter/Stil, unterstützen jetzt Ziehen mit Maus/Touch. Im Browser weiterhin kein freies Pinch-/Mausrad-Zoomen.
- Verifiziert: Karlsruhe über echte Städtesuche ausgewählt, zehn heutige Partys vertikal angezeigt; Minimum 10 km und kein 5-km-Button. Kartenverschiebung bei 10 km reduziert die Auswahl von zehn auf zwei, `/today` zeigt genau dieselben zwei Events.
- Datums-/Radiuschecks: zehn Karlsruhe-Fixtures, heute enthalten/morgen ausgeschlossen, deutsche Mitternachtsgrenze und Ein-/Ausschluss durch Entfernung erfolgreich. Lint und Typecheck erfolgreich; native Karten benötigen weiterhin einen Gerätetest.

## Entdecken nach Bildvorlage

- Kompakter Titel „Entdecken“ mit Unterzeile, Suchfeld, Genrefiltern und horizontaler Zeitraumleiste in den bisherigen App-Farben.
- Große Bild-Empfehlung als Listenheader, weitere Treffer im zweispaltigen Raster. Abgerundete Karten mit Textverlauf, Genre-Tags, Ort, Termin und ehrlichem DEMO-Badge; Eventdetails bleiben verlinkt.
- Eigene Komponente [ExploreEventCard](../../src/components/ExploreEventCard.tsx). `FlatList` behält virtualisierte Darstellung; Karten mit Mindesthöhe können bei größerer Schrift wachsen.
- Kombinierte Suche, Kategorie- und Zeitraumfilter, Trefferzahl, Leerzustand und Zurücksetzen implementiert. Kalenderknopf öffnet eine Zeitraum-Auswahl, keinen vorgetäuschten echten Kalender.
- Zeitraumfilter nutzen ausschließlich vorhandene Demo-Angaben (Alle, feste Heute-Markierung, Freitag, Samstag, Nächste Woche). Keine erfundenen absoluten Kalenderdaten; echter Heute-/Datumsabgleich bleibt mit einer strukturierten Eventquelle umzusetzen.
- Keine Favoriten, Live-Status, Besucherzahlen, persönliche Empfehlungen oder Standortdistanzen vorgetäuscht. Keine neuen Abhängigkeiten.
- Browser bei 375 × 812 und 320 × 640 geprüft: große Karte und Raster, Suche, Genre, Freitag-Filter, Leerzustand, Zurücksetzen, Zeitraumdialog und Eventnavigation funktionieren. Kein nativer Gerätetest.

## Horizontale Radar-Eventkarten

- „Heute in deiner Nähe“ zeigt nach neuer Bildvorlage horizontal wischbare Bildkarten (136 × 140 px bei Standardschrift), abgerundete Ecken und dunklen Textverlauf über dem Symbolfoto.
- Karten enthalten Titel, Kategorie, aus den Koordinaten berechnete Entfernung zum gewählten Radar-Zentrum und den vorhandenen Demo-Termin. `DEMO` statt eines unbelegten LIVE-Status; keine erfundenen Zeiten oder Distanzen.
- Kompakter Panelkopf, Einrasten beim Wischen, angeschnittene nächste Karte als Scrollhinweis und Demo-Hinweis am unteren Rand. Kartenhöhe wächst bei vergrößerter Systemschrift.
- Eigene Komponente [RadarEventCard](../../src/components/RadarEventCard.tsx); übrige Eventlisten, Kartenanbieter, Filter und `/today` bleiben unverändert. Keine Favoritenfunktion oder dekorativen funktionslosen Herzbuttons ergänzt.
- Browser bei 320 und 375 px Breite geprüft; Lint und Typecheck erfolgreich. Native Wischgesten noch nicht auf einem Gerät geprüft.

## Kompaktes Radar-Layout nach Bildvorlage

- Kopfzeile mit Logo links, kompakter bearbeitbarer Ortsauswahl mittig und Filtertaste rechts; Kategorien direkt darunter.
- Bestehende Kartenanbieter und Kartenfarben unverändert. Die Karte erhält mehr Platz, da der Radiusregler jetzt im Filterdialog liegt; über die km-Schaltfläche auf der Karte weiterhin direkt erreichbar.
- Standorttaste unten rechts auf der Karte; Ortung weiterhin ausschließlich nach bewusster Betätigung.
- Eventbereich überlappt den unteren Kartenrand um 18 px. Höhenabhängige Panelgröße und kompaktere Eventkarten gelten nur im Radar; andere Listen behalten ihre bisherige Darstellung.
- Vorhandene Farben, Scan, Filter, Stadt-/Standortsuche, Eventvorschau und die Unterseite `/today` bleiben erhalten. Keine neuen Abhängigkeiten oder erfundenen Live-Events.
- Browserprüfung bei 375 × 812 und 320 × 640: Kopf, Standorttaste und Eventkarte innerhalb des Bildschirms; House-Filter, Radiuswechsel auf 20 km und Navigation zu `/today` mit übernommenen Filtern erfolgreich geprüft.
- Expo-Router-Kompatibilität: Styles des Link-Kindes in [EventCard](../../src/components/EventCard.tsx) werden vor Übergabe mit `StyleSheet.flatten` zusammengeführt.
- `npx expo lint`, `npx tsc --noEmit` und Editor-Diagnosen erfolgreich. Kein nativer Gerätetest dieses Layouts.

## Aktueller Stand nach Rücknahme

Auf Wunsch ist die vorletzte Version wiederhergestellt: der Stand unmittelbar vor dem Hinzufügen der Demo-Standorte in ganz Deutschland. Wiederhergestellt ist der Stand davor: dunkler Hintergrund, Logo „App.“, Bild-Pins, drei Berliner Demo-Events, fester Eventbereich und die vorherige Kartendarstellung. Die zusätzlichen Deutschland-Demos, Datumsfilterung und verstellbare Eventfläche sind entfernt.

## Implementiert

- Radar-Karte auf iOS/Android frei verschieb- und zoombar; bei Stadt- oder Radiuswechsel wird sie weiterhin automatisch zentriert.
- Event-Pins auf nativen und Browser-Karten kompakter gestaltet.
- „Alle ansehen“ unter „Heute in deiner Nähe“ öffnet die separate Router-Seite `/today` mit den aktuellen Radar-Filtern und den heutigen Events, nicht mehr „Entdecken“.

- Dunkler horizontaler violett-pinker Verlauf auf allen Seiten und der unteren Navigation.
- Radar beim Öffnen mit drei vollständigen Umdrehungen in 5,4 Sekunden und Vibrationsimpulsen auf Mobilgeräten. Zunächst keine Pins; danach blendet sich der Radar aus und Bild-Pins erscheinen mit 320 ms Abstand.
- Runde Event-Vorschaubilder an Pins, Marker-Vorschau und Eventdetails mit Zurück-Navigation.
- Filter für Alle, Techno, House, Party und Clubs; Kategorie und Entfernung gelten für Karte und Liste.
- Kilometer-Schieberegler im Filterdialog: 5–50 km, initial 30 km. Aktualisiert die Anzeige beim Ziehen und Karte/Liste beim Loslassen. Presets bleiben erhalten.
- Städtesuche oberhalb der Filter mit echten Vorschlägen über Open-Meteo/GeoNames, Lade-, Leer- und Fehlerzuständen sowie Abbruch veralteter Anfragen. Auswahl zentriert die Karte und startet den Scan erneut.
- Separater Standortpfeil: Zugriff nur auf bewussten Druck. Ohne Freigabe bleibt die gekennzeichnete Berlin-Demo nutzbar. Eine gewählte Stadt wird nicht durch eine ältere GPS-Anfrage überschrieben.
- Drei feste, klar gekennzeichnete Berliner Demo-Events: Neon Nights, House Session und Club Open Air. Keine automatisch um den Nutzer erfundenen Marker und keine privaten Adressen.
- Kompakter Eventbereich am unteren Kartenrand mit scrollbarer Liste. Die Radar-Vorschau enthält weiterhin alle passenden Demo-Termine; `/today` nutzt feste Demo-Markierungen für heute, noch keine echten Kalenderdaten.
- Entdecken mit Suche nach Name, Genre und Ort sowie Kategorieauswahl.
- Profil-Reiter als ehrlicher Platzhalter; keine Anmeldung oder gespeicherten Events implementiert.
- Safe Areas und reduzierte Bewegung: Scan und Vibrationen enden beim Verlassen. Bei Bewegungsreduktion erscheinen Pins unmittelbar ohne Scan oder Pop-Effekt.
- Lokale Symbolfotos; Quellen in [assets/events/README.md](../../assets/events/README.md).

## Architektur

- Expo SDK 58. Routen unter [src/app/](../../src/app), Komponenten und Logik außerhalb davon.
- [index.ts](../../index.ts) lädt `expo-router/entry`; [App.tsx](../../App.tsx) exportiert [RadarScreen](../../src/screens/RadarScreen.tsx).
- iOS und Android nutzen `react-native-maps`: grauer Google-Maps-Stil auf Android, Apple Maps `mutedStandard` im Dark Mode auf iOS. Das Aussehen bleibt vom nativen Anbieter abhängig.
- Browser verwendet wieder OpenStreetMap-Rasterkacheln mit Graustufen-/Dunkelfilter am Kachelcontainer und Quellenhinweis. Keine Esri-Kacheln mehr.
- Native Bildmarker verfolgen ihre Darstellung bis Bild und Einblendung fertig sind und aktualisieren danach den Snapshot.
- `@react-native-community/slider` 5.2.1 auf Mobilgeräten; im Browser natives HTML-Range-Feld mit Tastaturbedienung.
- Endlicher Scan und gestaffelte Pin-Freigabe in [useRadarIntro](../../src/hooks/useRadarIntro.ts).
- Vordergrundortung ohne Hintergrundtracking oder Speicherung in einem eigenen Backend. Kartenanbieter erhalten notwendige Kartenanfragen; nur der eingegebene Suchtext geht an den Geocoder.
- Dark Mode, deutscher Standorttext und Android-Vibrationsberechtigung über [app.json](../../app.json). Keine nativen Projektverzeichnisse angelegt.

## Prüfung

- Nach Rücknahme: `npx expo lint` und `npx tsc --noEmit` erfolgreich; keine Editor-Diagnosen.
- Der wiederhergestellte Stand wurde in der vorangegangenen Sitzung bereits als iOS-/Android-Bundle und in mobilen Browsergrößen geprüft. Kein nativer Gerätetest.
- Browser nach Wiederherstellung erfolgreich geladen: Logo, drei Berliner Demo-Karten, Städtesuche und Radiusregler geprüft. Der alte native Kartenimport im Browser wurde durch den wiederhergestellten Einstieg entfernt.
- Browser-Vorschau läuft weiterhin unter `http://localhost:8090`; nach Rücknahme mit geleertem Metro-Cache neu gestartet.

## Bekannte Grenzen

- Alle Events und Termine sind Demo-Daten. Keine echte Live-Verfügbarkeit und aktuell kein echter Heute-Filter.
- Native Kartenfarben können auf iOS vom Android-/Browser-Stil abweichen. Physische Vibration, native Karten und Bildmarker benötigen weiterhin einen Gerätetest.
- Internetzugriff für Karten und Städtesuche erforderlich. Freies Kartenverschieben/Zoomen auf iOS und Android; Browser-Kacheln weiterhin ohne Gestensteuerung. Keine Offline-Kacheln.
- Vor Veröffentlichung Google-Maps-Konfiguration für Android sowie kommerziellen Geocoding-Tarif/Anbieter klären.
- Registrierung, Favoriten, echte Datumsfilter, Veranstalterinformationen, Tickets und Live-Snaps fehlen weiterhin.

## Nächste Schritte

1. Den wiederhergestellten Stand auf iOS/Android prüfen.
2. Weitere Designänderungen gezielt abstimmen.
3. Echte Eventquelle und strukturierte Termine anbinden.
4. Anmeldung, Favoriten und später Live-Snaps mit Ablauf, Datenschutz und Moderation ergänzen.
