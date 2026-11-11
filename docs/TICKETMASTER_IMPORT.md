# Plan: Ticketmaster als zweite Eventquelle

Stand: 11.11.2026 · Status: **Entwurf, noch nichts umgesetzt** · Bereich: Backend (Jacint)

Ziel: Mehr echte Events in Spots, solange noch keine Veranstalter selbst Events anlegen. Ticketmaster läuft neben Goabase; der Goabase-Import wird nicht verändert.

## Was die Ticketmaster-API bietet (gelesen am 11.11.2026)

- Offizielle **Discovery API v2**: `https://app.ticketmaster.com/discovery/v2/events.json?apikey=…`. Die International Discovery API nimmt keine neuen Schlüssel mehr an.
- Filter: `countryCode`, Ort per `geoPoint` (Geohash) + `radius` + `unit=km`, Zeitraum `startDateTime`/`endDateTime`, `classificationName`/`genreId`, `sort=date,asc`, `page`/`size`.
- Grenzen: **5.000 Aufrufe pro Tag, 5 pro Sekunde**. Pro Suche höchstens die ersten 1.000 Treffer (`size × page < 1000`).
- Eventdaten: `id`, `name`, `url` (Ticketkauf), `dates.start` (oft mit `dateTime`), `dates.end` (oft leer), `dates.status.code` (`onsale`, `offsale`, `canceled`, `postponed`, `rescheduled`), Genres (`segment`/`genre`/`subGenre`), Bilder mit Seitenverhältnis und Größe, Venue mit Name, Adresse, Stadt, Koordinaten.

**Nicht bestätigt**: ob die API mit `countryCode=DE` auch die Events von ticketmaster.de liefert und wie viele davon Nightlife sind. Das klärt Schritt 0.

## Bedingungen – was wir beachten müssen

- Inhalte, deren Besitzer das verlangt, **innerhalb von 24 Stunden entfernen**.
- Daten nur „für angemessene Zeit“ zwischenspeichern → wir speichern nur, was die App anzeigt, und aktualisieren regelmäßig.
- Ticketmaster nicht nachbauen oder ersetzen → wir zeigen Events und verlinken zum Ticketkauf bei Ticketmaster, kein eigener Verkauf.
- Viele Aufrufe ohne Nutzeraktion können gedrosselt werden → sparsamer Zeitplan (siehe unten).
- **Offene Frage**: Die Bedingungen verbieten, mit der API Einnahmen zu erzielen („derive revenues“), die genannte Ausnahme fehlt im Text. Für eine kostenlose App ohne Werbung vermutlich unkritisch, **vor Werbung, Abos oder Gebühren bei Ticketmaster nachfragen**. Keine Rechtsberatung.
- Datenschutzerklärung muss Ticketmaster als Quelle nennen. Branding-Richtlinien (design.ticketmaster.com) vor dem Release lesen.

## Schritt 0 – Machbarkeit prüfen (vor jeder Zeile Importcode)

1. Du registrierst dich auf developer.ticketmaster.com und erhältst einen API-Schlüssel. (Konten lege ich nicht an.)
2. Der Schlüssel kommt nur in eine lokale, Git-ignorierte Datei, nie in die App und nie in Git.
3. Ein rein lesendes Prüfskript fragt einmalig ab: ganz Deutschland, Karlsruhe 30 km, Berlin, nächste 30 Tage, Musik. Es zählt Events, Genres, Anteil mit Endzeit, Bilder, Ticket-Domains (ticketmaster.de?).
4. Ergebnis im Team ansehen und entscheiden: lohnt sich der Import?

**Vorbereitet:** Schlüssel in `.env.ticketmaster.local` hinter `TICKETMASTER_API_KEY=` eintragen (Datei ist Git-ignoriert), dann `node scripts/probe-ticketmaster-readonly.cjs`. Das Skript macht höchstens 15 GET-Anfragen, speichert nur Zahlen nach `supabase/.temp/ticketmaster-probe.json` und läuft nicht ein zweites Mal, solange dieser Bericht existiert.

