# Fortschritt – Etappe 2: Veranstalter und Dashboard (Jacint)

Branch `backend/veranstalter` (baut auf `backend/konten` auf, weil Etappe 1 noch nicht in `main` ist). Fahrplan: `docs/FAHRPLAN-RELEASE.md` (Branch `docs/fahrplan-release`). Alles nur lokal (PGlite) und in Spots-Test (`nfomkdvotqtlyymomksb`); Produktion nicht.

## Fertig

- **SQL 26** `supabase/ops/26_organizer_review_stats.sql`:
  - Antrag → Freigabe: `review_status` (draft/pending/approved/rejected/suspended) plus Hinweis und Zeitstempel. Veranstalter dürfen `is_published` nicht mehr setzen; öffentlich nur mit `approved`. Bereits öffentliche Veranstalter gelten als freigegeben.
  - `spots_organizer_submit` / `spots_organizer_withdraw` (nur Besitzer), `spots_admin_review_organizer` (nur Team: pending → approved/rejected, approved ↔ suspended), `spots_admin_organizer_queue` (Prüfliste mit Kontakt-Mail des Besitzers, nur Team). Höchstens 3 eigene Veranstalter pro Konto.
  - Statistik: `spots_track_event` zählt Aufrufe/Ticket-Klicks öffentlicher Veranstalter-Events pro Gerät/Event/Art/Tag einmal; gespeichert werden nur Tagessummen und ein Hash mit täglich neuem Salz (nach einem Tag gelöscht). Snaps zählt ein Trigger. `spots_organizer_event_stats` liefert Summen nur für Mitglieder und das Team.
- **SQL 27** `supabase/ops/27_organizer_public_media.sql`: öffentlicher Bucket `organizer-public` (JPG/PNG/WebP, 5 MB) für Logos und Flyer, Ordner = Veranstalter-ID, Hochladen/Ersetzen/Löschen/Auflisten nur für Mitglieder. Veranstalter-Events dürfen `venue_id` setzen (nur veröffentlichte Orte); Name, Stadt und Position kommen dann vom Ort.
- **Spots-Test (15.11.)**: SQL 18, 26 und 27 eingespielt. Alle Funktionen mit gleicher Prüfsumme wie die Dateien, Rechte geprüft, Funktionstest von SQL 26 in zurückgerollter Transaktion bestanden. Events vorher/nachher gleich (601, Prüfwert `ca4c9cb0…`).
- **App** (einfache Oberfläche, **Design offen für Noyan**):
  - Profil-Tab → „Veranstalter-Bereich“ (`/dashboard`): eigene Veranstalter, „Veranstalter werden“ (Name → Profil, Adresse wird aus dem Namen gebildet).
  - Dashboard (`/dashboard/[id]`): Status der Freigabe mit Hinweis des Teams, Antrag stellen/zurückziehen; Reiter Profil (Name, Stadt, Text, Website, Logo-Upload), Events (anlegen/bearbeiten/absagen, Ort aus dem Adressbuch oder selbst eingeben, Flyer-Upload, „Öffentlich zeigen“ erst nach Freigabe), Statistik (Aufrufe, Gemerkt, Ticket-Klicks, Snaps).
  - Admin-Bereich: neuer Reiter „Veranstalter“ (freigeben, ablehnen mit Begründung, sperren, Sperre aufheben).
  - Eventseite zählt Aufrufe und Ticket-Klicks nur bei Veranstalter-Events, nie bei TEST-Events (`src/services/eventStats.ts`).
  - Das alte „selbst veröffentlichen“ in `src/features/accounts/management.ts` ist entfernt. `expo-image-picker` installiert (in Expo Go enthalten), Fototext in `app.json`.
- Prüfung: 177/177 Tests (neu: `organizer-review`, `organizer-media`, `organizer-app`), Lint und Typecheck ohne Fehler. Web-Vorschau gegen Spots-Test: Veranstalter-Bereich und Dashboard ohne Anmeldung korrekt, keine Konsolenfehler. Abläufe mit Anmeldung noch nicht geprüft (keine Zugangsdaten in der Vorschau).

## Läuft gerade

- Handy-Test durch Jacint (siehe unten).

## Offen

- Handy-Test: Veranstalter anlegen → Logo hochladen → Antrag → im Admin-Reiter freigeben → Event mit Ort und Flyer anlegen, öffentlich stellen → Event in der App öffnen, Ticket-Link tippen → Statistik prüfen.
- SQL 18 / 27 mit echten Dateien prüfen (Upload, Anzeige, Löschen; fremdes Konto darf nicht hochladen).
- Bilder bleiben im Speicher, wenn ein Logo ersetzt oder ein Event gelöscht wird (Aufräumen später, z. B. per Edge Function).
- Ohne Ort aus dem Adressbuch hat ein Event keine Kartenposition (keine Adresssuche/Geocoding).
- Team-Mitglieder einladen: Datenbank kann es (`set_organizer_editor`), Oberfläche fehlt noch (braucht Suche nach Konto per Mail → eigene Funktion nötig).
- Ticketarten, Beiträge/Galerien (SQL 19 noch nicht in Spots-Test) im Dashboard.
- Datenschutz-Entwurf ergänzen: anonyme Zählung von Aufrufen/Ticket-Klicks (zufällige Geräte-Kennung, Hash, nach einem Tag gelöscht).
- Design aller neuen Seiten: offen für Noyan.
