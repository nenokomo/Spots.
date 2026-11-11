> **Entwurf – nicht rechtlich geprüft. Vor Verwendung von einer Fachperson prüfen lassen.**

# Datenschutzerklärung für die App Spots

Stand: [OFFEN: Datum der Veröffentlichung] · Entwurf vom 11.11.2026, abgeglichen mit dem Code vom 11.11.2026

**Lesehilfe fürs Team (vor Veröffentlichung entfernen)**
- **[GEPLANT]** = Funktion ist noch nicht live. Abschnitt erst veröffentlichen, wenn die Funktion live ist, sonst streichen.
- **[TEST]** = nur in der internen Testumgebung aktiv (Konten).
- **[OFFEN: …]** = Angabe fehlt und wurde bewusst nicht erfunden.
- Alles Übrige beschreibt, was der Code am 11.11.2026 tatsächlich tut.

---

## 1. Verantwortlicher

[OFFEN: Firmenname bzw. Name]
[OFFEN: Rechtsform, vertreten durch …]
[OFFEN: Anschrift]
E-Mail: [OFFEN: Datenschutz-E-Mail]

Datenschutzbeauftragte/r: [OFFEN: falls benannt, Kontakt nennen; sonst Zeile streichen]

## 2. Das Wichtigste in Kürze

- Spots funktioniert **ohne Konto**. Radar, Entdecken und Gemerkt brauchen keine Registrierung.
- Deinen **Standort** verwendet die App nur auf deinem Gerät. Umkreis und Entfernungen berechnet das Gerät selbst; deine GPS-Position wird nicht an unsere Server gesendet und nicht gespeichert.
- **Gemerkte Events** speichert die App nur auf deinem Gerät.
- **Kein Tracking, keine Werbung, keine Analyse-Tools.** Im Code vom 11.11.2026 sind keine Analyse-, Werbe- oder Tracking-Bibliotheken eingebunden.
- Karte, Eventbilder und Ortssuche lädt die App direkt bei Drittanbietern. Diese erhalten dabei technisch bedingt deine IP-Adresse (Details unten).

## 3. Überblick

| Bereich | Welche Daten | Wohin | Status |
|---|---|---|---|
| Events laden | IP-Adresse, Zeitpunkt, technische Angaben der Anfrage (z. B. App-/Geräteinfo), angefragte Inhalte (z. B. Event-IDs) | Supabase (Hosting) | live |
| Standort | GPS-Position (genau oder ungefähr, je nach Freigabe) | bleibt auf dem Gerät | live |
| Karte | IP-Adresse, angezeigter Kartenausschnitt, technische Gerätedaten | Apple (iOS), Google (Android), OpenStreetMap Foundation (Web) | live |
| Ortssuche | eingegebener Suchtext, IP-Adresse | Open-Meteo | live |
| Eventbilder | IP-Adresse, Bildadresse | Server der Eventquelle (derzeit Goabase) | live |
| Gemerkt | IDs der gemerkten Events | nur auf dem Gerät | live |
| Konto | E-Mail, Passwort (nicht im Klartext), privater Anzeigename, Anmeldedaten | Supabase Auth | [TEST] |
| Veranstalterkonto | öffentliche Profilangaben, Mitgliedschaften | Supabase | [GEPLANT] |
| Live Snaps | Fotos/Videos, Bildunterschrift, Zeitpunkt, Konto-ID | Supabase | [GEPLANT] |
| Meldungen | Grund, optionaler Text, Zeitpunkt, ggf. Konto-ID | Supabase | [GEPLANT] |
| Eventdaten aus öffentlichen Quellen | Eventangaben, ggf. Namen von Künstler/innen oder Veranstaltern | Goabase (live); Ticketmaster, OpenStreetMap, Club-Websites, Anthropic [GEPLANT] | teils live |

## 4. Einzelheiten

### 4.1 Hosting, Datenbank und Anmeldung (Supabase)

