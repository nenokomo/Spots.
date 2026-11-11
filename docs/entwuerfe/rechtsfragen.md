> **Entwurf – nicht rechtlich geprüft. Vor Verwendung von einer Fachperson prüfen lassen.**

# Offene Rechtsfragen (priorisiert)

Stand: 11.11.2026 · Keine Rechtsberatung. Arbeitsliste für das Gespräch mit einer Fachperson (IT-/Medienrecht, Datenschutz).

**P1** = vor dem ersten Club-Kontakt bzw. vor dem Release · **P2** = vor dem Start der jeweiligen Funktion · **P3** = später

## P1 – vor dem ersten Kontakt bzw. vor dem Release

1. **Impressumspflicht (§ 5 DDG)** – Wer ist Anbieter (Person oder Gesellschaft, Rechtsform)? Impressum in der App und im Store-Eintrag, mit ladungsfähiger Anschrift. Welche Pflichtangaben gehören je nach Rechtsform in geschäftliche E-Mails?
2. **Anfrage-Mails und DMs an Clubs (§ 7 UWG)** – Ist die Anfrage (kostenloser Eintrag, spätere Profilübernahme) „Werbung“? Dann wäre E-Mail ohne vorherige Einwilligung auch gegenüber Unternehmen unzulässig. Welcher Erstkontakt ist sicher (Telefon, Kontaktformular, veröffentlichte Anfrage-Adresse)? Gilt für Instagram-DMs dasselbe?
3. **Event-Fakten von Club-Websites** – Datenbankherstellerrecht (§§ 87a, 87b UrhG, auch wiederholte Entnahme kleiner Teile), Nutzungsbedingungen und robots.txt der Websites, Vorbehalt gegen Text- und Data-Mining (§ 44b UrhG) beim automatisierten Auslesen, auch mit KI. Reicht eine Zustimmung per E-Mail, und was muss sie umfassen? Was gilt beim bundesweiten Ausbau ohne Einzelzustimmung? Keine Übernahme aus Eventportalen oder Stadtmagazinen? Instagram nur von Hand nutzen (Meta-Bedingungen verbieten automatisiertes Auslesen)?
4. **Flyer und Fotos** – Urheberrecht und Lichtbildschutz (§§ 2, 72 UrhG). Der Club hat oft nicht alle Rechte (Grafik, Fotografie, Künstlerfotos). Spots lädt Bilder heute direkt von Goabase (geplant: Ticketmaster). Ersetzt das keine Lizenz – decken die Bedingungen von Goabase und Ticketmaster die Anzeige in einer App ab?
5. **Datenschutz-Grundlagen** – Auftragsverarbeitungsvertrag mit Supabase; Drittlandbezug (Supabase Inc. trotz EU-Region); Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO); Datenschutzerklärung in der App verlinken (fehlt im Profil); Angaben in Apples „App Privacy“ und Googles „Data safety“ passend zum Code.
6. **Standortdaten** – Reicht die Einwilligung über den Systemdialog (§ 25 TDDDG, Art. 6 Abs. 1 lit. a DSGVO)? Ist der App-Satz „Dein Standort bleibt auf dem Gerät“ haltbar, obwohl der Kartenanbieter den angezeigten Ausschnitt sieht? Ortssuche über Open-Meteo (Suchtext und IP-Adresse): Rolle und Rechtsgrundlage.
7. **Konto löschen** – Apple (App Store Guideline 5.1.1(v)) und Google Play verlangen bei Kontoerstellung eine Löschmöglichkeit in der App; sie fehlt im Code. Dazu Art. 17 DSGVO.
8. **Private Partyadressen** – Goabase liefert Koordinaten; Hauspartys sind als Kategorie gewünscht. Wann darf eine genaue Position gezeigt werden (Einwilligung der Gastgeber, sonst nur ungefährer Ort)? Haftung, wenn ungebetene Gäste kommen?
9. **Jugendschutz und Altersfreigabe** – Mindestalter 16 oder 18 (Art. 8 DSGVO: 16 Jahre; Verträge Minderjähriger, §§ 106 ff. BGB). Store-Altersfreigabe (Alkohol- und Drogenbezüge, Nutzerinhalte). Werbung für Alkohol in Eventtexten oder gesponserten Events (§ 6 JMStV). OSM-„nightclub“ enthält auch Erotikbetriebe: Filterpflicht?

## P2 – vor dem Start der jeweiligen Funktion

