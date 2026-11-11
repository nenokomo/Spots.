# Plan: Clubs und Events ohne eigene Veranstalter (Deutschland, Start Karlsruhe)

Stand: 11.11.2026 · Status: **Entwurf, noch nichts umgesetzt** · Bereiche: Backend (Jacint), Design (Noyan), Pflege (Spots-Team)

Ziel: In Karlsruhe sieht man in Spots von Anfang an, welche Clubs es gibt und was dort los ist, obwohl noch kein Club selbst Events einträgt. Vorbild ist das Prinzip von LoonOne (laut deren Datenschutzerklärung): Fakten aus öffentlichen Quellen, keine fremden Texte und Bilder, alles von Hand geprüft.

Grundsatz: **Nichts geht automatisch online.** Jedes Event und jeder Ort wird von einem Menschen geprüft und freigegeben. Damit gilt die Regel „keine erfundenen Daten“.

## Ausgangslage

- Ticketmaster liefert für Karlsruhe fast nichts (siehe [TICKETMASTER_IMPORT.md](TICKETMASTER_IMPORT.md)), Goabase wenige Partys.
- Eine öffentliche Event-Schnittstelle der Stadt gibt es nicht. Eventim und Reservix haben nur Partnerprogramme auf Anfrage.
- **OpenStreetMap, Abfrage am 11.11.2026, 15 km um Karlsruhe:** 59 Orte (19 `nightclub`, 6 `music_venue`, 34 `events_venue`), 58 mit Name, 32 mit Website, nur 8 mit Öffnungszeiten. Unter `nightclub` stehen in OSM manchmal auch Erotik-Lokale → jeder Ort wird von Hand geprüft.
- Datenbank: Events mit `source = 'spots'` müssen laut SQL 15 einem Veranstalter gehören. Redaktionelle Events bekommen deshalb eine **eigene Quelle `redaktion`** ohne Veranstalter. Eine Tabelle für Orte gibt es noch nicht.
- App-Filter heute: Alle, Techno, House, Events, Clubs (`src/constants/theme.ts`). Hip-Hop und Konzerte fehlen.

## Gebiet: ganz Deutschland (Entscheidung 11.11.2026)

Spots soll von Anfang an in ganz Deutschland etwas zeigen, nicht nur in Karlsruhe. Das ändert drei Dinge:

| Thema | Nur Karlsruhe | Ganz Deutschland |
|---|---|---|
| Orte aus OSM | 59 Orte, alle von Hand prüfbar | vermutlich mehrere tausend (genaue Zahl offen, die Overpass-Server waren am 11.11. überlastet) → **automatische Filter + Stichproben + Melden-Funktion** statt jeden Ort einzeln |
| Events | Team trägt ein, Clubs vorher fragen | Bundesweit tragen Ticketmaster (516 Musik-Events) und Goabase. Geprüfte Entwürfe aus Club-Websites **Stadt für Stadt** aufbauen, Karlsruhe zuerst |
| Zustimmung der Clubs | machbar | für tausende Clubs nicht machbar → rechtliche Prüfung, ob und wie Fakten ohne Einzelzustimmung übernommen werden dürfen, **vor** dem bundesweiten Ausbau der Automatik |

**Orte bundesweit veröffentlichen**
- Nur Einträge mit Name, Koordinaten und Art `nightclub` oder `music_venue` (bei `events_venue` erst mit Website oder Bestätigung).
- Automatisch aussortieren: OSM-Merkmale für Erotik-Lokale, geschlossene Orte (`disused`, `abandoned`, Name mit „geschlossen“), Einträge ohne Namen.
- Großstädte zuerst von Hand stichprobenartig prüfen; jede Ortsseite bekommt „Fehler melden“.
- Orte sind echte Daten mit Quelle (OSM) – sie werden als Ort gezeigt, nie als laufende Party.

**Events bundesweit**
- Sofort: Ticketmaster-Import ([TICKETMASTER_IMPORT.md](TICKETMASTER_IMPORT.md)) und Goabase.
- Danach: Entwürfe aus Club-Websites, beginnend mit Karlsruhe, dann Städte mit vielen Clubs. Freigabe weiter von Hand, deshalb wächst die Abdeckung mit dem Team.
- Vorschläge von Nutzern und später Veranstalter selbst füllen die Lücken.

## Phase A – Club-Verzeichnis aus OpenStreetMap

**Daten**
- Neue Tabelle `public.venues`: Name, Art (Club, Live-Musik, Eventlocation), Adresse, Koordinaten, Website, Öffnungszeiten, OSM-ID, `is_published`, später `organizer_id` nach Übernahme.
- Import-Skript: Overpass-Abfrage für eine Liste von Städten (Start: Karlsruhe 15 km). Neue Orte landen **unveröffentlicht**, das Team prüft und gibt frei. Bei erneutem Lauf werden Änderungen aus OSM als Vorschlag angezeigt, nicht still überschrieben.
- Lizenz: OSM steht unter ODbL. In der App reicht der Hinweis „© OpenStreetMap-Mitwirkende“ bei Karte bzw. Ortsdaten. Wenn wir die Ortsdatenbank selbst öffentlich weitergeben würden, müsste sie unter derselben Lizenz stehen – das tun wir nicht.

**App**
- Clubs erscheinen als **Orte**, nicht als Events: eigene, dezente Pins oder eine Liste „Clubs in der Nähe“, mit Hinweis „Kein Event eingetragen“ statt einer erfundenen Party. Gestaltung: Noyan.
- Ortsseite: Name, Adresse, Route, Website, Öffnungszeiten (falls vorhanden), kommende Events dieses Ortes.

## Phase B – Events als Entwurf mit Freigabe