Wir nutzen **Supabase** (Supabase Inc.) für Datenbank, Anmeldung (Supabase Auth) und Dateispeicher. Unsere Projekte liegen laut interner Dokumentation in der Region eu-central-1 (Frankfurt am Main). [OFFEN: Supabase-Region vor Veröffentlichung im Dashboard bestätigen]

Die App ruft bei Supabase die veröffentlichten Events ab: beim Start, wenn du in die App zurückkehrst, und etwa jede Minute, solange die App im Vordergrund ist. Dabei fragt sie immer **alle** veröffentlichten kommenden und laufenden Events ab. **Dein Standort oder dein Umkreis wird dabei nicht übermittelt.** Öffnest du ein Event oder eine Veranstalterseite, lädt die App zusätzlich Details, Ticketarten und Live Snaps.

Supabase verarbeitet dabei technisch notwendige Daten: IP-Adresse, Zeitpunkt, angefragte Adresse einschließlich Abfrageparametern (z. B. Event-IDs) und technische Angaben deines Geräts bzw. der App. Diese Daten landen in Server-Protokollen. [OFFEN: Aufbewahrungsdauer der Protokolle laut Supabase-Tarif]

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der App) und lit. f DSGVO (berechtigtes Interesse an einem sicheren, stabilen Betrieb).
Supabase handelt als Auftragsverarbeiter. [OFFEN: Auftragsverarbeitungsvertrag (DPA) mit Supabase abschließen bzw. bestätigen] Supabase Inc. hat ihren Sitz außerhalb der EU; siehe Abschnitt 6.

### 4.2 Standort

- Beim ersten Öffnen von Radar oder Entdecken fragt Spots über den Systemdialog, ob die App deinen Standort **während der Nutzung** verwenden darf. Hintergrund-Standort fordert Spots nicht an.
- Mit Freigabe liest die App deine Position einmalig aus (oder nutzt eine höchstens eine Minute alte, vom Gerät bereits ermittelte Position): beim Öffnen von Radar oder Entdecken und wenn du „Meinen Standort verwenden“ antippst.
- Die Position bleibt im Arbeitsspeicher der App. Sie dient dazu, die Karte auf deine Umgebung auszurichten, deinen Punkt auf der Karte zu zeigen und Entfernungen zu Events zu berechnen. **Spots speichert die Position nicht und sendet sie nicht an unsere Server.**
- Hinweis: Der Kartendienst lädt Kartenmaterial für den angezeigten Ausschnitt (4.3). Ist die Karte auf deine Position ausgerichtet, kann der Kartenanbieter daraus ungefähr ablesen, wo du bist.
- Ohne Freigabe wählst du eine Stadt; Spots funktioniert dann trotzdem.
- Du kannst die Freigabe jederzeit in den Systemeinstellungen ändern (in Spots: Profil → Berechtigungen).

Rechtsgrundlage: deine Einwilligung über den Systemdialog (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen.

### 4.3 Karten

| Plattform | Kartendienst | Anbieter |
|---|---|---|
| iOS | Apple Karten | Apple [OFFEN: zuständige Apple-Gesellschaft für die EU prüfen] |
| Android | Google Maps | Google Ireland Limited; Muttergesellschaft Google LLC (USA) [prüfen] |
| Web-Version | Kartenkacheln von OpenStreetMap | OpenStreetMap Foundation (Vereinigtes Königreich) |

Beim Anzeigen und Verschieben der Karte lädt dein Gerät Kartenmaterial direkt vom Anbieter. Dieser erhält dabei deine IP-Adresse, den angezeigten Kartenausschnitt und technische Gerätedaten. Die Anbieter verarbeiten diese Daten auch in eigener Verantwortung; es gelten ihre Datenschutzhinweise (Apple: apple.com/legal/privacy, Google: policies.google.com/privacy, OpenStreetMap Foundation: osmfoundation.org/wiki/Privacy_Policy). [OFFEN: Datenflüsse der Karten-SDKs (Apple MapKit, Google Maps SDK for Android) technisch prüfen, insbesondere eigene Nutzungs- oder Diagnosedaten der SDKs]

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer funktionierenden Kartendarstellung).

### 4.4 Ortssuche (Open-Meteo)

