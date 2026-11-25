# Spots Studio – Umbau-Plan (Analyse und Entscheidungen)

Stand: 25.11.2026. Branch `design/studio-umbau`. Auftrag von Noyan und Jacint (beide im Chat, beide haben zugestimmt).

**Wozu diese Datei?** Sie hält fest, **warum** das Studio umgebaut wird und **wie es am Ende aussehen soll**. Wer hier weiterarbeitet (Mensch oder KI), liest zuerst diese Datei und dann [FORTSCHRITT-studio-umbau.md](FORTSCHRITT-studio-umbau.md) (was davon schon fertig ist). Der Plan ändert sich nur, wenn Noyan oder Jacint etwas anders entscheiden – dann unten bei „Entscheidungen“ eintragen.

## 1. Ausgangslage

Am 25.11. hat Noyan das Studio so beschrieben: „Wenn ein Veranstalter hier draufgeht, versteht er nichts.“ Beispiele: Die Startseite ist nur eine Liste „Kommend/Vergangen“, „Neues Event“ ist ein kleiner Knopf oben rechts, die Story-Seite fragt „Wo soll es erscheinen? Entdecken oder Eventseite“ (kennt kein Veranstalter), „Einnahmen“ zeigt keine Einnahmen, das Profil ist eine Formular-Wand, überall zu viel Text.

Daraufhin wurde das ganze Studio im Code gelesen und mit Veranstalter-Apps verglichen (Eventbrite, Luma, Posh, Shotgun, RA Pro).

## 2. Die Kernursache

Das Studio war nach der **Datenbank** gebaut, nicht nach den **Aufgaben eines Veranstalters**. Die vier Reiter Events, Story, Einnahmen und Profil waren praktisch die vier Tabellen. Ein Veranstalter denkt aber in Momenten:

1. „Ich will mein Event rausbringen.“ (jede Woche)
2. „Ich will, dass Leute kommen.“ (teilen, Story)
3. „Heute ist der Abend.“ (live posten, Shots im Blick behalten)
4. „Wie lief's?“ (Zahlen)
5. Ganz selten: Profil, Team, Konto.

Vorher bekamen alle fünf Momente gleich viel Gewicht, und der wichtigste (1) war ein kleiner Knopf. Dazu kam: Das Prinzip „jede Aktion nur an einer Stelle“ ist richtig, wurde aber so umgesetzt, dass Zusammengehöriges getrennt war (ein Foto zum Event postete man nicht am Event, sondern in einem anderen Reiter). **Die eine Stelle muss dort sein, wo man sie erwartet.**

## 3. Entscheidungen (25.11., Noyan und Jacint)

| Thema | Entscheidung |
| --- | --- |
| Reiter | **Fünf: Übersicht · Events · ＋ · Zahlen · Profil.** Bewusst so gewählt, obwohl am 23.11. eine ähnliche Struktur verworfen wurde. Unterschied zu damals: kein eigener Story-Reiter, keine Extra-Seite für Zahlen, keine Banner. |
| Name des letzten Reiters | Bleibt **„Profil“** (nicht „Club“). |
| Story posten | **Über das runde Profilbild auf der Eventseite.** Das Bild trägt ein „+“, damit man sieht, dass man es antippen kann. Tippen öffnet zwei Punkte: **„Storys ansehen“** und **„Story posten“** (wie bei Instagram). |
| ＋ in der Mitte | Legt ein **neues Event** an (die Hauptfunktion). Story posten gehört zum Profilbild am Event. |
| Dauerhafte Bilder | Heißen **„Bilder“** und stehen im Reiter Profil (früher „Story → Entdecken“). „Story“ heißt nur noch, was nach 24 Stunden verschwindet. |
| „Einnahmen“ | Heißt **„Zahlen“**, solange Spots keine Tickets verkauft. Kein leeres „–“ mehr. |
| Anrede | Durchgehend **„ihr“**. |
| Backend | Jacint ist dabei; Änderungen in seinem Bereich sind erlaubt. Für SQL gilt weiter: erst Datei und lokale Tests, dann Spots-Test, Produktion nur mit ausdrücklicher Freigabe für genau diese Aktion. |

