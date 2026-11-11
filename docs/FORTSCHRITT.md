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

- **Teilschritt 1c – App für Ticketmaster**:
  - Neue Filter **„Hip-Hop“** und **„Konzerte“** (`src/constants/theme.ts`, Zuordnung in `src/services/eventAdapter.ts`: `concert` → Konzerte, Genre `Hip-Hop` → Hip-Hop; „Electronic“ wird nicht als Techno/House geraten). Genres „Classical“/„World“ werden als „Klassik“/„Weltmusik“ angezeigt.
  - Eventseite: „Tickets bei Ticketmaster“ statt „beim Anbieter“; kein doppelter Link, wenn Original- und Ticketlink gleich sind (`src/utils/eventSource.ts`).
  - Tests ergänzt (`navigation.test.cjs`, `design-integration.test.cjs`); gesamt **123/123**, Lint und Typecheck ok. Web-Vorschau 375 × 812: Chips „Hip-Hop“ und „Konzerte“ sichtbar, Filter „Techno“ zeigt das Test-Event.

- **Teil 2 – Club-Verzeichnis**:
  - `supabase/ops/21_venues.sql`: Tabelle `venues` (öffentlich nur Veröffentlichtes), `venue_reports` (nur Service-Rolle), Einordnung `spots_venues_private.osm_venue` mit festen Filtern (ohne Namen, Erotik inkl. `theme=bdsm/fetish`, geschlossen, ohne Position), Übernahme `spots_venues_apply_osm` (Team-Entscheidungen „hidden/approved“ bleiben, fehlende Orte nur bei vollständiger Antwort ausblenden, Schutz vor verdächtig kleinen Antworten), anonymes `spots_report_venue` (feste Gründe, max. 500 Zeichen, max. 50 offene Meldungen pro Ort).
  - Tests: `tests/venues-backend.test.cjs` (6 Teiltests, PGlite).
  - **In Spots-Test eingespielt**, Prüfsummen aller neuen Funktionen identisch mit den Dateien; 59 echte Orte um Karlsruhe (15 km) geladen: 17 Clubs, 6 Live-Musik, 16 Eventlocations sichtbar, 17 zur Prüfung; 2 BDSM-Orte und 1 ohne Namen aussortiert. Events-Prüfwert unverändert.
  - App: Abschnitt „Clubs & Locations“ in Entdecken (wenn Ort/Umkreis gewählt), Liste `/clubs` (Suche, Filter nach Art, Entfernung), Ortsseite `/venue/[id]` (Route, Website, Adresse, Öffnungszeiten, OSM-Quellenhinweis), „Fehler melden“ als Sheet. Ohne Tabelle (Produktion) bleibt alles ausgeblendet. Test-Orte nur in der Entwicklung. Web-Vorschau 375 × 812 geprüft.
  - Skripte: `scripts/fetch-osm-venues.cjs` (pro Bundesland, Ausweich-Server), `scripts/analyze-osm-venues.cjs` (lokale Auswertung mit derselben SQL).
  - **Clubzahl Deutschland: nicht ermittelt.** Alle drei Overpass-Server antworteten am 11.11. bei Bundesländern mit 504; eine 1°-Kachel um Karlsruhe ging (227 Orte, 90 s), mit Begrenzung auf Deutschland Zeitüberschreitung. Gesamtlauf später wiederholen.

- **Teil 3a – Admin-Bereich**:
  - `supabase/ops/22_admin_review.sql`: Admin-Rolle nur per SQL (`spots_admin_private.admins`), `spots_is_admin()`, Tabelle `event_drafts` (Ort, Zeiten, Genre, Art, Links, **Herkunft Pflicht**; nur Admins), Freigabe `spots_admin_approve_draft` erzeugt ein Event `source = 'redaktion'` mit Ortsdaten, Ablehnen, redaktionelle Events ein-/ausblenden (Importe nie), Orte freigeben/ausblenden, Meldungen erledigen/verwerfen, `events.venue_id`.
  - Tests: `tests/admin-backend.test.cjs` (5 Teiltests), `tests/berlin-time.test.cjs` (Eingabe in Berliner Zeit, Sommer/Winter, über Mitternacht). Gesamt **139/139**, Lint und Typecheck ok.
  - **In Spots-Test eingespielt**, Prüfsummen identisch, Events unverändert (außer neuer leerer Spalte `venue_id`). Noch **kein Admin eingetragen**.
  - App: `/admin` (nur mit Konto + Admin-Rolle; sonst „Nur für das Spots-Team“), Reiter Entwürfe/Orte/Meldungen, Formular „Event anlegen“ (Ortssuche, Datum/Zeit, Art, Genre, Links, Herkunft; „Speichern und freigeben“ oder nur Entwurf), Eintrag im Profil nur für Admins, Ortsseite zeigt freigegebene Events des Ortes. Web-Vorschau: Sperrseite ohne Konto geprüft, keine Datenabfragen ohne Konto. **Freigabe-Ablauf mit echtem Admin-Konto nicht geprüft** (kein Konto vorhanden).

