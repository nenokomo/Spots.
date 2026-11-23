# Fortschritt – Etappe 2: Veranstalter und Spots Studio (Jacint)

Branch `backend/veranstalter` (baut auf `backend/konten` auf, weil Etappe 1 noch nicht in `main` ist). Fahrplan: `docs/FAHRPLAN-RELEASE.md` (Branch `docs/fahrplan-release`). Alles nur lokal (PGlite) und in Spots-Test (`nfomkdvotqtlyymomksb`); Produktion nicht.

## Entscheidung 15.11. (Jacint)

Clubs registrieren sich **direkt als Veranstalter** – getrenntes System, kein „Privatkonto wird Veranstalter“. Beim Registrieren: Auswahl Privat / Veranstalter. Clubs geben an: Name, Adresse (Straße, Nr., PLZ, Stadt), Ansprechperson, Telefon (Pflicht), Website und Social Media (freiwillig). Der Antrag ist mit der Registrierung gestellt; vor der Freigabe dürfen Clubs Entwürfe anlegen. Veranstalter bekommen eine **komplett eigene Oberfläche** („Spots Studio“, eigener Look).

## Fertig

- **SQL 26** (Antrag/Freigabe, Statistik-Zähler), **SQL 27** (öffentlicher Bucket `organizer-public` für Logos/Flyer, Ort aus dem Adressbuch), **SQL 18** (private Buckets) – alle in Spots-Test, Prüfsummen gleich.
- **SQL 28** `supabase/ops/28_organizer_signup.sql`, in Spots-Test eingespielt (15.11.):
  - `user_profiles.account_type` (private/organizer), nur bei der Registrierung gesetzt (Trigger auf `auth.users`), danach nicht änderbar. Ältere Konten sind privat.
  - Club-Angaben kommen als Registrierungs-Metadaten; der Trigger legt den Club an (Status „Antrag offen“), macht das Konto zum Besitzer und löscht die Angaben danach aus den Metadaten. Ungültige Angaben blockieren die Registrierung nicht; die App holt sie nach (`spots_register_organizer`).
  - Neue Spalten `organizers.street/house_number/postcode/social_url`. Ansprechperson und Telefon privat in `spots_accounts_private.organizer_contacts` (lesen: Mitglieder; ändern: Besitzer; Team: Prüfliste). Konto löschen entfernt sie und zieht einen offenen Antrag zurück.
  - Private Konten können keine Veranstalter anlegen (`create_organizer`, `spots_register_organizer`).
  - Prüfliste `spots_admin_organizer_queue` zusätzlich mit Adresse, Social Media, Ansprechperson, Telefon, „E-Mail bestätigt“.
  - Prüfung: alle 10 Funktionen mit gleicher Prüfsumme wie die Datei; Probe-Registrierung (Club + privat) in zurückgerollter Transaktion bestanden; Events unverändert (601, `ca4c9cb0…`).
- **App**:
  - Registrieren: Auswahl „Privat“ / „Veranstalter / Club“ mit Club-Feldern (`src/features/organizer/signup.ts` prüft wie SQL 28; „club.de“ → https, „@name“ → Instagram, „@“ in Links als %40).
  - **Spots Studio** (`/studio`, `src/features/studio/`): eigene Reiter Übersicht, Events, Statistik, Club; Event-Editor `/studio/event/[id]`. Eigener Look in `studio/theme.ts` (Graphit, Neon-Lime für Aktionen, Pink nur als Marke) – Noyans `theme.ts` unverändert.
  - Veranstalter landen nach dem Anmelden immer im Studio; private Konten und Abgemeldete kommen nicht hinein.
  - „Veranstalter-Bereich“ im privaten Profil und die `/dashboard`-Seiten entfernt.
  - Admin-Reiter „Veranstalter“ zeigt Adresse, Ansprechperson, Telefon, Social Media, Mail-Status.
- Prüfung: 185/185 Tests, Lint und Typecheck ohne Fehler. Web-Vorschau: Registrierung mit Club-Feldern sichtbar, `/studio` ohne Anmeldung leitet aufs Radar, keine Konsolenfehler. **Studio von innen noch nicht gesehen** (braucht ein bestätigtes Veranstalter-Konto).

