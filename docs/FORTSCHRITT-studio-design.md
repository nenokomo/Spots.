# Fortschritt – Spots Studio Design (Noyan)

> **Abgelöst am 25.11.2026:** Der Aufbau unten (vier Reiter) wurde durch den Umbau ersetzt. Aktuell: [STUDIO-UMBAU-PLAN.md](STUDIO-UMBAU-PLAN.md) und [FORTSCHRITT-studio-umbau.md](FORTSCHRITT-studio-umbau.md). Diese Datei bleibt als Geschichte der Runden 1–4.

Stand: 23.11.2026. Branch `design/studio` (enthält `main` vom 19.11.: Jacints Moderation, Team, Ticketarten).

## Aktueller Aufbau (23.11., Runde 4: Studio neu strukturiert)

Grund: Die alte Struktur (Heute · Events · + · Story · Seite, dazu „Zahlen“ als Extra-Seite) war unübersichtlich, vieles gab es doppelt (Story posten an vier Stellen, Event anlegen an drei). Farben und Look sind gleich geblieben, nur der Aufbau ist neu.

**Vier Reiter, jeder mit genau einer Aufgabe. Jede Aktion gibt es nur an einer Stelle.**

| Reiter | Route | Datei | Aufgabe |
| --- | --- | --- | --- |
| Events | `/studio` | `EventsScreen.tsx` | Liste (Kommend · Vergangen), einziger Knopf „Neues Event“, bis zur Freigabe der Stand der Prüfung. Bei kommenden Events steht direkt in der Zeile, was fehlt (Flyer, Ticket-Link). |
| Story | `/studio/story` | `StoryScreen.tsx` | Einziger Ort zum Posten. Erst wählen „Entdecken“ oder „Eventseite“, dann Bild wählen, posten. Darunter die Bilder in Entdecken (löschen). |
| Einnahmen | `/studio/revenue` | `RevenueScreen.tsx` | Einnahmen und verkaufte Tickets oben, Reichweite darunter (Aufrufe, Gemerkt, Ticket-Klicks), dann jedes Event mit allen Zahlen in einer Zeile. |
| Profil | `/studio/profile` | `ClubScreen.tsx` | Visitenkarte mit „So sehen euch Gäste“, darunter aufklappbar: Seite bearbeiten · Team · Ansprechperson · Konto. |

Dazu nur eine weitere Seite: **das Event** (`/studio/event/[id]`, `EventEditorScreen.tsx`) mit fester Reihenfolge: Das Event → Ort → Flyer → Tickets (Link und Ticketarten) → Sichtbarkeit → Bilder zu diesem Event. „Speichern“ bleibt unten stehen.

- Weggefallen: Reiter „Heute“ (`OverviewScreen`), „+“ mit Auswahl (`CreateTab`), Extra-Seite „Zahlen“ (`/studio/stats`), Hinweis-Banner „Bereich“ (`AreaBanner`), Platzhalter „Beiträge – bald“, Karte „Event-Story“ im Event (Posten nur noch im Reiter „Story“).
- Neu: `Setup.tsx` (Einrichtung ohne Club statt der Reiter, Karte zur Freigabe), `AccountCard.tsx` (aus `ClubScreen` gelöst), in `ui.tsx` `Fold` (aufklappbarer Bereich) und `footer` für `StudioPage`.
- Datenlogik unverändert: gleiche Aufrufe wie vorher (`organizerApi`, `postShot`, `StudioContext`). Jacints Karten `TeamCard`, `TicketsCard`, `EventShotsCard` sind weiter eingebunden, nur Überschriften angepasst.
- Geprüft: Typecheck, Lint, `tests/organizer-app`, `navigation`, `design-integration`, `organizer-stories-app` (25/25). **Nicht auf dem Handy geprüft.**

## Einnahmen: was echt ist und was fehlt

- Echt: Aufrufe, Gemerkt, Ticket-Klicks, SHOTS pro Event (`fetchEventStats`, SQL 26).
- **Fehlt: Einnahmen und verkaufte Tickets.** Spots verkauft keine Tickets selbst, die Zahlen liegen beim Ticket-Anbieter oder an der Abendkasse. Die Seite zeigt deshalb „–“ und erklärt warum. Keine erfundenen Zahlen.
- Nur in der Entwicklung (`__DEV__`): Knopf „TEST · Beispielzahlen zeigen“ ganz unten, um das Design mit Zahlen zu beurteilen. Deutlich als TEST markiert, nie im Release.

## Daten nötig von Jacint

- **Verkaufszahlen pro Event** (verkaufte Tickets, Einnahmen in Cent). `RevenueScreen.tsx` erwartet pro Event `{ ticketsSold, revenueCents }` (Typ `Sales`). Zwei Wege:
  1. Schnell: Der Veranstalter trägt pro Ticketart ein, wie viele verkauft sind (neue Spalte bei `ticket_types`), Spots rechnet Preis × Anzahl.
  2. Später: Ticketverkauf direkt über Spots (z. B. Stripe) oder Abruf beim Ticket-Anbieter. Große Entscheidung.
- Verlauf der Zahlen über die Zeit (für Trends); Beiträge im Studio anlegen; Titelbild und Motto fürs Profil.

## Offen

- Handy-Test durch Noyan (alle vier Reiter, Event anlegen und speichern, Story für Entdecken und für eine Eventseite).
- Datums-/Zeitauswahl im Event statt Textfeldern braucht ein neues Paket (Freigabe nötig).
- Feinschliff der Karten von Jacint (`TeamCard`, `TicketsCard`, `EventShotsCard`).

## Frühere Runden (kurz)

- 19.11., Runde 1: Spots-Look statt Graphit/Lime (`studio/theme.ts`, Rosa als Akzent, „SPOTS STUDIO“-Abzeichen, Status-Pills).
- 19.11., Runde 2: Reiter Heute · Events · + · Story · Seite, Banner pro Bereich. Durch Runde 4 ersetzt.
- 23.11., Runde 3: `main` gemergt (`lime` → `accent` in Jacints Karten), Zahlen-Seite überarbeitet. Durch Runde 4 ersetzt.
