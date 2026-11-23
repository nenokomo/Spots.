# Fortschritt: Profil (Motto, Titelbild), Beiträge, Statistik-Verlauf, Datenschutz, Produktions-Plan

Branch `backend/profil-beitraege-zahlen` (Jacint, 23.11.2026). Betrifft Jacints Backend. Bewusst **keine** Änderungen an den Studio-Seiten und an der Veranstalterseite, weil Noyan sie gerade neu gestaltet (`design/studio`).
Produktion ist unverändert. Alles nur in Spots-Test (`nfomkdvotqtlyymomksb`), Prüfsummen der Funktionen gleich wie in den Dateien.

## Fertig

- **SQL 37** Motto (bis 120 Zeichen) und Titelbild (`organizers.motto`, `cover_url`); die Aufräumliste aus SQL 36 kennt das Titelbild.
- **SQL 38** Statistik-Verlauf: `spots_organizer_event_stats_daily(veranstalter, tage)` liefert Tageswerte pro Event (Aufrufe, Ticket-Klicks, neu gemerkt, Shots). „Neu gemerkt“ wird ab jetzt pro Tag gezählt; ältere Merklisten-Einträge stehen nur in der Gesamtzahl.
- **SQL 39** Beiträge endgültig löschen (Mitglieder und Team), höchstens 100 Beiträge pro Club; das Team darf Dateien im Bucket `organizer-media` löschen.
- **SQL 40** Datenschutz: `live_snaps.author_id` und `organizer_story_items.created_by` sind über die Schnittstelle nicht mehr lesbar (nur noch Spaltenrechte, die die App braucht). Die App war davon nicht betroffen, sie hat die Spalten nie gelesen.
- **Datenzugriff in der App** (`src/features/organizer/organizerApi.ts`, `src/services/organizers.ts`):
  - Profil: `MyOrganizer.motto/coverUrl`, `updateOrganizerProfile({ motto, coverUrl })` (nur gespeichert, wenn angegeben), `uploadOrganizerImage(…, 'cover')`. Öffentlich: `PublicOrganizer.motto/coverUrl`.
  - Verlauf: `fetchEventStatsDaily(organizerId, tage)` und `dailyTotals(zeilen, heute, tage)` (Summen pro Tag mit Nullen, fertig für ein Diagramm).
  - Beiträge: `fetchMyPosts`, `createPost({ body, images, publish })`, `setPostPublished`, `deletePost`. Die Veranstalterseite bekommt die Bilder von Beiträgen jetzt wirklich (`postImageUrls`, Links eine Stunde gültig).
- **Rechtstexte** in `docs/entwuerfe/`: Datenschutzerklärung und Nutzungsbedingungen mit dem Code abgeglichen; neue Rechtsfragen 26–33; Übersicht im README.
- **Plan für die Produktion:** `docs/PRODUKTION-RUNDE-2.md` (nichts ausgeführt).
- Function `cleanup-snaps` Version 2 läuft in Spots-Test seit dem 20.11. stündlich ohne Fehler (geprüft am 23.11.).

## Für Noyan (Daten sind da, Oberfläche offen)

- **Veranstalterseite:** `organizer.motto` und `organizer.coverUrl` statt erstem Satz der Biografie und nächstem Flyer (beide können fehlen → bisheriges Verhalten als Rückfall).
- **Studio Profil:** zwei Felder Motto und Titelbild (`uploadOrganizerImage(id, bild, 'cover')`, dann `updateOrganizerProfile` mit `coverUrl`).
- **Studio „+ Beitrag“:** `createPost`, Liste über `fetchMyPosts`, zurückziehen und löschen.
- **Studio „Zahlen“:** `fetchEventStatsDaily` + `dailyTotals` für den Verlauf; pro Event nach `eventId` filtern.

## Geprüft

- PGlite: `tests/organizer-profile-posts.test.cjs` (5/5), `tests/hide-author-columns.test.cjs` (4/4) und die bisherigen Story-, Shots- und Statistik-Tests. App-Tests 101/101, Lint, Typecheck.
- Web gegen Spots-Test (Gast) nach SQL 40: Entdecken zeigt den Club mit Story, Veranstalterseite lädt, keine Konsolenfehler.
- **Nicht geprüft:** Beitrag mit Bildern wirklich anlegen (braucht ein angemeldetes Club-Konto und eine Oberfläche), Titelbild hochladen, Verlauf mit echten Zahlen.

## Offen

- Volle Testreihe vor dem Merge nach `main` (Expo dabei aus).
- Oberflächen für Motto, Titelbild, Beiträge und Verlauf (Noyan, nach `design/studio`).
- Dateien gelöschter Beiträge, die ein anderes Team-Mitglied hochgeladen hat, bleiben im privaten Bucket liegen (nicht mehr lesbar); Aufräumliste dafür fehlt.
- Zählung: fester täglicher Löschlauf für die Prüfwerte (bisher nur beim nächsten Zählen).
- Gäste können eigene Shots in der App nicht löschen (Knopf fehlt); EXIF-Daten in Fotos.
