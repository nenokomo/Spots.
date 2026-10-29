# Projektstatus

Stand: 29.10.2026

## Aktuell: Kartenraster für Entdecken

- Als Alternative zur einspaltigen Liste zeigt Entdecken Events in einem zweispaltigen, dunklen Kartenraster mit Bild und kompakten Informationen. Suche, Filter, Kalender und Eventlinks bleiben bestehen; einzelne letzte Karten bleiben halbbreit.

## Aktuell: Kalenderbutton in der Entdecken-Kopfzeile entfernt

- Das Kalender-Icon oben rechts ist entfernt; der Kalender bleibt über „Datum wählen“ erreichbar.

## Aktuell: Entdecken neu gestaltet

- Entdecken als ruhigere, einspaltige Eventliste überarbeitet: zurückhaltende dunkle Karten mit kleinen Symbolfotos, klaren Metadaten und dezenten Spots-Akzenten statt großformatiger, farbintensiver Kacheln.
- Suche, kompakter Genre-Filter, Zeitraum-Schnellfilter und Kalender mit exakter Datumsauswahl bleiben verfügbar. Inhalte scrollen als eine Liste; die untere Navigation und ihr Schutzabstand bleiben erhalten. Demo-Kennzeichnung und Event-Detailnavigation bleiben bestehen.
- Bestehende Demo-Daten und bestehende Filtersemantik unverändert; Speicherung ist weiterhin nicht implementiert.
- Browserprüfung bei 320 × 640 und 375 × 812: Suche, Genreauswahl, Datum 30.10., Eventdetail und Tabwechsel funktionieren. Lint, Typecheck und Editor-Diagnosen erfolgreich; native Gerätetests stehen aus.

## Aktuell: Überschrift leicht angehoben

- Überschrift und Unterzeile auf „Alle Spots“ um 8 px nach oben versetzt; die Position von Filter und Eventliste bleibt gleich.

## Aktuell: Vereinfachte obere Leiste

- Auf der „Alle Spots“-Seite wurden der kleine Text „Deine Nacht“ und der Kartenbutton rechts entfernt. Der Radar-Zurückbutton links bleibt erhalten.

## Aktuell: Filter an der Eventliste

- Abstand zum Titelbild liegt nun vor dem Filter statt zwischen Filter und Liste. Der Filter sitzt somit direkt über dem Demo-Hinweis und den Eventkarten; das Öffnen von Kategorie- und Umkreisauswahl bleibt unverändert.

## Aktuell: Mehr Platz für das Titelbild

- Die Eventliste inklusive Demo-Hinweis beginnt ungefähr eine Kartenhöhe weiter unten. Überschrift und Filter bleiben an ihrer Position; beim Scrollen bleibt die Liste vollständig erreichbar.

## Aktuell: Umkreis im Filterbereich

- Die ausgeschriebene Umkreiszeile auf „Alle Spots“ entfernt. Der bestehende Filter öffnet nun Kategorieauswahl und Umkreisregler gemeinsam; der Bereich bleibt nach einer Kategorieauswahl offen und lässt sich über den Filterbutton schließen. Auswahl und Umkreis wirken weiterhin auf die Liste.

## Aktuell: Feinschliff zurückgenommen

- Auf Nutzerwunsch die Änderungen des letzten Feinschliffs zurückgenommen: ursprüngliche Abstände, Kartenfarben und Anordnung von Umkreis und Filter wiederhergestellt. Das zuvor bestätigte DJ-Bild und alle Funktionen bleiben unverändert.

## Aktuell: Feinschliff für „Alle Spots“

- Bestehendes DJ-Foto, Bildausschnitt und grundsätzlichen Seitenaufbau beibehalten. Titel in der oberen Leiste unabhängig von den unterschiedlich breiten Tasten zentriert, Abstände und Kontraste verfeinert.
- Kategorie und Umkreis als kompakte nebeneinanderliegende Bedienelemente mit klaren 44-px-Touchflächen; bei wenig Platz umbrechend. Neue Listenüberschrift und separate Demo-Kennzeichnung verdeutlichen die Hierarchie.
- Eventkarten dezent abgedunkelt und Abstände optimiert, genreabhängige Akzentfarben und Herz bleiben erhalten. Bestehende Filter, Umkreis und Eventnavigation unverändert.

## Aktuell: DJ-Foto ohne Seitenränder

- Foto-Hintergrund passt seine Höhe proportional an das Seitenverhältnis des DJ-Bildes (768 × 960) an, sodass es bildschirmbreit und ohne seitliche Balken vollständig eingepasst wird. Die Liste liegt weiterhin darüber; dunkle Verläufe sorgen für Lesbarkeit.

## Aktuell: Tatsächliche Verkleinerung des DJ-Fotos