Wenn du in der Stadtsuche mindestens drei Buchstaben eingibst, sendet die App den Suchtext an die Ortssuche von **Open-Meteo** (geocoding-api.open-meteo.com), um passende deutsche Städte zu finden. Open-Meteo erhält dabei den Suchtext und deine IP-Adresse, **nicht** deinen Standort. Die Ortsdaten stammen von GeoNames.
[OFFEN: Betreiber, Sitz und Datenschutzhinweise von Open-Meteo prüfen; Rolle (eigener Verantwortlicher oder Auftragsverarbeiter) klären]

Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO (von dir gewünschte Ortssuche).

### 4.5 Eventbilder und Logos

Eventbilder (Flyer) zeigt Spots direkt von den Servern der jeweiligen Quelle an, ohne sie bei uns zu kopieren: derzeit von Goabase, künftig auch von Ticketmaster [GEPLANT]. Logos von Veranstaltern lädt die App von der Adresse, die der Veranstalter angegeben hat [GEPLANT]. In der Story-Ansicht lädt die App das Bild des nächsten Events vorab.

Beim Laden eines Bildes erhält der jeweilige Server deine IP-Adresse und technische Angaben der Anfrage.
Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Darstellung der Events mit Bild).

### 4.6 Gemerkte Events

- Merkst du ein Event (Herz), speichert die App nur die **Event-ID auf deinem Gerät** (App-Speicher).
- Um die Merkliste anzuzeigen, fragt die App die Eventdaten zu diesen IDs bei Supabase ab. Die Anfrage ist mit keinem Konto verknüpft. Technisch erscheinen IP-Adresse und die angefragten Event-IDs aber in den Server-Protokollen (4.1).
- Löschen: Herz erneut antippen oder die App löschen.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Die Speicherung auf dem Gerät ist für die von dir gewünschte Funktion unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).

**[GEPLANT]** Mit Konto wird die Merkliste zusätzlich im Konto gespeichert (Konto-ID, Event-ID, Zeitpunkt), damit sie auf mehreren Geräten gleich ist. Ohne Konto bleibt alles lokal.

### 4.7 Konto [TEST]

Konten sind derzeit nur in unserer internen Testumgebung freigeschaltet.

- Registrierung mit **E-Mail-Adresse und Passwort** über Supabase Auth. Passwörter werden nicht im Klartext gespeichert.
- Nach der Registrierung erhältst du eine **Bestätigungs-E-Mail**. [OFFEN: E-Mail-Versanddienst (Supabase-Standard oder eigener Anbieter)]
- Damit du angemeldet bleibst, speichert die App einen Anmeldeschlüssel (Sitzung) auf deinem Gerät, in der Web-Version im Browserspeicher. Beim Abmelden wird er auf dem Gerät entfernt.
- Optional kannst du einen **privaten Anzeigenamen** (bis 80 Zeichen) speichern. Er ist nicht öffentlich.
- Supabase protokolliert Anmeldevorgänge (z. B. Zeitpunkt, IP-Adresse) zur Sicherheit.
- Es gibt keine öffentlichen Profile, keine Follower und keine Freundeslisten.
- Ein Login gilt auch für Veranstalterseiten, die du verwaltest (4.8).

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Konto); Sicherheitsprotokolle lit. f.
Konto löschen: [OFFEN: Löschfunktion in der App fehlt noch; bis dahin Löschweg nennen, z. B. E-Mail an Datenschutz-E-Mail]

### 4.8 Veranstalterkonten [GEPLANT]

- Mit einem Konto kann man ein Veranstalterprofil anlegen oder später einen bereits gelisteten Ort übernehmen. Für die Übernahme prüfen wir einen Nachweis (z. B. E-Mail von der Domain der Website oder Rückruf); das Spots-Team gibt frei.
- **Öffentlich**: Name, Kurzname in der Adresse, Beschreibung, Stadt, Logo, Website, veröffentlichte Beiträge und Events.
- **Nicht öffentlich**: wer Mitglied ist (Besitzer/Bearbeiter), E-Mail-Adressen, private Profile.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
[OFFEN: welche Nachweisdaten bei der Übernahme gespeichert werden und wie lange]