## 4. Zielbild

### Reiter

- **Übersicht** (Start): Bis zur Freigabe die Schritte zum Start. Dann die große Karte fürs **nächste Event**: Flyer, Countdown, Status, **Checkliste** (Flyer, Beschreibung, Tickets, veröffentlicht – fehlende Punkte antippen), rundes Profilbild mit „+“ für die Story, „Teilen“ und „Ansehen wie ein Gast“. Am Abend des Events Live-Modus („Läuft jetzt“, neue Shots von Gästen). Darunter ein kurzer Zahlen-Streifen der letzten 7 Tage.
- **Events**: Liste „Kommend / Vergangen“. Tippen öffnet die Eventseite.
- **＋**: neues Event (Schritt-für-Schritt).
- **Zahlen**: pro Event ein **Trichter** (gesehen → gemerkt → zu den Tickets), Verlauf der letzten 30 Tage, Vergleich der Events. Hinweis „datensparsam gezählt“ als kurzes Abzeichen statt Fußnote.
- **Profil**: die öffentliche Seite als **Vorschau** mit „Bearbeiten“, Fortschritt („zu 60 % fertig“), **Bilder**, **Team** (Einladung über das Teilen-Menü). Zahnrad oben rechts → **Einstellungen** (Ansprechperson, Konto).

### Seiten über den Reitern

- **Eventseite** (`/studio/event/[id]`): alles zu einem Event. Oben das runde Profilbild mit „+“ (Story), Titel, Zeit, Ort, Status. Dann Checkliste, „Veröffentlichen“, Zahlen dieses Events, Tickets (ausverkauft schalten), Bilder der letzten 24 Stunden (Story und Shots, ausblenden), Aktionen (Bearbeiten, Teilen, Duplizieren, Ansehen wie ein Gast), Absagen mit Rückfrage.
- **Event anlegen / bearbeiten** (`/studio/edit/[id]`): vier kurze Schritte und eine Vorschau.
  1. **Event** – Flyer zuerst, Titel, Art, Genre (Auswahl wie die Radar-Filter), Beschreibung.
  2. **Wann** – Datums- und Zeitauswahl statt Texteingabe; Ende nach Mitternacht wird als nächster Tag angezeigt.
  3. **Wo** – „Bei euch“ ist vorgewählt, sonst anderer Ort (suchen oder Adresse).
  4. **Tickets** – ein Abschnitt: Online-Tickets (Link) / Abendkasse / Eintritt frei, darunter optional Preise.
  5. **Vorschau** – „So sehen Gäste das Event“, dann **„Veröffentlichen“** oder „Als Entwurf speichern“.
  Zurück-Pfeil oben links, Warnung bei ungespeicherten Änderungen, Fehler direkt am Feld. Ein früheres Event kann als Vorlage dienen (Duplizieren).
- **Profil bearbeiten** (`/studio/page`): Logo, Titelbild, Name, Motto, Beschreibung, Adresse, Links.
- **Einstellungen** (`/studio/settings`): Ansprechperson, Konto (abmelden, löschen mit Rückfrage).

### Regeln für die Oberfläche

- **Kein Erklärtext als Standard.** Ein guter Screen braucht keinen. Erklärungen nur bei einem Fehler, in leeren Zuständen oder hinter einem ⓘ.
- **Rückfrage vor allem, was man nicht zurücknehmen kann** (absagen, löschen, Konto löschen, Mitglied entfernen).
- **Glossar – genau diese Wörter, überall gleich:**

| Wort | Bedeutung |
| --- | --- |
| Event | Eine Veranstaltung. |
| Story | Bilder des Veranstalters zu einem Event, 24 Stunden sichtbar. |
| Shots | Bilder von Gästen zu einem Event, 24 Stunden sichtbar. |
| Bilder | Dauerhafte Bilder im Profil (erscheinen in Entdecken). |
| Profil | Die öffentliche Seite des Veranstalters in Spots. |
| Veranstalter | Wer Events anlegt (Club, Kollektiv, Reihe). „Club“ nur, wenn wirklich ein Club gemeint ist. |

