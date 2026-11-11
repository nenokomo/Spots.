# Projektstatus – Spots

Stand: 11.11.2026. Diese Datei beschreibt nur den **aktuellen** Stand. Frühere Runden und Berichte: [Redesign-Runden bis 11.11.](docs/history/PROJECT_STATUS_REDESIGN_2026-11.md) · [ältere Geschichte](docs/history/PROJECT_STATUS_HISTORY.md) · [Dokumentationsindex](docs/README.md)

## Branches

| Branch | Inhalt | Zustand |
|---|---|---|
| `experiment/redesign` | Komplettes Redesign der Oberfläche (aktuelle Arbeit) | lokal, nicht gepusht |
| `feature/design-refresh` | Basis davon: Designsystem, Veranstalterseiten, Inhalts-Backend vorbereitet | lokal, 7 Commits vor `origin/main`, nicht gepusht |
| `feature/organizer-auth` | Accounts und Veranstalter-Backend | gepusht, in `design-refresh` gemergt |
| `main` | Letzter gemeinsamer Stand (PR #1) | unverändert |

Das Redesign ändert nur die Oberfläche; Datenschicht, Navigation, Statuslogik, Accounts und SQL sind wie auf `feature/design-refresh`. Zurück zum alten Stand: `git checkout feature/design-refresh`.

## Was die App jetzt kann

- **Vier Tabs**: Radar, Entdecken, Gemerkt, Profil.
- **Radar**: Vollbildkarte mit Radar-Scan (3 s), Pins mit Eventbild (Magenta-Ring = läuft, heller Ring = startet heute später). Pin öffnet eine Vorschau-Box; Panel unten mit Liste und Entfernung; „Alle“ öffnet „Heute Nacht“ (`/today`). Umkreis Standard 30 km. Ohne Standortfreigabe ist die gewählte Stadt die Mitte.
- **Entdecken**: Suche, Chips für Genre, Datum, Ort/Umkreis (10/30/50/100 km), Kalender im Glas-Stil (Monate per Wischen), „Als Nächstes“, „Alle Events“ als Story-Kacheln mit Vollbild-Story. „Gehypt“ nur in der Entwicklung (keine echten Verkaufszahlen).
- **Eventdetail**: Flyer groß, Glas-Karte mit Titel/Tag/Uhrzeit/Ort, Veranstalter, Route (Apple/Google Maps), Tickets bzw. Originalquelle, Live-Snaps-Bereich (zeigt nur, was das Backend liefert).
- **Veranstalterseite**: Feed-Aufbau mit Beiträgen (wischbare Galerie) und Events. In Produktion gibt es noch keine Veranstalter → Leerzustand.
- **Gemerkt**: nur lokal auf dem Gerät gespeichert, Anstehend/Vergangen.
- **Profil/Konto**: Login/Registrierung unter `/account`, nur aktiv mit der Testkonfiguration (Spots-Test).

**Design** (`src/constants/theme.ts`): fast schwarzer Hintergrund `#0a090c` mit Verlauf `#100e13 → #2a1222`, iOS-artige Grauflächen, Akzent `#c922ab` nur für Primäraktionen und Live-Status, Glas-Elemente.

## Daten und Backend

- Events kommen ausschließlich aus dem **Goabase-Import** (Cron alle 2 h in Produktion `yhnxdeypkbzyjappuzmv`). Rund 30 veröffentlichte Events; fast alle ohne Genre, Venue-Name, Beschreibung und Ticketlink.
- SQL 15/16 (Accounts, Veranstalter) nur in **Spots-Test** `nfomkdvotqtlyymomksb` ausgeführt.
- SQL 17 (Live Snaps, Meldungen, saved_events, Ticketarten), 18 (Storage), 19 (Beitragsgalerien) **nirgends ausgeführt**, nur lokal mit PGlite getestet (18 gar nicht automatisiert).
- Lokale TEST-Events (Karlsruhe) und ein TEST-Veranstalter nur bei `__DEV__`; abschaltbar mit `EXPO_PUBLIC_SPOTS_TEST_EVENTS=0`.

## Geprüft

- Letzter vollständiger Lauf: 96/96 Tests (`node --test tests/*.test.cjs` mit PGlite), Expo-Lint, Typecheck (Stand dritte Redesign-Runde). Spätere Runden einzeln im Web geprüft.
- Web-Vorschau 375 × 812: Radar, Entdecken, Eventdetail, Profil, Kalender.

## Nicht geprüft / bekannte Probleme

- **Kein Test auf echtem iOS-/Android-Gerät** für das Redesign: native Pins, Glas-Effekt, Gesten, Kalender-Wischen, Schrift.
- Tests/Lint/Typecheck seit der dritten Runde nicht erneut vollständig gelaufen.
- Filter Techno/House finden in echten Daten fast nichts (fehlende Genres).
- Produktion: pro App-Start 2–3 erwartete 400-Antworten (organizer_id-Abfrage), bis SQL 15 dort eingespielt ist.
- Goabase-Flyer nur in kleiner Auflösung.
- Offene Abstimmung: Veranstalterseiten waren laut `docs/ORGANIZER_ARCHITECTURE.md` dem Kollegen zugeordnet und wurden neu gebaut. Das Redesign betrifft Noyans Designbereich; SQL 17–19 betreffen Jacints Backend.

## Fehlt noch

- Upload-UI für Live Snaps und Beiträge (braucht `expo-image-picker`/`expo-video`, Development Build, SQL 17–19 in Spots-Test).
- Merkliste mit Konto synchronisieren (`saved_events`).
- Passwortreset, Accountlöschung, Moderationsoberfläche.
- Weitere Eventquellen; Hip-Hop/Festival-Kategorien.
- Englisch als zweite App-Sprache: noch kein Übersetzungssystem, alle Texte sind fest auf Deutsch im Code. Ansatz (z. B. `expo-localization` + Textdateien) vor dem Umbau abstimmen.
- Release-Vorbereitung: kein `eas.json`, slug/scheme noch „meine-app“, keine Bundle-ID/Package, kein Google-Maps-Key für Android.

## Nächste empfohlene Schritte

1. Tests, Lint und Typecheck auf `experiment/redesign` laufen lassen.
2. Redesign auf einem echten Handy testen (Expo Go oder Development Build).
3. Entscheiden: Redesign in `feature/design-refresh` übernehmen oder verwerfen; dann mit dem Team abstimmen und PR gegen `main`.
4. SQL 17–19 in Spots-Test einspielen und Upload-UI für Live Snaps bauen.
5. Release-Grundlagen (`eas.json`, Bundle-ID, Icons, Maps-Key).