### 4.9 Live Snaps [GEPLANT]

- Fotos und kurze Videos (bis 15 Sekunden) mit optionaler Bildunterschrift (bis 200 Zeichen), einem Event oder Veranstalter zugeordnet. Hochladen nur mit Konto.
- Speicherung in einem nicht öffentlichen Speicherbereich bei Supabase. Angezeigt werden Snaps über zeitlich begrenzte Links (30 Minuten gültig).
- **Sichtbar höchstens 24 Stunden** ab dem Hochladen. Danach werden die Dateien gelöscht. [OFFEN: genaue Löschfrist der Dateien und Datenbankeinträge nach Ablauf]
- Öffentlich sichtbar: das Foto/Video, die Bildunterschrift, der Zeitpunkt, das Event und ob der Snap vom Veranstalter stammt. Wer einen Besucher-Snap hochgeladen hat, zeigt die App nicht an. [OFFEN: Laut SQL 17 ist die Konto-ID der Hochladenden technisch über die Schnittstelle abrufbar – Spaltenrechte einschränken, dann Satz bestätigen]
- Snaps von Besucherinnen und Besuchern werden erst nach Freigabe sichtbar (durch den Veranstalter oder das Spots-Team). Snaps von Veranstaltern sind sofort sichtbar.
- Hochladen ist von 1 Stunde vor Beginn bis 2 Stunden nach Ende möglich, höchstens 20 Snaps pro Stunde und Konto.
- Nach drei Meldungen wird ein Snap automatisch ausgeblendet, bis er geprüft ist.
- Eigene Snaps kannst du jederzeit löschen.
- Bist du auf einem Snap zu sehen und möchtest das nicht, schreib an [OFFEN: Melde- bzw. Datenschutz-E-Mail].
- [OFFEN: Standort- und Kameradaten in Fotos (EXIF-Metadaten) vor dem Speichern entfernen – technisch umsetzen und hier bestätigen]

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO für Hochladende; lit. f für Moderation sowie für Personen, die auf Snaps zu sehen sind.

### 4.10 Meldungen [GEPLANT]

**Live Snaps und Beiträge melden** (mit Konto): Grund (Nacktheit, Gewalt, Belästigung, Privatsphäre, Spam, Sonstiges) und optional Details (bis 500 Zeichen). Gespeichert werden Konto-ID, Grund, Details und Zeitpunkt. Die gemeldete Person erfährt nicht, wer gemeldet hat. [OFFEN: bestätigen]

**„Fehler melden“ auf Ortsseiten** (ohne Konto): Grund und optional ein Freitext (bis 500 Zeichen). Bitte schreib keine persönlichen Daten in den Freitext. Technisch fällt die IP-Adresse in den Server-Protokollen an. [OFFEN: Spam-Schutz – welches Verfahren, welche Daten (z. B. IP-Adresse, Gerätekennung), wie lange]

Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit dem Digital Services Act (Melde- und Abhilfeverfahren) sowie lit. f (sicherer Dienst, korrekte Ortsdaten).

### 4.11 Eventdaten und Ortsdaten aus öffentlichen Quellen

Spots zeigt Veranstaltungen und Orte aus öffentlichen Quellen. Wir übernehmen Eventfakten (Titel, Datum, Uhrzeit, Ort, Genre, Ticketlink, Bildadresse). Diese Angaben können personenbezogene Daten enthalten, z. B. Namen von Künstlerinnen und Künstlern oder Veranstaltern. Private Adressen veröffentlichen wir nicht ohne Berechtigung.

