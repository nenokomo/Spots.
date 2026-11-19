# Projektstatus – Spots

Stand: 15.11.2026 (abends). Diese Datei beschreibt nur den **aktuellen** Stand. Fahrplan bis zum Release: [docs/FAHRPLAN-RELEASE.md](docs/FAHRPLAN-RELEASE.md). Arbeitsprotokolle: [Konten](docs/FORTSCHRITT-konten.md) · [Veranstalter](docs/FORTSCHRITT-veranstalter.md) · [Produktion](docs/FORTSCHRITT-produktion.md). Frühere Runden: [Redesign bis 11.11.](docs/history/PROJECT_STATUS_REDESIGN_2026-11.md) · [ältere Geschichte](docs/history/PROJECT_STATUS_HISTORY.md) · [Dokumentationsindex](docs/README.md)

## Branches

| Branch | Inhalt | Zustand |
|---|---|---|
| `main` | Gemeinsamer Stand: Redesign, Ticketmaster, Adressbuch, Admin-Bereich, Team-Anmeldung in Produktion, **Etappe 1 (Konten für alle)** und **Etappe 2 (Veranstalter, Spots Studio)** | gepusht |
| `backend/konten`, `backend/veranstalter`, `docs/fahrplan-release` | in `main` enthalten (15.11.) | gepusht |

Neue Arbeit startet als eigener Branch von `main` (`backend/<thema>`, `design/<thema>`).

## Was die App kann

- **Besucher-App** – vier Tabs: Radar, Entdecken, Gemerkt, Profil. Eventdetail, Veranstalterseite, Ortsseite `/venue/[id]` (noch nirgends verlinkt). Filter inkl. Hip-Hop und Konzerte. Clubs erscheinen nur mit Event (Entscheidung 13.11.).
- **Radar** (Design Noyan, 15.11.): Start am eigenen Standort, Umkreis 10 km, Button „Filter“, Kreis-Scan um den Standort-Punkt, Infokasten direkt am Pin.
- **Design allgemein** (Noyan, 16.11.): Abschnittstitel mit rosa Neon-Leuchten (`SectionTitle`), gefüllte Buttons im Verlauf „Orchidee“ (Beere → Violett).
- **Entdecken** (Design Noyan): Story-Kacheln und Story-Ansicht im Snapchat-Stil (Tippen = Bilder, nach dem letzten von vorn; Hochwischen = nächster Veranstalter; Ziehen nach unten/links/rechts = schließen, die Story wird dabei kleiner); „Heute“ zeigt dieselben Events wie das Radar (auch laufende); Suchleiste schlägt ab 3 Buchstaben Städte vor. Unterer Bereich ohne Suche/Filter: **Veranstalter der gewählten Stadt als Story-Kacheln** (SQL 33; eigene Story-Bilder, sonst Logo und Name; Knopf „Zum Profil“), mit Suche oder Genre-/Datumsfilter: „Passende Events“. Kachel-Design offen für Noyan.
- **Eventseite** (Design Noyan): bei jedem Event gleich aufgebaut – rundes Bild oben (Veranstalter mit Event-Story 24 h, sonst Eventbild), Beschreibung, Tickets, Karten-Vorschau mit Adresse (SQL 29), **SHOTS** von Gästen (Bild-Button „Poste einen SHOT“, Discokugel-Button, melden, keine Zahlen) und Kamera-Ansicht mit Runterziehen (Kamera und Upload: Jacint). Zählt Aufrufe und Ticket-Klicks für die Studio-Statistik.
- **Startseite** (`/account`): Ohne Konto startet die App mit „Wie nutzt du Spots?“ – **Privat**, **Veranstalter** oder „Als Gast fortfahren“; danach Anmelden, „Passwort vergessen?“, „Neues Konto erstellen“ / „Club registrieren“ (Kontoart aus der Auswahl). Gast gilt nur bis zum nächsten App-Start. Sperre über `Stack.Protected` in `src/app/_layout.tsx`. Profil: unten Abmelden und Konto löschen. Merkliste mit Konto (lokale TEST-Events bleiben auf dem Gerät). Produktion: nur Anmelden + Gast.
- **Spots Studio** (`/studio`, nur Veranstalter-Konten): Übersicht mit Freigabe-Stand, Events anlegen/bearbeiten/absagen (eigene Adresse → Kartenposition über OpenStreetMap oder Ort aus dem Adressbuch, Ende Pflicht, Flyer-Upload, „Live in Spots“ erst nach Freigabe), Statistik (Aufrufe, Gemerkt, Ticket-Klicks, Snaps), Club-Profil mit Logo und privater Ansprechperson. Veranstalter sehen die Besucher-App nicht; private Konten kommen nicht ins Studio.
- **Admin-Bereich `/admin`** (Admin-Rolle): Event-Entwürfe, Veranstalter-Anträge (freigeben, ablehnen, sperren), Shots, Story-Bilder (ausblenden, entfernen), Orte, Meldungen.
- **Moderation, Team, Tickets** ([docs/FORTSCHRITT-moderation.md](docs/FORTSCHRITT-moderation.md), in `main`): Story-Bilder melden; im Studio Bilder zu eigenen Events ausblenden, Team per Einladungscode, Ticketarten pro Event. Auf dem Handy von Jacint bestätigt (19.11.).
- **Produktion**: nur Team-Anmeldung (keine Registrierung), Admin für das Team.

