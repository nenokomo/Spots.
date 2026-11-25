# Projektstatus – Spots

Stand: 24.11.2026 (abends). Diese Datei beschreibt nur den **aktuellen** Stand. Fahrplan bis zum Release: [docs/FAHRPLAN-RELEASE.md](docs/FAHRPLAN-RELEASE.md). Arbeitsprotokolle: [Konten](docs/FORTSCHRITT-konten.md) · [Veranstalter](docs/FORTSCHRITT-veranstalter.md) · [Produktion](docs/FORTSCHRITT-produktion.md). Frühere Runden: [Redesign bis 11.11.](docs/history/PROJECT_STATUS_REDESIGN_2026-11.md) · [ältere Geschichte](docs/history/PROJECT_STATUS_HISTORY.md) · [Dokumentationsindex](docs/README.md)

## Branches

| Branch | Inhalt | Zustand |
|---|---|---|
| `main` | Gemeinsamer Stand mit allem bisher Fertigen, inkl. neuem Studio-Design, Website und Kontofunktionen im Entwicklungsmodus | gepusht |
| `design/studio` | Noyans laufender Design-Branch, zurzeit vollständig in `main` enthalten | gepusht |
| `design/studio-umbau` | Umbau von Spots Studio (25.11.): fünf Reiter, Event anlegen in Schritten, Story über das Profilbild, Zahlen mit Trichter. Plan: [docs/STUDIO-UMBAU-PLAN.md](docs/STUDIO-UMBAU-PLAN.md) | gepusht, noch kein Pull Request, nicht auf dem Handy geprüft |

Am 24.11. aufgeräumt: alle 27 Branches, die vollständig in `main` steckten, auf GitHub gelöscht. Neue Arbeit startet immer als eigener Branch vom aktuellen `main` (`git pull origin main`, dann `backend/<thema>` oder `design/<thema>`).

## Was die App kann

- **Besucher-App** – vier Tabs: Radar, Entdecken, Gemerkt, Profil. Eventdetail, Veranstalterseite, Ortsseite `/venue/[id]` (noch nirgends verlinkt). Filter inkl. Hip-Hop und Konzerte. Clubs erscheinen nur mit Event (Entscheidung 13.11.).
- **Radar** (Design Noyan, 15.11.): Start am eigenen Standort, Umkreis 10 km, Button „Filter“, Kreis-Scan um den Standort-Punkt, Infokasten direkt am Pin.
- **Design allgemein** (Noyan, 16.11.): Abschnittstitel mit rosa Neon-Leuchten (`SectionTitle`), gefüllte Buttons im Verlauf „Orchidee“ (Beere → Violett).
- **Entdecken** (Design Noyan): Story-Kacheln und Story-Ansicht im Snapchat-Stil (Tippen = Bilder, nach dem letzten von vorn; Hochwischen = nächster Veranstalter; Ziehen nach unten/links/rechts = schließen, die Story wird dabei kleiner); „Heute“ zeigt dieselben Events wie das Radar (auch laufende); Suchleiste schlägt ab 3 Buchstaben Städte vor. Unterer Bereich ohne Suche/Filter: **Veranstalter der gewählten Stadt als Story-Kacheln** (SQL 33; eigene Story-Bilder, sonst Logo und Name; Knopf „Zum Profil“), mit Suche oder Genre-/Datumsfilter: „Passende Events“. Kachel-Design offen für Noyan.
- **Eventseite** (Design Noyan): bei jedem Event gleich aufgebaut – rundes Bild oben (Veranstalter mit Event-Story 24 h, sonst Eventbild), Beschreibung, Tickets, Karten-Vorschau mit Adresse (SQL 29), **SHOTS** von Gästen (Bild-Button „Poste einen SHOT“, Discokugel-Button, melden, keine Zahlen) und Kamera-Ansicht mit Runterziehen (Kamera und Upload: Jacint). Zählt Aufrufe und Ticket-Klicks für die Studio-Statistik.
- **Startseite** (`/account`): Ohne Konto startet die App mit „Wie nutzt du Spots?“ – **Privat**, **Veranstalter** oder „Als Gast fortfahren“; danach Anmelden, „Passwort vergessen?“, „Neues Konto erstellen“ / „Club registrieren“ (Kontoart aus der Auswahl). Gast gilt nur bis zum nächsten App-Start. Sperre über `Stack.Protected` in `src/app/_layout.tsx`. Profil: unten Abmelden und Konto löschen. Merkliste mit Konto (lokale TEST-Events bleiben auf dem Gerät). Produktion: nur Anmelden + Gast.
- **Spots Studio** (`/studio`, nur Veranstalter-Konten; in `main`: vier Reiter Events · Story · Einnahmen · Profil, [docs/FORTSCHRITT-studio-design.md](docs/FORTSCHRITT-studio-design.md)). **Auf `design/studio-umbau` neu aufgebaut** (Noyan und Jacint, 25.11., [Plan](docs/STUDIO-UMBAU-PLAN.md), [Stand](docs/FORTSCHRITT-studio-umbau.md)): fünf Reiter **Übersicht** (nächstes Event mit Checkliste) · **Events** · **＋** (neues Event in vier Schritten mit Vorschau, Datums- und Zeitauswahl, Genre als Auswahl) · **Zahlen** (Trichter, Verlauf, Vergleich) · **Profil** (Vorschau, Bilder, Team; Einstellungen hinter dem Zahnrad). Eventseite mit Story über das Profilbild mit „+“, Duplizieren, Teilen, Rückfrage vor Absagen und Löschen. Veranstalter sehen die Besucher-App nicht; private Konten kommen nicht ins Studio.
- **Admin-Bereich `/admin`** (Admin-Rolle): Event-Entwürfe, Veranstalter-Anträge (freigeben, ablehnen, sperren), Shots, Story-Bilder (ausblenden, entfernen), Orte, Meldungen.
- **Moderation, Team, Tickets** ([docs/FORTSCHRITT-moderation.md](docs/FORTSCHRITT-moderation.md), in `main`): Story-Bilder melden; im Studio Bilder zu eigenen Events ausblenden, Team per Einladungscode, Ticketarten pro Event. Auf dem Handy von Jacint bestätigt (19.11.).
- **Produktion**: veröffentlichte App nur mit Team-Anmeldung, Admin für das Team. Im Entwicklungsmodus (`npx expo start`, `__DEV__`) zeigt die App auch gegen die Produktion alle Kontofunktionen (Registrierung, Studio, Merkliste im Konto, Konto löschen) – echte Daten, keine Test-Events anlegen. Club-Konto dort noch nicht angelegt: [docs/PRODUKTION-RUNDE-2.md](docs/PRODUKTION-RUNDE-2.md), Abschnitt „Stufe 1“.

