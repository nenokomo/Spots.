# Fortschritt – design/feinschliff (Noyan)

Stand: 15.11.2026

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

## Als Nächstes

1. Handy-Test durch Noyan; Scan-Design je nach Ergebnis anpassen (Farbe, Tempo, Strahlbreite).
2. Committen, `main` hereinholen (neue Commits von Jacint).
3. Nächster Screen.

## Daten nötig von Jacint (falls Clubs zurückkommen)

1. **Club-Bilder.** `public.venues` hat keine Bildspalte; OpenStreetMap liefert keine Fotos.
2. **Mindestens 50 Google-Bewertungen.** Keine Bewertungsdaten vorhanden; bräuchte die Google Places API (kostenpflichtig, Speichern nur eingeschränkt erlaubt). Alternative: kuratierte Club-Liste. Entscheidung offen.