**Design** (`src/constants/theme.ts`): fast schwarzer Hintergrund mit Pflaumen-Verlauf, iOS-artige Grauflächen, Akzent `#c922ab`. Neue Seiten nutzen die vorhandenen Bausteine; Feinschliff ist Noyans Bereich.
Spots Studio hat bewusst einen eigenen Look (`src/features/studio/theme.ts`: Graphit, Neon-Lime, Pink nur als Marke) – Vorschlag von Jacint, Gestaltung offen für Noyan.

## Daten und Backend

- **Produktion** `yhnxdeypkbzyjappuzmv` (Stand 13.11.): SQL 20–24 (Ticketmaster mit Cron alle 6 h, Orte, Admin, Partner-Anfragen). Goabase-Cron alle 2 h. Adressbuch Baden-Württemberg geladen, 1 Admin. **Ohne** SQL 15, 17–19, 25–32 (Konten, Snaps, Speicher, Veranstalter, Event-Adressen, Shots) und ohne Function `cleanup-snaps`. Protokoll: [docs/FORTSCHRITT-produktion.md](docs/FORTSCHRITT-produktion.md).
- **Spots-Test** `nfomkdvotqtlyymomksb`: SQL 15–36 eingespielt (Prüfsummen identisch mit den Dateien). Ticketmaster-Cron aktiv; Function `cleanup-snaps` (Version 2) + stündlicher Aufräum-Job (SQL 31).
- Neu in Etappe 1/2: **25** Konto löschen + Merkliste; **26** Antrag/Freigabe + datensparsame Statistik (Tagessummen, Hash mit Tagessalz); **27** öffentlicher Bucket `organizer-public` (Logos/Flyer) + Ort aus dem Adressbuch für Club-Events; **28** Kontoart bei der Registrierung (Trigger auf `auth.users`), Club-Adresse, Ansprechperson/Telefon privat; **29** Straße/Nr./PLZ an Events, Ende Pflicht für Club-Events (bestehende Zeilen unangetastet).
- Etappe 3 (Shots, [docs/FORTSCHRITT-shots.md](docs/FORTSCHRITT-shots.md)): **19** Galerien; **30** Gäste-Shots sofort sichtbar, Team-Moderation, Aufräumen nur durch den Server; **31** stündlicher Aufräum-Job; **32** Gäste-Shots nur mit Konto sichtbar (Club-Story für alle); **33** Veranstalter-Story für Entdecken (bleibt, bis der Club löscht, max. 30 Bilder) und Event-Story ab dem Anlegen des Events (Studio: „Entdecken-Story“, im Event-Editor „Event-Story“). App: „Shot posten“ mit Handy-Kamera (nur mit Konto), Gäste sehen einen Hinweis mit Anmelde-Link, Melden über das Konto, Admin-Reiter „Shots“.
- Lokale TEST-Events und TEST-Orte nur bei `__DEV__`; abschaltbar mit `EXPO_PUBLIC_SPOTS_TEST_EVENTS=0`.

