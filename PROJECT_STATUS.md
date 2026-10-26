# Projektstatus

Stand: 26.10.2026

## Aktueller Stand nach Rücknahme

Auf Wunsch ist die vorletzte Version wiederhergestellt: der Stand unmittelbar vor dem Hinzufügen der Demo-Standorte in ganz Deutschland. Wiederhergestellt ist der Stand davor: dunkler Hintergrund, Logo „App.“, Bild-Pins, drei Berliner Demo-Events, fester Eventbereich und die vorherige Kartendarstellung. Die zusätzlichen Deutschland-Demos, Datumsfilterung und verstellbare Eventfläche sind entfernt.

## Implementiert

- Dunkler horizontaler violett-pinker Verlauf auf allen Seiten und der unteren Navigation.
- Radar beim Öffnen mit drei vollständigen Umdrehungen in 5,4 Sekunden und Vibrationsimpulsen auf Mobilgeräten. Zunächst keine Pins; danach blendet sich der Radar aus und Bild-Pins erscheinen mit 320 ms Abstand.
- Runde Event-Vorschaubilder an Pins, Marker-Vorschau und Eventdetails mit Zurück-Navigation.
- Filter für Alle, Techno, House, Party und Clubs; Kategorie und Entfernung gelten für Karte und Liste.
- Kilometer-Schieberegler unter der Karte: 5–50 km, initial 30 km. Aktualisiert die Anzeige beim Ziehen und Karte/Liste beim Loslassen. Presets im Filterdialog bleiben erhalten.
- Städtesuche oberhalb der Filter mit echten Vorschlägen über Open-Meteo/GeoNames, Lade-, Leer- und Fehlerzuständen sowie Abbruch veralteter Anfragen. Auswahl zentriert die Karte und startet den Scan erneut.
- Separater Standortpfeil: Zugriff nur auf bewussten Druck. Ohne Freigabe bleibt die gekennzeichnete Berlin-Demo nutzbar. Eine gewählte Stadt wird nicht durch eine ältere GPS-Anfrage überschrieben.
- Drei feste, klar gekennzeichnete Berliner Demo-Events: Neon Nights, House Session und Club Open Air. Keine automatisch um den Nutzer erfundenen Marker und keine privaten Adressen.
- Fester Eventbereich unter Karte und Regler mit scrollbarer Liste. Die Überschrift „Heute in deiner Nähe“ ist Designtext; die Demo-Termine sind derzeit nicht nach dem Tagesdatum gefiltert.
- Entdecken mit Suche nach Name, Genre und Ort sowie Kategorieauswahl.
- Profil-Reiter als ehrlicher Platzhalter; keine Anmeldung oder gespeicherten Events implementiert.
- Safe Areas und reduzierte Bewegung: Scan und Vibrationen enden beim Verlassen. Bei Bewegungsreduktion erscheinen Pins unmittelbar ohne Scan oder Pop-Effekt.
- Lokale Symbolfotos; Quellen in [assets/events/README.md](assets/events/README.md).

## Architektur

- Expo SDK 58. Routen unter [src/app/](src/app/), Komponenten und Logik außerhalb davon.
- [index.ts](index.ts) lädt `expo-router/entry`; [App.tsx](App.tsx) exportiert [RadarScreen](src/screens/RadarScreen.tsx).
- iOS und Android nutzen `react-native-maps`: grauer Google-Maps-Stil auf Android, Apple Maps `mutedStandard` im Dark Mode auf iOS. Das Aussehen bleibt vom nativen Anbieter abhängig.
- Browser verwendet wieder OpenStreetMap-Rasterkacheln mit Graustufen-/Dunkelfilter am Kachelcontainer und Quellenhinweis. Keine Esri-Kacheln mehr.
- Native Bildmarker verfolgen ihre Darstellung bis Bild und Einblendung fertig sind und aktualisieren danach den Snapshot.
- `@react-native-community/slider` 5.2.1 auf Mobilgeräten; im Browser natives HTML-Range-Feld mit Tastaturbedienung.
- Endlicher Scan und gestaffelte Pin-Freigabe in [useRadarIntro](src/hooks/useRadarIntro.ts).
- Vordergrundortung ohne Hintergrundtracking oder Speicherung in einem eigenen Backend. Kartenanbieter erhalten notwendige Kartenanfragen; nur der eingegebene Suchtext geht an den Geocoder.
- Dark Mode, deutscher Standorttext und Android-Vibrationsberechtigung über [app.json](app.json). Keine nativen Projektverzeichnisse angelegt.

## Prüfung

- Nach Rücknahme: `npx expo lint` und `npx tsc --noEmit` erfolgreich; keine Editor-Diagnosen.
- Der wiederhergestellte Stand wurde in der vorangegangenen Sitzung bereits als iOS-/Android-Bundle und in mobilen Browsergrößen geprüft. Kein nativer Gerätetest.
- Browser nach Wiederherstellung erfolgreich geladen: Logo, drei Berliner Demo-Karten, Städtesuche und Radiusregler geprüft. Der alte native Kartenimport im Browser wurde durch den wiederhergestellten Einstieg entfernt.
- Browser-Vorschau läuft weiterhin unter `http://localhost:8090`; nach Rücknahme mit geleertem Metro-Cache neu gestartet.

## Bekannte Grenzen

- Alle Events und Termine sind Demo-Daten. Keine echte Live-Verfügbarkeit und aktuell kein echter Heute-Filter.
- Native Kartenfarben können auf iOS vom Android-/Browser-Stil abweichen. Physische Vibration, native Karten und Bildmarker benötigen weiterhin einen Gerätetest.
- Internetzugriff für Karten und Städtesuche erforderlich. Kein freies Kartenverschieben und keine Offline-Kacheln.
- Vor Veröffentlichung Google-Maps-Konfiguration für Android sowie kommerziellen Geocoding-Tarif/Anbieter klären.
- Registrierung, Favoriten, echte Datumsfilter, Veranstalterinformationen, Tickets und Live-Snaps fehlen weiterhin.

## Nächste Schritte

1. Den wiederhergestellten Stand auf iOS/Android prüfen.
2. Weitere Designänderungen gezielt abstimmen.
3. Echte Eventquelle und strukturierte Termine anbinden.
4. Anmeldung, Favoriten und später Live-Snaps mit Ablauf, Datenschutz und Moderation ergänzen.


