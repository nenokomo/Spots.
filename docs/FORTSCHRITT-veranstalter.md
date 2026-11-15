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

## Läuft gerade

- Handy-Test durch Jacint.

## Offen

- Handy-Test: als Club registrieren → Mail bestätigen → anmelden → Studio erscheint → Logo, Event mit Ort/Flyer anlegen → mit Admin-Konto freigeben → Event live stellen → in der Besucher-App öffnen, Ticket-Link → Statistik. Achtung: eingebauter Mailversand nur 2 Mails/Stunde und nur an Supabase-Team-Adressen.
- Club-Adresse hat keine Kartenposition: Events erscheinen nur mit Ort aus dem Adressbuch auf der Karte. Später: Club mit Adressbuch-Ort verknüpfen oder Adresssuche (Geocoding).
- Team-Mitglieder einladen (Datenbank kann es, Oberfläche fehlt). Mehrere Clubs pro Konto: Studio zeigt nur den ersten.
- Alte Bilder im Speicher aufräumen; Ticketarten, Beiträge/Galerien (SQL 19) im Studio.
- Datenschutz-Entwurf: Club-Angaben, Ansprechperson/Telefon, anonyme Zählung ergänzen.
- Design: Studio-Look ist ein Vorschlag; mit Noyan abstimmen (betrifft Noyans Design: Navigation, Registrieren-Seite, Reiter-Layout).
