# Fortschritt – design/feinschliff (Noyan)

Stand: 19.11.2026

## Erledigt (betrifft Noyans Design, Radar-Karte)

- Radar startet am eigenen Standort: Karte erscheint erst nach der Standortsuche (kein Berlin-Aufblitzen), auch bei doppeltem Aufruf der Suche. Berlin nur noch als Rückfall ohne Freigabe.
- Standard-Umkreis 10 km statt 30 km; Button oben rechts heißt jetzt „Filter“.
- Infokasten erscheint direkt über dem angetippten Pin (unter dem Pin nahe am oberen Rand). Android verschiebt die Karte beim Antippen nicht mehr.
- Event-Pins etwas größer, danach wieder etwas kleiner (Kopf 42 px). Nativ und im Web angepasst.
- Neues Scan-Design (`src/components/RadarOverlay.tsx`): rosa Sweep mit Nachleuchten, zwei feine Ringe, leuchtender Mittelpunkt. Scan startet erst, wenn die Karte sichtbar ist (`src/hooks/useRadarIntro.ts`).
- Kleine Änderung in `src/hooks/useLocation.ts` (betrifft Jacints Bereich): laufende Standortsuche wird geteilt statt sofort zu enden.
- Branch auf main `02e6260` gebracht („Clubs nur mit Event“): Club-Punkte im Radar, Clubs-Bereich und /clubs sind entfernt. Die zwischenzeitlich gebauten Club-Pins sind damit hinfällig und wieder gelöscht.
- Geprüft: Typecheck, Expo-Lint. Noch nicht auf dem Handy geprüft, noch nicht committet.

## Entdecken-Storys (15.11., noch nicht committet)

- Scan auf dem Radar neu: Kreis um den Standort-Punkt (passt sich der Kartenbreite an), feine Ringe, rosa Strahl. Pin-Kopf 41 px.
- Story-Kacheln in Entdecken: kleine Ecken (8 px), kein Rahmen, höher.
- Story-Ansicht: Tippen rechts/links = Bilder derselben Story, nach dem letzten Bild beginnt sie von vorn. Hochwischen = nächster Veranstalter (liegt fertig geladen darunter und läuft mit dem Finger mit, wie ein Feed). Runterwischen = schließen (Seite dahinter sichtbar). Gedrückt halten = Pause. Kein Kreuz, kein Zähler, kein „Vorschau“.
- Behoben: doppeltes Weiterspringen (Zeitzähler wurde überschrieben, Balken wurde laufend zurückgesetzt), verschluckte Taps, schwarzer Hänger beim Schließen (Fenster ohne eigene Animation).
- Nur in der Entwicklung: 3 TEST-Symbolbilder pro Story. **Daten nötig von Jacint:** echte Bilder/Snaps pro Veranstalter.
- Geprüft: Typecheck, Expo-Lint. Nicht auf dem Handy geprüft.

## Eventseite neu (15.11., noch nicht committet)

- Flyer läuft in die Seite aus; darauf LIVE-Abzeichen, großer Titel, eine Zeitzeile, Genre-Chips. Jede Info nur einmal.
- Profilbild des Veranstalters oben auf dem Eventbild (über dem Titel): rosa Ring = neue Event-Story (Veranstalter-Snaps, `by_organizer`), 24 h beliebig oft ansehbar, nur auf der Eventseite. Name daneben öffnet das Profil.
- Shots ohne Liste und ohne Zahlen: ein Button „Shots ansehen“ (öffnet alle neuen, nur ein Fortschrittsbalken), daneben während des Events „Shot posten“ → Kamera-Ansicht „Poste einen Shot“ (`ShotCamera`, **nur Design**, Kamera und Upload baut Jacint).
- Profilbild oben 76 px mit dickem Verlaufsring, rosa Leuchten und „STORY“-Label (grau nach dem Ansehen).
- Reihenfolge unten: Tickets (immer sichtbar, Ticketarten mit „Kaufen“ oder Hinweis + Button zum Anbieter) → Über das Event (direkt über dem Ort, mit ehrlichem Hinweis ohne Beschreibung) → Ort → Shots. Kauf läuft beim Anbieter, kein Bezahlen in der App.
- Ort als kleine Karten-Vorschau (`PlacePreview`, Web ohne Karte), Antippen öffnet die Route; darunter die Adresse ausgeschrieben (kopierbar).
- **Zwei Arten, nicht verwechseln:**
  - **Event-Story** (Veranstalter): für genau dieses Event, 24 h beliebig oft ansehbar, nur auf der Eventseite (Ring am Profilbild).
  - **Shots** (Gäste, früher „Live Snaps“): jeder mit Konto darf posten, nur solange das Event läuft; 24 h auf der Seite, aber jeder Shot nur einmal öffnen (pro Gerät gemerkt, so gewollt), damit ein schlechter Moment nicht ständig wiederholt wird. Melden direkt in der Ansicht (6 Gründe, `content_reports`, nach 3 Meldungen ausgeblendet). Nicht in der Bildergalerie.
