# Produktions-Runde 2 – Konten, Veranstalter, Shots, Storys

Stand: 23.11.2026 (Jacint). **Nur ein Plan. Nichts davon ist ausgeführt.**
Jeder Schritt in der Produktion (`yhnxdeypkbzyjappuzmv`) braucht die ausdrückliche Freigabe von Jacint **und** Noyan in dem Chat, in dem er ausgeführt wird. Secrets und Vault fasst Claude nicht an.

Bisher in Produktion: SQL 20–24 (Ticketmaster mit Zeitplan, Orte, Admin, Partner-Anfragen), Goabase-Zeitplan, Team-Anmeldung. Diese Runde bringt alles, was in Spots-Test seit dem 13.11. dazugekommen ist: SQL 15, 17–19, 25–40 und die Function `cleanup-snaps`.

## Was sich für Nutzer ändert

Zunächst **nichts Sichtbares**. Die App zeigt in der Produktion weiterhin nur die Team-Anmeldung (`src/features/accounts/configuration.ts`, Modus „team“). Registrierung, Spots Studio, Shots und Storys werden erst sichtbar, wenn Teil D freigegeben ist. Zwei Dinge wirken sofort:
- Die erwarteten 400-Antworten pro App-Start verschwinden (die Spalte `events.organizer_id` gibt es dann).
- Das Radar zeigt Konzerte ohne Endzeit vier Stunden lang als laufend (das ist App-Code, unabhängig von dieser Runde).

## Bevor es losgeht

| Nr. | Wer | Was |
|---|---|---|
| V1 | Jacint + Noyan | Termin wählen, an dem beide da sind (etwa 2 Stunden). Kein Release und kein Store-Test am selben Abend. |
| V2 | Jacint | Im Supabase-Dashboard der Produktion prüfen, dass eine Sicherung möglich ist (Backups bzw. Wiederherstellungspunkt laut Tarif) und den Zeitpunkt notieren. |
| V3 | Jacint | Vault der Produktion: Es gibt genau je einen Eintrag `spots_project_url` und `spots_import_goabase_secret_key` (werden schon vom Ticketmaster-Zeitplan benutzt, SQL 24). Nur prüfen, dass sie da sind – Werte nicht in den Chat. |
| V4 | Claude | Volle Testreihe lokal (PGlite, `--test-concurrency=2`, Expo aus), Typecheck, Lint auf dem Stand, der eingespielt wird. |
| V5 | Claude (nur lesen, mit Freigabe) | Bestand der Produktion aufnehmen: vorhandene Tabellen, Funktionen, Zeitpläne, Buckets; Anzahl und Prüfwert der Events (`count(*)`, `md5` über alle Zeilen); Anzahl Konten und Admins. Ergebnis hier unter „Protokoll“ eintragen. |

## Teil A – Datenbank (Claude, jeder Schritt mit Freigabe)

Alle Dateien sind transaktional: Scheitert etwas, bleibt die Datenbank unverändert. Jede Datei bricht von selbst ab, wenn ihre Voraussetzung fehlt oder sie schon eingespielt ist. **Nicht einspielen:** `16_test_organizer_accounts.sql` (nur Testdaten).

Nach **jedem** Schritt: (1) Prüfsummen der neuen Funktionen mit der Datei vergleichen, (2) Anzahl und Prüfwert der Events mit V5 vergleichen – beides muss gleich sein, (3) als nicht angemeldeter Nutzer die veröffentlichten Events zählen – die Zahl darf sich nicht ändern.

| Schritt | Datei | Inhalt | Worauf besonders achten |
|---|---|---|---|
| A1 | 15 | Konten, Veranstalter, Mitgliedschaften, Beiträge; neue leere Spalte `events.organizer_id` | Legt Prüfregeln und eine zusätzliche Leseregel auf `events` an. Events der Importe müssen danach weiter öffentlich lesbar sein (Prüfung 3). |
| A2 | 17 | Shots (`live_snaps`), Meldungen, Merkliste im Konto, Ticketarten | – |
| A3 | 18 | Speicherbereiche `live-snaps` und `organizer-media` (beide nicht öffentlich) | Danach im Dashboard prüfen: beide Buckets da, nicht öffentlich. |
| A4 | 19 | Galerien zu Beiträgen | – |
| A5 | 25 | Konto löschen, Abgleich der Merkliste | – |
| A6 | 26 | Antrag und Freigabe von Veranstaltern, Zählung | Schema `spots_stats_private` neu. |
| A7 | 27 | Öffentlicher Speicherbereich `organizer-public`, Ort aus dem Adressbuch für Club-Events | Bucket ist öffentlich (gewollt, für Logos und Flyer). |
| A8 | 28 | Kontoart, Registrierung als Club, Ansprechperson (privat) | Legt einen Auslöser auf `auth.users` an: Er wirkt nur auf **neue** Konten. Danach prüfen, dass die Team-Anmeldung weiter funktioniert (Jacint meldet sich in der App an). |
| A9 | 29 | Adresse am Event, Endzeit Pflicht für Club-Events | Die Regel gilt nur für neue Zeilen; bestehende Events bleiben unangetastet. |
| A10 | 30 | Shots sofort sichtbar, Prüfliste fürs Team, Aufräum-Funktionen | – |
| A11 | 32 | Gäste-Shots nur mit Konto sichtbar | – |
| A12 | 33 | Veranstalter-Story, Liste für Entdecken, Event-Story ab dem Anlegen | – |
| A13 | 34 | Story-Bilder melden, Prüfliste, Team-Sperre für Shots | – |
| A14 | 35 | Einladungscodes für Team-Mitglieder | – |
| A15 | 36 | Liste verwaister Bilder | – |
| A16 | 37 | Motto und Titelbild | – |
| A17 | 38 | Statistik-Verlauf, „neu gemerkt“ | – |
| A18 | 39 | Beiträge löschen, Limit | – |
| A19 | 40 | Autoren von Shots und Story-Bildern nicht mehr abrufbar | Danach als nicht angemeldeter Nutzer `spots_explore_organizers` aufrufen: muss ohne Fehler antworten. |

