# Fortschritt – Eventquellen, Club-Verzeichnis, Admin-Bereich

Branch: `feature/event-sources` (lokal, **nicht gepusht**, kein Merge nach `main`).
Diese Datei wird nach jedem Teilschritt aktualisiert und mit committet.
Bei „mach weiter“: zuerst diese Datei lesen, dann mit `git status` und `git log` prüfen, was wirklich fertig ist.

## Auftrag (Reihenfolge, Stand 11.11.2026)

1. Ticketmaster-Import: SQL, Import, Tests, Lint, Typecheck; danach Filter und Anzeige in der App
2. Club-Verzeichnis aus OpenStreetMap: automatische Filter (Erotik, geschlossen, ohne Namen), Ortsseiten, „Fehler melden“; Clubzahl für ganz Deutschland
3. Goabase und Admin-Bereich zum Freigeben der Entwürfe
4. Doku-Entwürfe in `docs/entwuerfe/`: Anfrage-Mails, Datenschutzerklärung, Nutzungsbedingungen, App-Texte DE/EN, offene Rechtsfragen

Regeln: Datenbankänderungen erst lokal (PGlite), dann Spots-Test (`nfomkdvotqtlyymomksb`) bei grünen Tests. Produktion (`yhnxdeypkbzyjappuzmv`) nie ohne Freigabe von Jacint und Nutzer. Keine Secrets oder Vault anfassen.

## Fertig

- **Teilschritt 0 – Pläne**: [TICKETMASTER_IMPORT.md](TICKETMASTER_IMPORT.md) mit Machbarkeitsprüfung (516 Musik-Events DE / 30 Tage), [KARLSRUHE_EVENTS.md](KARLSRUHE_EVENTS.md) (ganz Deutschland, Start Karlsruhe), lesendes Prüfskript `scripts/probe-ticketmaster-readonly.cjs`, Regel zu dieser Datei in `AGENTS.md`.

- **Teilschritt 1a – Ticketmaster-Backend und Import**:
  - `supabase/ops/20_ticketmaster_sync_backend.sql`: Sperre (Lease), atomare Übernahme `spots_ticketmaster_apply`, Sichtbarkeit in SQL (ohne Endzeit 8 Stunden wie in der App), entfernte/unbestätigte Events werden ausgeblendet statt gelöscht, Sperrliste für Löschwünsche (`spots_ticketmaster_block`), nur `service_role` darf aufrufen.
  - `supabase/functions/import-ticketmaster/` (`sync.ts`, `index.ts`, `deno.json`), Eintrag in `supabase/config.toml`: Deutschland, Segment Musik, Wochenfenster von −12 h bis +30 Tage, Abbruch ohne Schreiben bei ≥ 1000 Treffern, 429 oder Fehlern, Einzelprüfung fehlender bekannter Events, Schlüssel nie in Fehlermeldungen.
  - Tests: `tests/ticketmaster-sync.test.cjs` (16), `tests/ticketmaster-backend.test.cjs` (8, PGlite). Gesamt **121/121 bestanden**, Lint und Typecheck ohne Fehler.

- **Teilschritt 1b – Ende-zu-Ende und Spots-Test**:
  - `scripts/run-ticketmaster-local.cjs`: echter Abruf (5 Anfragen) in PGlite mit echter SQL. Ergebnis 11.11.: 521 gefunden, 506 übernommen, 475 sichtbar, 2 laufen gerade; übersprungen 13 „kein Musik-Segment“, 2 fremde Ticketseite; zweiter Lauf 506 × unverändert.
  - Englische Städtenamen (Cologne, Munich …) werden fest auf Deutsch übersetzt; `locale=de-de` liefert bei Ticketmaster 0 Treffer (filtert statt übersetzt).
  - **SQL 20 in Spots-Test eingespielt** (`nfomkdvotqtlyymomksb`): Rechte nur `service_role`, Prüfwert der 35 bestehenden Events vorher/nachher gleich, Probelauf mit leerem Datensatz ok, Sperre frei.
  - Edge Function **nicht** bereitgestellt: braucht das Secret `TICKETMASTER_API_KEY` (siehe offene Punkte).

## Läuft gerade

- Teilschritt 1c: App – Filter „Konzerte“ und „Hip-Hop“, Ticketmaster-Hinweis auf der Eventseite.

## Als Nächstes

1. App-Teil für Ticketmaster
2. Club-Verzeichnis (Teil 2)

## Offene Punkte (für die Abschlussliste)

- Doku-Entwürfe (Punkt 4) schreibt ein Hilfsagent parallel; Ergebnis noch nicht übernommen.
- Ticketmaster in Spots-Test aktivieren (Secrets fasse ich nicht an), z. B. durch Jacint:
  `npx supabase secrets set TICKETMASTER_API_KEY=<Consumer Key> --project-ref nfomkdvotqtlyymomksb`, dann
  `npx supabase functions deploy import-ticketmaster --project-ref nfomkdvotqtlyymomksb --no-verify-jwt` und einmal per POST mit dem Secret Key aufrufen.
- Zeitplan (Cron) für den Ticketmaster-Import braucht Vault-Einträge → Jacint.
- Einnahmen-Klausel der Ticketmaster-Bedingungen vor einer Monetarisierung klären.
