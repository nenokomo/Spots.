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
- **Konten** (`/account`, nur Spots-Test): Registrieren mit Auswahl **Privat** oder **Veranstalter / Club**, Anmelden, Passwort vergessen, Konto löschen, Merkliste mit Konto (lokale TEST-Events bleiben auf dem Gerät).
- **Spots Studio** (`/studio`, nur Veranstalter-Konten): Übersicht mit Freigabe-Stand, Events anlegen/bearbeiten/absagen (Ort aus dem Adressbuch, Flyer-Upload, „Live in Spots“ erst nach Freigabe), Statistik (Aufrufe, Gemerkt, Ticket-Klicks, Snaps), Club-Profil mit Logo und privater Ansprechperson. Veranstalter sehen die Besucher-App nicht; private Konten kommen nicht ins Studio.
- **Admin-Bereich `/admin`** (Admin-Rolle): Event-Entwürfe, Veranstalter-Anträge (freigeben, ablehnen, sperren), Orte, Meldungen.
- **Produktion**: nur Team-Anmeldung (keine Registrierung), Admin für das Team.

**Design** (`src/constants/theme.ts`): fast schwarzer Hintergrund mit Pflaumen-Verlauf, iOS-artige Grauflächen, Akzent `#c922ab`. Neue Seiten nutzen die vorhandenen Bausteine; Feinschliff ist Noyans Bereich.
Spots Studio hat bewusst einen eigenen Look (`src/features/studio/theme.ts`: Graphit, Neon-Lime, Pink nur als Marke) – Vorschlag von Jacint, Gestaltung offen für Noyan.

## Daten und Backend

- **Produktion** `yhnxdeypkbzyjappuzmv` (Stand 13.11.): SQL 20–24 (Ticketmaster mit Cron alle 6 h, Orte, Admin, Partner-Anfragen). Goabase-Cron alle 2 h. Adressbuch Baden-Württemberg geladen, 1 Admin. **Ohne** SQL 15, 17–19, 25–28 (Konten, Snaps, Speicher, Veranstalter). Protokoll: [docs/FORTSCHRITT-produktion.md](docs/FORTSCHRITT-produktion.md).
- **Spots-Test** `nfomkdvotqtlyymomksb`: SQL 15–18 und 20–28 eingespielt (Prüfsummen identisch mit den Dateien). Nicht eingespielt: **SQL 19** (Galerien). Ticketmaster-Cron aktiv.
- Neu in Etappe 1/2: **25** Konto löschen + Merkliste; **26** Antrag/Freigabe + datensparsame Statistik (Tagessummen, Hash mit Tagessalz); **27** öffentlicher Bucket `organizer-public` (Logos/Flyer) + Ort aus dem Adressbuch für Club-Events; **28** Kontoart bei der Registrierung (Trigger auf `auth.users`), Club-Adresse, Ansprechperson/Telefon privat.
- Lokale TEST-Events und TEST-Orte nur bei `__DEV__`; abschaltbar mit `EXPO_PUBLIC_SPOTS_TEST_EVENTS=0`.

## Geprüft

- **185/185 Tests** (`node --test tests/*.test.cjs` mit `SPOTS_PGLITE_MODULE`), Expo-Lint und Typecheck ohne Fehler.
- Handy (15.11., iPhone, Expo Go gegen Spots-Test): Registrieren + Bestätigen, Merkliste mit Konto, Konto löschen (Konto, Profil, Merkliste weg), Club-Registrierung und Studio sichtbar.

## Nicht geprüft / bekannte Probleme

- **Passwort vergessen** auf dem Handy noch nicht zu Ende getestet (Mail-Limit).
- Eingebauter Supabase-Mailversand: **nur 2 Mails pro Stunde** und nur an Supabase-Team-Adressen; deutsche Mailtexte erst mit eigenem Mailserver (SMTP).
- Rücksprung aus Mails: `exp://`-Adressen müssen in Supabase **genau** eingetragen sein (`exp://**` greift nicht); ändert sich mit der WLAN-Adresse.
- Club-Adresse hat keine Kartenposition: Club-Events nur mit Ort aus dem Adressbuch auf der Karte.
- Studio-Abläufe (Upload, Freigabe, Live stellen, Statistik) noch nicht vollständig auf dem Handy durchgespielt; Upload (SQL 18/27) nicht mit echten Dateien getestet.
- Radar zählt nur Events mit Endzeit als „live“; Ticketmaster-Konzerte haben meist keine.
- Produktion: pro App-Start 2–3 erwartete 400-Antworten (organizer_id-Abfrage), bis SQL 15 dort eingespielt ist.

## Fehlt noch

- Eigener Mailserver (Domain, SMTP), deutsche Mailtexte eintragen.
- Studio: Team-Mitglieder einladen, mehrere Clubs pro Konto, Ticketarten, Beiträge/Galerien (SQL 19), alte Bilder aufräumen.
- Live Snaps (Etappe 3, Development Build).
- Konten und Veranstalter in Produktion (eigene Runde, jeder Schritt mit Freigabe von Jacint und Noyan).
- Rechtliches: Entwürfe in [docs/entwuerfe/](docs/entwuerfe/README.md) prüfen lassen; Datenschutz um Club-Angaben und anonyme Zählung ergänzen.
- Release-Grundlagen (`eas.json`, Bundle-ID, Schema `spots`, Icons, Maps-Key), Englisch als zweite Sprache.

## Nächste empfohlene Schritte

1. Passwort vergessen auf dem Handy fertig testen (neues privates Testkonto, nur den neuesten Link öffnen).
2. Noyan: Design von Spots Studio und der Registrieren-Seite.
3. Studio-Ablauf komplett durchspielen: Club → Freigabe → Event live → Statistik.
4. Mailserver und Domain klären, dann Produktions-Runde für Konten und Veranstalter planen.