- Bildfläche explizit auf Breite und Höhe des Kopfbereichs begrenzt. Damit überschreiben im Browser die ursprünglichen Bildabmessungen die Einpassung nicht mehr; das vollständige Motiv wird mit `contain` skaliert. Die vorherige Änderung des Resize-Modus allein war im Browser nicht ausreichend.

## Aktuell: DJ-Foto vollständig eingepasst

- Das DJ-Foto im Kopfbereich der „Alle ansehen“-Seite wird proportional vollständig eingepasst, statt als stark vergrößerter Ausschnitt dargestellt. Der dunkle Hintergrund und der Verlauf für lesbare Schrift bleiben erhalten.

## Aktuell: Neues DJ-Bild im Kopfbereich

- Das neu vom Nutzer bereitgestellte DJ-Foto `today-hero-dj.png` wird probeweise im Kopfbereich der „Alle ansehen“-Seite verwendet. Layout, Abdunklung, Filter und Eventkarten unverändert; bisherige Fotos bleiben erhalten.

## Aktuell: Kompakter Kategoriefilter

- In „Alle Spots in deiner Nähe“ ist nur „Spots“ pink; der restliche Überschriftentext ist weiß.
- Die dauerhaft sichtbare Kategorie-Leiste wurde durch einen Filterbutton ersetzt. Ein aufklappbarer Bereich bietet weiterhin alle bestehenden Kategorien als Einzelauswahl; nach der Auswahl schließt er sich und der Button zeigt einen aktiven Filter. Umkreis und Radar-Kontext bleiben unabhängig erhalten.

## Aktuell: Herzsymbol auf Eventkarten

- Auf der „Alle ansehen“-Liste ersetzt ein Herz ohne Beschriftung das Lesezeichen mit „bald“. Die Anzeige ist weiterhin keine Speicherfunktion; die gesamte Karte öffnet wie bisher die Eventdetails.

## Aktuell: Überschrift und vorheriges Kartendesign

- Überschrift auf „Alle Spots in deiner Nähe“ geändert. Eventkarten verwenden auf Wunsch wieder ihre vorherigen genreabhängigen Verläufe und Akzent-Chips; das zuletzt ausgewählte Headerbild bleibt unverändert.

## Aktuell: Ruhigere „Deine Nacht“-Seite

- Das zuvor vom Nutzer bereitgestellte Partyfoto `today-hero.png` ersetzt das Symbolfoto im oberen Kopfbereich; die übrige Seite behält den dunklen Hintergrund der ursprünglichen Gestaltung.
- Eventkarten verwenden denselben zurückhaltenden dunklen Violettverlauf und neutrale Genre-Chips statt genreabhängig wechselnder Farben. Aufbau, Spots-Akzente, Filter und Eventfunktionen bleiben erhalten.

## Aktuell: Ursprüngliche „Alle ansehen“-Gestaltung wiederhergestellt

- Auf Nutzerwunsch die erste Gestaltung der neuen „Deine Nacht“-Seite wiederhergestellt: ursprüngliches `nightlife.jpg` nur im Kopfbereich, dunkle Verläufe und genreabhängig getönte Karten wie in der ersten Version. Ganzseitiges Foto und nachträglich hinzugefügte Glaskarten entfernt; die hochgeladenen Fotos bleiben als Assets erhalten.

## Aktuell: Hintergrundbild verschoben

- Das ganzseitige Foto auf „Alle ansehen“ ist nach links verschoben; es füllt den Hintergrund weiterhin ohne freie Ränder. Karten und Lesbarkeitsverlauf bleiben unverändert.

## Aktuell: Ganzseitiges Foto und Glaskarten auf „Alle ansehen“

- Nutzerfoto liegt bildschirmfüllend hinter der Heute-Unterseite und bleibt beim Scrollen fest stehen; durch proportionalen Cover-Zuschnitt können Bildränder abgeschnitten werden. Ein dunkler Verlauf schützt die Lesbarkeit.
- Eventkarten verwenden wiederverwendbares GlassBackdrop mit ruhiger, dunkler Tönung: natives Liquid Glass auf unterstützten iOS-Geräten, statischer Glaseffekt ohne Blur auf Android und im Browser. Inhalte, Genre-Chips und Eventnavigation unverändert.
- Browserprüfung: Hintergrund über vollständige 375 × 812 Ansicht, House-Filter drei Treffer und Eventdetails erreichbar. Lint und Typecheck erfolgreich; native Glasdarstellung und Performance noch nicht auf Geräten geprüft.

## Aktuell: Ruhigeres „Alle ansehen“-Design

