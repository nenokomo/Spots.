# Fortschritt – Marketing-Website

Branch: `feature/website` (von `main`, lokal). Eigene Datei statt `docs/FORTSCHRITT.md`, damit es beim Zusammenführen mit `feature/event-sources` keinen Konflikt gibt.
Bei „mach weiter“: diese Datei lesen und mit `git status` / `git log` prüfen.

## Auftrag (11.11.2026)

Marketing-Website für Gäste und Veranstalter in `website/`: Startseite, `/veranstalter` mit Kontaktformular, Impressum, Datenschutz, SEO und Vorschaubilder, `MARKETING.md`, kritische Prüfung (Breiten, Lighthouse), Screenshots, Pull Request. Vision wird als fertige App gezeigt (Entscheidung Nutzer: Seite geht erst live, wenn die App fast fertig ist). Keine erfundenen Zahlen, Stimmen oder Logos → `[TODO]`-Bausteine.

## Fertig

- **Teil 1 – Gerüst und Seiten**: Astro (statisch) in `website/`, eigene `package.json`; App-Lint und -Typecheck ignorieren den Ordner. Designsystem (Archivo selbst gehostet, Tinte/Papier/Magenta), App-Mockups komplett in HTML/CSS (Radar, Entdecken, Eventseite, Live Snap, Event anlegen, Dashboard). Startseite, `/veranstalter`, Impressum, Datenschutz (Entwürfe mit Platzhaltern), 404, `robots.txt`, Sitemap, Manifest, Vorschaubilder und Icons (`npm run og`), Screenshot-Skript (`npm run shots`).
- **Kontaktformular**: `supabase/ops/23_partner_requests.sql` (privates Schema, anonymes Senden nur über `spots_partner_request`, Prüfungen, max. 3 pro Adresse und Tag, max. 60 pro Stunde). Test `tests/partner-requests.test.cjs` (5 Teiltests, PGlite). **In Spots-Test eingespielt**, Prüfsumme identisch. Ende-zu-Ende mit Spots-Test geprüft (Fehlerzustand, Versand, Danke-Zustand), Testeintrag danach gelöscht. Ohne Supabase-Konfiguration fällt das Formular auf eine vorausgefüllte Mail zurück.

## Läuft gerade

- Teil 2: Feinschliff nach Durchsicht, Prüfung auf Handy/Tablet/Desktop, Lighthouse.

## Als Nächstes

1. Feinschliff, Lighthouse 90+
2. `MARKETING.md`, README der Website, TODO-Liste
3. Screenshots, Commit, Push, Pull-Request-Text

## Offene Punkte

- Produktion: SQL 23 dort einspielen (Freigabe Jacint + Nutzer), dann `PUBLIC_SUPABASE_URL` und `PUBLIC_SUPABASE_PUBLISHABLE_KEY` beim Hoster setzen.
- Hosting-Konto (Vercel/Netlify/Cloudflare) und Domain anlegen, `SITE_URL` setzen.
- Alle `[TODO: …]` siehe `website/README.md`.
