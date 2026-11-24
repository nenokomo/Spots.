> **Entwurf – nicht rechtlich geprüft. Vor Verwendung von einer Fachperson prüfen lassen.**

# Datenschutzerklärung für die App Spots

Stand: [OFFEN: Datum der Veröffentlichung] · Entwurf vom 11.11.2026. Abschnitte 2, 3, 4.6–4.10, 4.18–4.21, 5 und 7 am 23.11.2026 mit dem Code abgeglichen (Konten, Veranstalter, Shots, Storys, Meldungen, Zählung); die übrigen Abschnitte sind Stand 11.11.2026

**Lesehilfe fürs Team (vor Veröffentlichung entfernen)**
- **[GEPLANT]** = Funktion ist noch nicht live. Abschnitt erst veröffentlichen, wenn die Funktion live ist, sonst streichen.
- **[TEST]** = fertig gebaut, aber nur in der internen Testumgebung aktiv (Konten, Veranstalter, Shots, Storys, Meldungen, Zählung). Vor der Freischaltung für alle den Vermerk entfernen.
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
- **Gemerkte Events** speichert die App ohne Konto nur auf deinem Gerät. Mit Konto liegen sie zusätzlich in deinem Konto [TEST].
- **Kein Tracking, keine Werbung, keine Analyse-Tools.** Im Code sind keine Analyse-, Werbe- oder Tracking-Bibliotheken eingebunden. Für Veranstalter zählt Spots nur, wie oft eine Eventseite geöffnet wurde – als Tagessumme, ohne Bezug zu dir (4.19) [TEST].
- Karte, Eventbilder und Ortssuche lädt die App direkt bei Drittanbietern. Diese erhalten dabei technisch bedingt deine IP-Adresse (Details unten).

## 3. Überblick

| Bereich | Welche Daten | Wohin | Status |
|---|---|---|---|
| Events laden | IP-Adresse, Zeitpunkt, technische Angaben der Anfrage (z. B. App-/Geräteinfo), angefragte Inhalte (z. B. Event-IDs) | Supabase (Hosting) | live |
| Standort | GPS-Position (genau oder ungefähr, je nach Freigabe) | bleibt auf dem Gerät | live |
| Karte | IP-Adresse, angezeigter Kartenausschnitt, technische Gerätedaten | Apple (iOS), Google (Android), OpenStreetMap Foundation (Web) | live |
| Ortssuche | eingegebener Suchtext, IP-Adresse | Open-Meteo | live |
| Eventbilder | IP-Adresse, Bildadresse | Server der Eventquelle (derzeit Goabase) | live |
| Gemerkt | IDs der gemerkten Events | ohne Konto nur auf dem Gerät; mit Konto zusätzlich Supabase | live; mit Konto [TEST] |
| Konto | E-Mail, Passwort (nicht im Klartext), Kontoart (privat oder Veranstalter), Anmeldedaten | Supabase Auth | [TEST] |
| Veranstalterkonto | öffentliches Profil (Name, Adresse, Beschreibung, Motto, Logo, Titelbild, Links); nicht öffentlich: Ansprechperson, Telefon, Mitglieder | Supabase | [TEST] |
| Adresssuche für Veranstalter | Adresse des Clubs bzw. Events | OpenStreetMap Foundation (Nominatim) | [TEST] |
| Shots und Event-Story | Fotos, Zeitpunkt, Event; Konto-ID nur intern | Supabase | [TEST] |
| Veranstalter-Story, Beiträge, Tickets | Bilder, Texte, Ticketarten und Preise des Veranstalters | Supabase | [TEST] |
| Meldungen | Grund, optionaler Text, Zeitpunkt, Konto-ID | Supabase | [TEST] |
| Zählung für Veranstalter | Tagessummen pro Event; kurzlebiger Prüfwert einer zufälligen Gerätekennung | Supabase | [TEST] |
| Eventdaten aus öffentlichen Quellen | Eventangaben, ggf. Namen von Künstler/innen oder Veranstaltern | Goabase (live); Ticketmaster, OpenStreetMap, Club-Websites, Anthropic [GEPLANT] | teils live |

