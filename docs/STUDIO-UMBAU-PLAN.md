# Spots Studio – Umbau-Plan (Analyse und Entscheidungen)

Stand: 25.11.2026, dritte Runde („einfacher“). Branch `design/studio-einfacher` (die Fassung davor liegt auf `design/studio-umbau`). Auftrag von Noyan und Jacint (beide im Chat, beide haben zugestimmt).

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

## 3. Entscheidungen

| Thema | Entscheidung |
| --- | --- |
| Tabs | **Drei: Events · Zahlen · Profil**, und rechts neben der Tab-Leiste das **＋ als eigener runder Knopf**. (25.11. zuerst fünf: Übersicht · Events · ＋ · Zahlen · Profil. Nach dem Bau zeigten Übersicht und Events fast dasselbe; in der Runde „einfacher“ zusammengelegt.) |
| Name des letzten Tabs | Bleibt **„Profil“** (nicht „Club“). |
| Bearbeiten | **Die Seite ist das Formular.** Eventseite und Veranstalterseite sind im Studio dieselben Seiten, die Gäste sehen. Was man ändern kann, tippt man an; es öffnet sich ein kleines Sheet nur für diesen Teil. Das gilt auch beim Anlegen: Das ＋ öffnet die leere Eventseite mit Platzhaltern. Keine Schritt-Seiten, keine nachgebaute Vorschau. |
| Story posten | **Über das runde Profilbild mit „+“ auf der Eventseite**: „Storys ansehen“ und „Story posten“ (wie bei Instagram). |
| Story in Entdecken | Die dauerhaften Bilder (bleiben, bis man sie löscht). **Dieselbe Geste: das Profilbild mit „+“ im Profil.** (Zuerst „Bilder“ genannt und unten im Profil – Noyan hat sie so nicht gefunden.) |
| Event anlegen | **Nur über das ＋.** Kein zweiter Knopf. |
| Verwalten | Was Gäste nicht sehen (Zahlen, Ausverkauft, Story und Shots ausblenden), steht hinter **„Verwalten“** in der Leiste unten auf der Eventseite. Seltenes (Duplizieren, Zurück auf Entwurf, Absagen) unter **„Mehr“** oben rechts. |
| „Einnahmen“ | Heißt **„Zahlen“**, solange Spots keine Tickets verkauft. Kein leeres „–“. |
| Farbe | **Rosa gehört der einen Hauptaktion** eines Bildschirms (Veröffentlichen, Teilen, das ＋). Stifte und Nebenknöpfe sind neutral. |
| Anrede | Durchgehend **„ihr“**. |
| Backend | Für SQL gilt: erst Datei und lokale Tests, dann Spots-Test, Produktion nur mit ausdrücklicher Freigabe für genau diese Aktion. |

### Wie „Die Seite ist das Formular“ gebaut ist

- Die beiden Gast-Seiten sind in „Aussehen“ und „Daten laden“ getrennt: `EventDetailView` in `src/screens/EventDetailScreen.tsx` und `OrganizerProfileView` in `src/screens/OrganizerProfileScreen.tsx`. Besucher-App und Studio benutzen **dieselbe Ansicht**; für Gäste sieht alles aus wie vorher.
- Das Studio übergibt seine eigenen Daten (auch Entwürfe und noch nicht Gespeichertes) in der Form der Besucher-App (`src/features/studio/guestView.ts`) und schaltet mit `edit` das Antippen ein. Fehlt ein Teil, steht dort ein Platzhalter (`edit.empty`).
- Ein Teil des Events öffnet `EventParts.tsx` (Flyer, Titel, Datum und Uhrzeit, Beschreibung, Tickets, Ort), ein Teil des Profils `ProfileEdit.tsx` (Titelbild; Name, Logo und Adresse; Über uns).
- Gespeichertes Event: „Speichern“ im Sheet speichert sofort. Neues Event: „Übernehmen“ sammelt, gespeichert wird mit „Veröffentlichen“ oder „Als Entwurf“ (`saveEvent.ts`).

## 4. Zielbild

### Tabs

- **Events** (Start): Bis zur Freigabe die Schritte zum Start. Dann die große Karte fürs **nächste Event** (Flyer, Countdown, Status, Profilbild mit „+“, „Noch offen“ – ein Punkt öffnet auf der Eventseite gleich den passenden Teil). Am Abend „Läuft jetzt“ und die Shots von Gästen. Darunter „Weitere“ und „Vergangen“.
- **Zahlen**: oben ein Knopf zur Wahl des Events, dann **ein Satz Erkenntnis** („4 % der Aufrufe führten zu den Tickets. Das ist mehr als bei euren anderen Events.“), der **Trichter**, der Verlauf der letzten 30 Tage, der Vergleich. „Datensparsam gezählt“ zum Aufklappen.
- **Profil**: die Veranstalterseite, wie Gäste sie sehen. Titelbild, Name und „Über uns“ zum Antippen; das Profilbild mit „+“ ist die Story in Entdecken. Darunter nur, was dem Profil noch fehlt. Zahnrad → **Einstellungen** (Team, Ansprechperson, Konto).
- **＋** (eigener Knopf): neues Event.