**Design** (`src/constants/theme.ts`): fast schwarzer Hintergrund mit Pflaumen-Verlauf, iOS-artige Grauflächen, Akzent `#c922ab`. Neue Seiten nutzen die vorhandenen Bausteine; Feinschliff ist Noyans Bereich.
Spots Studio gehört zur Spots-Familie (`src/features/studio/theme.ts`: gleicher dunkler Hintergrund, Rosa als Akzent, „SPOTS STUDIO“-Abzeichen) – Design Noyan.

## Daten und Backend

- **Produktion** `yhnxdeypkbzyjappuzmv` (Stand 23.11., am 24.11. nur lesend geprüft: Tabellen, Funktionen, Regeln und Auslöser wie in Spots-Test; drei Zeitpläne laufen ohne Fehler; 1 Konto = Admin, noch kein Veranstalter): SQL 15, 17–30, 32–40 eingespielt (Prüfsummen gleich, Events unverändert, Protokoll in [docs/PRODUKTION-RUNDE-2.md](docs/PRODUKTION-RUNDE-2.md)), dazu 20–24 (Ticketmaster, Orte, Admin, Partner-Anfragen) und Goabase-Zeitplan. App läuft dort weiter nur mit Team-Anmeldung. Function `cleanup-snaps` und Aufräum-Zeitplan (SQL 31) seit 23.11. eingerichtet. **Noch nicht:** Weiterleitungen, Mailserver, Konten für alle. Free Plan: keine automatischen Sicherungen.
- **Spots-Test** `nfomkdvotqtlyymomksb`: SQL 15–40 eingespielt (Prüfsummen identisch mit den Dateien). Ticketmaster-Cron aktiv; Function `cleanup-snaps` (Version 2, Shots und verwaiste Bilder) + stündlicher Aufräum-Job (SQL 31), läuft seit dem 20.11. ohne Fehler.
- Neu in Etappe 1/2: **25** Konto löschen + Merkliste; **26** Antrag/Freigabe + datensparsame Statistik (Tagessummen, Hash mit Tagessalz); **27** öffentlicher Bucket `organizer-public` (Logos/Flyer) + Ort aus dem Adressbuch für Club-Events; **28** Kontoart bei der Registrierung (Trigger auf `auth.users`), Club-Adresse, Ansprechperson/Telefon privat; **29** Straße/Nr./PLZ an Events, Ende Pflicht für Club-Events (bestehende Zeilen unangetastet).
- Etappe 3 (Shots, [docs/FORTSCHRITT-shots.md](docs/FORTSCHRITT-shots.md)): **19** Galerien; **30** Gäste-Shots sofort sichtbar, Team-Moderation, Aufräumen nur durch den Server; **31** stündlicher Aufräum-Job; **32** Gäste-Shots nur mit Konto sichtbar (Club-Story für alle); **33** Veranstalter-Story für Entdecken (bleibt, bis der Club löscht, max. 30 Bilder) und Event-Story ab dem Anlegen des Events (Studio: beides im Reiter „Story“). App: „Shot posten“ mit Handy-Kamera (nur mit Konto), Gäste sehen einen Hinweis mit Anmelde-Link, Melden über das Konto, Admin-Reiter „Shots“.
- Lokale TEST-Events und TEST-Orte nur bei `__DEV__`; abschaltbar mit `EXPO_PUBLIC_SPOTS_TEST_EVENTS=0`.