## 4. Einzelheiten

### 4.1 Hosting, Datenbank und Anmeldung (Supabase)

Wir nutzen **Supabase** (Supabase Inc.) für Datenbank, Anmeldung (Supabase Auth) und Dateispeicher. Unsere Projekte liegen laut interner Dokumentation in der Region eu-central-1 (Frankfurt am Main). [OFFEN: Supabase-Region vor Veröffentlichung im Dashboard bestätigen]

Die App ruft bei Supabase die veröffentlichten Events ab: beim Start, wenn du in die App zurückkehrst, und etwa jede Minute, solange die App im Vordergrund ist. Dabei fragt sie immer **alle** veröffentlichten kommenden und laufenden Events ab. **Dein Standort oder dein Umkreis wird dabei nicht übermittelt.** Öffnest du ein Event oder eine Veranstalterseite, lädt die App zusätzlich Details, Ticketarten, Shots und Storys.

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

Eventbilder (Flyer) zeigt Spots direkt von den Servern der jeweiligen Quelle an, ohne sie bei uns zu kopieren: derzeit von Goabase und Ticketmaster. Logos von Veranstaltern lädt die App von der Adresse, die der Veranstalter angegeben hat [GEPLANT]. In der Story-Ansicht lädt die App das Bild des nächsten Events vorab.

Beim Laden eines Bildes erhält der jeweilige Server deine IP-Adresse und technische Angaben der Anfrage.
Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Darstellung der Events mit Bild).

### 4.6 Gemerkte Events

- Merkst du ein Event (Herz), speichert die App nur die **Event-ID auf deinem Gerät** (App-Speicher).
- Um die Merkliste anzuzeigen, fragt die App die Eventdaten zu diesen IDs bei Supabase ab. Die Anfrage ist mit keinem Konto verknüpft. Technisch erscheinen IP-Adresse und die angefragten Event-IDs aber in den Server-Protokollen (4.1).
- Löschen: Herz erneut antippen oder die App löschen.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Die Speicherung auf dem Gerät ist für die von dir gewünschte Funktion unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).

**Mit Konto [TEST]:** Bist du angemeldet, speichert Spots deine Merkliste zusätzlich in deinem Konto (Konto-ID, Event-ID, Zeitpunkt), damit sie auf mehreren Geräten gleich ist. Beim ersten Anmelden werden die auf dem Gerät gemerkten Events ins Konto übernommen. Nur du kannst deine Merkliste lesen. Veranstalter sehen für ihre eigenen Events nur die Anzahl der Merklisten-Einträge, nie wer gemerkt hat (4.19). Löschst du dein Konto, wird die Merkliste im Konto gelöscht.

### 4.7 Konto [TEST]

Konten sind derzeit nur in unserer internen Testumgebung freigeschaltet.

- Registrierung mit **E-Mail-Adresse und Passwort** über Supabase Auth. Passwörter werden nicht im Klartext gespeichert. Bei der Registrierung wählst du die Kontoart: privat oder Veranstalter. Die Kontoart lässt sich später nicht wechseln.
- Nach der Registrierung erhältst du eine **Bestätigungs-E-Mail**. Für „Passwort vergessen“ schicken wir dir einen Link per E-Mail; die Antwort der App verrät nicht, ob es zu einer Adresse ein Konto gibt. [OFFEN: E-Mail-Versanddienst (eigener Mailserver geplant)]
- Damit du angemeldet bleibst, speichert die App einen Anmeldeschlüssel (Sitzung) auf deinem Gerät, in der Web-Version im Browserspeicher. Beim Abmelden wird er auf dem Gerät entfernt.
- Supabase protokolliert Anmeldevorgänge (z. B. Zeitpunkt, IP-Adresse) zur Sicherheit.
- Es gibt keine öffentlichen Profile für private Konten, keine Follower und keine Freundeslisten.
- **Konto löschen:** in der App unter Profil → Konto löschen (bei Veranstaltern: Spots Studio → Club → Konto löschen). Gelöscht werden das Konto, die Merkliste im Konto und deine Meldungen. Deine Shots werden mit dem Konto gelöscht. [OFFEN: Löschfrist in Sicherungskopien (Backups) laut Supabase-Tarif]

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Konto); Sicherheitsprotokolle lit. f.

