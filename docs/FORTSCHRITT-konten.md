# Fortschritt – Etappe 1: Konten für alle (Jacint)

Branch `backend/konten`. Fahrplan: [FAHRPLAN-RELEASE.md](FAHRPLAN-RELEASE.md). Alles nur in Spots-Test (`nfomkdvotqtlyymomksb`); Produktion bleibt bei der Team-Anmeldung.

## Ziel

Registrieren, Anmelden, Passwort vergessen, Konto löschen (Pflicht bei Apple/Google), Merkliste mit Konto, deutsche Mailtexte.

## Fertig

- **SQL 25** `supabase/ops/25_account_lifecycle.sql`: `spots_delete_my_account()` (nur eigenes Konto; Veranstalter ohne weitere Mitglieder und deren Spots-Events werden ausgeblendet, nie gelöscht; Profil, Merkliste, Snaps, Meldungen per CASCADE) und `spots_sync_saved_events(uuid[])` (übernimmt nur öffentliche Events, max. 500, liefert die Liste des Kontos). Tests: `tests/account-lifecycle.test.cjs` (PGlite, auf 15 + 17).
- **Spots-Test (13.11.)**: SQL 17 (Live Snaps, Meldungen, Merkliste, Ticketarten – bisher nirgends eingespielt) und SQL 25 eingespielt. Alle 9 neuen Funktionen mit gleicher Prüfsumme wie die Dateien, RLS auf allen vier neuen Tabellen, `anon` darf nicht löschen. Events vorher/nachher gleich (575, Prüfwert `f4171c43…`).

## Läuft gerade

- App: Passwort vergessen, Konto löschen, Merkliste mit Konto.

## Offen

- Deutsche Mailtexte (Vorlagen) und Eintrag im Dashboard (Jacint).
- E-Mail-Versand über eigene Domain (Entscheidung offen, siehe Fahrplan).
- SQL 18 (Speicher für Uploads) gehört zu Etappe 2/3.