- **Goabase** (goabase.net): derzeit die einzige Eventquelle. Der Import läuft automatisch etwa alle zwei Stunden. Jedes Event verlinkt auf die Seite bei Goabase.
- **Ticketmaster** [GEPLANT]: Musik-Events in Deutschland über die Ticketmaster Discovery API. Bilder werden von Ticketmaster-Servern geladen (4.5). Tickets kaufst du bei Ticketmaster; dort gilt die Datenschutzerklärung von Ticketmaster. Verlangt der Inhaber eines Inhalts die Entfernung, entfernen wir Ticketmaster-Inhalte innerhalb von 24 Stunden. [OFFEN: Pflichtangaben laut Ticketmaster-API-Bedingungen mit diesem Absatz abgleichen]
- **OpenStreetMap** [GEPLANT]: Verzeichnis von Clubs und Veranstaltungsorten (Name, Art, Adresse, Koordinaten, Website, Öffnungszeiten). Daten © OpenStreetMap-Mitwirkende, Lizenz ODbL.
- **Club-Websites und Angaben von Clubs** [GEPLANT]: Das Spots-Team erstellt Einträge aus öffentlichen Event-Seiten von Clubs, grundsätzlich mit Zustimmung des Clubs, und prüft jeden Eintrag vor der Veröffentlichung.

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, über öffentliche Veranstaltungen zu informieren).
Bist du in einem Eintrag genannt und möchtest das nicht, kannst du widersprechen oder eine Berichtigung verlangen: [OFFEN: Kontakt-E-Mail].

### 4.12 KI-gestützte Event-Entwürfe (Anthropic) [GEPLANT]

Um Event-Entwürfe aus öffentlichen Club-Websites schneller zu erstellen, wollen wir die **Claude API von Anthropic PBC (USA)** nutzen. Übermittelt werden nur öffentliche Inhalte von Event-Seiten – **keine Daten von Nutzerinnen und Nutzern der App**. Öffentliche Event-Seiten können Namen enthalten (z. B. von DJs). Die KI erstellt nur Entwürfe; ein Mensch prüft jeden Entwurf vor der Veröffentlichung.

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
[OFFEN: Auftragsverarbeitungsvertrag mit Anthropic, Rechtsgrundlage der Übermittlung in die USA, Aufbewahrungsdauer bei Anthropic]

### 4.13 Externe Links, Route und Teilen

- **Tickets und Originalquelle**: Ein Tipp öffnet die Seite des Ticketanbieters bzw. der Quelle im Browser oder in der passenden App. Dort gelten deren Datenschutzhinweise. Spots hängt keine Daten über dich an den Link an. [GEPLANT: falls Affiliate-Links eingeführt werden (z. B. über AWIN), hier ergänzen]
- **Route**: Auf iOS öffnet Spots Apple Karten, sonst Google Maps, mit den Koordinaten des Veranstaltungsorts als Ziel. Spots gibt deinen Standort nicht mit; die Karten-App verwendet ihn ggf. nach deinen dortigen Einstellungen.
- **Website des Veranstalters** [GEPLANT]: öffnet sich im Browser.
- **Teilen**: Über den Teilen-Dialog deines Geräts schickst du Titel, Datum, Ort und ggf. den Quelllink an Empfänger deiner Wahl. Spots erfährt nicht, mit wem du teilst.

### 4.14 Kein Tracking, keine Werbung

Spots setzt keine Analyse-, Werbe- oder Tracking-Dienste ein, erstellt keine Nutzungsprofile und zeigt keine Werbung. Push-Mitteilungen gibt es derzeit nicht. Führen wir so etwas ein, aktualisieren wir diese Erklärung vorher und holen, wo nötig, deine Einwilligung ein.

### 4.15 Web-Version [OFFEN: nur falls öffentlich angeboten]

Karte von OpenStreetMap (4.3), Anmeldung im Browserspeicher (4.7), keine Cookies. [OFFEN: Hosting der Web-Version und dessen Server-Protokolle ergänzen]

### 4.16 App-Stores

Für Download und Updates gelten die Bedingungen von Apple (App Store) bzw. Google (Google Play); diese verarbeiten Daten in eigener Verantwortung. [OFFEN: nach Einrichtung der Store-Konten prüfen, ob und welche Absturz- oder Diagnoseberichte wir über die Store-Konsolen erhalten]

### 4.17 Kontakt per E-Mail

Schreibst du uns, verarbeiten wir deine E-Mail-Adresse und deine Nachricht, um dein Anliegen zu bearbeiten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). [OFFEN: E-Mail-Postfach-Anbieter]

