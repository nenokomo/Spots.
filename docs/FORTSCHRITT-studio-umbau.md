# Fortschritt – Spots Studio Umbau

Branch: **`design/studio-einfacher`** (Schritt 3, lokal, nicht gepusht). Die Fassung davor (Schritte 0–2) liegt auf `design/studio-umbau` – dorthin zurück, falls Schritt 3 nicht gefällt. Plan und Begründung: [STUDIO-UMBAU-PLAN.md](STUDIO-UMBAU-PLAN.md).
Diese Datei wird nach jedem Teilschritt aktualisiert und mit committet. Bei „mach weiter“: zuerst diese Datei lesen, dann mit `git status` und `git log` prüfen, was wirklich fertig ist.

Betrifft Noyans Design (`src/features/studio/`, `src/components/Icon.tsx`, `src/screens/EventDetailScreen.tsx`, `src/screens/OrganizerProfileScreen.tsx`) und – mit Zustimmung von Jacint am 25.11. – Jacints Bereich, wo vorhandene Datenaufrufe im Studio anders zusammengesetzt werden (`tests/`, Ticketarten beim Speichern eines Events). Keine neue SQL, keine neuen Datenbank-Funktionen.

## Fertig

- **Schritt 0 – Plan festgelegt**: [STUDIO-UMBAU-PLAN.md](STUDIO-UMBAU-PLAN.md) mit Analyse, Entscheidungen, Zielbild und den Punkten für Jacint.
- **Schritt 1 – Umbau der Oberfläche** (25.11.):

| Teil | Wo | Was |
| --- | --- | --- |
| Reiter | `StudioTabsLayout.tsx`, `src/app/studio/(tabs)/` | Übersicht · Events · ＋ · Zahlen · Profil. Das ＋ in der Mitte öffnet „Neues Event“. Der Reiter „Story“ ist weg. |
| Übersicht | `OverviewScreen.tsx` | Bis zur Freigabe die Schritte zum Start (mit „Antrag stellen“). Karte fürs nächste Event: Flyer, Countdown, Status, Profilbild mit „+“, „Noch offen“ (führt zum passenden Schritt), Teilen, als Gast ansehen. Läuft das Event: „Läuft jetzt“ und die Shots von Gästen. Darunter die letzten 7 Tage. |
| Events | `EventsScreen.tsx`, `EventCard.tsx` | Liste Kommend/Vergangen, Tippen öffnet die Eventseite. |
| Eventseite | `EventScreen.tsx` (`/studio/event/[id]`) | Profilbild mit „+“, Zeit, Ort, Status; „Veröffentlichen“; was noch offen ist; Bearbeiten, Teilen, Duplizieren, als Gast ansehen; Trichter; Tickets mit „Ausverkauft“; Story und Shots der letzten 24 Stunden (ausblenden); Absagen und „Zurück auf Entwurf“ mit Rückfrage. |
| Event anlegen | `EventWizardScreen.tsx` (`/studio/edit/[id]`), `eventForm.ts` | Vier Schritte und Vorschau: Event (Flyer zuerst, Genre als Auswahl) → Wann → Wo („Bei euch“ vorgewählt) → Tickets (Online / Abendkasse / Eintritt frei, Preise) → Vorschau mit „Veröffentlichen“ oder „Als Entwurf speichern“. Fehler am Feld, Zurück-Pfeil oben links, Rückfrage bei ungespeicherten Eingaben, kein Wischen zurück. Bearbeiten: jeder Schritt direkt, „Speichern“ überall. Duplizieren: `?from=<id>`. |
| Datum und Uhrzeit | `DateTimeField.tsx` (+ `.web.tsx`) | Auswahl des Systems statt Texteingabe (neues Paket `@react-native-community/datetimepicker`, in Expo Go enthalten). „Am nächsten Tag“ erscheint, wenn das Ende nach Mitternacht liegt. |
| Story | `Story.tsx` | Rundes Profilbild mit „+“ auf der Eventseite und der Übersicht. Tippen: „Storys ansehen“ / „Story posten“ (Kamera oder Mediathek, Vorschau, dann „Posten“). Einziger Ort zum Posten. |
| Zahlen | `StatsScreen.tsx`, `Funnel.tsx` | Pro Event (oder alle): Trichter Gesehen → Gemerkt → Zu den Tickets mit Quote, Shots, Verlauf der letzten 30 Tage (Tippen auf einen Tag zeigt den Wert), Vergleich der Events. „Datensparsam gezählt“ zum Aufklappen. Kein leeres „–“, keine Beispielzahlen mehr. |
| Profil | `ProfileScreen.tsx`, `Gallery.tsx`, `TeamCard.tsx` | Vorschau des öffentlichen Profils, „Bearbeiten“, „Zu x % fertig“, „Bilder“ (früher Story → Entdecken), Team mit Einladung über das Teilen-Menü. Zahnrad → Einstellungen. |
| Profil bearbeiten (in Schritt 2 durch Stifte ersetzt) | früher `PageEditScreen.tsx` | Logo, **Titelbild**, Name, **Motto**, Beschreibung, Adresse, Links. Titelbild und Motto erscheinen jetzt auch auf der öffentlichen Veranstalterseite. |
| Einstellungen | `SettingsScreen.tsx` (`/studio/settings`), `AccountCard.tsx` | Ansprechperson, Abmelden, Konto löschen mit Rückfrage. |
| Bausteine | `ui.tsx`, `Icon.tsx` | Sheet, Rückfrage, Checkliste, Menüzeile, Chip, leerer Zustand, Fortschritt, Fehler am Feld; zwölf neue Icons. Das „SPOTS STUDIO“-Abzeichen steht nur noch auf der Übersicht. |

  Entfernt: `StoryScreen`, `RevenueScreen`, `ClubScreen`, `EventEditorScreen`, `TicketsCard`, `EventShotsCard` (ihre Aufgaben stehen in der Tabelle oben).