10. **Ticketmaster-Bedingungen** – Die Klausel gegen das Erzielen von Einnahmen („derive revenues“) verweist auf eine Ausnahme, deren Text fehlt. Was gilt für Sponsoring, Provisionen, Affiliate-Links? Dazu: Entfernung binnen 24 Stunden auf Verlangen, Zwischenspeicherung nur „angemessene Zeit“, Branding-Vorgaben, Pflichtangaben in der Datenschutzerklärung. Schriftlich bei Ticketmaster nachfragen.
11. **OpenStreetMap (ODbL)** – Namensnennung „© OpenStreetMap-Mitwirkende“ mit Link; Wortlaut nach den Attribution Guidelines der OSMF (die Web-Karte zeigt nur „© OpenStreetMap“). **Share-Alike:** Wird die geprüfte und korrigierte Ortstabelle eine abgeleitete Datenbank? Dann müssten wir bei öffentlicher Nutzung – auch nur als Anzeige in der App – die Datenbank oder die Änderungen unter ODbL anbieten (ODbL 4.6). Die Annahme in `KARLSRUHE_EVENTS.md` („nur bei Weitergabe“) prüfen. Ausweg: Korrekturen direkt in OSM eintragen, eigene Daten getrennt halten. Außerdem Nutzungsrichtlinien für Overpass und für die Kachelserver (die Web-Karte lädt von tile.openstreetmap.org).
12. **DSA-Pflichten für Nutzerinhalte** – Kontaktstellen (Art. 11, 12), Angaben in den Nutzungsbedingungen (Art. 14), Meldeverfahren für **jede** Person (Art. 16; laut SQL 17 ist Melden nur mit Konto möglich), Begründung bei Einschränkungen (Art. 17, auch beim automatischen Ausblenden nach drei Meldungen), Meldung von Straftaten (Art. 18), Beschwerdesystem (Art. 20). Welche Ausnahmen gelten für Klein- und Kleinstunternehmen (Art. 19)? Gilt das schon für Veranstalterseiten und Beiträge?
13. **App-Store-Regeln für Nutzerinhalte** – Apple Guideline 1.2 und die Google-Play-Richtlinie verlangen u. a. Filter, Meldefunktion mit zeitnaher Reaktion, **Nutzer blockieren** (bisher nicht geplant) und veröffentlichte Kontaktdaten.
14. **Live Snaps und abgebildete Personen** – Recht am eigenen Bild (§§ 22, 23 KUG) im Verhältnis zur DSGVO; Fotos von Menschenmengen; Minderjährige; geschützte Räume (§ 201a StGB); Fotoverbote und Hausordnungen vieler Clubs; Standort-Metadaten (EXIF) in Fotos entfernen; Musik in Videos (Urheber- und Leistungsschutzrechte, GEMA). Sind Veranstalter, die Snaps freigeben, mitverantwortlich?
15. **Sensible Rückschlüsse** – Eine Merkliste mit Konto und Live Snaps können Rückschlüsse auf besondere Kategorien zulassen (z. B. sexuelle Orientierung bei queeren Partys, Art. 9 DSGVO). Datenminimierung, keine Auswertung, enger Zugriff.
16. **Anthropic (USA)** – Auftragsverarbeitungsvertrag, Übermittlung in die USA, Aufbewahrung bei Anthropic, Bedingungen für die Nutzung der Ergebnisse. Namen von DJs auf Event-Seiten sind personenbezogene Daten Dritter (Informationspflicht nach Art. 14 DSGVO).
17. **Anonymes „Fehler melden“** – Spam-Schutz ohne Konto datenschutzkonform gestalten (IP-Adresse, Gerätekennung?). Freitext kann personenbezogene Daten enthalten. Speicherdauer festlegen.
18. **Affiliate-Links und gesponserte Events** – Kennzeichnung (§ 5a UWG; Art. 26 DSA, ggf. Ausnahme nach Art. 19). Eventim (über AWIN) untersagt den direkten Preisvergleich mit Angeboten Dritter: Gilt das schon, wenn dasselbe Event auch über eine andere Quelle verlinkt ist?
19. **Impressum auf Veranstalterseiten** – Brauchen gewerbliche Veranstalter auf ihrer Spots-Seite ein eigenes Impressum, wie bei Social-Media-Seiten? Dann Feld vorsehen.
20. **Open-Meteo und GeoNames** – Ist die kostenlose Open-Meteo-API nur für nicht-kommerzielle Nutzung freigegeben (beim Anbieter prüfen)? Dann braucht es vor einer Monetarisierung einen Tarif. GeoNames-Lizenz und Namensnennung (der Hinweis „Ortssuche: Open-Meteo / GeoNames“ ist vorhanden).
21. **Goabase-API** – Der vorgeschriebene Backlink ist eingebaut. Sind gewerbliche Nutzung und die Anzeige der Bilder erlaubt?

## P3 – später

22. **Marke „Spots“** – Recherche bei DPMA und EUIPO (u. a. Klassen 9, 41, 42), bestehende Apps gleichen Namens, Domain. Auch „Live Snaps“ prüfen (Nähe zu Snap Inc. und „Snap“).
23. **Haftung für Eventangaben und Preise** – Haftungsprivilegien für fremde Inhalte (Art. 4–6 DSA); Preisangaben bei Ticketarten (Preisangabenverordnung).
24. **Ticketing (Phase 4)** – Zahlungsdienste, Barrierefreiheit (BFSG), kein Widerrufsrecht bei Freizeitveranstaltungen mit festem Termin (§ 312g Abs. 2 Nr. 9 BGB), eigene AGB für den Ticketverkauf.
25. **Änderungsklauseln** – Keine Zustimmung durch Schweigen bei wesentlichen Änderungen der Nutzungsbedingungen; Verfahren festlegen.
