> **Entwurf – nicht rechtlich geprüft. Vor Verwendung von einer Fachperson prüfen lassen.**

# Entwürfe: Anfragen, Rechtstexte, App-Texte

Stand: 11.11.2026 · Grundlage: Code und Doku im Repo vom selben Tag (nur gelesen, nichts am Code geändert)

## Dateien

| Datei | Inhalt |
|---|---|
| [mail-clubs.md](mail-clubs.md) | Anfrage an Clubs (E-Mail, Bestätigung nach Zusage, Instagram-DM) |
| [mail-eventim.md](mail-eventim.md) | Partneranfrage Eventim: Daten-Feed, Bedingungen, Namensnennung, Affiliate über AWIN, kein Preisvergleich |
| [mail-reservix.md](mail-reservix.md) | Partneranfrage Reservix, gleicher Aufbau |
| [datenschutzerklaerung.md](datenschutzerklaerung.md) | Datenschutzerklärung nach DSGVO; geplante Teile markiert |
| [nutzungsbedingungen.md](nutzungsbedingungen.md) | Nutzungsbedingungen; Teil B für Veranstalter |
| [app-texte.md](app-texte.md) | Wichtige Oberflächentexte Deutsch mit englischem Vorschlag |
| [rechtsfragen.md](rechtsfragen.md) | Offene Rechtsfragen, priorisiert (P1–P3) |

**Schreibweisen:** `[OFFEN: …]` = fehlende Angabe, bewusst nicht erfunden · `[GEPLANT]` = noch nicht live · `[TEST]` = nur in der Testumgebung · `[prüfen]` = Formulierung rechtlich klären · `{Feld}` = pro Empfänger ausfüllen (Mails)

## Was im Code geprüft wurde

- **Standort:** `expo-location`, nur „während der Nutzung“, kein Hintergrund. Umkreis und Entfernungen rechnet das Gerät (`distanceKm`). An Supabase gehen weder Position noch Umkreis; die App lädt immer alle veröffentlichten Events (`src/services/events.ts`).
- **Gemerkt:** nur AsyncStorage auf dem Gerät. Zum Anzeigen werden die Event-IDs ohne Kontobezug bei Supabase abgefragt.
- **Konten:** Supabase Auth mit E-Mail und Passwort, Bestätigung per PKCE, Sitzung im AsyncStorage. Nur gegen das Testprojekt freigeschaltet (`src/features/accounts/configuration.ts`).
- **Karten:** `react-native-maps` ohne `provider` → Apple Karten (iOS), Google Maps (Android). Web: Kacheln von `tile.openstreetmap.org`.
- **Weitere Dienste:** Ortssuche über **Open-Meteo** (`src/services/cities.ts`, stand nicht im Auftrag). Eventbilder direkt von der Quelle geladen (heute Goabase).
- **Links:** Tickets/Quelle, Route (iOS Apple Karten, sonst Google Maps; nur Zielkoordinaten), Teilen über das System.
- **Keine** Analyse-, Werbe- oder Tracking-Pakete in `package.json` oder `src/`.
- **Supabase-Region:** laut `docs/history/PRODUCTION_PREFLIGHT.md` eu-central-1 (Frankfurt), im Dashboard noch bestätigen.

## Auffälligkeiten für das Team

1. **Konto löschen** fehlt. Apple und Google verlangen das, sobald Konten angeboten werden.
2. **Links zu Datenschutz, Nutzungsbedingungen und Impressum** fehlen in der App (Profil). Die Stores verlangen mindestens die Datenschutzerklärung.
3. **Melden nur mit Konto** (SQL 17). Der DSA verlangt eine Meldemöglichkeit für jede Person → zusätzlich Melde-E-Mail (in den Nutzungsbedingungen eingeplant).
4. **Nutzer blockieren** ist nicht geplant, verlangt aber Apple Guideline 1.2 für Nutzerinhalte.
5. **`live_snaps.author_id`** ist laut SQL 17 per Tabellenrecht für jeden lesbar. Die App zeigt es nicht, die Schnittstelle liefert es aber → Spaltenrechte einschränken.
6. **EXIF-Metadaten** (Standort) in Fotos vor dem Speichern entfernen, sobald der Upload kommt.
7. **„Dein Standort bleibt auf dem Gerät“** stimmt für die GPS-Position. Der Kartenanbieter sieht aber den angezeigten Ausschnitt → Formulierung prüfen (rechtsfragen.md, Punkt 6).
8. **Technische Fehlermeldungen** (Supabase, RLS, Publishable Key) sind für Nutzer sichtbar → vor dem Release ersetzen.
9. **Web:** `/today` trägt Breiten- und Längengrad der Kartenmitte in der Adresse. Die Web-Karte zeigt „© OpenStreetMap“ statt „© OpenStreetMap-Mitwirkende“.
10. **Profil → „Eventdaten: Goabase“** anpassen, sobald Ticketmaster und OpenStreetMap dazukommen.
11. **Standort-Systemtext** in `app.json` gibt es nur auf Deutsch.

