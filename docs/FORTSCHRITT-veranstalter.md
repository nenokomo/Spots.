# Fortschritt – Etappe 2: Veranstalter und Dashboard (Jacint)

Branch `backend/veranstalter` (abgezweigt von `backend/konten`, weil Etappe 1 noch nicht in `main` ist). Fahrplan: `docs/FAHRPLAN-RELEASE.md` (Branch `docs/fahrplan-release`). Alles nur lokal (PGlite) und in Spots-Test (`nfomkdvotqtlyymomksb`); Produktion nicht.

## Fertig

- **SQL 26** `supabase/ops/26_organizer_review_stats.sql` (nächste freie Nummer geprüft: auf keinem Branch gibt es 26+):
  - Antrag → Freigabe: neue Spalten `review_status` (draft/pending/approved/rejected/suspended), `review_note`, `submitted_at`, `reviewed_at`, `reviewed_by`. Veranstalter dürfen `is_published` nicht mehr setzen. Öffentlich nur mit `approved`. Bereits öffentliche Veranstalter gelten als freigegeben.
  - Funktionen: `spots_organizer_submit` / `spots_organizer_withdraw` (nur Besitzer), `spots_admin_review_organizer` (nur Team: pending → approved/rejected, approved ↔ suspended), `spots_admin_organizer_queue` (Prüfliste mit Kontakt-Mail des Besitzers, nur Team).
  - Höchstens 3 eigene Veranstalter pro Konto (`create_organizer` ersetzt).
  - Statistik: `spots_track_event(event, 'view'|'ticket_click', geraete_kennung)` für alle; zählt nur öffentliche Veranstalter-Events, pro Gerät/Event/Art/Tag einmal. Gespeichert werden nur Tagessummen und ein Hash mit täglich neuem Salz (nach einem Tag gelöscht). Snaps zählt ein Trigger beim Hochladen. `spots_organizer_event_stats(veranstalter)` liefert Summen (Aufrufe, Ticket-Klicks, Gemerkt, Snaps) nur für Mitglieder und das Team.
  - Event-Zeilen bleiben unverändert (im Test geprüft). Konto löschen (SQL 25) funktioniert weiter.
- Tests: `tests/organizer-review.test.cjs` (PGlite). Gesamt 168/168.

## Läuft gerade

- SQL 18 und 26 in Spots-Test einspielen und prüfen.

## Offen

- App: `src/features/accounts/management.ts` schickt noch `isPublished` beim Profil-Update – muss auf Antrag umgestellt werden (Teil des App-Schritts).
- Gemerkt zählt nur Merklisten von Konten; Merklisten ohne Konto bleiben auf dem Gerät.
- Logos und Flyer: SQL 18 hat nur private Speicher (Snaps, Beitragsbilder). Profilbild (`avatar_url`) und Event-Flyer (`image_url`) brauchen eine dauerhafte öffentliche Adresse → Entscheidung nötig (siehe unten).
- SQL 19 (Galerien) danach in Spots-Test.
- App-Teil: „Veranstalter werden“, Dashboard (Profil, Events, Statistiken), Freigabe-Reiter im Admin-Bereich. Design offen für Noyan.

## Entscheidung offen: Logos/Flyer

Vorschlag: zusätzlicher **öffentlicher** Speicher `organizer-public` (nur Bilder, max. 5 MB, Ordner = Veranstalter-ID, Hochladen/Löschen nur für Mitglieder). Vorteil: feste Bild-Adresse, schnell überall anzeigbar. Nachteil: wer die Adresse kennt, sieht das Bild auch vor der Freigabe.
