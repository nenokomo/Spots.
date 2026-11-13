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

- Nichts.

## Offen

- Jacint: Mailtexte im Dashboard von Spots-Test eintragen (Authentication → Emails → Templates, Betreff steht in der ersten Zeile jeder Datei).
- Handy-Test mit einem Wegwerf-Konto: registrieren, bestätigen, Merkliste, Passwort vergessen, Konto löschen. Hinweis: Der eingebaute Supabase-Versand schickt nur an Adressen von Mitgliedern des Supabase-Teams.
- E-Mail-Versand über eigene Domain (Entscheidung offen, siehe Fahrplan).
- Design der Kontoseite: offen für Noyan.