- **Teil 3b – Goabase geprüft (nur lesend, 2 Anfragen)**: Die API liefert Flyer in `small/medium/large/full` (Import nutzt `small`), Veranstaltername, Eintritt und Line-up als Text, aber **kein Genre-Feld**. Genres aus Freitext wären Raten → nicht umgesetzt. Größere Bilder wären ein neuer Release des eingefrorenen Produktionsimports → Entscheidung Jacint. Am Goabase-Import nichts geändert.
- **Abschluss**: `PROJECT_STATUS.md` auf den neuen Stand gebracht.
- **Ticketmaster in Spots-Test aktiv (11.11., Jacint)**: Secret gesetzt, Function `import-ticketmaster` bereitgestellt, einmal per POST ausgelöst: 506 übernommen, 475 sichtbar, Sperre frei, Goabase unverändert. Auf dem Handy mit Testkonfiguration bestätigt: neue Events sichtbar. **Noch kein Zeitplan (Cron)**, Import läuft also nur bei manuellem Aufruf.
- **Admin-Konto in Spots-Test (11.11.)**: Konto von Jacint angelegt, bestätigt, Anmeldung in der App klappt, als Admin eingetragen (ein früheres Testkonto mit vergessenem Passwort auf Wunsch gelöscht). Freigabe-Ablauf selbst noch nicht durchgespielt.
- **Nachtrag 11.11.**: Formular „Event anlegen“ scrollt jetzt (Rückmeldung vom Handy). **Clubs auf der Radar-Karte**: graue Punkte (nativ + Web), erst nach dem Scan, max. 250, Tipp öffnet die Ortsseite, Schalter „Clubs auf der Karte“ im Radar-Filter (Standard an). Web-Vorschau geprüft (Karlsruhe, Test-Orte); auf dem Handy noch nicht. Betrifft Noyans Design (Radar). Danach auf Wunsch: Punkte etwas größer (13 px), Tipp auf einen Punkt öffnet eine Vorschau-Box wie bei Events (neutraler Rand statt Pink), Tipp auf die Box öffnet die Ortsseite; in der Web-Vorschau geprüft.

## Läuft gerade

- Nichts. Auftrag dieser Runde abgearbeitet; offene Punkte siehe unten.

## Als Nächstes

1. Branch `feature/event-sources` von Jacint (SQL, Function) und Noyan (Seiten) ansehen lassen, dann pushen und PR gegen `main`
2. Konto anlegen, als Admin eintragen, Freigabe-Ablauf auf dem Handy testen
3. Zeitplan (Cron) für den Ticketmaster-Import in Spots-Test

## Offene Punkte (für die Abschlussliste)

- Doku-Entwürfe (Punkt 4) schreibt ein Hilfsagent parallel; Ergebnis noch nicht übernommen.
- Ticketmaster in Spots-Test: regelmäßigen Zeitplan (Cron, alle 6 h) einrichten wie bei Goabase (Vault-Eintrag nötig, Jacint).
- Zeitplan (Cron) für den Ticketmaster-Import braucht Vault-Einträge → Jacint.
- Einnahmen-Klausel der Ticketmaster-Bedingungen vor einer Monetarisierung klären.
- Produktentscheidung: Das Radar zählt nur Events mit Endzeit als „live“ (`isLiveEvent`). Ticketmaster liefert meist keine Endzeit (≈ 90 %), solche Konzerte erscheinen daher vor Beginn als „später heute“, aber nach Beginn nicht als „live“. Ändern? (betrifft auch Goabase)
- Profil zeigt bei „Eventdaten“ weiterhin nur „Goabase“; anpassen, sobald Ticketmaster in Produktion läuft.
- Die Filterleiste hat jetzt 7 Chips; Gestaltung/Reihenfolge mit Noyan abstimmen.
- Bestätigungs- und Passwort-Mails in Spots-Test leiten auf `localhost` weiter: im Dashboard unter Authentication → URL Configuration eine richtige Site-URL/Redirect-URL eintragen.
- OSM-Import für ganz Deutschland später wiederholen (`node scripts/fetch-osm-venues.cjs`, dann laden mit Service-Rolle). Für die Produktion braucht es ein kleines Ladeskript mit Service-Key, das Jacint ausführt.
- Automatischer Erotik-Filter greift nur bei eindeutigen Merkmalen; Stichproben durch das Team bleiben nötig.
- Doku-Entwürfe liegen in `docs/entwuerfe/` (Mails, Datenschutz, Nutzungsbedingungen, App-Texte DE/EN, 25 Rechtsfragen). Befunde daraus: Konto löschen fehlt (Apple/Google-Pflicht); Melden in SQL 17 nur mit Konto (DSA verlangt Melden für alle); `live_snaps.author_id` wäre laut SQL 17 öffentlich lesbar (vor dem Einspielen korrigieren, Jacint); Ortssuche schickt Suchtext an Open-Meteo (Nutzungsbedingungen prüfen); keine Links zu Datenschutz/Impressum in der App; EXIF-Daten bei Uploads entfernen.