### 4.8 Veranstalterkonten und Spots Studio [TEST]

Clubs und Veranstalter registrieren sich mit einem eigenen Veranstalter-Konto und verwalten ihre Seite in „Spots Studio“.

- **Bei der Registrierung** fragen wir ab: Name des Clubs, Adresse (Straße, Hausnummer, PLZ, Stadt), Ansprechperson und Telefonnummer; freiwillig Website und Social-Media-Link.
- **Öffentlich** (nach Freigabe durch das Spots-Team): Name, Kurzname in der Adresse, Stadt und Adresse, Beschreibung, Motto, Logo, Titelbild, Website, Social-Media-Link, veröffentlichte Events mit Adresse, Ticketarten und Preisen, Beiträge und Story-Bilder.
- **Nicht öffentlich:** Ansprechperson und Telefonnummer (nur für Rückfragen des Spots-Teams), E-Mail-Adressen, wer Mitglied des Teams ist.
- **Prüfung:** Das Spots-Team prüft jedes neue Veranstalterprofil und sieht dafür die Angaben oben, die E-Mail-Adresse des Besitzers und ob sie bestätigt ist. Wir speichern das Ergebnis (freigegeben, abgelehnt, gesperrt), den Zeitpunkt, wer geprüft hat und einen Hinweis an den Veranstalter.
- **Team-Mitglieder:** Der Besitzer kann Einladungscodes erstellen (7 Tage gültig, einmal nutzbar). Wer einen Code mit dem eigenen Veranstalter-Konto einlöst, wird Mitglied. Der Besitzer sieht die E-Mail-Adressen der Mitglieder seines Clubs. Gespeichert werden Code, Ersteller, Ablauf und wer ihn eingelöst hat; Fehlversuche beim Einlösen speichern wir kurzzeitig pro Konto, um das Durchprobieren von Codes zu verhindern. [OFFEN: Löschfrist für eingelöste und abgelaufene Codes]
- **Konto löschen:** Löscht der letzte Besitzer sein Konto, werden Ansprechperson und Telefonnummer gelöscht; das Profil und seine Events werden ausgeblendet, nicht gelöscht. [OFFEN: Frist für die endgültige Löschung ausgeblendeter Profile]

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Nutzung von Spots Studio); Prüfung und Missbrauchsschutz lit. f.

### 4.9 Shots und Event-Story [TEST]

„Shots“ sind Fotos von Gästen zu einem laufenden Event. Die „Event-Story“ sind Fotos des Veranstalters zu seinem Event. Videos gibt es noch nicht [GEPLANT].