## Teil B – Function und Zeitplan

| Schritt | Wer | Was |
|---|---|---|
| B1 | Claude (mit Freigabe) oder Jacint im Terminal | Function `cleanup-snaps` in der Produktion bereitstellen, Einstellungen wie in Spots-Test (`verify_jwt = false`, Schutz über den geheimen Schlüssel). Prüfen: Aufruf ohne Schlüssel wird mit 401 abgelehnt. |
| B2 | Claude (mit Freigabe) | SQL 31: stündlicher Zeitplan `spots-cleanup-snaps` (Minute 43). Braucht B1 und V3. |
| B3 | Claude (nur lesen) | Nach der nächsten Minute 43: Antwort 200 in `net._http_response`, Lauf „succeeded“ in `cron.job_run_details`. |

## Teil C – Einstellungen im Dashboard (Jacint)

| Schritt | Was |
|---|---|
| C1 | Authentication → URL Configuration: Weiterleitungs-Adressen der echten App eintragen (`spots://**`, sobald das Schema umgestellt ist; bis dahin `meine-app://**`). Keine `exp://`-Adressen in der Produktion. |
| C2 | Authentication → Sign In / Providers: „Confirm email“ an. Neue Registrierungen bleiben **aus**, bis Teil D freigegeben ist. |
| C3 | SMTP mit eigenem Absender und die deutschen Mailtexte (Bestätigung, Passwort vergessen, E-Mail ändern). Ohne C3 kein Teil D. |

## Teil D – Konten für alle freischalten (eigene Entscheidung, nicht Teil dieser Runde)

Erst wenn alles davor steht **und**:
- Mailserver läuft und eine Probe-Registrierung mit einer fremden Adresse ankommt (C3),
- Datenschutzerklärung und Nutzungsbedingungen geprüft und in der App verlinkt sind (`docs/entwuerfe/`),
- App-Schema und Weiterleitungen der echten App stimmen (C1),
- Jacint und Noyan beide zustimmen.

Dann: den Modus für die Produktion im Code von „team“ auf „full“ stellen (`src/features/accounts/configuration.ts`), neue App-Version bauen, Registrierungen im Dashboard einschalten, einmal komplett durchspielen (privat registrieren, Club registrieren, im Admin freigeben, Event live, Shot, Story, melden, Konto löschen).

## Wenn etwas schiefgeht

- Bricht eine Datei ab, ist nichts geändert: Meldung lesen, Ursache klären, **nicht** blind wiederholen.
- Ändern sich Anzahl oder Prüfwert der Events oder sinkt die Zahl der öffentlich lesbaren Events: sofort anhalten, nichts weiter einspielen, Ursache suchen. Für A1 gibt es keinen fertigen Rückweg als Datei; im Notfall die Sicherung aus V2.
- Die App in der Produktion braucht keine der neuen Tabellen, solange der Modus „team“ ist. Ein Abbruch mitten in Teil A lässt die App also weiter laufen; fortgesetzt wird beim nächsten Schritt.

## Offene Punkte vor der Runde

- SQL 31 und die Function sind bisher nur in Spots-Test gelaufen (dort seit dem 20.11. stündlich ohne Fehler).
- SQL 18 und die Speicher-Regeln aus 19, 27, 33 und 39 sind lokal nur gegen ein kleines Modell des Speichers getestet; die echte Prüfung war in Spots-Test.
- Die Studio-Seiten lesen `motto` und `cover_url` (SQL 37). Spots Studio gegen die Produktion funktioniert daher erst nach A16.

## Protokoll

(wird während der Runde ausgefüllt: Datum, Schritt, Ergebnis, Prüfwerte)
