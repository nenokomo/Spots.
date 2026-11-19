# Fortschritt: Moderation, Team-Mitglieder, Tickets, Aufräumen

Branch `backend/moderation-team` (Jacint, 19.11.2026). Betrifft Jacints Backend; Oberflächen bewusst einfach („Design offen für Noyan“).
Produktion ist unverändert. Alles nur in Spots-Test (`nfomkdvotqtlyymomksb`).

## Fertig

- **SQL 34** `34_story_moderation.sql` (Spots-Test, Prüfsummen gleich):
  - Story-Bilder melden über `content_reports.story_item_id` (einmal pro Konto, nur mit Konto).
  - Story-Bilder blenden sich **nicht** automatisch aus (Entscheidung: Sammelmeldungen sollen keinen geprüften Club treffen). Das Team sieht die Meldungen in `spots_admin_story_queue` und blendet aus (`spots_admin_set_story_status`) oder löscht.
  - `organizer_story_items.moderation_status` (sichtbar/ausgeblendet); der Club sieht ausgeblendete Bilder im Studio, kann sie aber nicht selbst wieder zeigen.
  - Shots: `live_snaps.team_locked` – was das Team ausblendet oder entfernt, kann der Club nicht wieder einblenden.
- **SQL 35** `35_organizer_invites.sql` (Spots-Test): Einladungscodes für Team-Mitglieder (12 Zeichen, 7 Tage, einmal nutzbar, höchstens 5 offene; nur der Besitzer erstellt, sieht und zieht zurück). Einlösen nur mit Veranstalter-Konto; falscher Code gibt keinen Hinweis auf den Club, nach 10 Fehlversuchen pro Stunde Pause. Mitgliederliste mit E-Mail nur für den Besitzer.
- **SQL 36** `36_public_media_cleanup.sql` (Spots-Test): `spots_public_media_orphans` listet Dateien im Bucket `organizer-public`, auf die nichts mehr zeigt (älter als 24 Stunden). Nur für den Server. In Spots-Test aktuell 0 verwaiste von 3 Dateien.
- **App**:
  - Story in Entdecken: Knopf „Melden“ (gemeinsames Melde-Fenster `ReportPanel` für Shots und Storys; Gäste ohne Konto sehen „Zum Melden bitte zuerst anmelden“).
  - Admin-Reiter „Storys“: gemeldete zuerst, ausblenden, wieder zeigen, entfernen (Zeile und Datei).
  - Studio, Event-Editor: „Bilder zu diesem Event“ (Event-Story und Gäste-Shots der letzten 24 Stunden, ausblenden/wieder zeigen), „Tickets“ (Name, Preis, Link, ausverkauft; nur Information, kein Verkauf).
  - Studio, Reiter Club: „Team“ (Mitglieder, Einladungscode erstellen/zurückziehen, Mitglied entfernen). Registrierung: „Ich habe einen Einladungscode“ legt ein Veranstalter-Konto ohne eigenen Club an; der Code wird nach dem Anmelden im Studio eingelöst.
  - Radar: Events ohne Endzeit gelten vier Stunden ab Beginn als laufend (`LIVE_WITHOUT_END_MS`); gegen Spots-Test geprüft.
- **Edge Function** `cleanup-snaps`: räumt zusätzlich verwaiste öffentliche Bilder auf (überspringt den Teil, wenn SQL 36 fehlt). Lokal mit Stand-ins durchgespielt.

## Geprüft

- PGlite: `tests/story-moderation.test.cjs` (7/7) und die bisherigen Shots-/Story-Tests. App-Tests 99/99, Lint, Typecheck.
- Web gegen Spots-Test (Gast): Story öffnen → „Melden“ → Grund wählen → Hinweis zum Anmelden, keine Konsolenfehler.
- **Handy (19.11., Jacint, Expo Go gegen Spots-Test):** alles getestet, passt (Meldung von Jacint; einzelne Schritte nicht protokolliert).

## Offen

- **Function `cleanup-snaps` in Spots-Test bereitstellen** – braucht Jacints ausdrückliches OK.
- Volle Testreihe vor dem Merge nach `main` (Expo dabei aus).
- Design für Noyan: Melde-Knopf in der Story, Studio-Karten (Team, Tickets, Bilder), Admin-Reiter „Storys“.
- Datenschutz-Entwurf: Einladungscodes, Meldungen zu Story-Bildern, E-Mail-Anzeige für den Club-Besitzer ergänzen.
