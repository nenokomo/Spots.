> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: Vault eingerichtet und geprüft, vor Jobanlage gestoppt

Stand: **09.11.2026, 21:13 Europe/Berlin**. Freigegebene Fortsetzung ausschließlich für **yhnxdeypkbzyjappuzmv / Spots.** Der korrigierte pg_net-Plattformplan wurde berücksichtigt: keine Extension-Neuinstallation und keine Änderungen an systemverwalteten net-Rechten.

## Tatsächlich ausgeführt

- Produktions-ID/Name und unveränderte ACTIVE/v3/verify_jwt=false mit abgenommenem Function-Fingerprint erneut bestätigt.
- Vorhandene Extensions/private Tabelle wiederverwendet; keine erneute Ausführung von SQL 11. Bestehende Events und Importmetadaten gegen frischen und ursprünglichen Snapshot geprüft.
- Aktuelle API-/LOGIN-Grenzen geprüft: public/graphql_public exponiert, net ausgeschlossen, Clientrollen NOLOGIN, keine unklassifizierte aktive Loginrolle. Private Tabelle/RLS und Cron-Sperren unverändert.
- Genau die vorbereitete SQL **11b** mit gebundenen Parametern einmalig ausgeführt. Die beiden Namen **spots_project_url** und **spots_import_goabase_secret_key** sind jetzt in Vault vorhanden. Kein Secret in SQL-Literalen, Dateien, argv oder Ausgaben.

## Fehler und Stopp

Die anschließende Vergleichsprüfung war fälschlich über den Management-API-Modus read_only=true gestartet. Dieser verwendet die Rolle supabase_read_only_user, die Vault-Entschlüsselung nicht ausführen darf. Antwort **HTTP 400 / SQLSTATE 42501**, permission denied for function _crypto_aead_det_decrypt.

Das war ein Fehler der Prüfrollenwahl im Ausführungsskript, kein fehlgeschlagener Secret-Insert und kein neues pg_net-Problem. Entsprechend der Nutzeranweisung wurde die Einrichtung **sofort vor SQL 12 gestoppt**. Der vorsorgliche Pausebefehl fand keine Jobzeile; kein Job wurde angelegt oder aktiviert. Kein Retry der Vault-Erstellung.

## Ausschließlich lesende Aufklärung nach dem Stopp

1. Metadatenprüfung ohne Entschlüsselung: beide Vault-Namen vorhanden, **0 Cron-Jobs/0 Dispatches**, API-/Rollengrenzen unverändert.
2. Neuer vollständiger Snapshot: **alle 35 Eventdaten/UUIDs, Quellversionen, Entfernungs-/Quarantänemetadaten, Lease und Event-Policies identisch**. Keine Duplikate, Lease frei, App-Umgebung per SHA-256 unverändert. Produktive Function unverändert.
3. Ausschließlich **SELECT** unter der für Vault berechtigten Rolle **postgres**, mit derselben parametergebundenen geschützten Vergleichslogik: **values_match=true**. Exakte Produktions-URL und exakter vorhandener Default Secret bestätigt. Keine Klartextwerte verlassen die Datenbank; nur Rollenname und Vergleichsboolean zurückgegeben. Dazu mussten weder GRANTs/Owner noch Daten verändert werden. Die Management-API-Option read_only=false bestimmt hier die Ausführungsrolle; die SQL-Anweisung selbst ist ausschließlich lesend.

Der Prüfcode wurde lokal entsprechend korrigiert; SQL 11b sowie weitere SQL-Dateien wurden nicht nachträglich geändert. Keine zusätzlichen Rollenrechte vergeben. Die bisherigen Stopp-/Einmalmarker und das Fehlerprotokoll bleiben erhalten; der fehlerhafte Lauf wird nicht nachträglich als vollständig erfolgreich markiert.

## Nachweise und Fortsetzungspunkt

Geschützte/Git-ignorierte Belege weiterhin unter `supabase/backups/automation-2026-11-09T19-55-27-529Z/`: vor-resume-/Plattform-Snapshots, ausgeführte SQL 11b/Einmalmarker, Fehlerbericht und **vault-check.json** mit berechtigtem SELECT-Nachweis. Vollständige Credentials ausschließlich im Speicher; keine Ausgaben/Logs mit Schlüsselwerten.

Fortsetzung ausschließlich **ab vorhandenen geprüften Vault-Einträgen und SQL 12**: einen inaktiven Job anlegen, kontrollierter Cron-Aufruf mit Selbstpause/HTTP- und Datenprüfung, erst danach Aktivierung und Beobachtung des ersten regulären Laufs. **Keine erneute Ausführung von SQL 11 oder 11b**, kein Überschreiben vorhandener Secrets. Der bestehende Resume-Modus ist bewusst gegen den früheren Stopp abgesichert; nicht unverändert erneut starten, sondern gezielt ab dem bestätigten Fortsetzungspunkt fortfahren.

**Aktuell: Vault erfolgreich eingerichtet und geprüft, Cron-Job nicht angelegt/nicht aktiv, automatische Synchronisierung weiterhin nicht nachgewiesen.** Keine Function-Aufrufe oder Imports in diesem Schritt. Keine Änderungen an Expo-App, produktiver Edge Function oder bestehenden Events. Keine unabhängigen Importertests wiederholt.
