# Projektstatus

## Implementiert

- Expo SDK 58 mit passenden Abhängigkeiten.
- Begrüßungsbildschirm beim Start.
- Animierter Radar-Effekt.
- Standortfreigabe über `expo-location`.
- Kartenansicht über `react-native-maps`.
- Filter für Techno, House, Clubs und Events.
- Navigation zwischen Radar und Entdecken.
- Suchfeld für kommende Demo-Events.
- Detailseite beim Antippen eines Radar-Pins mit Zurück-Navigation.
- Pin-Vorschau vor dem Öffnen der vollständigen Event-Detailseite.
- Radar-Karte verwendet einen kleinen Standort-Umkreis statt einer globalen Ansicht.
- Eigenständiger Radar-Scan vor der Kartenansicht mit Scanstrahl, Treffern und Vibration.
- Demo-Marker in der Nähe des aktuellen Standorts.

## Noch offen

- Echte Event-Datenquelle und Backend.
- Echte Party-Marker statt Demo-Marker.
- Navigation zu Event-Detailseiten.
- Suche, gespeicherte Events und Profile.
- Datenschutz- und Moderationskonzept für Live-Snaps.

## Technische Hinweise

- Ohne Standortfreigabe wird eine Beispielregion angezeigt.
- Für echte Daten müssen später private Adressen geschützt und die Datenquelle geprüft werden.
