# Fortschritt – Etappe 1: Konten für alle (Jacint)

Branch `backend/konten`. Fahrplan: [FAHRPLAN-RELEASE.md](FAHRPLAN-RELEASE.md). Alles nur in Spots-Test (`nfomkdvotqtlyymomksb`); Produktion bleibt bei der Team-Anmeldung.

## Ziel

Registrieren, Anmelden, Passwort vergessen, Konto löschen (Pflicht bei Apple/Google), Merkliste mit Konto, deutsche Mailtexte.

## Fertig

- **SQL 25** `supabase/ops/25_account_lifecycle.sql`: `spots_delete_my_account()` (nur eigenes Konto; Veranstalter ohne weitere Mitglieder und deren Spots-Events werden ausgeblendet, nie gelöscht; Profil, Merkliste, Snaps, Meldungen per CASCADE) und `spots_sync_saved_events(uuid[])` (übernimmt nur öffentliche Events, max. 500, liefert die Liste des Kontos). Tests: `tests/account-lifecycle.test.cjs` (PGlite, auf 15 + 17).
- **Spots-Test (13.11.)**: SQL 17 (Live Snaps, Meldungen, Merkliste, Ticketarten – bisher nirgends eingespielt) und SQL 25 eingespielt. Alle 9 neuen Funktionen mit gleicher Prüfsumme wie die Dateien, RLS auf allen vier neuen Tabellen, `anon` darf nicht löschen. Events vorher/nachher gleich (575, Prüfwert `f4171c43…`).
- **App: Passwort vergessen** (Link per Mail, danach neues Passwort in der App; die Antwort verrät nie, ob ein Konto existiert), **Konto löschen** (zweistufige Bestätigung, nur mit Konten für alle, nicht bei der Team-Anmeldung). Tests in `tests/accounts.test.cjs`.
- **App: Merkliste mit Konto** (`src/services/savedEventsSync.ts`, `src/hooks/useSavedEvents.tsx`): Ein Gerät bringt seine Liste nur beim allerersten Abgleich ein, danach gilt das Konto; Einträge eines anderen Kontos wandern nie mit. Tests in `tests/saved-sync.test.cjs`.
- **Deutsche Mailtexte** in `supabase/templates/` (Bestätigung, Passwort, E-Mail-Änderung), lokal in `supabase/config.toml` eingetragen.
- Prüfung: 157/157 Tests, Lint und Typecheck ohne Fehler. Web-Vorschau mit Spots-Test: Anmelden, „Passwort vergessen?“, „Neues Konto erstellen“ sichtbar. Angemeldeter Zustand und Konto löschen nicht in der Vorschau geprüft (keine Zugangsdaten), nur per Tests.

## Läuft gerade

- **Startseite (15.11., Wunsch Jacint)**: Die App startet ohne Konto auf `/account` in zwei Schritten: (1) „Wie nutzt du Spots?“ – **Privat** oder **Veranstalter** (oder „Als Gast fortfahren“); (2) Anmelden, „Passwort vergessen?“, „Neues Konto erstellen“ bzw. „Club registrieren“ – die Kontoart beim Registrieren kommt aus Schritt 1, kein Umschalter mehr. Beim Anmelden entscheidet die echte Kontoart (Club → Studio, Privat → Radar). Gast gilt nur bis zum nächsten App-Start, danach kommt wieder die Startseite (Entscheidung Jacint; `src/features/accounts/guestMode.ts`, alter gespeicherter Eintrag wird gelöscht). Die Sperre sitzt im Hauptlayout (`Stack.Protected`), weil eine Weiterleitung im Reiter-Layout auf dem Handy ignoriert wurde; Club-Konten kommen nie in die Besucher-App. Profil: keine Anmeldezeile, unten „Abmelden“ und „Konto löschen“; Gäste sehen „Anmelden oder registrieren“ (öffnet die Auswahl). Produktion (Team-Anmeldung): ohne Registrieren. Formular für den privaten Anzeigenamen entfernt (wurde nirgends angezeigt). Web-Vorschau geprüft (Auswahl, Veranstalter → Club-Felder, Privat → nur E-Mail/Passwort, Gast → Radar, nach Neuladen wieder Startseite). **Handy (15.11.)**: Startseite erscheint bei jedem Start, Ablauf bestätigt. 193/193 Tests.
- **Handy-Test (15.11., iPhone, Expo Go gegen Spots-Test)**: Registrieren und Bestätigen klappt (Konto bestätigt). Gefunden und behoben:
  - Gemerkte **TEST-Events** verschwanden nach erneutem Anmelden: Ihre Kennungen sehen aus wie echte, die App schickte sie ans Konto, die Datenbank ließ sie weg, danach galt die leere Konto-Liste. Jetzt bleiben TEST-Events nur auf dem Gerät (`src/services/savedEventsSync.ts`, Test in `tests/saved-sync.test.cjs`). Mit echten Events noch einmal prüfen.
  - Links in Mails führten auf `localhost:3000`. Ursache (Quellcode Supabase Auth, 15.11.): Rücksprungadressen mit IP-Adresse als Host werden immer abgelehnt, bevor die Erlaubt-Liste geprüft wird – auch exakte Einträge helfen nicht. Expo Go im WLAN nutzt `exp://192.168…`. Lösung zum Testen: `npx expo start --tunnel` (`exp://….exp.direct`, passt zu `exp://**`). Die echte App mit `meine-app://` ist nicht betroffen. Die IP-Einträge in Spots-Test können weg.
  - Der eingebaute Mailversand schickt nur **2 Mails pro Stunde** fürs ganze Projekt. Danach „Zu viele Anfragen“.
