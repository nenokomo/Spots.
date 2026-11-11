# Spots – Website

Marketing-Website für Gäste und Veranstalter. Statische Seite mit [Astro](https://astro.build), eigener Ordner im App-Repo, unabhängig von der Expo-App.

**Warum Astro?** Es baut fertiges HTML und CSS, ohne dass im Browser ein Framework laden muss. Ergebnis: sehr schnell (Lighthouse 99–100), gut für Google und für Link-Vorschauen in WhatsApp und Instagram, und kostenlos bei jedem statischen Hoster. Astro-Dateien sind fast reines HTML und damit leicht zu pflegen.

## Seiten

| Pfad | Inhalt |
|---|---|
| `/` | Startseite für Gäste |
| `/veranstalter/` | Seite für Clubs, Bars und Crews – zum direkten Verlinken in Outreach-Mails |
| `/impressum/`, `/datenschutz/` | Rechtliches (Entwürfe mit Platzhaltern, nicht im Suchindex) |
| `/404` | Fehlerseite |

## Lokal starten

```bash
cd website
npm install
npm run dev        # http://localhost:4321
```

Weitere Befehle:

```bash
npm run build      # statische Seite nach website/dist
npm run preview    # gebaute Seite lokal ansehen
npm run check      # Typecheck
npm run og         # Vorschaubilder (1200 × 630) und Icons neu erzeugen
npm run shots      # Screenshots in Handy-, Tablet- und Desktop-Breite nach docs/screenshots
```

`og` und `shots` nutzen den installierten Chrome oder Edge (Pfad notfalls über `CHROME=…`).

## Deployen (Vercel, Netlify oder Cloudflare Pages)

1. Neues Projekt aus dem GitHub-Repo anlegen.
2. **Root-Verzeichnis:** `website` · **Build-Befehl:** `npm run build` · **Ausgabeordner:** `dist`.
3. Umgebungsvariablen setzen (siehe `.env.example`):
   - `SITE_URL` – die echte Domain, z. B. `https://spots-app.de`
   - `PUBLIC_SUPABASE_URL` und `PUBLIC_SUPABASE_PUBLISHABLE_KEY` – für das Kontaktformular (öffentliche Werte, keine Secrets)
4. Danach geht jeder Merge nach `main` automatisch live; jeder Pull Request bekommt eine Vorschau-Adresse.

**Kontaktformular:** Speichert über `public.spots_partner_request` (`supabase/ops/23_partner_requests.sql`). Im Testprojekt eingespielt; **in der Produktion erst nach Freigabe** von Jacint und euch. Ohne die beiden Supabase-Variablen öffnet das Formular stattdessen eine vorausgefüllte Mail an die Kontakt-Adresse. Anfragen findet ihr im Supabase-Dashboard unter `spots_partner_private.partner_requests`.

Für die lokale Entwicklung zeigt `website/.env.development.local` (nicht im Git) auf Spots-Test.

## Pflege

- **Zentrale Angaben** (Mails, Store-Links, Social, Impressum): `src/config/site.ts`. Leere Werte erscheinen als `[TODO: …]`.
- **Texte:** direkt in `src/pages/index.astro` und `src/pages/veranstalter.astro`.
- **App-Mockups:** komplett in HTML/CSS (`src/components/screens/`, Styles in `src/styles/mock.css`) – scharf auf jedem Display, keine Bilddateien. Wenn sich die App ändert, hier anpassen.
- **Design-Tokens:** `src/styles/global.css` (Farben, Abstände, Schrift).
- **Schrift:** Archivo (Variable Font, SIL Open Font License), selbst gehostet über `@fontsource-variable/archivo` – keine Verbindung zu Google Fonts.
- **Platzhalter-Bausteine** (`TodoBlock`) sind nur in `npm run dev` sichtbar und erscheinen nicht in der gebauten Seite. Nie mit erfundenen Zahlen, Stimmen oder Logos füllen.

## Datenschutz

Keine Cookies, kein Tracking, keine externen Schriften oder Skripte. Einzige Datenverarbeitung: Server-Protokolle beim Hoster und das Kontaktformular.

## Offene TODOs vor dem Livegang

**Daten (in `src/config/site.ts`):**
- [ ] Kontakt-Mail, Kontakt-Mail für Veranstalter
- [ ] Store-Links App Store und Google Play; offizielle Store-Badges einsetzen (Vorgaben von Apple/Google)
- [ ] Instagram- und TikTok-Profil
- [ ] Impressum: Name/Firma, Rechtsform, Vertretungsberechtigte, Anschrift, Telefon, ggf. Register und USt-IdNr., verantwortliche Person nach § 18 MStV
- [ ] Hosting-Anbieter mit Anschrift

**Datenschutzerklärung (`src/pages/datenschutz.astro`):**
- [ ] Speicherdauer der Server-Protokolle, Grundlage für USA-Übermittlung beim Hoster
- [ ] Supabase-Region und Auftragsverarbeitung bestätigen
- [ ] Löschfrist für Anfragen, Mail-Anbieter, Datenschutzbeauftragte/r, Aufsichtsbehörde, Datum

**Impressum:** Hinweis nach § 36 VSBG prüfen.

**Inhalte mit echten Daten (nur in Entwicklung sichtbar):**
- [ ] Stimmen von Nutzerinnen und Nutzern (Startseite)
- [ ] Nächste Städte (Startseite)
- [ ] Ansprechpartner mit Foto (Veranstalter-Seite)
- [ ] Partner-Logos (Veranstalter-Seite, nur mit Zustimmung)

**Inhalt:** Konditionen fürs Ticketing (FAQ Veranstalter: Servicegebühr).

**Technik:**
- [ ] Domain, `SITE_URL`
- [ ] SQL 23 in der Produktion, Supabase-Variablen beim Hoster
- [ ] Benachrichtigung bei neuen Anfragen (z. B. Mail über eine Edge Function) – bisher nur im Dashboard sichtbar

Alle Rechtstexte sind Entwürfe – vor dem Livegang von einer Fachperson prüfen lassen.