- Headerfoto wird proportional eingepasst, sodass mehr vom gesamten Bild statt eines stark vergrößerten Ausschnitts sichtbar ist; der dunkle Lesbarkeitsverlauf bleibt erhalten.
- Eventkarten und ihre Genre-Chips auf ein einheitliches dunkles Farbschema umgestellt; genreabhängige bunte Hintergründe entfernt. Eventbilder, Inhalte und Aktionen bleiben unverändert.
- Browserprüfung: Headerfoto geladen und alle zehn Demo-Eventkarten mit derselben Hintergrundfarbe. Lint und Typecheck erfolgreich; native Darstellung nicht auf Geräten geprüft.

## Aktuell: Ausgetauschtes Headerbild

- Das neu vom Nutzer bereitgestellte Partyfoto `assets/events/today-hero-party.png` ersetzt das vorherige Headerbild auf der „Alle ansehen“-Seite; der dunkle Verlauf bleibt erhalten. Das vorherige Foto bleibt als Asset erhalten.

## Aktuell: Eigenes Headerbild für „Alle ansehen“

- Vom Nutzer bereitgestelltes Partyfoto als lokale `assets/events/today-hero.png` eingebunden, ausschließlich im Kopfbereich der Heute-Unterseite. Dunkle Lesbarkeitsverläufe bleiben erhalten; Eventbilder und Filter unverändert.
- Browser bestätigt erfolgreich geladenes Headerbild (564 × 847 Pixel). Lint und Typecheck erfolgreich. Bildherkunft in der Asset-Dokumentation separat von Unsplash vermerkt.

## Aktuell: Neue „Deine Nacht“-Liste nach Designvorlage

- Radar → „Alle ansehen“ öffnet eine neu gestaltete Heute-Seite mit vorhandenem Party-Symbolfoto als abgedunkeltem Hintergrund, eigener Safe-Area-Kopfleiste, Radar-Zurückknopf, Kartenknopf und „Die Nacht ruft.“ mit Spots-Akzentfarbe.
- Horizontale Genre-Chips mit SVG-Icons und aufklappbarer Umkreisregler (10–50 km). Änderungen bleiben in den URL-Parametern dieser Liste; Radar-Zentrum und anfängliche Filter werden weiterhin vom Radar übernommen. Heute-/05:00-Nachtregel unverändert, Demo-Hinweis und Leerzustand vorhanden.
- Eigene kompakte Eventkarten: Bild links, Kategorien oberhalb des Titels, Datum/Ort, dezente farbige Verläufe und Detailpfeil. Lesezeichen ausdrücklich als „bald“ markiert; keine nicht vorhandene Speicherfunktion vorgetäuscht. Bestehende Eventkarten auf Radar/anderen Seiten unverändert.
- Route delegiert an TodayEventsScreen außerhalb des Routenordners; TodayEventCard als kleine separate Komponente. Keine neuen Abhängigkeiten oder Eventdaten/Bilder ergänzt, statische Verläufe statt zusätzlicher Blur-Ebenen auf Android.
- Browserprüfung bei 320 × 640 und 375 × 812: Karten 108 px hoch, zehn Karlsruhe-Demos, House-Filter drei Treffer, Umkreis auf 10 km, Eventdetails und Kartenrückkehr erfolgreich. Lint und Typecheck erfolgreich; native Darstellung weiterhin ohne Gerätetest.

## Aktuell: Automatischer Radar-Standort und Suche schließen

- Radar fragt bei jedem Öffnen/Fokussieren einmalig den Vordergrundstandort ab und zentriert darauf, ohne neuen Radar-Scan oder laufendes Standorttracking. Vorhandene frische Positionen werden weiter genutzt; manuelle Stadtauswahl bleibt während des Radarbesuchs möglich.
- Erstmalige Standortfreigabe wird angefragt; abgelehnte Freigaben werden bei automatischen Tabbesuchen nicht erneut angefordert. Ohne Freigabe, ausgeschalteten Diensten oder bei Fehlern bleibt die bisherige Karte mit erklärendem Hinweis nutzbar. Manuelle Standorttaste weiterhin verfügbar; eine zwischenzeitliche Stadtauswahl wird nicht von alten Standortantworten überschrieben.
- Tippen außerhalb der Radar-Städtesuche schließt Tastatur und Ergebnisliste und leert die Suche. Touch-/Pointer-Ereignisse innerhalb der Suche bleiben geschützt, damit Eingabe und Ergebniswahl funktionieren. Auch Verlassen des Radar-Tabs schließt die Suche.
- Verifiziert im Browser: automatische Zentrierung bei Tab-Rückkehr mit vorübergehend simuliertem Karlsruhe-Standort (Browserfunktionen anschließend wiederhergestellt), Suchfokus und Ergebnisliste nach Klick auf Karte geschlossen. Lint, Typecheck und Editor-Diagnosen erfolgreich. Reale GPS-/Berechtigungsdialoge sowie Bildschirmtastaturen auf iOS/Android noch auf Geräten prüfen.