**Quellenliste** (privat, nur Team)
- Pro Ort: Adresse der Event-Seite auf der Club-Website, **Zustimmung** (angefragt / erlaubt / abgelehnt), letzte Prüfung.
- Abgerufen werden nur Quellen mit Zustimmung „erlaubt“. Karlsruher Clubs werden vorher angeschrieben; die meisten profitieren von der Werbung. Ohne Zustimmung nur nach rechtlicher Prüfung.

**Abruf und Entwurf**
1. Ein Job lädt die Event-Seite (zunächst von Hand gestartet, später z. B. täglich).
2. Die KI (Claude API) liest **nur Fakten** heraus: Titel, Datum, Beginn, Ende, Genre, Eintritt, Ticket-Link. Was nicht dasteht, bleibt leer – keine geratenen Uhrzeiten oder Genres.
3. Prüfungen im Code: Datum in der Zukunft und plausibel, Ort passt zur Quelle, Ticket-Link ist https.
4. Ergebnis ist ein **Entwurf** in einer privaten Tabelle, mit Quelladresse. Doppelte (gleicher Ort, gleicher Tag) werden zusammengeführt.
5. Ändert sich ein Event auf der Quelle (Uhrzeit, Absage), entsteht ein Änderungsentwurf zur Prüfung.

**Freigabe**
- Admin-Bereich nur für das Spots-Team (eigene Rolle in der Datenbank): Entwürfe ansehen, korrigieren, freigeben oder verwerfen. Freigabe erzeugt ein Event mit `source = 'redaktion'`, Quelle und Ort.
- Auch komplett von Hand anlegen ist möglich (z. B. Infos per Telefon oder Instagram vom Club).

**Bilder und Texte**
- Keine fremden Flyer und keine kopierten Beschreibungen. Ausnahme: Der Club erlaubt es ausdrücklich (in der Quellenliste vermerkt).
- Ohne Bild: Ersatzmotiv pro Genre im Spots-Stil (Noyan). Beschreibung leer oder kurz vom Team selbst formuliert.

**Datenschutz**
- Die KI bekommt nur öffentliche Eventangaben, keine Nutzerdaten. Anthropic (USA) als Auftragsverarbeiter in der Datenschutzerklärung nennen.
- API-Schlüssel nur im Backend.

## Phase C – Vorschlagen-Formular

- In der App: „Club oder Event vorschlagen“ mit Name, Stadt, Website oder Instagram.
- Ohne Konto möglich, mit Schutz gegen Spam und Begrenzung pro Gerät.
- Landet nur in der Prüfliste des Teams, nichts geht automatisch online.

## Phase D – Übergabe an die Clubs

- Ein Club beansprucht seinen Ort mit Nachweis (z. B. E-Mail von der Domain seiner Website oder Rückruf). Das Team gibt frei.
- Danach gehört der Ort dem Veranstalter (`organizer_id`), er pflegt eigene Events (`source = 'spots'`) und sieht später sein Dashboard.
- Für diesen Ort werden keine neuen Entwürfe aus der Website mehr erzeugt.

## Reihenfolge und Aufwand (grob)

| Schritt | Inhalt | Wer | Aufwand |
|---|---|---|---|
| 1 | Tabellen `venues`, Quellenliste, Entwürfe, Admin-Rolle (SQL, lokal getestet) | Jacint | 2–3 Tage |
| 2 | OSM-Import + Prüfung der 59 Karlsruher Orte | Jacint + Team | 1–2 Tage |
| 3 | Admin-Bereich: Orte freigeben, Events von Hand anlegen | App | 3–4 Tage |
| 4 | Clubs in der App als Orte zeigen, Ortsseite | Noyan + App | 2–3 Tage |
| 5 | Karlsruher Clubs anschreiben, Zustimmung eintragen | Team | laufend |
| 6 | Automatische Entwürfe aus Club-Websites mit KI | Jacint | 3–5 Tage |
| 7 | Vorschlagen-Formular | App | 1–2 Tage |
| 8 | Übergabe an Clubs (Claim) | Jacint + App | mit dem Veranstalter-Bereich |

Schon nach Schritt 3 kann das Team Karlsruher Events von Hand eintragen. Die Automatik (Schritt 6) spart später Arbeit, ist aber nicht Voraussetzung.

Alles zuerst lokal und in **Spots-Test**, Produktion nur mit Jacint und ausdrücklicher Freigabe.

## Rechtliches (keine Rechtsberatung, vor dem Start prüfen lassen)

- Reine Fakten (Datum, Ort, Uhrzeit) sind in der Regel nicht urheberrechtlich geschützt; Flyer, Fotos und Beschreibungstexte schon.
- Systematisches Auslesen großer Teile einer fremden Datenbank kann das Datenbankherstellerrecht verletzen; Nutzungsbedingungen der Websites gelten zusätzlich. Deshalb Zustimmung der Clubs als Standard.
- Impressum, Datenschutzerklärung (OSM, Anthropic, Supabase usw.) und Melde-Möglichkeit für Inhalte vor dem Start.

## Offene Entscheidungen

- Admin-Bereich in der App (versteckt, nur Team) oder als Web-Seite? Vorschlag: gleiche App, Web-Ansicht reicht fürs Team.
- Wer im Team prüft und gibt frei, und wie oft?
- Claude-API-Schlüssel: Wer legt das Konto an?
- Neue Filter „Hip-Hop“ und „Konzerte“ (auch für Ticketmaster) – Gestaltung mit Noyan.
- ~~Startgebiet?~~ Entschieden: ganz Deutschland; Event-Entwürfe Stadt für Stadt, Karlsruhe zuerst.
- Reihenfolge der Städte nach Karlsruhe?
