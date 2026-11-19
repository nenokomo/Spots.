# Fortschritt – Spots Studio Design (Noyan)

Stand: 19.11.2026. Branch `design/studio` (von `design/feinschliff`, enthält aktuelles `main`). Erste Runde umgesetzt, siehe unten.

## Ausgangslage

- Studio heute: Übersicht · Events · Statistik · Club, eigener Look „Backstage“ (Graphit, Neon-Lime) in `src/features/studio/theme.ts`.
- Noyan ist mit Design und Struktur nicht zufrieden → komplett neu.
- In `main` (noch nicht in `design/feinschliff`): Studio-Seite „Entdecken-Story“ (`StoryScreen.tsx`, Bilder posten/löschen, optional Text und Event) und „Event-Story“ im Event-Editor (Jacint).

## Vorschläge

1. **Umsatz:** Spots verkauft keine Tickets selbst (Kauf beim Anbieter), daher keine Umsatzzahlen. Wege (Jacints Backend, große Entscheidung): eigener Verkauf (z. B. Stripe) oder Umsätze vom Anbieter abrufen. Bis dahin: Bereich „Umsatz & Tickets“ gestalten, ehrlich nur Ticket-Klicks + Hinweis. Keine erfundenen Zahlen.
2. **Storys:** Posten gibt es schon (Jacint, siehe oben). Design: großer „+“-Knopf mittig in der Tab-Leiste (Story · Event · Beitrag); an Event-Tagen oben „Heute Nacht: Story posten“.
3. **Neue Tabs:** Heute · Events · + · Zahlen · Profil.
   - Heute: Event von heute/nächstes, Live-Status, Aufgaben („Flyer fehlt“, „Kein Ticket-Link“), Freigabe nur bis zur Freigabe.
   - Events: Liste/Kalender, Entwürfe getrennt, Event duplizieren.
   - Zahlen: pro Event mit Verlauf und Trend, später Umsatz.
   - Profil: Vorschau der Besucherseite, bearbeiten, Beiträge verwalten, Konto.
4. **Editor:** Datums-/Zeitauswahl statt Textfeldern, Schritte (Basis → Ort → Flyer → Tickets → Veröffentlichen), Vorschau „So sieht dein Event in Spots aus“.
5. **Look:** Spots-Familie (dunkel, Rosa/Orchidee) mit eigener Kennung („STUDIO“-Abzeichen) statt fremdem Lime-Look. Status einheitlich: Entwurf grau, In Prüfung gelb, Live rosa, Abgesagt rot. Leere Zustände mit nächstem Schritt.

## Daten nötig von Jacint

- Umsatz/Ticketverkauf (Entscheidung offen).
- Beiträge im Studio anlegen; Ticketarten mit Preisen; Verlauf der Statistik über die Zeit; Titelbild und Motto fürs Profil.

## Umgesetzt (19.11., Runde 1)

- **Look:** Spots-Familie (`studio/theme.ts`): gleicher Hintergrund mit Pflaumen-Verlauf, Rosa als Akzent, gefüllte Knöpfe im Orchidee-Verlauf, Neon-Abschnittstitel, „SPOTS STUDIO“-Abzeichen. Lime entfernt (Namen `lime*` → `accent`/`onAccent`/`accentSoft`). Status-Pills mit Punkt: Entwurf grau, In Prüfung/Verschoben gelb, Live rosa leuchtend, Abgesagt rot.
- **Tabs:** Heute · Events · + · Zahlen · Profil als schwebende Glas-Kapsel wie in der Besucher-App. „+“ (neue Route `studio/(tabs)/create.tsx`, nie angezeigt) öffnet die Auswahl: Story in Entdecken, Neues Event, Event-Story (nächstes Event), Beitrag („Kommt bald“).
- **Heute:** Logo oben rechts (→ Profil), Freigabe-Stand nur bis zur Freigabe, großes Kärtchen fürs nächste Event (Flyer, „Heute Nacht“/„Läuft gerade“, Event-Story posten, Bearbeiten), 4 Kennzahlen, „Zu erledigen“ (Flyer fehlt, kein Ticket-Link, noch nicht live), Entdecken-Story mit Story-Ring, „Danach“.
- **Events:** Umschalter mit Anzahl, Datumsfeld in Rosa, Platzhalter „Flyer“ wenn keiner da ist, leerer Zustand mit „Event anlegen“.
- **Editor:** Event-Story ganz oben, dann Was & wann → Wo → Flyer & Tickets → Beschreibung → Veröffentlichen.
- **Zahlen:** Kennzahlen mit Symbolen, „Umsatz & Tickets“ ehrlich nur mit Ticket-Klicks und Hinweis, Balken im Verlauf, „SHOTS“ statt „Snaps“.
- **Profil:** Visitenkarte (Logo, Name, Status) mit „So sehen euch Gäste“, Beiträge-Hinweis „bald“, Ansprechperson als privat markiert.
- Datenlogik unverändert (StudioContext, organizerApi, Speichern, Freigabe). Geprüft: Typecheck, Lint. Nicht auf dem Handy geprüft.

## Drei Bereiche klar getrennt (19.11., Runde 2)

- Tabs jetzt ein Bereich pro Reiter: **Heute · Events (Eventseiten) · + · Story (Entdecken-Story) · Seite (Veranstalterseite)**. Zahlen sind eine eigene Seite (`/studio/stats`), erreichbar über „Alle Zahlen“ auf Heute.
- Routen verschoben: `studio/story.tsx` → `studio/(tabs)/story.tsx` (Jacints Story-Seite, nur die Route), `studio/(tabs)/stats.tsx` → `studio/stats.tsx`. Links `/studio/story` und `/studio/stats` bleiben gleich.
- Neuer Baustein `AreaBanner` auf jeder Seite: welcher Bereich, wo er für Gäste erscheint, bei Eventseiten „Ansehen“ (nur wenn live).
- Entdecken-Story: Hinweis „Als eure Kachel unter ‚Veranstalter in <Stadt>‘. Nicht auf Eventseiten.“
- Veranstalterseite: Titel „Veranstalterseite“, Trennlinie „Privat · nicht auf eurer Seite“ vor Ansprechperson und Konto.
- Heute: „Eure Bereiche in Spots“ mit den drei Bereichen; „+“-Auswahl zeigt bei jedem Eintrag den Bereich.

## Offen

- Handy-Test durch Noyan.
- Story-Seite (`StoryScreen`, Jacints einfache Oberfläche) bekommt die neuen Farben, Gestaltung noch offen.
- Datums-/Zeitauswahl im Editor braucht ein neues Paket (Freigabe nötig).