- Das „SPOTS STUDIO“-Abzeichen steht nur noch auf der Übersicht, nicht mehr auf jeder Seite.

## 5. Die Analyse im Einzelnen (Befund → Lösung)

### Startseite
Befund: eine Liste beantwortet keine Frage. Der Veranstalter will wissen: Was steht als Nächstes an, ist es fertig, läuft es?
Lösung: Übersicht mit der Karte fürs nächste Event und Checkliste (Posh teilt seine Übersicht genauso in live, Entwurf, vergangen). „Neues Event“ als großes ＋ in der Mitte der Leiste.

### Event anlegen
| Vorher | Problem | Jetzt |
| --- | --- | --- |
| Datum als Text „TT.MM.JJJJ“, Zeiten als „HH:MM“ | fehleranfällig, braucht einen Erklärsatz | Datums- und Zeitauswahl; „Ende: Sa., 05:00 Uhr“ wird angezeigt |
| Flyer an dritter Stelle | im Nachtleben ist der Flyer das Event | Flyer zuerst |
| Genre als freier Text | „Tekkno“ passt nicht zu den Radar-Filtern, Events fallen aus den Filtern | Auswahl aus derselben Liste wie die Filter, „Anderes“ bleibt möglich |
| Ticket-Link und zusätzlich Ticketarten mit eigenem Link, erst nach dem Anlegen | zwei Wege zum selben Ziel | ein Abschnitt Tickets, auch schon beim Anlegen |
| drei Knöpfe zwischen eigener Adresse und „Spots-Adressbuch“, Hinweis auf OpenStreetMap | Technik-Sprache | „Bei euch“ vorgewählt, sonst „Anderer Ort“ |
| Schalter „Live in Spots“ und Knopf „Speichern“ | unklar, ob Speichern veröffentlicht | „Veröffentlichen“ und „Als Entwurf speichern“ |
| „Event absagen“ sofort | ein Fehltipp sagt das Event ab | Rückfrage |
| „Zurück“ als Text oben rechts, Eingaben gehen ohne Warnung verloren | unüblich, riskant | Pfeil oben links, Warnung |

Luma arbeitet mit wenigen Feldern und Live-Vorschau; ein Eventbrite-Redesign-Fall kritisiert genau das lange Formular.

### Story
Befund: Unter „Story“ steckten zwei verschiedene Dinge – Bilder für Entdecken, die **bleiben, bis man löscht**, und Bilder für die Eventseite, die 24 Stunden bleiben. Jeder kennt „Story“ als 24-Stunden-Inhalt.
Lösung: Story = nur 24 Stunden, immer am Event, über das Profilbild mit „+“. Dauerhafte Bilder heißen „Bilder“ und gehören ins Profil. Kamera und Mediathek stehen beide zur Wahl.

### Zahlen
Befund: riesige Zahl „–“ mit „Verkaufszahlen gibt es noch nicht“. Der Reiter versprach etwas, das es nicht gibt.
Lösung: mit dem anfangen, was es gibt, als Trichter mit Quote; pro Event statt Gesamtsumme; Verlauf über die Zeit. Einnahmen kommen wieder, sobald es Verkaufszahlen gibt (siehe Abschnitt 7).

### Profil
Befund: vier Klappen; „Seite bearbeiten“ bei neuen Clubs automatisch offen, also sofort neun Felder. Der 12-stellige Team-Code mit Anleitung ist zu kompliziert.
Lösung: Vorschau der öffentlichen Seite mit „Bearbeiten“, Fortschritt statt Formular, Einladung über das Teilen-Menü, Einstellungen hinter dem Zahnrad.

### Sprache
Befund: fast jede Karte hatte einen grauen Erklärsatz („Über seine Adresse öffentlich abrufbar“, „über OpenStreetMap“). Drei Wörter für den Veranstalter, fünf für Bilder, „ihr“ und „du“ gemischt.
Lösung: Erklärtexte gestrichen, Glossar (oben), durchgehend „ihr“.

## 6. Reihenfolge