## Aktuell: Frei schwebende, kompakte Navigation

- Vollbreitenbalken hinter der Navigation entfernt: Die gemeinsame Glas-Kapsel liegt absolut über dem Inhalt, mit 24 px Seitenabstand, 60 px Höhe und sicherem Abstand zur unteren Systemleiste. Plattformgerechte Glas-Ersatzdarstellung bleibt erhalten.
- „Heute in deiner Nähe“ reicht auf dem Radar bis zum unteren Bildschirmrand; der bisherige Panelverlauf bleibt ohne Glas. Listeninhalt und Demo-Hinweis bleiben oberhalb der Navigation erreichbar.
- Iconflächen auf 30 × 28 px verkleinert, Beschriftungen direkt darunter. Gemeinsame Abstandsdefinition schützt auch die scrollbaren Inhalte in Entdecken und Profil vor Überdeckung.
- Verifiziert im Browser bei 375 × 812 und 320 × 640: Panel endet exakt am Bildschirmrand, Kapsel 60 px hoch, kein opaker Navigationsbalken. Alle drei Tabwechsel erfolgreich; Radar-Label rund 2,5 px unter dem Icon. Lint und Typecheck erfolgreich. Native Safe-Area-/Glasdarstellung noch ohne Gerätetest.

## Aktuell: Gemeinsame Glas-Kapsel der Navigation

- Radar, Entdecken und Profil liegen gemeinsam in einer abgerundeten Glas-Kapsel, statt jeweils in einem einzelnen Kreis. Icons und Beschriftungen bleiben getrennt anklickbar; aktive Auswahl weiterhin pink.
- Gemeinsame Fläche mit seitlichem Abstand und Safe-Area-Abstand unten. iOS verwendet bei Verfügbarkeit natives Liquid Glass, Android/Browser weiterhin die statische Variante ohne Blur.
- Einzelne Icon-Glasflächen und ihre Ringkonturen entfernt. Partydaten und die 05:00-Nachtregel unverändert.

## Aktuell: Glas-Iconkreise und Partynacht bis 05:00

- Untere Navigation mit je einer 44-px-Glasfläche direkt um Radar-, Entdecken- und Profilicon; aktive Auswahl mit Akzentkontur. Labels und restlicher Navigationshintergrund bleiben ohne Glas. Gemeinsame [GlassTabIcon](src/components/GlassTabIcon.tsx)-Komponente verwendet die vorhandene iOS-/Android-Ersatzlogik.
- Die zehn Karlsruhe-Demos haben feste neue Termine am **29.10.2026** um 21/22 Uhr, ohne doppelte Events. Sie bleiben ausdrücklich fiktive Beispiele und werden nicht automatisch täglich neu datiert.
- [partyWindowKey](src/utils/events.ts) definiert die Nachtregel in `Europe/Berlin`: zwischen 00:00 und 04:59 enthält die Heute-Auswahl zusätzlich den vorherigen Veranstaltungstag. Ab 05:00 entfällt der Vortag; Events des aktuellen Kalendertages bleiben enthalten.
- Radar, Heute-Unterseite und Heute-Schnellfilter in Entdecken nutzen dasselbe Partyfenster. Der normale Monatskalender filtert weiterhin nach exaktem Kalenderdatum. Aktualisierung alle 30 Sekunden und beim Zurückkehren in den Vordergrund.
- Verifiziert: zehn Karlsruhe-Pins und Listeneinträge, Tabwechsel ohne neuen Scan, Navigation in mobiler Browsergröße. Zeitchecks für Mitternacht, exakt 05:00, Sommer-/Winterzeitwechsel und Jahreswechsel erfolgreich. Lint und Typecheck erfolgreich; native Glasoptik weiterhin ohne Gerätetest.

## Aktuell: Glas-Ausnahmen auf Radar und Navigation

- „Heute in deiner Nähe“ auf dem Radar verwendet wieder den bisherigen violett-pinken Panelverlauf ohne Glas; auch die Eventkarten innerhalb dieses Panels nutzen keine Glasoptik.
- Untere Navigation (Radar, Entdecken, Profil) wieder mit normalem App-Verlauf statt GlassBackdrop.
- Kilometeranzeige und Standorttaste auf der Karte wieder mit ihren normalen dunklen Hintergründen, ohne native oder statische Glasdarstellung.
- Übrige Glasflächen unverändert, insbesondere Suche, Filter-/Kalenderdialoge, Eventdetails und Profil.

## Aktuell: Plattformgerechte Glasgestaltung

