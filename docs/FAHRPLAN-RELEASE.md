# Fahrplan bis zum Release

Stand: 13.11.2026. Entscheidung des Teams (Jacint + Noyan): Spots erscheint erst, wenn Besucher **und** Veranstalter alles Wichtige vorfinden – Konten für alle, Veranstalter-Konten mit Dashboard und Live Snaps.

Grundregel: Alles entsteht zuerst in **Spots-Test**. Produktion wird erst kurz vor dem Release freigeschaltet, jeder Schritt mit Freigabe von Jacint und Noyan.

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Wo nutzen Veranstalter das Dashboard? | **App und Browser**, derselbe Code (Expo Router läuft auch im Web). |
| Freigabe neuer Veranstalter | **Profil wird vom Team geprüft und freigegeben**; danach erscheinen die Events dieses Veranstalters ohne weitere Prüfung. |
| Statistiken im Dashboard | **Aufrufe der Eventseite, Gemerkt, Ticket-Klicks, Snaps zum Event** – nur Summen pro Event, nichts über einzelne Personen, keine erfundenen Zahlen. |
| E-Mail-Versand | Offen. Vorschlag: Domain bei IONOS (braucht es ohnehin für Website und Impressum), Postfach z. B. `noreply@<domain>` per SMTP in Supabase, SPF/DKIM bei IONOS aktivieren. Bei vielen Nutzern später ein Versanddienst mit EU-Servern. Bis dahin baut Etappe 1 mit dem eingebauten Supabase-Versand (nur fürs Team). |

## Etappen

| Etappe | Inhalt | Bereich |
|---|---|---|
| 1 – Konten für alle (ca. 1 Woche) | Registrieren, Anmelden, Passwort vergessen, **Konto löschen** (Pflicht bei Apple/Google), deutsche Mailtexte, Merkliste mit Konto (Teil von SQL 17). | Jacint (Backend + einfache Oberfläche), Noyan (Design) |
| 2 – Veranstalter und Dashboard (ca. 2–3 Wochen) | „Veranstalter werden“, Freigabe im Admin-Bereich, Dashboard: Profil mit Logo/Bildern, Events anlegen/bearbeiten/veröffentlichen (Ort aus dem Adressbuch oder neu), Tickets, Beiträge/Galerien, Team-Mitglieder, Statistiken. Uploads über SQL 18/19. | Jacint (Backend, Zähler, Uploads), Noyan (Dashboard-Design) |
| 3 – Live Snaps (ca. 2 Wochen) | Fotos/kurze Videos zu Events, 24 Stunden sichtbar, Melden, Prüfliste für das Team, automatisches Ausblenden nach mehreren Meldungen. Braucht einen Development Build. | Jacint (Backend, Moderation), Noyan (Kamera-/Snap-Design) |
| parallel – Release-Grundlagen | Entwicklerkonten Apple/Google, `eas.json`, App-ID, Schema `meine-app` → `spots`, Google-Maps-Schlüssel (Android), Icon, Startbildschirm, Test-Builds auf echten Geräten. | beide |
| parallel – Rechtliches und Website | Entwürfe in `docs/entwuerfe/` früh fachlich prüfen lassen (Konten und Nutzerinhalte: Datenschutz, Nutzungsbedingungen, DSA-Meldestelle, Jugendschutz), Links in der App, Website online (Domain, Hosting, Impressum). | beide, Fachperson |
| laufend – Inhalte Karlsruhe | Events über den Admin-Bereich eintragen (nur echte Events mit Quelle). | beide |

Grobe Dauer bis zur Einreichung: etwa 6–8 Wochen, abhängig von verfügbarer Zeit, Rechtsprüfung und Freischaltung der Entwicklerkonten.

## Stand

- Stand 15.11.: Etappe 1 (Konten) und Etappe 2 (Veranstalter, Spots Studio, Startseite) in `main`; Etappe 3 (Shots) Backend in Spots-Test. Spots-Test hat SQL 15–31, Produktion nur 20–24 (nur Team-Anmeldung).
- Absprachen 15.11.: Domain und Mailserver – Jacint, nächste Woche. Entwicklerkonten Apple/Google – kurz vor dem Release. Rechtstexte – Jacint. Produktion: zuerst nur der Aufbau (Registrierung bleibt aus), Konten erst mit Mailserver und Rechtstexten.
- Fortschritt je Etappe in eigener Datei `docs/FORTSCHRITT-<thema>.md`.