## Ergebnis Schritt 0 (11.11.2026, 5 Anfragen)

Segment Musik, nächste 30 Tage. Zusammenfassung: `supabase/.temp/ticketmaster-probe.json` (nur Zahlen, nicht im Git).

| | Deutschland | Berlin 30 km | Karlsruhe 30 km |
|---|---|---|---|
| Events | **516** | 109 | **1** (Baden-Baden) |
| Genaue Startzeit | 513 | 108 | 1 |
| Mit Endzeit | 51 (10 %) | 9 | 0 |
| Großes 16:9-Bild | 516 | 109 | 1 |
| Venue-Koordinaten | 511 | 109 | 1 |

- **Genres DE**: Rock 157, Other 132, Hip-Hop/Rap 64, Alternative 52, Dance/Electronic nur 16, Klassik 15, Pop 12, Metal 11.
- **Städte**: Berlin 109, Bremen 73, Hamburg 43, Köln 40, München 26, Frankfurt 26.
- **Ticket-Domains**: ticketmaster.de 460, universe.com 51 (gehört zu Ticketmaster), ticketmaster.fr 3, travelcircus.de 2.
- **Status**: onsale 457, **`cancelled` (mit zwei L, anders als in der Doku)** 33, offsale 21, rescheduled 5. Der Import muss beide Schreibweisen akzeptieren.

**Bewertung**
- Datenqualität sehr gut: fast immer genaue Startzeit, Bild und Koordinaten. Endzeiten fehlen meist, das ist bekannt.
- Menge: rund 17-mal mehr Events als heute (≈ 30), vor allem in Großstädten. Unter 1.000 Treffern, die Aufteilung pro Tag ist vorerst nur Absicherung.
- **Für Karlsruhe praktisch nutzlos** (1 Event). Nachprüfung mit 80 km Umkreis: 11 Musik-Events (9 davon Stuttgart), über alle Segmente 22 (davon 11 Comedy, 4 in Karlsruhe selbst). Karlsruher Veranstalter verkaufen offenbar kaum über Ticketmaster. Dort helfen nur redaktionelle Pflege und Clubs direkt.
- Wenig Nightlife (Dance/Electronic 16). Ticketmaster ist eine Konzertquelle, keine Clubquelle.
- Erlaubte Ticket-Domains: `ticketmaster.de`, `universe.com`, weitere Ticketmaster-Länderdomains; fremde Domains (z. B. travelcircus.de) nicht übernehmen.

## Aufbau (wie Goabase, aber getrennt)

| Teil | Inhalt |
|---|---|
| `supabase/functions/import-ticketmaster/` | Eigene Edge Function: `sync.ts` (Abruf + Umwandlung), `index.ts` (geschützter Aufruf, Sperre, Übernahme) |
| `supabase/ops/20_ticketmaster_sync_backend.sql` | Eigene Sperre (Lease), Versionstabelle im privaten Schema, Funktionen `spots_ticketmaster_begin/apply/release` |
| `public.events` | Unverändert. Neue Zeilen mit `source = 'ticketmaster'`; Schutz vor Duplikaten über das bestehende `UNIQUE(source, source_event_id)` |
| App | Keine Änderung nötig, liest weiter nur veröffentlichte Events. Später: Hinweis „Tickets bei Ticketmaster“ |
| Schlüssel | Als Secret der Edge Function bzw. im Vault, nie mit `EXPO_PUBLIC_` |

## Umwandlung Ticketmaster → Spots

