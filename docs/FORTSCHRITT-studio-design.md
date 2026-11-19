# Fortschritt – Spots Studio Design (Noyan)

Stand: 19.11.2026. Noch nichts umgesetzt, nur Vorschläge. Vor dem Start: `main` hereinholen (Jacints Veranstalter-Storys, SQL 33).

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

## Offen / Entscheidung Noyan

- Spots-Look oder eigener Studio-Look?
- Neuer Tab-Aufbau so okay?