- SDK-kompatibles `expo-glass-effect` 58.0.5 über `expo install` ergänzt. Gemeinsame dekorative [GlassBackdrop](src/components/GlassBackdrop.tsx)-Schicht mit separater [iOS-Implementierung](src/components/GlassBackdrop.ios.tsx).
- Echtes natives Liquid Glass nur bei verfügbarer iOS-26-API/kompatiblem Build und erlaubter Transparenz. Ein zentraler [GlassProvider](src/components/GlassProvider.tsx) berücksichtigt „Transparenz reduzieren“ und Änderungen während der Laufzeit. Bei fehlender API/native Modul wird die statische Ersatzdarstellung genutzt.
- Android und Browser verwenden ausschließlich die statische [Glasoptik](src/components/GlassFallback.tsx) mit getönten Flächen, sanftem Verlauf und hellen Kanten – kein BlurView, Backdrop-Filter oder Glas-Animation. Die iOS-spezifische native Implementierung wird nicht in Android eingebunden.
- Eingesetzt in unterer Navigation, Städtesuche, Suchfeld/Kalenderknopf, inaktiven Genrefiltern, Radar-Panel, Radius-/Standorttaste, Filter-/Kalenderdialogen, Eventlisten, Event-Metadaten, Detail-Aktionen/Ticketbereich und Profil-Infokarte. Spots-Farben und sämtliche Interaktionen bleiben erhalten; „Alle ansehen“ bleibt ohne Buttonfläche.
- Animierte Eventkarten, gedimmte Aktionen und dichte Listen nutzen absichtlich nur die statische Variante. Kein Glas auf den Karten-Pins und keine neue Vollbild-Blur-Ebene.
- Browser geprüft: Kalenderdatum, Eventnavigation/Detailreiter, Profil, Radar-Filter und 10-km-Minimum. Android- und iOS-Produktionsbundles erfolgreich exportiert. Lint und Typecheck erfolgreich.
- Native Optik, Barrierefreiheitseinstellungen und FPS noch nicht auf echten Geräten gemessen; keine Garantie identischer Laufzeitperformance. Für native Glasfunktionen ggf. neuen Development-Build erstellen (oder eine passende Expo-Go-Version verwenden); ältere Builds fallen auf statische Flächen zurück.

## Aktuell: Monatskalender, neue Texte und Vorschau per Außentipp

- Kalenderknopf auf Entdecken öffnet einen echten Monatskalender mit Montag als Wochenbeginn, Monatsnavigation, markierten Demo-Eventtagen und deaktivierten vergangenen Tagen. Eigene Komponente [EventCalendar](src/components/EventCalendar.tsx), ohne neue Abhängigkeiten.
- Datumswahl filtert exakt nach dem Veranstaltungstag von `startsAt` in `Europe/Berlin`. Suchtext und Genre bleiben aktiv; der gewählte Tag ist sichtbar und entfernbar. Schnellfilter entfernen die exakte Datumswahl, „Alle Termine anzeigen“ setzt den Zeitraum zurück.
- Neuer Entdecken-Text: „Deine Nacht wartet. Finde den Beat, der dich rauszieht.“ Die Heute-Unterseite heißt „Die Nacht ruft.“ mit „Dein Abend. Dein Beat. Deine Spots.“; Heute/Radius bleiben als zusätzliche Orientierung sichtbar.
- Pin-Vorschau ohne X und ohne Chevron. Eine transparente Fläche hinter der anklickbaren Eventkarte schließt die Vorschau bei Außentipp, ohne das Event versehentlich zu öffnen. Position bleibt am Kartenbereich ausgerichtet; übrige Listen/Navigation unverändert.
- Browser geprüft: 30.10. → Neon Nights, 06.11. → Club Open Air, 29.10. → leer; Genre-/Suchschnittmenge und deaktivierte Vergangenheit. Kalender bei 320 px Breite bedienbar. Außentipp auf Kopfbereich schließt Vorschau; Tipp auf Vorschau öffnet Eventdetails.
- Kein nativer Gerätetest; keine Änderungen an den Demo-Terminen oder am einmaligen Startscan.

## Aktuell: Startscan nur einmal, identische Radar-/Heute-Auswahl

- Radar-Intro läuft nur einmal je App-Laufzeit. Kein Neustart bei Stadt-/Radiuswechsel, Tabwechsel, Rückkehr aus Eventdetails oder Hintergrund. Der Sitzungsstatus und bereits freigegebene/animierte Event-IDs bleiben ausschließlich im Arbeitsspeicher; ein vollständiger App-Neustart setzt sie zurück.
- Ein unterbrochenes Intro wird beendet statt später erneut gestartet. Neue Partys erscheinen weiterhin gestaffelt, ohne vorhandene Ergebnisse für einen neuen Scan zu leeren.
- Radar-Pins und Heute-Liste verwenden dieselbe nach Datum, Genre und Radius gefilterte Auswahl. Berliner Fixtures sind für 30./31.10. und 06.11.2026 terminiert; am 28.10. gibt es deshalb dort weder heutige Pins noch heutige Listeneinträge. Zukünftige Events bleiben in Entdecken.
- Karten-Vorschau ohne Chevron-Pfeil, nur mit separatem X. Die ganze Eventkarte bleibt ein Link zu den Details; übrige Listen behalten ihre Pfeile.
- Lint und Typecheck erfolgreich. Browser-Neuladen ohne Laufzeitfehler, Stadtwechsel nach Karlsruhe ohne neuen Scan und zehn heutige Partys geprüft. Keine nativen Gerätetests.