### Seiten über den Tabs

- **Eventseite** (`/studio/event/[id]`): die Eventseite der Gäste. Antippen ändert einen Teil. Leiste unten: „Verwalten“ und der nächste Schritt („Veröffentlichen“, danach „Teilen“). Nach dem Veröffentlichen: „Euer Event ist live“ mit „Jetzt teilen“.
- **Neues Event** (`/studio/new`, von unten eingeblendet): dieselbe Seite, leer. Platzhalter „Flyer hinzufügen“, „Titel hinzufügen“, „Datum und Uhrzeit wählen“. Ort, Uhrzeiten, Art, Genre und Abendkasse kommen als **Vorgabe vom letzten Event**; das Datum wird als gleicher Wochentag vorgeschlagen. Zum Speichern braucht es Titel und Zeit, zum Veröffentlichen auch einen Flyer. „Schließen“ fragt nach, bevor Eingaben verloren gehen. Duplizieren: `?from=<id>`.
- **Einstellungen** (`/studio/settings`): Team (Einladung über das Teilen-Menü), Ansprechperson, Konto (abmelden, löschen mit Rückfrage).

### Regeln für die Oberfläche

- **Kein Erklärtext als Standard.** Erklärungen nur bei einem Fehler, in leeren Zuständen oder zum Aufklappen.
- **Rückfrage vor allem, was man nicht zurücknehmen kann** (absagen, löschen, Konto löschen, Mitglied entfernen).
- **Tippflächen mindestens 44 Punkt, Schrift mindestens 11 Punkt.**
- **Nach unten ziehen lädt neu** (Events, Zahlen, Profil, Eventseite).
- **Glossar – genau diese Wörter, überall gleich:**

| Wort | Bedeutung |
| --- | --- |
| Event | Eine Veranstaltung. |
| Story | Bilder des Veranstalters zu einem Event, 24 Stunden sichtbar. Posten über das Profilbild mit „+“ am Event. |
| Story in Entdecken | Dauerhafte Bilder des Veranstalters. Gäste sehen sie in Entdecken als Kachel. Profilbild mit „+“ im Profil. |
| Shots | Bilder von Gästen zu einem Event, 24 Stunden sichtbar. |
| Profil | Die öffentliche Seite des Veranstalters in Spots (Veranstalterseite). |
| Veranstalter | Wer Events anlegt (Club, Kollektiv, Reihe). „Club“ nur, wenn wirklich ein Club gemeint ist. |
| Tab-Leiste, Tabs | Die Leiste unten und ihre Punkte. |

- Das „SPOTS STUDIO“-Abzeichen steht nur auf dem Start-Tab. Beim ersten Öffnen erklärt ein einmaliges Willkommen die drei Dinge: Event anlegen, Story posten, Zahlen sehen.

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
8. **Hilfe und Kontakt, Rechtliches.** Bei „Abgelehnt“ und „Gesperrt“ steht „meldet euch beim Spots-Team“, aber es gibt keinen Weg dorthin. Geplant: „Hilfe & Kontakt“ in den Einstellungen und ein Knopf an der Stelle, dazu Impressum und Datenschutz. Braucht eine **Kontakt-Mail und die Domain** – beides ist auch auf der Website noch ein Platzhalter (`site.contactEmail`, `spots.example`). Nicht gebaut, um keine erfundene Adresse zu zeigen.
9. **Entwürfe löschen.** Im Studio gibt es nur „Event absagen“; ein Entwurf bleibt danach als „Abgesagt“ in der Liste. Die Datenbank erlaubt Veranstaltern bei Events nur Anlegen und Ändern, kein Löschen (SQL 15: `spots_event_insert`, `spots_event_edit`). Wunsch (Noyan): Entwürfe, die nie veröffentlicht waren, endgültig löschen. Braucht: Recht und Regel zum Löschen eigener, nie veröffentlichter Events samt ihrer Ticketarten. Danach in der App: „Entwurf löschen“ mit Rückfrage auf der Eventseite unter „Nur für euch“.
10. **Später (Wettbewerb):** Gästeliste und Einlass-Scan (RA, Shotgun), Promoter-Links mit Auswertung (Shotgun), Ticketverkauf über Spots.

## 8. Quellen des Vergleichs

- Luma – Creating an Event: https://help.luma.com/p/creating-an-event
- Eventbrite Organizer Redesign (Fallstudie): https://nicolasmarciano.pages.dev/eventbrite-redesign/
- Zapier – How to use Eventbrite: https://zapier.com/blog/how-to-use-eventbrite
- Posh – Creating a new event: https://support.posh.vip/en/articles/10723693-creating-a-new-event
- Posh – Explore your events: https://support.posh.vip/en/articles/10723757-explore-your-events
- Posh – New Organizer Dashboard: https://university.posh.vip/university/post/meet-poshs-new-organizer-dashboard
- Shotgun – Promoters Management: https://support-pro.shotgun.live/hc/en-us/articles/13970546627858--Promoters-Management
- RA Pro: https://pro.ra.co · RA – Submitting Events: https://support.ra.co/article/12-submitting-events