## Geprüft

- **237/237 Tests** (`node --test tests/*.test.cjs` mit `SPOTS_PGLITE_MODULE`), Expo-Lint und Typecheck ohne Fehler.
- Handy (15.11./19.11., iPhone, Expo Go gegen Spots-Test): Registrieren + Bestätigen, Merkliste mit Konto, Konto löschen, Club-Registrierung, Studio, Club-Event mit eigener Adresse auf Radar und Entdecken, Startseite bei jedem Start, Passwort vergessen (19.11.), Veranstalter-Story posten und in Entdecken ansehen. Expo dafür mit den Spots-Test-Variablen im Terminal starten (sonst Produktion).

## Nicht geprüft / bekannte Probleme

- Eingebauter Supabase-Mailversand: **nur 2 Mails pro Stunde** und nur an Supabase-Team-Adressen; deutsche Mailtexte erst mit eigenem Mailserver (SMTP).
- Rücksprung aus Mails in **Expo Go**: Supabase lehnt Adressen mit IP (`exp://192.168…`) immer ab (Quellcode Supabase Auth, Erlaubt-Liste wird gar nicht geprüft) und nimmt dann `localhost:3000`. Zum Testen Expo mit `--tunnel` starten (`exp://….exp.direct` passt zu `exp://**`). Die echte App (`meine-app://`, später `spots://`) ist nicht betroffen.
- Kartenposition von Club-Events kommt aus OpenStreetMap (Nominatim) und kann etwas daneben liegen; die Adresse steht auf der Eventseite. Datenschutz: Event-Adressen gehen beim Speichern an Nominatim.
- Studio-Umbau (`design/studio-umbau`, 25.11.) noch nicht auf dem Handy geprüft: nur Typecheck, Lint, App-Tests und Probe-Bündel. Einnahmen und verkaufte Tickets brauchen Daten vom Backend (Entscheidung offen); bis dahin heißt der Reiter „Zahlen“.
- Radar: Events ohne Endzeit (meist Ticketmaster-Konzerte) gelten vier Stunden ab Beginn als laufend – eine Annahme, kein bestätigtes Ende.
- Motto, Titelbild und Statistik-Verlauf haben auf `design/studio-umbau` eine Oberfläche; Beiträge anlegen ist weiter offen ([docs/FORTSCHRITT-profil-beitraege-zahlen.md](docs/FORTSCHRITT-profil-beitraege-zahlen.md)). Mit einem Club-Konto noch nicht ausprobiert.

## Fehlt noch

- Eigener Mailserver (Domain, SMTP), deutsche Mailtexte eintragen.
- Studio: mehrere Clubs pro Konto; Oberfläche für Beiträge; die Backend-Punkte aus [docs/STUDIO-UMBAU-PLAN.md](docs/STUDIO-UMBAU-PLAN.md), Abschnitt 7 (Vormerken, Push, Veranstalter ohne festen Ort, Schutz privater Adressen, Teilen mit Link).
- Shots: Live-Kamera und Videos (Development Build).
- Produktion: Datenbank, Function und Aufräum-Zeitplan eingerichtet; offen sind Dashboard-Einstellungen (Teil C) und Konten für alle (Teil D, erst mit Mailserver und Rechtstexten), siehe [docs/PRODUKTION-RUNDE-2.md](docs/PRODUKTION-RUNDE-2.md).
- Rechtliches: Entwürfe in [docs/entwuerfe/](docs/entwuerfe/README.md) (am 23.11. mit dem Code abgeglichen) prüfen lassen; Links zu den Texten in die App. Ticketverkauf über Spots (Idee: Zahlungsdienst mit Marktplatz, Club bleibt Verkäufer) ist nur besprochen, nichts gebaut.
- Release-Grundlagen (`eas.json`, Bundle-ID, Schema `spots`, Icons, Maps-Key), Englisch als zweite Sprache.

## Nächste empfohlene Schritte

1. Noyan: Studio-Umbau (`design/studio-umbau`) auf dem Handy prüfen, danach Pull Request nach `main`; Design der Registrieren-Seite. Jacint: Punkte aus dem Umbau-Plan, Abschnitt 7, und Verkaufszahlen klären.
2. Studio-Ablauf komplett durchspielen: Club → Freigabe → Event live → Story → Einnahmen.
3. Mailserver und Domain klären, dann Produktions-Runde für Konten und Veranstalter planen.