- **Studio-Navigation (15.11.)**: Event-Editor öffnete nicht (versteckter Reiter). Jetzt Stapel + Reiter wie in der Besucher-App; auf dem Handy bestätigt.
- **SQL 29** `supabase/ops/29_event_address.sql`, in Spots-Test eingespielt (Prüfsumme gleich, Importe unverändert): Events haben Straße, Nr., PLZ; Club-Events brauchen ein Ende (NOT VALID: bestehende Zeilen unangetastet); Ort aus dem Adressbuch übernimmt auch die Adresse. Entscheidung Jacint: jedes Event hat eine eigene Adresse, Ende ist Pflicht.
- **Adresse → Kartenposition** beim Speichern über OpenStreetMap Nominatim (strukturierte Suche, nur Deutschland, `src/features/organizer/geocode.ts`). Editor: Club-Adresse vorausgefüllt, Ende Pflicht. Eventseite zeigt die Adresse (getrennt geladen, ohne Fehler in Projekten ohne SQL 29). Hinweis Datenschutz: Event-Adressen gehen beim Speichern an Nominatim.
- Prüfung: 192/192 Tests, Lint, Typecheck; Nominatim mit öffentlicher Adresse geprüft. **Handy (15.11.)**: Club-Event mit eigener Adresse und Ende erscheint im privaten Konto auf Radar und Entdecken.

- **Veranstalter-Storys (17.11., Branch `backend/veranstalter-storys`)** – Entscheidung Jacint: Entdecken zeigt alle freigegebenen Veranstalter der Stadt als Story-Kachel (wie eine Profilanzeige); nur Veranstalter posten; ohne Story Logo und Name; Event-Story ab dem Anlegen.
  - **SQL 33** `supabase/ops/33_organizer_stories.sql`, in Spots-Test eingespielt: Tabelle `organizer_story_items` (Bild im Bucket `organizer-public`, Pfad `<club>/story-…`, optional Text und eigenes Event, max. 30, öffentlich nur bei freigegebenem Club, Team darf löschen); `spots_explore_organizers(stadt)` (Stadt gleich oder „Frankfurt“ ↔ „Frankfurt am Main“, Story + nächstes Event, Titel von Entwürfen bleiben verborgen); Event-Story für Mitglieder ab Anlegen bis 2 h nach Ende; Statistik „Shots“ zählt nur Gäste.
  - App: Studio-Seite `/studio/story` (posten, löschen, Event wählen) und Karte „Event-Story“ im Event-Editor; Entdecken mit Veranstalter-Kacheln (`OrganizerStoryTile`) und gemeinsamer Story-Ansicht für Events und Veranstalter (`StoryViewer`). Stadt: gewählte Stadt, mit Standort die Stadt des nächsten Events, sonst alle.
  - Prüfung: PGlite-Test `tests/organizer-stories.test.cjs` (6/6), App-Tests 46/46, Lint, Typecheck. Web gegen Spots-Test: Kachel „Jacint club test“, Story mit Logo, „Zum Profil“ öffnet die Seite, keine Konsolenfehler. **Handy (19.11., iPhone, Expo Go gegen Spots-Test):** Story im Studio gepostet und als Besucher in Entdecken gesehen. Hinweis: Expo für Spots-Test mit den Spots-Test-Variablen im Terminal starten, sonst landet die App in der Produktion (dort „invalid_credentials“).

## Läuft gerade

- Handy-Test durch Jacint.

## Offen

- Veranstalter-Storys: Melden und Admin-Ansicht siehe `docs/FORTSCHRITT-moderation.md`; Kachel-Design für Noyan.

- Handy-Test: als Club registrieren → Mail bestätigen → anmelden → Studio erscheint → Logo, Event mit Ort/Flyer anlegen → mit Admin-Konto freigeben → Event live stellen → in der Besucher-App öffnen, Ticket-Link → Statistik. Achtung: eingebauter Mailversand nur 2 Mails/Stunde und nur an Supabase-Team-Adressen.
- Club-Adresse hat keine Kartenposition: Events erscheinen nur mit Ort aus dem Adressbuch auf der Karte. Später: Club mit Adressbuch-Ort verknüpfen oder Adresssuche (Geocoding).
- Mehrere Clubs pro Konto: Studio zeigt nur den ersten. (Team-Mitglieder: siehe `docs/FORTSCHRITT-moderation.md`.)
- Beiträge/Galerien (SQL 19) im Studio. (Ticketarten und Bild-Aufräumen: siehe `docs/FORTSCHRITT-moderation.md`.)
- Datenschutz-Entwurf: Club-Angaben, Ansprechperson/Telefon, anonyme Zählung ergänzen.
- Design: Studio-Look ist ein Vorschlag; mit Noyan abstimmen (betrifft Noyans Design: Navigation, Registrieren-Seite, Reiter-Layout).