## 5. Empfänger

| Empfänger | Rolle | Wofür | Status |
|---|---|---|---|
| Supabase Inc. | Auftragsverarbeiter | Datenbank, Anmeldung, Dateispeicher, Server-Protokolle | live |
| [OFFEN: E-Mail-Versanddienst] | Auftragsverarbeiter | Bestätigungs-E-Mails | [TEST] |
| [OFFEN: E-Mail-Postfach-Anbieter] | Auftragsverarbeiter | Kontakt | ab Veröffentlichung |
| Anthropic PBC | Auftragsverarbeiter | Entwürfe aus öffentlichen Event-Seiten | [GEPLANT] |
| Apple, Google, OpenStreetMap Foundation | eigene Verantwortung [OFFEN: Rolle prüfen] | Karten | live |
| Open-Meteo | eigene Verantwortung [OFFEN: Rolle prüfen] | Ortssuche | live |
| Goabase, Ticketmaster, Veranstalter (Bildserver) | eigene Verantwortung | Eventbilder, Logos | Goabase live, Rest [GEPLANT] |

## 6. Übermittlung in Drittländer

Mit Unternehmen in den USA haben zu tun: Supabase Inc. (Unternehmenssitz; unsere Daten liegen laut Doku in der EU), Google LLC und Apple (Karten) sowie Anthropic PBC [GEPLANT]. Die OpenStreetMap Foundation sitzt im Vereinigten Königreich.
[OFFEN: Rechtsgrundlage je Anbieter prüfen – Angemessenheitsbeschluss (EU-US Data Privacy Framework, falls der Anbieter zertifiziert ist; Vereinigtes Königreich) oder Standardvertragsklauseln]

## 7. Speicherdauer

| Daten | Dauer |
|---|---|
| Standort | nicht gespeichert; nur im Arbeitsspeicher, solange die App läuft |
| Ortssuche | von uns nicht gespeichert; bei Open-Meteo [OFFEN] |
| Server-Protokolle (Supabase) | [OFFEN: laut Supabase-Tarif] |
| Gemerkte Events | auf dem Gerät, bis du sie entfernst oder die App löschst |
| Konto, privater Anzeigename | bis zur Löschung des Kontos [OFFEN: Löschfrist inkl. Backups] |
| Live Snaps [GEPLANT] | höchstens 24 Stunden sichtbar; Dateien danach gelöscht [OFFEN: Frist] |
| Meldungen [GEPLANT] | [OFFEN] |
| „Fehler melden“ [GEPLANT] | [OFFEN: z. B. bis zur Bearbeitung plus X Monate] |
| KI-Entwürfe [GEPLANT] | [OFFEN] |
| E-Mails an uns | bis das Anliegen erledigt ist, sofern keine gesetzliche Aufbewahrungspflicht besteht |

## 8. Deine Rechte

Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3).

**Widerspruchsrecht (Art. 21 DSGVO):** Verarbeiten wir Daten auf Grundlage berechtigter Interessen (lit. f), kannst du aus Gründen, die sich aus deiner besonderen Situation ergeben, jederzeit widersprechen.

Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), z. B. bei [OFFEN: zuständige Aufsichtsbehörde je nach Sitz des Verantwortlichen].

Anfragen an: [OFFEN: Datenschutz-E-Mail]

## 9. Pflicht zur Bereitstellung, Mindestalter

Du musst keine Daten angeben, um Spots zu nutzen. Ohne Standortfreigabe wählst du eine Stadt; ohne Konto stehen Konto-Funktionen nicht zur Verfügung.
Spots richtet sich an Personen ab [OFFEN: Mindestalter 16 oder 18] Jahren.

## 10. Änderungen

Wir passen diese Erklärung an, wenn sich Spots oder die Rechtslage ändert. Die aktuelle Fassung findest du in der App unter Profil [OFFEN: Link in der App einbauen] und unter [OFFEN: Website]. Betreffen wesentliche Änderungen dein Konto, informieren wir dich vorher [GEPLANT].