- Merkliste mit echten Events bestätigt (2 Einträge im Konto, TEST-Events nur auf dem Gerät). **Konto löschen** bestätigt: Konto, Profil und Merkliste weg, Events unverändert (601).
- Noch offen: **Passwort vergessen** (Mail-Limit). Das private Testkonto ist gelöscht – zum Testen ein neues privates Konto anlegen und nur den neuesten Link öffnen.
- Etappe 1 am 15.11. nach `main` gemergt (zusammen mit Etappe 2).
- Start gegen Spots-Test ohne `.env.local` zu ändern: in PowerShell `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` setzen, dann `npx expo start --clear`.

## Offen

- **Mailtexte warten auf SMTP** (Entscheidung 15.11.): Supabase lässt die Mailtexte nur mit eigenem Mailserver (Custom SMTP) ändern. Die deutschen Texte liegen fertig in `supabase/templates/` und werden eingetragen, sobald der Versand über die eigene Domain steht (Authentication → Emails → Templates, Betreff steht in der ersten Zeile jeder Datei). Bis dahin verschickt Spots-Test die englischen Standard-Mails.
- Handy-Test mit einem Wegwerf-Konto (mit den englischen Standard-Mails): registrieren, bestätigen, Merkliste, Passwort vergessen, Konto löschen. Hinweis: Der eingebaute Supabase-Versand schickt nur an Adressen von Mitgliedern des Supabase-Teams.
- E-Mail-Versand über eigene Domain (Entscheidung offen, siehe Fahrplan). Custom SMTP erst einschalten, wenn alle Felder stimmen – halb ausgefüllt kommen keine Mails mehr an.
- Design der Kontoseite: offen für Noyan.

## Plan für 15.11. (neuer Chat)

Stand beim Start: Branch `backend/konten` (5 Commits) und `docs/fahrplan-release` (1 Commit) nur lokal, nicht gepusht. `main` = `155c094`, seit dem 13.11. nichts Neues von Noyan. Ticketmaster-Zeitplan in Spots-Test läuft fehlerfrei (alle 6 h HTTP 200). In Spots-Test gibt es 1 Konto (Jacint).

1. **Abschluss Etappe 1** (Jacint): Mailtexte im Dashboard von Spots-Test eintragen, Handy-Test mit Wegwerf-Konto (siehe Offen). Danach `backend/konten` und `docs/fahrplan-release` pushen und nach `main` mergen.
2. **Etappe 2 beginnen – Veranstalter-Konten (Backend zuerst)**, neuer Branch `backend/veranstalter`:
   - Neue SQL-Datei (nächste freie Nummer prüfen, voraussichtlich 26): Veranstalter dürfen ihr Profil **nicht selbst veröffentlichen** (heute kann der Besitzer `organizers.is_published` setzen); stattdessen Antrag → Freigabe durch das Spots-Team (Admin-RPC). Nach der Freigabe erscheinen Events des Veranstalters ohne weitere Prüfung (Entscheidung im Fahrplan).
   - Statistik-Zähler pro Event: Aufrufe, Ticket-Klicks (datensparsam, nur Summen, gegen Mehrfachzählen gebremst); Gemerkt und Snaps werden aus vorhandenen Tabellen gezählt.
   - SQL 18 (Speicher für Logo/Flyer/Snaps) prüfen und in Spots-Test einspielen.
   - Erst lokal (PGlite), dann Spots-Test. Produktion nicht.
3. **Danach App**: „Veranstalter werden“, Dashboard (Profil, Events anlegen/bearbeiten, Statistiken) in App und Browser, Freigabe-Reiter im Admin-Bereich. Einfache Oberfläche, Design offen für Noyan.