- **Posten nur mit Konto.** Gäste können von 1 Stunde vor Beginn bis 2 Stunden nach Ende posten, höchstens 20 Shots pro Stunde und Konto. Veranstalter können zu eigenen Events ab dem Anlegen posten.
- Für ein Foto fragt die App nach dem Zugriff auf die **Kamera** (Systemdialog). Ohne Freigabe kannst du keine Shots aufnehmen; alles andere funktioniert.
- Shots sind **sofort sichtbar** und höchstens **24 Stunden**. Danach löscht ein automatischer Lauf (stündlich) die Dateien und die Einträge.
- **Wer sieht was:** Die Event-Story des Veranstalters sehen alle. Shots von Gästen sehen nur angemeldete Konten.
- Speicherung in einem nicht öffentlichen Speicherbereich bei Supabase. Angezeigt werden die Bilder über zeitlich begrenzte Links (30 Minuten gültig).
- Gespeichert werden: das Foto, der Zeitpunkt, das Event und intern die Konto-ID der postenden Person. **Wer einen Shot gepostet hat, zeigt die App nicht an und ist über unsere Schnittstelle nicht abrufbar.** Das Spots-Team sieht bei der Prüfung ebenfalls nicht, wer gepostet hat.
- **Moderation:** Nach drei Meldungen wird ein Shot automatisch ausgeblendet. Der Veranstalter kann Shots zu seinen Events ausblenden; das Spots-Team kann ausblenden und entfernen.
- Eigene Shots kannst du löschen. [OFFEN: Knopf dafür in der App fehlt noch; bis dahin Weg über die Melde- bzw. Datenschutz-E-Mail nennen]
- Bist du auf einem Shot zu sehen und möchtest das nicht, melde ihn in der App (Grund „Zeigt mich oder andere ohne Erlaubnis“) oder schreib an [OFFEN: Melde- bzw. Datenschutz-E-Mail].
- [OFFEN: Standort- und Kameradaten in Fotos (EXIF-Metadaten) vor dem Speichern entfernen – technisch umsetzen und hier bestätigen]

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO für Postende; lit. f für Moderation sowie für Personen, die auf Shots zu sehen sind. Kamera: Einwilligung über den Systemdialog (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG).

### 4.10 Meldungen

**Shots, Story-Bilder und Beiträge melden** [TEST] (mit Konto): Grund (Nacktheit, Gewalt, Belästigung, Privatsphäre, Spam, Sonstiges). Gespeichert werden Konto-ID, Grund und Zeitpunkt. Jedes Konto kann einen Inhalt einmal melden. Weder die gemeldete Person noch der Veranstalter noch das Spots-Team sehen in der App, wer gemeldet hat; das Team sieht nur Anzahl und Gründe. Meldungen werden gelöscht, wenn der gemeldete Inhalt gelöscht wird (bei Shots spätestens nach etwa 25 Stunden) oder wenn du dein Konto löschst. [OFFEN: Speicherdauer von Meldungen zu Story-Bildern und Beiträgen, die bestehen bleiben]

Story-Bilder und Beiträge von Veranstaltern werden durch Meldungen nicht automatisch ausgeblendet; das Spots-Team prüft sie.

**„Fehler melden“ auf Ortsseiten** (ohne Konto): Grund und optional ein Freitext (bis 500 Zeichen). Bitte schreib keine persönlichen Daten in den Freitext. Technisch fällt die IP-Adresse in den Server-Protokollen an. [OFFEN: Spam-Schutz – welches Verfahren, welche Daten (z. B. IP-Adresse, Gerätekennung), wie lange]

Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit dem Digital Services Act (Melde- und Abhilfeverfahren) sowie lit. f (sicherer Dienst, korrekte Ortsdaten).

### 4.11 Eventdaten und Ortsdaten aus öffentlichen Quellen

Spots zeigt Veranstaltungen und Orte aus öffentlichen Quellen. Wir übernehmen Eventfakten (Titel, Datum, Uhrzeit, Ort, Genre, Ticketlink, Bildadresse). Diese Angaben können personenbezogene Daten enthalten, z. B. Namen von Künstlerinnen und Künstlern oder Veranstaltern. Private Adressen veröffentlichen wir nicht ohne Berechtigung.

