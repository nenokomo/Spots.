# Spots – lokale Integration von Daten und Design

Stand: 09.11.2026. Keine Änderungen an Supabase-Produktion, keine POST-Imports, kein Deployment und keine Cron-Aktion.

## Branches und Reihenfolge

Alle origin-Branches frisch abgerufen. main liegt auf 7d5f654; Jacint-branch auf ee0c270. Der aktuelle Design-Branch ist noyan-design (c8f0217, vier Designcommits seit gemeinsamer Basis). Noyan-branch-design zeigt auf 3c0732d und liegt bereits in der Historie von main und noyan-design.

Neuen lokalen Branch **integration/spots-supabase-design** von origin/main erstellt. Zuerst Jacint-branch per Merge integriert, anschließend noyan-design. Keine pauschale ours/theirs-Strategie. Bestehende lokale/Remote-Branches bleiben unverändert; kein Push und kein Merge nach main.

## Konfliktentscheidungen

14 Konfliktdateien:

| Dateien | Auflösung |
| --- | --- |
| PROJECT_STATUS.md | Aktuellen Betriebsstand erhalten, Integration ergänzt. Vollständige Designchronik separat archiviert. |
| src/app/_layout.tsx | Design-Startscreen und Routen mit bestehendem EventsProvider und SavedEventsProvider kombiniert. |
| EventCalendar.tsx | Scrollbares Monatslayout übernommen, Markierungen aus echten Events und keine Demo-Beschriftung. |
| EventCard, ExploreEventCard, RadarEventCard, TodayEventCard | Design beibehalten, SpotEvent/UUIDs und Eventdetail-Routen erhalten. Keine erfundene Veranstalterzuordnung. |
| RadarMap.types.ts | Standortanzeige und sichtbarer Umkreis mit LocatedEvent kombiniert; Kartenmarker benötigen gültige GPS-Daten. |
| src/data/events.ts | Bewusste Löschung erhalten. Keine Fixture-Veranstaltungen in der App. |
| EventDetailScreen.tsx | Neues Layout/Fotobetrachter auf useEvent und echte Source-Felder umgestellt. Laden/Fehler, Quellenlink, Backlink, echte Endzeit und sicheres Live-Kennzeichen erhalten. Keine Symbolfotos als Besuchermedien. |
| ExploreScreen.tsx | Neue Vorschau/Kalender/Filter mit useUpcomingEvents; Demnächst statt nicht belegter Popularität, echte Leer-/Fehlerzustände. |
| RadarScreen.tsx | Neues Karten-/Standortlayout mit useLiveEvents, Radiusfilter und echtem laufenden Zeitintervall. |
| SavedEventsScreen.tsx | Neues Branding und echte über UUIDs nachgeladene Merklisten-Einträge. |
| TodayEventsScreen.tsx | Neue Filtergestaltung mit derselben tatsächlichen Live-Auswahl wie Radar. |

Nicht konfliktbehaftete Designänderungen ebenfalls geprüft: Kartenmarker, Standort-/Pin-Animation, Profilgestaltung und Stadt-/Kategorieauswahl. Startup-SVG nutzt auf Web aria-hidden und auf Native die passenden Accessibility-Props; dadurch keine React-DOM-Prop-Warnungen mehr.

## Fachliche Grenzen ohne erfundene Daten

Das vorhandene Eventschema liefert keine bestätigte Veranstalter-ID, Profile, Social-Media-Zuordnung oder Besucherbeiträge. Der Design-Branch hatte dafür aus Demo-Events abgeleitete Veranstalter und Symbolfoto-Beiträge. Diese wurden nicht als echte Daten übernommen. Designkomponenten bleiben erhalten, ihre Sammlungen bleiben leer; die Veranstalterroute zeigt „Veranstalterprofil noch nicht verfügbar“. Keine Verknüpfung allein anhand eines Eventtitels.

Echte Eventkarten öffnen Eventdetails. Ein späteres produktives Veranstalterdatenmodell und die Frage, ob Eventkarten zusätzlich Veranstalterprofile verlinken sollen, benötigen eine eigene fachliche Entscheidung. BeReel-Upload bleibt ausdrücklich nicht verfügbar. Fotobetrachter zeigt nur vorhandene Quellbilder; kein erfundener Medienfeed.

Vollständige frühere Designchronik: [DESIGN_BRANCH_STATUS.md](history/DESIGN_BRANCH_STATUS.md). Historische Demo-Aussagen gelten nicht für diesen Integrationsbranch.

## Tatsächliche Prüfungen

- Expo SDK 58-Dokumentation zu Router und Splashscreen gelesen. expo-splash-screen ~58.0.13 aus dem Design-Branch über expo install installiert; keine zusätzliche App-Funktion oder Backend-Abhängigkeit ergänzt. Das SDK-kompatible Installieren aktualisierte auch drei vorhandene transitive Expo-Hilfspakete; Lockdatei enthalten. Kein npm audit fix ausgeführt.
- Expo-Lint **ohne Cache** erfolgreich. Der alte Cache hatte vor der Installation noch das fehlende Splashscreen-Paket gemeldet; Abschlussprüfung ohne Cache ist grün.
- TypeScript-Appcheck erfolgreich.
- Vollständiger abschließender lokaler Lauf: **70 Tests bestanden, 0 Fehler, 0 übersprungen**, einschließlich der bisherigen 67 SQL-/Cron-/Importer-/Eventtests und drei neuer Komponenten-Integrationsprüfungen: alle vier Eventkarten mit UUID-Routen; Details mit echtem Ressourcenobjekt/Quellenlinks; Lade-/Fehlerzustände ohne alte Ersatzdaten.
- Echter Headless-Browser (Edge, 390 × 844): **28 kommende Supabase-Events**, Auswahl „Psy & Night Trance 2nd Edition powered by PULSSCHLAG“, UUID df2c0fa3-c48e-4406-aeb5-e43746c8fb78. Neue Detailansicht zeigt Titel, tatsächliche Termine und Quellenlink. Goabase-Backlink vorhanden. Radar „0 Events laufen jetzt“, korrekter Leerzustand; keine künstlichen Live-Events. 5 Supabase-GETs, **0 Schreibanfragen**, keine JavaScript-Fehler; abschließender Durchlauf auch ohne untersuchte React-Prop-Warnungen.
- Screenshots nur lokal/Git-ignoriert unter supabase/.temp/integration-*.png. Keine Schlüssel, Header oder vollständigen API-Antworten in Bericht/Git.
- Produktionsfunction/SQL/Cron-Dateien und bestehender App-Lese-Service identisch zu Jacint-branch. .env.local unverändert. Keine Backend-Skripte ausgeführt.

Grenzen: Browserprüfung ersetzt keinen iOS-/Android-Gerätetest; insbesondere native Karte und Splashscreen im Release-Build noch prüfen. Bei 0 echten Live-Events wurde kein realer Live-Pin angetippt; UUID-Navigation der Karten und Live-/GPS-Filter sind lokal getestet. Bereits eingerichtete Cron-Automatik wurde für diese Integration weder verändert noch erneut abgenommen.

Der Paketmanager meldete bei der Installation 17 Audit-Funde (1 niedrig, 13 mittel, 3 hoch). Deren Herkunft wurde in diesem Merge nicht separat untersucht; kein automatisches oder erzwungenes Dependency-Upgrade vorgenommen. Native Release-Prüfung und Dependency-Audit bleiben gesonderte Folgeschritte.

Der kombinierte Stand ist für einen Pull-Request-Review vorbereitet. Veröffentlichung des Integrationsbranches/PR und Merge nach main sind noch nicht ausgeführt.
