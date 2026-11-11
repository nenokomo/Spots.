# Projektstatus – Spots

Stand: 11.11.2026 (abends). Diese Datei beschreibt nur den **aktuellen** Stand. Arbeitsprotokoll der laufenden Runde: [docs/FORTSCHRITT.md](docs/FORTSCHRITT.md). Frühere Runden: [Redesign-Runden bis 11.11.](docs/history/PROJECT_STATUS_REDESIGN_2026-11.md) · [ältere Geschichte](docs/history/PROJECT_STATUS_HISTORY.md) · [Dokumentationsindex](docs/README.md)

## Branches

| Branch | Inhalt | Zustand |
|---|---|---|
| `main` | Gemeinsamer Stand des Teams: Designsystem, Veranstalterseiten, Inhalts-Backend vorbereitet, Redesign als Grunddesign (mit Noyan abgestimmt) | gepusht |
| `feature/event-sources` | **Neu:** Ticketmaster-Import, Club-Verzeichnis (OpenStreetMap), Admin-Bereich, Doku-Entwürfe | lokal, **nicht gepusht**, nicht gemergt |
| `feature/design-refresh`, `feature/organizer-auth` | ältere Zweige, in `main` enthalten | gepusht |

Neue Arbeit startet als eigener Branch von `main`. Stand vor dem Redesign: Commit `489ac06`.

## Was die App kann

Auf `main`:
- **Vier Tabs**: Radar, Entdecken, Gemerkt, Profil.
- **Radar**: Vollbildkarte mit Radar-Scan, Pins mit Eventbild (läuft / startet heute später), Vorschau-Box, Panel mit Liste und Entfernung, „Alle“ → „Heute Nacht“ (`/today`). Umkreis Standard 30 km.
- **Entdecken**: Suche, Genre, Datum, Ort/Umkreis, Kalender, „Als Nächstes“, Story-Kacheln. „Gehypt“ nur in der Entwicklung.
- **Eventdetail**, **Veranstalterseite** (in Produktion noch leer), **Gemerkt** (nur lokal), **Konto** unter `/account` (nur mit Testkonfiguration).

Zusätzlich auf `feature/event-sources`:
- **Filter „Hip-Hop“ und „Konzerte“**; Eventseite „Tickets bei Ticketmaster“.
- **Clubs & Locations**: Abschnitt in Entdecken (bei gewähltem Ort), Liste `/clubs`, Ortsseite `/venue/[id]` mit Route, Website, Öffnungszeiten, OSM-Quellenhinweis, Events des Ortes und **„Fehler melden“** (ohne Konto).
- **Admin-Bereich `/admin`** (nur Konto mit Admin-Rolle): Events von Hand anlegen (immer mit Ort und Herkunft), Entwürfe freigeben/ablehnen, ungeprüfte Orte freigeben/ausblenden, Meldungen bearbeiten.
- Ohne die neuen Tabellen (Produktion) bleiben Clubs und Admin unsichtbar; nichts bricht.

**Design** (`src/constants/theme.ts`): fast schwarzer Hintergrund mit Pflaumen-Verlauf, iOS-artige Grauflächen, Akzent `#c922ab`. Neue Seiten nutzen die vorhandenen Bausteine; Feinschliff ist Noyans Bereich.

## Daten und Backend