- **Goabase** (goabase.net): Der Import läuft automatisch etwa alle zwei Stunden. Jedes Event verlinkt auf die Seite bei Goabase.
- **Ticketmaster**: Musik-Events in Deutschland über die Ticketmaster Discovery API. Bilder werden von Ticketmaster-Servern geladen (4.5). Tickets kaufst du bei Ticketmaster; dort gilt die Datenschutzerklärung von Ticketmaster. Verlangt der Inhaber eines Inhalts die Entfernung, entfernen wir Ticketmaster-Inhalte innerhalb von 24 Stunden. [OFFEN: Pflichtangaben laut Ticketmaster-API-Bedingungen mit diesem Absatz abgleichen]
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

### 4.18 Veranstalter-Story, Beiträge und Tickets [TEST]

- **Veranstalter-Story:** Bilder, die ein Veranstalter für die Übersicht in „Entdecken“ postet, optional mit kurzem Text und einem seiner Events. Sie bleiben, bis der Veranstalter sie löscht. Die Bilder liegen in einem öffentlichen Speicherbereich und sind über ihre Adresse abrufbar.
- **Beiträge:** Texte mit bis zu zehn Bildern auf der Veranstalterseite. Die Bilder liegen in einem nicht öffentlichen Speicherbereich und werden über zeitlich begrenzte Links (eine Stunde gültig) angezeigt.
- **Tickets:** Veranstalter können Ticketarten mit Preis und Link angeben. Spots verkauft keine Tickets und verarbeitet keine Zahlungsdaten.
- Welches Mitglied eines Veranstalter-Teams ein Bild gepostet hat, speichern wir intern; es ist nicht öffentlich abrufbar.
- Logos, Flyer, Titel- und Story-Bilder, auf die nichts mehr verweist (z. B. nach dem Ersetzen), löscht ein automatischer Lauf frühestens nach 24 Stunden.

Auf Bildern von Veranstaltern können Personen zu sehen sein. Bist du betroffen, melde das Bild in der App oder schreib an [OFFEN: Melde- bzw. Datenschutz-E-Mail].
Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Veranstalter); lit. f für abgebildete Personen und Moderation.

### 4.19 Zählung für Veranstalter [TEST]

Veranstalter sehen in Spots Studio für ihre eigenen Events: wie oft die Eventseite geöffnet wurde, wie oft der Ticket-Link angetippt wurde, wie viele Konten das Event gemerkt haben und wie viele Shots gepostet wurden – als Summen und als Tagesverlauf. **Sie sehen nie, wer das war.**

- Gezählt wird nur bei Events, die ein Veranstalter selbst in Spots eingetragen hat, nicht bei Events aus öffentlichen Quellen.
- Damit dasselbe Gerät am selben Tag nicht mehrfach zählt, erzeugt die App einmalig eine **zufällige Kennung** und speichert sie auf deinem Gerät. Sie hat keinen Bezug zu deinem Konto, deinem Gerät oder deiner Werbe-ID.
- Beim Öffnen einer Eventseite oder Antippen des Ticket-Links sendet die App diese Kennung zusammen mit der Event-ID an Supabase. Gespeichert wird **nicht die Kennung**, sondern nur ein Prüfwert (Hash) aus Kennung, Event, Art des Ereignisses und einem täglich neuen Zufallswert. Prüfwerte und Zufallswerte von vorgestern und älter werden gelöscht, sobald wieder etwas gezählt wird. Danach bleiben nur die Tagessummen pro Event. [OFFEN: festen täglichen Löschlauf ergänzen, damit die Frist auch ohne neue Zählung sicher eingehalten wird]
- Die zufällige Kennung löschst du, indem du die App löschst.

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse der Veranstalter und von uns an einfachen, nicht personenbezogenen Zahlen). [prüfen: Speichern und Auslesen der zufälligen Kennung auf dem Gerät – unbedingt erforderlich nach § 25 Abs. 2 Nr. 2 TDDDG oder Einwilligung nötig?]

### 4.20 Adresssuche für Veranstalter (OpenStreetMap Nominatim) [TEST]