## Offene Angaben ([OFFEN])

**Firma und Kontakt** (alle Dateien)
- Firmenname bzw. Name, Rechtsform, vertretungsberechtigte Person, Anschrift
- Kontakt-E-Mail, Datenschutz-E-Mail, Melde-E-Mail, Kontaktstellen-E-Mail (DSA), Telefon (optional), Website
- Datenschutzbeauftragte/r (falls benannt)
- Absender der Mails: Vorname, Nachname, Funktion
- Ansprechpersonen und E-Mail bei Eventim und Reservix
- geplanter Start; Datum der Veröffentlichung der Rechtstexte

**Dienstleister und Verträge** (Datenschutzerklärung)
- Supabase: Region bestätigen, AVV/DPA, Aufbewahrung der Server-Protokolle je Tarif
- E-Mail-Versanddienst (Bestätigungsmails) und E-Mail-Postfach-Anbieter
- Anthropic: AVV, Rechtsgrundlage für die USA, Aufbewahrung
- Open-Meteo: Betreiber, Sitz, Datenschutzhinweise, Rolle, Speicherdauer
- Rolle der Kartenanbieter und der zuständigen Apple-Gesellschaft
- Rechtsgrundlage der Drittlandübermittlung je Anbieter
- Pflichtangaben laut Ticketmaster-API-Bedingungen
- Hosting der Web-Version (falls sie öffentlich wird)
- Absturz- und Diagnoseberichte über die Store-Konsolen

**Fristen und Speicherdauer**
- Löschfrist nach Kontolöschung (inkl. Backups); Löschweg für Konten (bis zur In-App-Löschung) und für Veranstalterprofile
- Löschfrist der Live-Snap-Dateien und -Einträge nach Ablauf
- Speicherdauer von Meldungen, „Fehler melden“, KI-Entwürfen und Übernahme-Nachweisen; Aufbewahrung zur Beweissicherung
- Frist für Änderungen oder Entfernen nach Club-Anfrage; Einspruchsfrist bei Moderation (DSA: mindestens sechs Monate prüfen); Ankündigungsfrist für geänderte Nutzungsbedingungen; Kündigungsfrist

**Entscheidungen**
- Mindestalter 16 oder 18
- Zuständige Aufsichtsbehörde und Gerichtsstand (hängen vom Sitz ab); Hinweis nach § 36 VSBG nötig?
- Hinweis auf Test- oder Beta-Phase; Web-Version öffentlich anbieten?
- Spam-Schutz für das anonyme „Fehler melden“
- Freigabeprozess für Veranstalterprofile; eigene Regeln für private Gastgeber; Impressum-Feld für Veranstalterseiten
- weitergehende Haftungsbeschränkung bei kostenloser Nutzung

**Technik vor Veröffentlichung**
- Datenflüsse der Karten-SDKs prüfen
- EXIF entfernen; `author_id` nicht öffentlich lesbar machen
- Bestätigen, dass Gemeldete nicht erfahren, wer gemeldet hat
- Links zu den Rechtstexten in der App einbauen

## Nächste Schritte

1. Firmendaten klären → Impressum, Mails, Datenschutzerklärung füllen.
2. P1-Punkte aus `rechtsfragen.md` mit einer Fachperson klären, **vor dem ersten Club-Kontakt** vor allem Punkt 2 (§ 7 UWG).
3. Datenschutzerklärung bei jedem neuen Feature nachziehen (`[GEPLANT]`-Abschnitte aktivieren oder streichen).
4. Englisch erst nach Entscheidung über das Übersetzungssystem einbauen (siehe `PROJECT_STATUS.md`).