## Geprüft

- **226/226 Tests** (`node --test tests/*.test.cjs` mit `SPOTS_PGLITE_MODULE`), Expo-Lint und Typecheck ohne Fehler.
- Handy (15.11./19.11., iPhone, Expo Go gegen Spots-Test): Registrieren + Bestätigen, Merkliste mit Konto, Konto löschen, Club-Registrierung, Studio, Club-Event mit eigener Adresse auf Radar und Entdecken, Startseite bei jedem Start, Passwort vergessen (19.11.), Veranstalter-Story posten und in Entdecken ansehen. Expo dafür mit den Spots-Test-Variablen im Terminal starten (sonst Produktion).

## Nicht geprüft / bekannte Probleme

- Eingebauter Supabase-Mailversand: **nur 2 Mails pro Stunde** und nur an Supabase-Team-Adressen; deutsche Mailtexte erst mit eigenem Mailserver (SMTP).
- Rücksprung aus Mails in **Expo Go**: Supabase lehnt Adressen mit IP (`exp://192.168…`) immer ab (Quellcode Supabase Auth, Erlaubt-Liste wird gar nicht geprüft) und nimmt dann `localhost:3000`. Zum Testen Expo mit `--tunnel` starten (`exp://….exp.direct` passt zu `exp://**`). Die echte App (`meine-app://`, später `spots://`) ist nicht betroffen.
- Kartenposition von Club-Events kommt aus OpenStreetMap (Nominatim) und kann etwas daneben liegen; die Adresse steht auf der Eventseite. Datenschutz: Event-Adressen gehen beim Speichern an Nominatim.
- Statistik im Studio noch nicht auf dem Handy geprüft.
- Radar: Events ohne Endzeit (meist Ticketmaster-Konzerte) gelten vier Stunden ab Beginn als laufend – eine Annahme, kein bestätigtes Ende.
- Function `cleanup-snaps` Version 2 (Shots und verwaiste Bilder, SQL 36) läuft in Spots-Test; der erste stündliche Lauf ist noch nicht nachgeprüft.
- Produktion: pro App-Start 2–3 erwartete 400-Antworten (organizer_id-Abfrage), bis SQL 15 dort eingespielt ist.

## Fehlt noch

- Eigener Mailserver (Domain, SMTP), deutsche Mailtexte eintragen.
- Studio: mehrere Clubs pro Konto, Beiträge/Galerien (SQL 19).
- Shots: Live-Kamera und Videos (Development Build).
- Konten und Veranstalter in Produktion (eigene Runde, jeder Schritt mit Freigabe von Jacint und Noyan).
- Rechtliches: Entwürfe in [docs/entwuerfe/](docs/entwuerfe/README.md) prüfen lassen; Datenschutz um Club-Angaben und anonyme Zählung ergänzen.
- Release-Grundlagen (`eas.json`, Bundle-ID, Schema `spots`, Icons, Maps-Key), Englisch als zweite Sprache.

## Nächste empfohlene Schritte

1. Noyan: Design von Spots Studio und der Registrieren-Seite.
2. Studio-Ablauf komplett durchspielen: Club → Freigabe → Event live → Statistik.
3. Mailserver und Domain klären, dann Produktions-Runde für Konten und Veranstalter planen.