Speichert ein Veranstalter ein Event mit eigener Adresse, sendet die App diese Adresse (Straße, Hausnummer, PLZ, Stadt) an die Adresssuche **Nominatim** der OpenStreetMap Foundation (nominatim.openstreetmap.org), um den Punkt auf der Karte zu berechnen. Übermittelt werden die Adresse und technisch bedingt die IP-Adresse des Veranstalters. Besucherinnen und Besucher sind davon nicht betroffen.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. [OFFEN: Nutzungsbedingungen von Nominatim einhalten (höchstens eine Anfrage pro Sekunde, Kennung der App); bei vielen Veranstaltern eigenen Dienst oder Anbieter prüfen]

### 4.21 Was das Spots-Team sieht [TEST]

Für Freigaben und Moderation hat das Spots-Team einen geschützten Bereich. Dort sichtbar: Veranstalter-Anträge mit den Angaben aus 4.8, Shots und Story-Bilder mit Anzahl und Gründen der Meldungen (ohne Namen der Postenden oder Meldenden), Event-Entwürfe, Orte und Fehlermeldungen zu Orten.

## 5. Empfänger

| Empfänger | Rolle | Wofür | Status |
|---|---|---|---|
| Supabase Inc. | Auftragsverarbeiter | Datenbank, Anmeldung, Dateispeicher, Server-Protokolle | live |
| [OFFEN: E-Mail-Versanddienst] | Auftragsverarbeiter | Bestätigungs- und Passwort-E-Mails | [TEST] |
| [OFFEN: E-Mail-Postfach-Anbieter] | Auftragsverarbeiter | Kontakt | ab Veröffentlichung |
| Anthropic PBC | Auftragsverarbeiter | Entwürfe aus öffentlichen Event-Seiten | [GEPLANT] |
| Apple, Google, OpenStreetMap Foundation | eigene Verantwortung [OFFEN: Rolle prüfen] | Karten | live |
| OpenStreetMap Foundation (Nominatim) | eigene Verantwortung [OFFEN: Rolle prüfen] | Adresssuche für Veranstalter | [TEST] |
| Open-Meteo | eigene Verantwortung [OFFEN: Rolle prüfen] | Ortssuche | live |
| Goabase, Ticketmaster, Veranstalter (Bildserver) | eigene Verantwortung | Eventbilder, Logos | live |
| Veranstalter in Spots | eigene Verantwortung | Summen zu ihren Events (4.19), Shots zu ihren Events (4.9); E-Mail-Adressen ihrer Team-Mitglieder (4.8) | [TEST] |

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
| Konto | bis zur Löschung des Kontos [OFFEN: Löschfrist inkl. Backups] |
| Merkliste im Konto [TEST] | bis du das Event entfernst oder das Konto löschst |
| Veranstalterprofil, Ansprechperson, Telefon [TEST] | bis zur Löschung; Ansprechperson und Telefon enden mit dem letzten Besitzer-Konto [OFFEN: Frist für ausgeblendete Profile] |
| Einladungscodes [TEST] | 7 Tage gültig [OFFEN: Löschfrist danach] |
| Shots und Event-Story [TEST] | 24 Stunden sichtbar; Dateien und Einträge werden vom stündlichen Lauf danach gelöscht (spätestens nach etwa 25 Stunden) |
| Veranstalter-Story, Beiträge [TEST] | bis der Veranstalter sie löscht oder das Team sie entfernt |
| Nicht mehr verwendete Bilder von Veranstaltern [TEST] | frühestens 24 Stunden nach dem Hochladen gelöscht |
| Meldungen [TEST] | bis der gemeldete Inhalt oder dein Konto gelöscht wird [OFFEN: feste Frist] |
| Zählung [TEST] | Prüfwerte in der Regel höchstens zwei Tage [OFFEN: fester Löschlauf]; Tagessummen pro Event ohne Personenbezug, solange das Event besteht |
| „Fehler melden“ | [OFFEN: z. B. bis zur Bearbeitung plus X Monate] |
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