## Aktuell: Eventdetails und abgestimmte Radar-Einblendung

- Eventdetailseiten nach neuer Bildvorlage: großes Symbolfoto mit Verlauf, Demo-Badge, Titel/Genres, Datum und Ort, Snaps-Vorschau, Ticketbereich, Aktionszeile und funktionierende Reiter Infos/Line-up/Location/Snaps. Gestaltung bleibt in Spots-Farben.
- Keine erfundenen Besucherzahlen, Ticketpreise oder Snaps. Tickets/Speichern als noch nicht verfügbar gekennzeichnet; für Demo-Koordinaten wird keine echte Veranstaltungsroute angeboten. Teilen öffnet auf bewussten Druck die Systemfunktion mit ausdrücklich als Demo gekennzeichnetem Eventtext; Fehlerzustand vorhanden.
- Pin-Freigabe ist pro Event-ID statt pro gesamter Ergebnisliste gespeichert. Kartenverschiebung erhält bereits sichtbare Marker und fügt nur neue Events gestaffelt hinzu. Fertig eingeblendete Pins wiederholen ihren Effekt beim erneuten Eintritt in den Radius nicht; neue Stadt/Scan startet die Sequenz weiterhin bewusst neu.
- Browser-Marker werden nicht mehr nur wegen Überschreiten des sichtbaren Kartenrands ausgehängt; der Kartencontainer schneidet sie ab.
- „Heute in deiner Nähe“ nutzt dieselbe gestaffelte Freigabe wie die Pins und blendet jede neue Karte mit 280 ms Fade/Slide ein. Während des Scans erscheint ein Ladehinweis statt der fertigen Liste. Bewegungsreduktion überspringt die Effekte.
- „Alle ansehen“ ist wieder ein gut lesbarer Textlink ohne pinke Buttonfläche, mit 44 px Touchhöhe.
- Browser geprüft: Detailreiter und schmale Darstellung (320 px); gemessene Pin-/Listenanzahl während Einblendung jeweils identisch (0/0, 1/1, 2/2 usw.); nach Kartenverschiebung bleibt das DOM-Element eines sichtbaren Pins dasselbe. Transparenter Hintergrund von „Alle ansehen“ bestätigt. Native Darstellung und System-Teilen noch nicht auf Geräten geprüft.
- Prüfstand: Lint vor der abschließenden Pin-Wiederkehrkorrektur erfolgreich; der erneute Lint-Aufruf danach wurde als „rejected by user“ abgelehnt und nicht umgangen. Finaler Typecheck und Editor-Diagnosen erfolgreich.

## Aktuell: Spots, heutige Partys und Suche ab Kartenmitte

Dieser Abschnitt ersetzt die weiter unten dokumentierten älteren Zwischenstände.

- Der Markenname ist **Spots**: Radar-Logo, Browser-Titel, Expo-Anzeigename, Standort-Berechtigungstext und Projektanweisung angepasst. Technischer Slug und URL-Schema bleiben zur Wahrung bestehender Links unverändert. Der native Anzeigename erfordert einen neuen Build.
- „Heute in deiner Nähe“ ist wieder eine vertikale, scrollbar begrenzte Liste mit kompakten Eventkarten. „Alle ansehen“ ist ein kontrastreicher Akzent-Button mit mindestens 44 px Höhe.
- Radar-Liste, `/today` und Heute-Filter in Entdecken vergleichen `startsAt` mit dem tatsächlichen Datum in `Europe/Berlin`; keine dauerhaften `isToday`-Flags mehr. Aktualisierung nach Tageswechsel per Timer und bei Rückkehr aus dem Hintergrund.
- Zehn ausdrücklich fiktive Karlsruhe-Partys hinzugefügt, mit festen Terminen am **28.10.2026**, öffentlichen Gebietskoordinaten und Symbolfotos. Sie werden nicht täglich neu datiert und sind keine echten Veranstaltungen. Die drei Berlin-Beispiele haben feste zukünftige Termine.
- Radius überall 10–50 km, initial weiterhin 30 km; 5-km-Preset und 5-km-Reglergrenze entfernt.
- Ortsauswahl/GPS geben nur das anfängliche Kartenziel vor. Nach Verschieben gilt der Umkreis ab der aktuellen Kartenmitte; Kategorie/Entfernung aktualisieren die Kartenmarker und die heutige Liste. `/today` erhält exakt dieselbe Kartenmitte und Filter.
- iOS/Android melden die neue Mitte bei `onRegionChangeComplete`; Radiuswechsel bleiben an der verschobenen Kartenmitte. Browser-Kacheln bleiben derselbe Anbieter/Stil, unterstützen jetzt Ziehen mit Maus/Touch. Im Browser weiterhin kein freies Pinch-/Mausrad-Zoomen.
- Verifiziert: Karlsruhe über echte Städtesuche ausgewählt, zehn heutige Partys vertikal angezeigt; Minimum 10 km und kein 5-km-Button. Kartenverschiebung bei 10 km reduziert die Auswahl von zehn auf zwei, `/today` zeigt genau dieselben zwei Events.
- Datums-/Radiuschecks: zehn Karlsruhe-Fixtures, heute enthalten/morgen ausgeschlossen, deutsche Mitternachtsgrenze und Ein-/Ausschluss durch Entfernung erfolgreich. Lint und Typecheck erfolgreich; native Karten benötigen weiterhin einen Gerätetest.