- Untere Leiste: ein Haupt-Button (Tickets → Infos → Route) plus Merken. Fußzeile nur „Infos von Quelle ↗“.
- Neue Dateien: `SnapViewer`, `LiveSnaps`, `PlacePreview(.web)`, `constants/mapStyle.ts`. In der Entwicklung TEST-Bilder für TEST-Events.
- **Daten nötig von Jacint:** SQL 17 (`live_snaps`, `content_reports`) einspielen; Upload für Event-Storys (Veranstalter) und Shots (Konto, nur während das Event läuft – serverseitig prüfen); Videos brauchen einen Player. Neue Funktion `reportShot` in `src/services/content.ts` (Jacints Bereich) bitte ansehen. Offen: Melden laut SQL 17 nur mit Konto, der DSA verlangt Melden für alle. Straße/Hausnummer/PLZ fehlen in den Eventdaten; `PlacePreview` hat dafür schon `street` (Datenschutz bei privaten Partys beachten).
- Geprüft: Typecheck, Expo-Lint. Nicht auf dem Handy geprüft.

## Korrekturen (15.11.)

- Entdecken zeigt jetzt dieselben Events wie das Radar: laufende (`useLiveEvents`) plus kommende, ohne Doppelte. „Heute“ = `isTonight` (läuft, schon begonnen oder startet heute, auch nach Mitternacht). Betrifft die Datenauswahl im Screen – Jacint bitte kurz ansehen.
- Eventseite immer gleich: rundes Bild oben auf jedem Event (Veranstalter mit Story-Ring, sonst das Eventbild) und SHOTS immer sichtbar; Posten nur während des Events, sonst ruhiger Button mit Hinweis.

- Entdecken-Storys: Wechsel wieder per Hochwischen (wie TikTok), Bilder per Tippen mit Wiederholung. Schließen jetzt durch Ziehen nach unten, links oder rechts: die Story folgt dem Finger frei und wird dabei kleiner.
- Kein „Live“-Abzeichen mehr auf Story-Kacheln und „Als Nächstes“-Karten.
- Offen: Stadtsuche ab 1 Buchstaben braucht eine lokale Liste deutscher Städte (Open-Meteo sucht erst ab 3 Zeichen, max. 6 Treffer) – Daten nötig, Freigabe zum Download von GeoNames ausstehend.

- Abschnittstitel überall mit rosa Neon-Leuchten (`SectionTitle` in `ui/Section.tsx`): Entdecken, Gemerkt, Radar, Heute Nacht, Event- und Veranstalterseite.
- Entdecken: „Als Nächstes“ direkt unter den Kategorien, mehr Abstand zwischen den übrigen Abschnitten, Kacheln mit 10 px Abstand; Suchleiste schlägt ab 3 Buchstaben Städte vor (Open-Meteo, wie Radar).

- Eventseite: feste Veranstalter-Karte unter dem Titel („Profil ›“), auch ohne Story.
- Veranstalterseite neu: Titelbild aus dem nächsten Flyer, großes Profilbild mittig mit Story-Ring (kommende Events als Storys), Name und Stadt, Zahlenleiste, Bio mittig, „Als Nächstes“/„Dein Event“, Pill-Umschalter Events (Standard) / Beiträge.

## Veranstalterseite neu (19.11.)

- Kopf: Titelbild (nächster echter Flyer, sonst Logo/Symbolbild), Profilbild mit Story-Ring linksbündig, Name, „Veranstalter · Stadt“, Musik-Chips (häufigste Genres der Events).
- „Über uns“-Karte: erster Satz der Biografie als Motto, Rest mit „Mehr lesen“, Website. **Daten nötig von Jacint:** eigenes Feld Motto und Titelbild.
- „Als Nächstes“ / „Jetzt live“: immer das nächste Event. Feste Leiste unten „Tickets fürs nächste Event“ + Merken (nur mit Ticket-Link).
- „Programm“: nächste 4 Termine als Datumszeilen (mit Ticket-Pill bei Link), Kalender-Fenster (Kalender aus Entdecken) für alles Weitere.
- Beiträge direkt auf der Seite wie ein Instagram-Feed; vergangene Events (3, mehr aufklappbar). Kopfleiste mit Name erscheint beim Scrollen.
- Geprüft: Typecheck, Lint (nur die bekannten 2 Meldungen zu expo-image-picker). Handy-Test durch Noyan.

## Als Nächstes

1. `main` hereinholen (Jacints Veranstalter-Storys, SQL 33; mögliche Konflikte in ExploreScreen und EventStoryViewer).
2. Spots Studio neu gestalten, siehe [FORTSCHRITT-studio-design.md](FORTSCHRITT-studio-design.md).

## Daten nötig von Jacint (falls Clubs zurückkommen)

1. **Club-Bilder.** `public.venues` hat keine Bildspalte; OpenStreetMap liefert keine Fotos.
2. **Mindestens 50 Google-Bewertungen.** Keine Bewertungsdaten vorhanden; bräuchte die Google Places API (kostenpflichtig, Speichern nur eingeschränkt erlaubt). Alternative: kuratierte Club-Liste. Entscheidung offen.