- **Schritt 2 – Bearbeiten in der Gast-Ansicht** (nach Noyans erstem Test):
  - **Eventseite im Studio = Eventseite der Gäste** mit Stiften (`EventScreen.tsx` zeigt `EventDetailView`). Leiste unten: Veröffentlichen / Live in Spots und Teilen. Darunter „Nur für euch“.
  - **Tab Profil = Veranstalterseite der Gäste** mit Stiften (`ProfileScreen.tsx` zeigt `OrganizerProfileView`). Ein Stift öffnet nur diesen Teil (`ProfileEdit.tsx`: Titelbild, Logo, Name und Adresse, Über uns). Die Seite `/studio/page` (`PageEditScreen`) gibt es nicht mehr.
  - **Vorschau beim Anlegen = echte Eventseite**, schon vor dem Speichern (`EventWizardScreen.tsx`).
  - **Story in Entdecken** (vorher „Bilder“): oben dieselbe Kachel wie in Entdecken, Tippen zeigt die Story wie ein Gast (`Gallery.tsx`).
  - **Event anlegen nur über das ＋**: kein zweiter Knopf in der Übersicht.
  - Dafür getrennt: `src/screens/EventDetailScreen.tsx` und `OrganizerProfileScreen.tsx` in Ansicht (`…View`, mit optionalem `edit`) und Seite (lädt die Daten). Für Gäste unverändert. Daten des Studios in der Form der Besucher-App: `guestView.ts`.

- **Schritt 3 – einfacher** (Noyan: „mach alles“, 14 Vorschläge aus der kritischen Durchsicht):
  - **Die Seite ist das Formular.** Das ＋ öffnet die leere Eventseite mit Platzhaltern (`/studio/new`, von unten). Antippen öffnet ein Sheet nur für diesen Teil (`EventParts.tsx`) – beim Anlegen wie beim Bearbeiten. Die Schritt-Seiten (`EventWizardScreen`, `/studio/edit/[id]`) gibt es nicht mehr. Speichern: `saveEvent.ts`.
  - **Drei Tabs und ein eigenes ＋**: Events · Zahlen · Profil. Übersicht und Events sind zusammengelegt (`EventsScreen.tsx`); `OverviewScreen` entfällt.
  - **„Verwalten“ und „Mehr“** auf der Eventseite statt „Nur für euch“ ganz unten. Rückfragen im selben Sheet.
  - **Story in Entdecken am Profilbild mit „+“** im Profil (`ExploreStory.tsx`, ersetzt `Gallery.tsx`); Logo beim Namen; Team in den Einstellungen.
  - **Vorgaben vom letzten Event** (Uhrzeiten, Ort, Art, Genre, Abendkasse) und Datumsvorschlag (`freshForm`, `suggestedDate`).
  - **„Euer Event ist live“** nach dem Veröffentlichen, mit „Jetzt teilen“.
  - **Feinschliff:** Aktualisieren durch Ziehen (Events, Zahlen, Profil, Eventseite); Stifte neutral, ganze Bereiche tippbar; Tippflächen 44; Schrift mindestens 11; einmaliges Willkommen (`Welcome.tsx`); in Zahlen ein Auswahlknopf und ein Satz Erkenntnis (`ticketInsight`).
  - **Nicht gebaut:** „Hilfe & Kontakt“ und Rechtliches – es gibt noch keine Kontakt-Mail und keine Domain (Plan, Abschnitt 7, Punkt 8).

## Geprüft

- Typecheck und Expo-Lint ohne Fehler.
- `node --test tests/*.test.cjs`: 116 bestanden, 0 fehlgeschlagen, 29 SQL-Tests übersprungen (auf diesem Rechner ist kein PGlite eingerichtet; an der SQL wurde nichts geändert). `tests/studio-app.test.cjs` hat 15 Tests (Formular-Logik, Vorgaben, was fehlt, Platzhalter, Erkenntnis-Satz, Aufbau).
- Probe-Bündel für iOS und Web gebaut (`expo export`), beide ohne Fehler.
- **Nicht geprüft: die Oberfläche selbst.** Kein Handy-Test durch die KI. Vor allem ansehen: das ＋ neben der Leiste; Event anlegen auf der leeren Seite; die Sheets pro Teil (Datum und Uhrzeit auf iOS in der Zeile, auf Android der Dialog); „Verwalten“ und „Mehr“; Story in Entdecken am Profilbild; ob Eventseite und Veranstalterseite für **Gäste** unverändert aussehen.

## Offen

- Handy-Test durch Noyan (Liste oben). Erster Test: Rückmeldungen in Schritt 2 umgesetzt.
- Alles aus dem Plan, Abschnitt 7 („Daten nötig von Jacint“): Vormerken zur Veröffentlichung, Push-Benachrichtigungen, Veranstalter ohne festen Ort, Schutz für private Adressen, Teilen und Einladen mit echtem Link, Verkaufszahlen.
- Entwürfe löschen geht noch nicht: Die Datenbank erlaubt Veranstaltern kein Löschen von Events (Plan, Abschnitt 7, Punkt 8 – Daten nötig von Jacint).
- Registrieren-Seite: Dort steht weiter „Name des Clubs“ (`OrganizerSignupFields.tsx`, gemeinsam mit der Startseite). Wortwahl und Design dieser Seite sind ein eigener Schritt.
- Beiträge im Studio anlegen (Daten sind da, Oberfläche fehlt weiter).
