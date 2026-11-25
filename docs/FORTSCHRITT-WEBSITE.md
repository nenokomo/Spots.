# Fortschritt – Marketing-Website

Branch: `feature/website` (von `main`, lokal). Eigene Datei statt `docs/FORTSCHRITT.md`, damit es beim Zusammenführen mit `feature/event-sources` keinen Konflikt gibt.
Bei „mach weiter“: diese Datei lesen und mit `git status` / `git log` prüfen.

## Auftrag (11.11.2026)

Marketing-Website für Gäste und Veranstalter in `website/`: Startseite, `/veranstalter` mit Kontaktformular, Impressum, Datenschutz, SEO und Vorschaubilder, `MARKETING.md`, kritische Prüfung (Breiten, Lighthouse), Screenshots, Pull Request. Vision wird als fertige App gezeigt (Entscheidung Nutzer: Seite geht erst live, wenn die App fast fertig ist). Keine erfundenen Zahlen, Stimmen oder Logos → `[TODO]`-Bausteine.

## Fertig

- **Teil 1 – Gerüst und Seiten**: Astro (statisch) in `website/`, eigene `package.json`; App-Lint und -Typecheck ignorieren den Ordner. Designsystem (Archivo selbst gehostet, Tinte/Papier/Magenta), App-Mockups komplett in HTML/CSS (Radar, Entdecken, Eventseite, Live Snap, Event anlegen, Dashboard). Startseite, `/veranstalter`, Impressum, Datenschutz (Entwürfe mit Platzhaltern), 404, `robots.txt`, Sitemap, Manifest, Vorschaubilder und Icons (`npm run og`), Screenshot-Skript (`npm run shots`).
- **Kontaktformular**: `supabase/ops/23_partner_requests.sql` (privates Schema, anonymes Senden nur über `spots_partner_request`, Prüfungen, max. 3 pro Adresse und Tag, max. 60 pro Stunde). Test `tests/partner-requests.test.cjs` (5 Teiltests, PGlite). **In Spots-Test eingespielt**, Prüfsumme identisch. Ende-zu-Ende mit Spots-Test geprüft (Fehlerzustand, Versand, Danke-Zustand), Testeintrag danach gelöscht. Ohne Supabase-Konfiguration fällt das Formular auf eine vorausgefüllte Mail zurück.

- **Teil 2 – Prüfung und Feinschliff**: Durchsicht in 390, 834 und 1440 px (Puppeteer-Screenshots, Kontaktbögen). Behoben: Klassen-Konflikte Seite/Mockup, Telefon-Position im Veranstalter-Hero, doppeltes Dashboard, Überlauf „Heute schon“ auf dem Handy, Lesbarkeit der Platzhalter auf Pink, Live-Snap-Menge, kompakte Karten auf dem Handy, Telefon-Paar auf dem Tablet, Link-Text „hier“ (SEO). **Lighthouse (gebaute Seite):** Startseite mobil 99/100/100/100, Veranstalter mobil 100/100/100/100, Desktop jeweils 100. App: 103/103 Tests, Lint und Typecheck ok; Website: `astro check` 0 Fehler.
- **Teil 3 – Doku**: `website/README.md` (Start, Deployen, Pflege, alle TODOs), `website/MARKETING.md` (Positionierung, Pitch, Claims, Outreach + Follow-up, Bios, Post-Ideen, erste 10 Veranstalter), Screenshots in `website/docs/screenshots/` (gebaute Seite, 390 und 1440 px).

## Änderungen Noyan (24.11.2026, Startseite, noch nicht committet)

- Überschrift „Was geht heute?“ statt „Wo geht heute was?“ (auch in `MARKETING.md` und im Text von `scripts/og.mjs`; das Vorschaubild `public/og-start.png` ist noch das alte, `npm run og` braucht Chrome).
- „Live Shots“ statt „Live Snaps“ auf beiden Seiten. Abschnitt erklärt jetzt: von Gästen, nur während das Event läuft, jeden Shot sieht man nur einmal, keine Storys. Zwei FAQ-Einträge dazu.
- Entdecken: Hinweis auf alle Veranstalterprofile der Stadt mit Storys, auch ohne Event am Wochenende.
- Handy-Ansichten neu gezeichnet wie in der App: Eventseite (`EventScreen.astro`), Shot (`SnapScreen.astro`), Entdecken mit Veranstalter-Kacheln (`ExploreScreen.astro`), Stile in `mock.css`.
- Abschnitte „Und sonst so“ und „Start in Karlsruhe“ entfernt, Menüpunkt „Städte“ in Kopf- und Fußzeile auch.

## Hosting (25.11.2026)

- Netlify eingerichtet und öffentlich: `spots-36by.netlify.app`, Domain `spots-app.de` verbunden (DNS bei IONOS, A-Einträge auf Netlify, Mail-Einträge unverändert). Einstellungen in `website/README.md`, Abschnitt „Hosting“.
- Build-Fehler behoben: Die Website las die tsconfig der App (braucht expo); jetzt fest `website/tsconfig.json`, Node aus `website/.nvmrc`.
- Postfach `kontakt@spots-app.de` bei IONOS angelegt.

## Als Nächstes

1. HTTPS für `spots-app.de` in Netlify prüfen (Zertifikat), dann `https://spots-app.de` und Weiterleitung von `www.` prüfen.
2. Kontaktformular einmal mit einer echten Anfrage testen (landet in der Produktion).
3. TODOs aus `website/README.md` füllen: Rechtsform, Register, USt-IdNr., § 36 VSBG, Hosting (Netlify) in Impressum und Datenschutz, Store-Links.

## Offene Punkte

- Vertrag zur Auftragsverarbeitung mit IONOS (Postfach) und Netlify (Hosting).
- Rechtstexte von einer Fachperson prüfen lassen; Seite zeigt noch `[TODO]`-Platzhalter.
