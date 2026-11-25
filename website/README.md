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

## Hosting: Netlify (seit 25.11.2026)

Die Seite läuft bei Netlify (Projekt `spots-36by`, auch unter `spots-36by.netlify.app`) und ist öffentlich. Jeder Push nach `main` geht automatisch live; Pull Requests bekommen eine Vorschau-Adresse.

- **Build-Einstellungen in Netlify:** Branch `main` · Base directory `website` · Build command `npm run build` · Publish directory `website/dist`. Node-Version aus `website/.nvmrc`.
- **Umgebungsvariablen** (siehe `.env.example`, alle öffentlich – **nicht** als „Secret“ markieren, sonst bricht Netlify den Build ab): `SITE_URL=https://spots-app.de`, `PUBLIC_SUPABASE_URL` und `PUBLIC_SUPABASE_PUBLISHABLE_KEY` der Produktion.
- **Domain:** `spots-app.de` (Hauptadresse, `www.` leitet weiter). DNS bleibt bei IONOS: A-Einträge für `@` und `www` auf `75.2.60.5`. Mail-Einträge (MX, SPF, DMARC, DKIM, autodiscover) nicht anfassen.
- `astro.config.mjs` nutzt nur `website/tsconfig.json`: Beim Hoster sind die App-Pakete (expo) nicht installiert.

**Kontaktformular:** Speichert über `public.spots_partner_request` (`supabase/ops/23_partner_requests.sql`), in Spots-Test und in der Produktion eingespielt. Ohne die beiden Supabase-Variablen öffnet das Formular stattdessen eine vorausgefüllte Mail an die Kontakt-Adresse. Anfragen findet ihr im Supabase-Dashboard unter `spots_partner_private.partner_requests`.

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
- [x] Kontakt-Mail `kontakt@spots-app.de` (Postfach bei IONOS)
- [ ] Kontakt-Mail für Veranstalter (leer = Kontakt-Mail)
- [ ] Store-Links App Store und Google Play; offizielle Store-Badges einsetzen (Vorgaben von Apple/Google)
- [ ] Instagram- und TikTok-Profil
- [x] Impressum: Name, Vertretungsberechtigte, Anschrift, Telefon, verantwortliche Person nach § 18 MStV
- [ ] Impressum: Rechtsform, ggf. Register und USt-IdNr., Hinweis nach § 36 VSBG prüfen
- [ ] Hosting-Anbieter mit Anschrift (Netlify) in Impressum und Datenschutz; Netlify ist eine US-Firma

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
- [x] Domain `spots-app.de`, `SITE_URL` (Netlify, DNS bei IONOS)
- [x] SQL 23 in der Produktion, Supabase-Variablen beim Hoster
- [ ] Benachrichtigung bei neuen Anfragen (z. B. Mail über eine Edge Function) – bisher nur im Dashboard sichtbar

Alle Rechtstexte sind Entwürfe – vor dem Livegang von einer Fachperson prüfen lassen.