- **Produktion** `yhnxdeypkbzyjappuzmv`: unverändert. Events nur aus dem Goabase-Import (Cron alle 2 h), rund 30 veröffentlicht.
- **Spots-Test** `nfomkdvotqtlyymomksb`: SQL 15/16 (Konten), **neu 20** (Ticketmaster-Backend), **21** (Orte + Meldungen; 56 echte Orte um Karlsruhe geladen), **22** (Admin, Entwürfe, `events.venue_id`). Prüfsummen aller neuen Funktionen identisch mit den Dateien; bestehende Events unverändert. Ein Admin-Konto (Jacint) eingetragen, Anmeldung klappt. **Ticketmaster-Import läuft** (Function bereitgestellt, 506 Events, 475 sichtbar; auf dem Handy bestätigt), aber noch ohne Zeitplan.
- SQL 17 (Live Snaps, Meldungen, Ticketarten), 18, 19: **nirgends ausgeführt**.
- Ticketmaster-Import (`supabase/functions/import-ticketmaster/`): lokal Ende-zu-Ende geprüft (506 Musik-Events in Deutschland, 30 Tage). Details: [docs/TICKETMASTER_IMPORT.md](docs/TICKETMASTER_IMPORT.md).
- Club-Verzeichnis: Plan in [docs/KARLSRUHE_EVENTS.md](docs/KARLSRUHE_EVENTS.md). Clubzahl für ganz Deutschland **nicht ermittelt** (Overpass-Server am 11.11. überlastet).
- Lokale TEST-Events und TEST-Orte nur bei `__DEV__`; abschaltbar mit `EXPO_PUBLIC_SPOTS_TEST_EVENTS=0`.

## Geprüft

- `feature/event-sources`: **139/139 Tests** (`node --test tests/*.test.cjs` mit `SPOTS_PGLITE_MODULE`), Expo-Lint und Typecheck ohne Fehler. Web-Vorschau 375 × 812: neue Filter, Clubliste, Ortsseite, Melden-Sheet (Test-Ort), Admin-Sperrseite.
- Handy-Test durch den Nutzer (11.11.) nur für den Redesign-Stand auf `main`, nicht für die neuen Funktionen.

## Nicht geprüft / bekannte Probleme

- **Freigabe-Ablauf mit echtem Admin-Konto** nicht durchgespielt; neue Seiten nicht auf iOS/Android getestet.
- Radar zählt nur Events mit Endzeit als „live“; Ticketmaster-Konzerte haben meist keine (Produktentscheidung offen).
- Erotik-Filter für Orte greift nur bei eindeutigen Merkmalen; Stichproben nötig.
- Produktion: pro App-Start 2–3 erwartete 400-Antworten (organizer_id-Abfrage), bis SQL 15 dort eingespielt ist.
- Goabase liefert Flyer auch in `medium/large/full` (Import nutzt `small`) und **kein Genre-Feld** (nur Freitext → kein Genre ohne Raten). Umstellung der Bildgröße wäre ein neuer Release des eingefrorenen Imports (Jacint).
- Aus den Doku-Entwürfen: Konto löschen fehlt (Apple/Google-Pflicht); Melden laut SQL 17 nur mit Konto (DSA verlangt Melden für alle); `live_snaps.author_id` wäre laut SQL 17 öffentlich lesbar; Ortssuche schickt Suchtext an Open-Meteo; keine Links zu Datenschutz/Impressum in der App.

## Fehlt noch

- Ticketmaster: Zeitplan in Spots-Test, später Produktion; Club-Daten für ganz Deutschland; Ladeweg für Produktion.
- Automatische Event-Entwürfe aus Club-Websites (Claude-API, nur mit Zustimmung der Clubs).
- Upload-UI für Live Snaps und Beiträge (Development Build, SQL 17–19).
- Merkliste mit Konto synchronisieren; Passwortreset, Kontolöschung.
- Veranstalter-Dashboard (Statistiken), Englisch als zweite Sprache, Release-Grundlagen (`eas.json`, Bundle-ID, Icons, Maps-Key).
- Rechtliches: Entwürfe in [docs/entwuerfe/](docs/entwuerfe/README.md) prüfen lassen und Lücken füllen.

## Nächste empfohlene Schritte

1. `feature/event-sources` ansehen (Jacint: SQL 20–22, Edge Function; Noyan: neue Seiten), dann pushen und PR gegen `main`.
2. Freigabe-Ablauf mit dem Admin-Konto auf dem Handy testen; Site-URL für Auth-Mails in Spots-Test setzen (leitet noch auf localhost).
3. Zeitplan (Cron) für den Ticketmaster-Import in Spots-Test einrichten und einige Tage beobachten.
4. Offene Rechtsfragen P1 klären, bevor Clubs angeschrieben werden.