## Entdecken nach Bildvorlage

- Kompakter Titel „Entdecken“ mit Unterzeile, Suchfeld, Genrefiltern und horizontaler Zeitraumleiste in den bisherigen App-Farben.
- Große Bild-Empfehlung als Listenheader, weitere Treffer im zweispaltigen Raster. Abgerundete Karten mit Textverlauf, Genre-Tags, Ort, Termin und ehrlichem DEMO-Badge; Eventdetails bleiben verlinkt.
- Eigene Komponente [ExploreEventCard](src/components/ExploreEventCard.tsx). `FlatList` behält virtualisierte Darstellung; Karten mit Mindesthöhe können bei größerer Schrift wachsen.
- Kombinierte Suche, Kategorie- und Zeitraumfilter, Trefferzahl, Leerzustand und Zurücksetzen implementiert. Kalenderknopf öffnet eine Zeitraum-Auswahl, keinen vorgetäuschten echten Kalender.
- Zeitraumfilter nutzen ausschließlich vorhandene Demo-Angaben (Alle, feste Heute-Markierung, Freitag, Samstag, Nächste Woche). Keine erfundenen absoluten Kalenderdaten; echter Heute-/Datumsabgleich bleibt mit einer strukturierten Eventquelle umzusetzen.
- Keine Favoriten, Live-Status, Besucherzahlen, persönliche Empfehlungen oder Standortdistanzen vorgetäuscht. Keine neuen Abhängigkeiten.
- Browser bei 375 × 812 und 320 × 640 geprüft: große Karte und Raster, Suche, Genre, Freitag-Filter, Leerzustand, Zurücksetzen, Zeitraumdialog und Eventnavigation funktionieren. Kein nativer Gerätetest.

## Horizontale Radar-Eventkarten

- „Heute in deiner Nähe“ zeigt nach neuer Bildvorlage horizontal wischbare Bildkarten (136 × 140 px bei Standardschrift), abgerundete Ecken und dunklen Textverlauf über dem Symbolfoto.
- Karten enthalten Titel, Kategorie, aus den Koordinaten berechnete Entfernung zum gewählten Radar-Zentrum und den vorhandenen Demo-Termin. `DEMO` statt eines unbelegten LIVE-Status; keine erfundenen Zeiten oder Distanzen.
- Kompakter Panelkopf, Einrasten beim Wischen, angeschnittene nächste Karte als Scrollhinweis und Demo-Hinweis am unteren Rand. Kartenhöhe wächst bei vergrößerter Systemschrift.
- Eigene Komponente [RadarEventCard](src/components/RadarEventCard.tsx); übrige Eventlisten, Kartenanbieter, Filter und `/today` bleiben unverändert. Keine Favoritenfunktion oder dekorativen funktionslosen Herzbuttons ergänzt.
- Browser bei 320 und 375 px Breite geprüft; Lint und Typecheck erfolgreich. Native Wischgesten noch nicht auf einem Gerät geprüft.

## Kompaktes Radar-Layout nach Bildvorlage

