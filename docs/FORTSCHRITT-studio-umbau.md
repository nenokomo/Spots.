# Fortschritt – Spots Studio Umbau

Branch: `design/studio-umbau` (von `main`, 25.11.2026, gepusht am 25.11., noch kein Pull Request). Plan und Begründung: [STUDIO-UMBAU-PLAN.md](STUDIO-UMBAU-PLAN.md).
Diese Datei wird nach jedem Teilschritt aktualisiert und mit committet. Bei „mach weiter“: zuerst diese Datei lesen, dann mit `git status` und `git log` prüfen, was wirklich fertig ist.

Betrifft Noyans Design (`src/features/studio/`, `src/components/Icon.tsx`, `src/screens/OrganizerProfileScreen.tsx`) und – mit Zustimmung von Jacint am 25.11. – Jacints Bereich, wo vorhandene Datenaufrufe im Studio anders zusammengesetzt werden (`tests/`, Ticketarten beim Speichern eines Events). Keine neue SQL, keine neuen Datenbank-Funktionen.

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
| Profil bearbeiten | `PageEditScreen.tsx` (`/studio/page`) | Logo, **Titelbild**, Name, **Motto**, Beschreibung, Adresse, Links. Titelbild und Motto erscheinen jetzt auch auf der öffentlichen Veranstalterseite. |
| Einstellungen | `SettingsScreen.tsx` (`/studio/settings`), `AccountCard.tsx` | Ansprechperson, Abmelden, Konto löschen mit Rückfrage. |
| Bausteine | `ui.tsx`, `Icon.tsx` | Sheet, Rückfrage, Checkliste, Menüzeile, Chip, leerer Zustand, Fortschritt, Fehler am Feld; zwölf neue Icons. Das „SPOTS STUDIO“-Abzeichen steht nur noch auf der Übersicht. |

  Entfernt: `StoryScreen`, `RevenueScreen`, `ClubScreen`, `EventEditorScreen`, `TicketsCard`, `EventShotsCard` (ihre Aufgaben stehen in der Tabelle oben).

## Geprüft

- Typecheck und Expo-Lint ohne Fehler.
- `node --test tests/*.test.cjs`: 110 bestanden, 0 fehlgeschlagen, 29 SQL-Tests übersprungen (auf diesem Rechner ist kein PGlite eingerichtet; an der SQL wurde nichts geändert). Neu: `tests/studio-app.test.cjs` (9 Tests: Startwerte, Prüfung pro Schritt, Tickets, Checkliste, Countdown, Aufbau der Reiter).
- Probe-Bündel für iOS und Web gebaut (`expo export`), beide ohne Fehler.
- **Nicht geprüft: die Oberfläche selbst.** Kein Handy-Test, keine Vorschau im Browser (dafür braucht es ein angemeldetes Veranstalter-Konto). Vor allem ansehen: Datums- und Zeitauswahl auf iOS und Android, das ＋ in der Leiste, Story posten mit der Kamera, das Sheet über der Tastatur.

## Offen

- Handy-Test durch Noyan (Liste oben).
- Alles aus dem Plan, Abschnitt 7 („Daten nötig von Jacint“): Vormerken zur Veröffentlichung, Push-Benachrichtigungen, Veranstalter ohne festen Ort, Schutz für private Adressen, Teilen und Einladen mit echtem Link, Verkaufszahlen.
- Registrieren-Seite: Dort steht weiter „Name des Clubs“ (`OrganizerSignupFields.tsx`, gemeinsam mit der Startseite). Wortwahl und Design dieser Seite sind ein eigener Schritt.
- Beiträge im Studio anlegen (Daten sind da, Oberfläche fehlt weiter).