**Schnell:** ＋ in der Leiste · Rückfragen · „Zahlen“ mit Trichter · Texte und Glossar · Datums- und Zeitauswahl · Zurück-Pfeil und Warnung.
**Mittel:** Übersicht · Event anlegen in Schritten mit Vorschau · Story am Event, Bilder im Profil · Profil als Vorschau, Einstellungen · Genre-Auswahl.
**Größer (mit Jacint):** Event duplizieren und teilen · Benachrichtigungen · Veranstalter ohne festen Ort · Schutz für private Adressen.

Was davon fertig ist, steht in [FORTSCHRITT-studio-umbau.md](FORTSCHRITT-studio-umbau.md).

## 7. Daten nötig von Jacint

Diese Punkte gehen nicht allein in der Oberfläche. Die App ist so gebaut, dass sie ohne sie funktioniert.

1. **Vormerken zur Veröffentlichung.** Vor der Freigabe kann ein Event nicht veröffentlicht werden (Datenbank-Regel). Wunsch: „Geht automatisch live, sobald ihr freigegeben seid.“ Braucht eine Spalte am Event (z. B. `publish_when_approved`) und einen Schritt in der Freigabe-Funktion.
2. **Benachrichtigungen (Push).** „Ihr seid freigegeben“, „Neue Shots bei eurem Event“, „Ein Bild wurde gemeldet“. Braucht: Development Build (`expo-notifications` läuft nicht in Expo Go), Tabelle für Geräte-Token, eine Edge Function zum Senden und die Zugangsdaten von Apple und Google (Release-Grundlagen).
3. **Veranstalter ohne festen Ort.** Registrierung und Profil verlangen Straße, Hausnummer und PLZ (SQL 28: Prüfung in `spots_register_organizer`). Kollektive und Open-Air-Crews haben keinen Ort. Braucht: Adresse freiwillig (nur Stadt Pflicht), angepasste Prüfung in SQL und in `signup.ts`.
4. **Schutz für private Adressen.** Jedes Event verlangt eine volle Adresse, die öffentlich auf der Eventseite steht. Wunsch: „Adresse erst kurz vorher zeigen“ oder „nur Stadtteil“. Braucht: Spalte am Event und eine Regel in der Datenbank, die die Adresse wirklich zurückhält (nur in der App ausblenden wäre kein Schutz).
5. **Teilen mit Link.** Events aus dem Studio haben keine Web-Adresse. „Teilen“ schickt deshalb Titel, Zeit, Ort und den Ticket-Link als Text. Für einen echten Link braucht es eine Event-Seite auf der Website und das App-Schema `spots://` (Release-Grundlagen). Danach auch: Flyer direkt in die Instagram-Story.
6. **Einladung per Link.** Das Team wird jetzt über das Teilen-Menü eingeladen (Text mit Code). Ein Link, der die App öffnet und den Code einträgt, braucht dasselbe wie Punkt 5.
7. **Verkaufszahlen** (wie bisher offen): verkaufte Tickets und Einnahmen pro Event. Erst dann kommt „Einnahmen“ zurück in den Reiter Zahlen.
8. **Später (Wettbewerb):** Gästeliste und Einlass-Scan (RA, Shotgun), Promoter-Links mit Auswertung (Shotgun), Ticketverkauf über Spots.

## 8. Quellen des Vergleichs

- Luma – Creating an Event: https://help.luma.com/p/creating-an-event
- Eventbrite Organizer Redesign (Fallstudie): https://nicolasmarciano.pages.dev/eventbrite-redesign/
- Zapier – How to use Eventbrite: https://zapier.com/blog/how-to-use-eventbrite
- Posh – Creating a new event: https://support.posh.vip/en/articles/10723693-creating-a-new-event
- Posh – Explore your events: https://support.posh.vip/en/articles/10723757-explore-your-events
- Posh – New Organizer Dashboard: https://university.posh.vip/university/post/meet-poshs-new-organizer-dashboard
- Shotgun – Promoters Management: https://support-pro.shotgun.live/hc/en-us/articles/13970546627858--Promoters-Management
- RA Pro: https://pro.ra.co · RA – Submitting Events: https://support.ra.co/article/12-submitting-events