| Spots-Feld | Aus Ticketmaster | Regel |
|---|---|---|
| `title` | `name` | Pflicht |
| `starts_at` | `dates.start.dateTime` | **Ohne genaue Startzeit kein Import** (`dateTBA`, `timeTBA`, `noSpecificTime`), keine geratene Uhrzeit |
| `ends_at` | `dates.end.dateTime` | Sonst leer. Keine erfundene Endzeit; die App behandelt Events ohne Ende schon richtig |
| `venue_name`, `city`, `latitude`, `longitude` | erste Venue | Ohne Koordinaten erscheint das Event nicht auf dem Radar |
| `image_url` | größtes Bild im Format 16:9 | Nur https; Bild bleibt bei Ticketmaster (kein Kopieren) |
| `ticket_url`, `source_url` | `url` | Nur https auf Ticketmaster-Domains (inkl. `universe.com`); fremde Domains → Event nicht übernehmen |
| `genre`, `category` | `genre`/`subGenre` | Feste Zuordnungstabelle (z. B. Dance/Electronic → Techno/House nur bei eindeutigem Subgenre, Hip-Hop/Rap → Hip-Hop). Unklares bleibt leer, keine Rateerei |
| `status` | `dates.status.code` | `onsale`/`offsale`/`rescheduled` → `scheduled`; `canceled` oder `cancelled` → `cancelled`; `postponed` → `postponed`; Unbekanntes → nicht übernehmen |
| `is_published` | — | Wie bei Goabase: nur `scheduled` und noch nicht vorbei |

## Umfang (Entscheidung 11.11.2026)

**Alle Konzerte**: ganzes Segment Musik in Deutschland, alle Genres. Nicht dabei: Sport, Theater, Familie usw.

Folgen:
- Deutlich mehr Events als nur Nightlife. Die App braucht dafür eine Kategorie **„Konzerte“** im Filter, damit Nutzer Clubnächte und Konzerte trennen können (App-Änderung, eigener Schritt).
- Genres wie Rock, Pop oder Klassik bekommen eine eigene Zuordnung oder bleiben nur als Kategorie „Konzerte“ sichtbar.

## Abruf und Zeitplan

- Nur Deutschland, nur Segment Musik (alle Genres); Zeitraum heute bis +30 Tage.
- Abfragen **pro Tag** aufteilen, damit keine Suche über 1.000 Treffer kommt. Schätzung: 30 Tage × 1–5 Seiten ≈ 30–150 Aufrufe pro Lauf, bei 4 Läufen am Tag deutlich unter 5.000. Volle Seite an der Grenze → Lauf bricht ohne Schreiben ab (wie bei Goabase).
- Alle 6 Stunden. Bekannte Events, die nicht mehr in der Suche auftauchen, einzeln nachprüfen; 404 → unveröffentlichen, nicht löschen.
- HTTP 429 (Kontingent erschöpft), Netzwerk- oder Formatfehler → nichts schreiben, Sperre freigeben.
- Löschwunsch eines Veranstalters: Event per Sperrliste dauerhaft ausblenden, innerhalb von 24 Stunden.

## Tests

- Feste Beispiel-Antworten (Fixtures) für Umwandlung, Status, fehlende Zeiten, Genres, Bilder, kaputte Links.
- SQL-Tests mit PGlite: keine Duplikate, keine Änderung an Goabase-Zeilen, UUIDs bleiben erhalten, Sperre.
- Fehlerfälle: 429, Timeout, volle Seite an der Grenze.

## Einführung

1. ~~Schritt 0 (Machbarkeit)~~ erledigt; Entscheidung im Team.
2. Code und Tests lokal, Review durch Jacint.
3. Nur in **Spots-Test** ausführen und Function bereitstellen – jeweils nach ausdrücklicher Freigabe.
4. Einige Tage im Test laufen lassen und Daten ansehen.
5. **Produktion nur mit Jacint und ausdrücklicher Freigabe**, inklusive Backup vorher.

## Offene Entscheidungen

- ~~Welche Genres?~~ Entschieden: alle Konzerte (Segment Musik).
- Wie heißt und wirkt die neue Kategorie „Konzerte“ im Radar und in Entdecken? (Design: Noyan)
- Wer registriert den API-Schlüssel und verwaltet ihn?
- Rückfrage bei Ticketmaster zur Einnahmen-Klausel vor einer Monetarisierung.