- Kopfzeile mit Logo links, kompakter bearbeitbarer Ortsauswahl mittig und Filtertaste rechts; Kategorien direkt darunter.
- Bestehende Kartenanbieter und Kartenfarben unverändert. Die Karte erhält mehr Platz, da der Radiusregler jetzt im Filterdialog liegt; über die km-Schaltfläche auf der Karte weiterhin direkt erreichbar.
- Standorttaste unten rechts auf der Karte; Ortung weiterhin ausschließlich nach bewusster Betätigung.
- Eventbereich überlappt den unteren Kartenrand um 18 px. Höhenabhängige Panelgröße und kompaktere Eventkarten gelten nur im Radar; andere Listen behalten ihre bisherige Darstellung.
- Vorhandene Farben, Scan, Filter, Stadt-/Standortsuche, Eventvorschau und die Unterseite `/today` bleiben erhalten. Keine neuen Abhängigkeiten oder erfundenen Live-Events.
- Browserprüfung bei 375 × 812 und 320 × 640: Kopf, Standorttaste und Eventkarte innerhalb des Bildschirms; House-Filter, Radiuswechsel auf 20 km und Navigation zu `/today` mit übernommenen Filtern erfolgreich geprüft.
- Expo-Router-Kompatibilität: Styles des Link-Kindes in [EventCard](src/components/EventCard.tsx) werden vor Übergabe mit `StyleSheet.flatten` zusammengeführt.
- `npx expo lint`, `npx tsc --noEmit` und Editor-Diagnosen erfolgreich. Kein nativer Gerätetest dieses Layouts.

## Aktueller Stand nach Rücknahme

Auf Wunsch ist die vorletzte Version wiederhergestellt: der Stand unmittelbar vor dem Hinzufügen der Demo-Standorte in ganz Deutschland. Wiederhergestellt ist der Stand davor: dunkler Hintergrund, Logo „App.“, Bild-Pins, drei Berliner Demo-Events, fester Eventbereich und die vorherige Kartendarstellung. Die zusätzlichen Deutschland-Demos, Datumsfilterung und verstellbare Eventfläche sind entfernt.

## Implementiert

- Radar-Karte auf iOS/Android frei verschieb- und zoombar; bei Stadt- oder Radiuswechsel wird sie weiterhin automatisch zentriert.
- Event-Pins auf nativen und Browser-Karten kompakter gestaltet.
- „Alle ansehen“ unter „Heute in deiner Nähe“ öffnet die separate Router-Seite `/today` mit den aktuellen Radar-Filtern und den heutigen Events, nicht mehr „Entdecken“.

- Dunkler horizontaler violett-pinker Verlauf auf allen Seiten und der unteren Navigation.
- Radar beim Öffnen mit drei vollständigen Umdrehungen in 5,4 Sekunden und Vibrationsimpulsen auf Mobilgeräten. Zunächst keine Pins; danach blendet sich der Radar aus und Bild-Pins erscheinen mit 320 ms Abstand.
- Runde Event-Vorschaubilder an Pins, Marker-Vorschau und Eventdetails mit Zurück-Navigation.
- Filter für Alle, Techno, House, Party und Clubs; Kategorie und Entfernung gelten für Karte und Liste.
- Kilometer-Schieberegler im Filterdialog: 5–50 km, initial 30 km. Aktualisiert die Anzeige beim Ziehen und Karte/Liste beim Loslassen. Presets bleiben erhalten.
- Städtesuche oberhalb der Filter mit echten Vorschlägen über Open-Meteo/GeoNames, Lade-, Leer- und Fehlerzuständen sowie Abbruch veralteter Anfragen. Auswahl zentriert die Karte und startet den Scan erneut.
- Separater Standortpfeil: Zugriff nur auf bewussten Druck. Ohne Freigabe bleibt die gekennzeichnete Berlin-Demo nutzbar. Eine gewählte Stadt wird nicht durch eine ältere GPS-Anfrage überschrieben.
- Drei feste, klar gekennzeichnete Berliner Demo-Events: Neon Nights, House Session und Club Open Air. Keine automatisch um den Nutzer erfundenen Marker und keine privaten Adressen.
- Kompakter Eventbereich am unteren Kartenrand mit scrollbarer Liste. Die Radar-Vorschau enthält weiterhin alle passenden Demo-Termine; `/today` nutzt feste Demo-Markierungen für heute, noch keine echten Kalenderdaten.
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
- Internetzugriff für Karten und Städtesuche erforderlich. Freies Kartenverschieben/Zoomen auf iOS und Android; Browser-Kacheln weiterhin ohne Gestensteuerung. Keine Offline-Kacheln.
- Vor Veröffentlichung Google-Maps-Konfiguration für Android sowie kommerziellen Geocoding-Tarif/Anbieter klären.
- Registrierung, Favoriten, echte Datumsfilter, Veranstalterinformationen, Tickets und Live-Snaps fehlen weiterhin.

## Nächste Schritte

1. Den wiederhergestellten Stand auf iOS/Android prüfen.
2. Weitere Designänderungen gezielt abstimmen.
3. Echte Eventquelle und strukturierte Termine anbinden.
4. Anmeldung, Favoriten und später Live-Snaps mit Ablauf, Datenschutz und Moderation ergänzen.


