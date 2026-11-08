# Projektstatus

Stand: 06.11.2026

## Aktuell: Höherer Bildkopf, gleichmäßige Karten und Wischgalerie

- Headerhöhe von Breite/2,16 auf Breite/1,8 erhöht; mindestens 200 px. Eventname/Bio verbleiben unterhalb des begrenzten Fotos.
- Beide Informationsspalten erhalten identische berechnete Breiten; beide Reihen dieselbe schriftgrößenabhängige Mindesthöhe. Merken-Karte wächst mit der Zeile.
- Neue EventPhotoViewer-Komponente: horizontal blätterbare Galerie mit Seiteneinrasten, Start beim gewählten Bild und Zähler. Vertikales Wischen ab 80 px oder schneller kurzer Geste schließt die Großansicht; kurze Gesten federn zurück. Pfeile entfernt, Schließen-Button bleibt als barrierearme Alternative.
- Bilder bleiben Demo-Symbolfotos. Keine neuen Abhängigkeiten.
- Expo Lint und TypeScript erfolgreich. Browser: Öffnen des dritten Fotos, korrekter Zähler und Schließen durch vertikale Ziehgeste geprüft. Native horizontale/vertikale Touchgesten auf iPhone/Android noch zu prüfen.

## Aktuell: Fehlerhafte Bildausdehnung und kollabierte Kacheln korrigiert

- Nutzer-Screenshot zeigte überlaufendes Headerbild hinter Bio/Infokarten und zu Linien kollabierte Beitragsbilder.
- Header mit expliziter, aus gemessener Containerbreite berechneter Höhe und overflow hidden begrenzt. Bilder haben explizit 100 % Breite/Höhe statt ausschließlich absoluteFill mit intrinsischen Bildmaßen.
- Beitragskacheln erhalten numerische Breite/Höhe aus gemessener Containerbreite, weiterhin drei Spalten und bisherige Proportionen. Layoutmessung berücksichtigt Rotation und Safe Areas.
- Expo Lint und TypeScript erfolgreich. Mobile Browserprüfung durchgeführt; native iPhone-Prüfung nach Neuladen noch offen.

## Aktuell: Referenzproportionen der Eventseite präzisiert

- Bildkopf wieder im Verhältnis 2,16:1 zur Bildschirmbreite; rundes Profilbild unten links innerhalb des Fotos. Eventname jetzt wie in der hochgeladenen Vorlage direkt unter dem Bild.
- Abstände, Bio, 2×2-Infokarten und Upload-Feld kompakter auf die Referenz abgestimmt. Spots-Farben und vorhandene Symbole unverändert.
- Beiträge-Überschrift direkt vor dem dreispaltigen Raster; Demo-Kennzeichnung am Seitenende statt zusätzlicher Zwischenzeile. Foto-Großansicht und alle vorhandenen Aktionen erhalten.
- Weiterhin nur Symbolfotos, keine erfundenen Video-Laufzeiten oder echten Uploads. Native visuelle Prüfung weiterhin offen.
- Expo Lint, TypeScript und Editor-Diagnosen erfolgreich.

## Aktuell: Eventdetail nach Referenz vom 06.11.2026

- Größerer Bildkopf mit rundem Profilbild und Eventname innerhalb des Fotos. Bestehende Spots-Farben, Systemschrift und Icons erhalten; Zurück, Teilen und Event-Einstellungen oben.
- Bio direkt darunter, optionales individuelles Datenfeld biography; ohne hinterlegten Inhalt ehrlicher Leerzustand. Kein Veranstalter-Editor oder Backend vorhanden.
- Standort mit vollständiger vorhandener Ortsangabe, Datum, Tickets und lokale Merkfunktion als abgestimmtes 2×2-Raster.
- Pink umrandeter Bereich „BeReel hochladen“ und drei Spalten für Beiträge. Symbolbilder klar als Demo gekennzeichnet; Antippen öffnet eine bildschirmfüllende Fotoansicht mit Vor-/Zurücknavigation und Schließen.
- Informationen in schließbaren Dialogen statt aufklappender Zwischenbereiche. Einstellungen erläutern den fehlenden Veranstalterzugang.
- Bestehende Event-Routen aus Radar und Entdecken geprüft und erhalten.
- Weiterhin offen: echte Foto-/Video-Uploads, Video-Wiedergabe, Veranstalterbeiträge, Bio-Bearbeitung, serverseitiger 24-Stunden-Ablauf, Anmeldung und Moderation. Keine dieser Funktionen wird als implementiert dargestellt.
- Expo Lint, TypeScript und Editor-Diagnosen erfolgreich. Visuelle Prüfung auf iOS/Android noch offen.

## Aktuell: Eventprofil nach neuer mobiler Bildvorlage

- Titelbild proportional und textfrei; Profilbild links innerhalb des Bildes. Eventname unmittelbar darunter, gefolgt von Bio und den vier Standort-/Datum-/Ticket-/Merken-Feldern.
- Großer pink umrandeter Snap-Upload-Kasten oberhalb der Beiträge wiederhergestellt; öffnet den ehrlichen Hinweis zum noch nicht verfügbaren Upload.
- Sechs vorhandene Symbolfoto-Vorschauen mit gerundeten Ecken und Zwischenräumen im 3×2-Raster. Keine erfundenen Videolaufzeiten oder funktionslosen Einstellungsbuttons aus der Vorlage übernommen.


## Aktuell: Eventprofil-Raster und sichtbare Aktionsfelder korrigiert

- Standort/Datum und Tickets/Merken stehen in zwei expliziten Reihen. Verschachtelte Merken-Karte mit prozentualer Höhe entfernt; lokale Merkfunktion bleibt erhalten.
- Tickets öffnen einen eigenen Hinweis zum fehlenden Ticketverkauf. Große permanente Detail-Tabs und initialer Leerraum entfernt; Zusatzinfos erscheinen auf Anforderung.
- Sechs lokale Symbolfoto-Vorschauen in einem bündigen 3×2-Raster, ohne graue Platzhalter. Bildheader bleibt textfrei; Eventname und Bio stehen darunter.
- Lint und TypeScript geprüft. Keine laufende Browser-Vorschau auf Port 8081 vorhanden; Darstellung auf Geräten noch nicht visuell verifiziert.


## Aktuell: Bildheader ohne Text und ohne Beschreibung

- Hintergrundbild im Eventprofil deutlich verkleinert; es enthält jetzt ausschließlich das Bild und das überlappende Eventlogo, ohne Eventname, Bio, Datum oder Standort.
- Eventname steht außerhalb unter dem Bild. Der separate Beschreibungstext wurde entfernt; unter dem Eventnamen bleibt nur die Bio.


## Aktuell: Profilvorlage an den hochgeladenen Entwurf angenähert

- Eventdetailseite mit großem Bildkopf, überlappendem Eventlogo und Eventname als Profilheader angepasst.
- Beschreibung und Bio stehen darunter; Standort, Datum, Tickets und Merken erscheinen als gleichartige 2×2-Infofelder.
- Beiträge sind am Seitenende als sechs große quadratische Kacheln in einem 3×2-Raster angeordnet. Lint und TypeScript erfolgreich.


## Aktuell: Eventprofil klar in Bild, Inhalt und Beiträge getrennt

- Eventdetails neu geordnet: Das obere Hintergrundbild enthält nur das Bild, das überlappende Eventlogo und den Eventnamen. Datum, Standort und weitere Informationen liegen nicht mehr im Bildbereich.
- Unter dem Header stehen zuerst Beschreibung und Bio, danach Datum/Standort, Ticket- und Aktionsbereiche. Das Beiträge-Raster befindet sich am Ende der Seite.


## Aktuell: Instagram-artiger Profilkopf und Beitragsraster

- Das Titelbild im Profilkopf ist jetzt bildrein, kompakter und höher am Seitenanfang positioniert; Text und Verläufe liegen nicht mehr über dem Bild.
- Beiträge werden darunter als größere, randlose quadratische 3-Spalten-Kacheln ohne Text-Overlay dargestellt, näher an einem Instagram-Profilraster.


## Aktuell: Veranstalterprofil als Social-Profilvorlage

- Eventdetails auf eine profilartige Veranstalteransicht umgebaut: großes Titelbild oben, überlappendes Eventlogo als Profilbild links, Veranstaltername, Handle und Bio.
- Datum und Standort stehen jetzt separat unter Eventtitel und Kategorien. Zusätzlich gibt es ein Beiträge-Raster mit drei Demo-Kacheln sowie ein deutliches Snap-Upload-Feld, das zum Snaps-Bereich führt.
- Die Elemente sind weiterhin eine fiktive Demo-Vorlage; echter Profil-Content, Upload und Veranstalterkonten sind noch nicht angeschlossen.


## Aktuell: Veranstalterbereich auf Eventdetails neu gestaltet

- Auf der Eventdetailseite eine neue kompakte Veranstalterkarte ergänzt: klarer „Veranstalter“-Kontext, Initialen-Avatar, Demo-Kennzeichnung, Name, Karlsruhe-Bezug und kurze Beschreibung.
- Die Darstellung bleibt bewusst rein informativ, da die aktuellen Events fiktiv sind und noch keine echten Veranstalterprofile oder Profilnavigation existieren.


## Aktuell: Feste Radius-Buttons aus dem Radarfilter entfernt

- Die redundanten 10/20/30/50-km-Schaltflächen unter dem Umkreis-Slider auf der Startseite entfernt. Der Radius wird jetzt ausschließlich über den Schieberegler und dessen aktuelle km-Anzeige eingestellt.
- Filterlogik, Wertebereich von 10 bis 50 km und die Weitergabe des gewählten Radius bleiben unverändert.


## Aktuell: Fünf weitere Karlsruhe-Testevents

- Fünf ausdrücklich fiktive Karlsruhe-Events für den 05.11.2026 ergänzt: Durlach Dance, Mühlburg Midnight, Nordstadt Neon, Rüppurr Rhythm und Knielingen Bass. Sie verwenden eindeutige IDs, öffentliche Beispielkoordinaten und bestehende Symbolbilder; die Termine bleiben fest und werden nicht automatisch verschoben.
- Die Events sind über die bestehenden Radar-, Heute- und Entdecken-Filter verfügbar, sofern Datum, Ort und Kategorie passen. Keine echten Veranstaltungsdaten oder privaten Adressen ergänzt.


## Aktuell: Schlanke Startscreen-Wortmarke

- Kursive Variante auf Nutzerwunsch ersetzt: Spots-Wortmarke jetzt aufrecht mit Gewicht 300 und 3 px Zeichenabstand. Schriftgröße, Farben und alle übrigen Startscreen-Elemente unverändert.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Native Darstellung noch auf Gerät zu prüfen.

## Aktuell: Markantere Startscreen-Wortmarke

- Ausschließlich die Spots-Wortmarke im Ladescreen auf kräftige kursive Systemschrift (Gewicht 800, Zeichenabstand -2) angepasst. Schriftgröße und Farben samt lila Punkt erhalten; kleiner horizontaler Innenabstand verhindert das Abschneiden kursiver Buchstaben.
- Radarlogo, Hintergrund, Claim, Ladeanzeige und Vibration unverändert. Lint, TypeScript und Editor-Diagnosen erfolgreich; native Optik noch auf Gerät zu prüfen.

## Aktuell: Neuer Radar-Ladescreen und Vibration pro Kartendrehung

- Bildschirmfüllendes Rasterbild im In-App-Startscreen durch skalierbares SVG-Radarlogo ersetzt: feine Ringe, pinker Suchstrahl und Lichtpunkte auf dunkler Fläche. Separate Spots-Wortmarke mit Markenpunkt, Claim und dezente Ladeanzeige; responsive Logogröße und Safe Areas. Neue RadarLogo-Komponente ohne zusätzliche Abhängigkeiten. Altes Bildasset bleibt ungenutzt erhalten.
- Kartenradar führt weiterhin drei Drehungen à 1,8 Sekunden aus, löst den Vibrationsimpuls jetzt aber im Abschluss-Callback jeder vollen Drehung aus statt per separatem Start-/Intervalltimer. Keine Web-Vibration; Bewegungsreduktion, Hintergrundwechsel und Unmount stoppen den Scan. Android-Vibrationsberechtigung bereits vorhanden. iOS verwendet den systemseitigen Vibrationsimpuls (dessen Dauer sich über Vibration nicht verkürzen lässt).
- Native Splash-Konfiguration und die bisherige Mindestanzeigezeit von 850 ms unverändert; Änderung betrifft den In-App-Ladescreen.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Vibrationslogik mit simulierten Animationsabschlüssen geprüft: genau drei Impulse; keine Impulse bei reduzierter Bewegung, Hintergrundabbruch und Web. Optik und tatsächliche Vibration auf iPhone/Android noch auf Gerät zu prüfen.

## Aktuell: Kalender-Paging zurückgenommen

- Auf Nutzerwunsch die letzte Änderung vollständig zurückgenommen: wieder frei scrollbare, fortlaufende Monatsliste mit natürlichen Monatshöhen statt Ein-Monats-Seiten und Einrasten. Zusätzliche innere ScrollViews entfernt.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Native visuelle Prüfung weiterhin offen.

## Aktuell: Kalender zeigt jeweils einen Monat

- Monatsliste auf vertikale Seiten mit gemessener Höhe des sichtbaren Kalenderbereichs umgestellt. Jede Monatsseite füllt den Bereich vollständig, sodass im Ruhezustand kein Folgemonat sichtbar ist; Wischen rastet am nächsten Monatsanfang ein.
- Kurze Monate behalten denselben Platz wie lange Monate. Auf kleinen Ansichten oder bei großer Systemschrift bleibt das Monatsraster bei Bedarf innerhalb seiner Seite scrollbar, damit keine Tage abgeschnitten werden.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Paging und verschachtelte Gesten bei stark vergrößerter Schrift noch auf nativen Geräten zu prüfen.

## Aktuell: Vertikal scrollbarer Entdecken-Kalender

- Monatspfeile durch fortlaufende vertikale Monatsliste ersetzt: November → Dezember → Januar mit Jahreswechsel. Wochentage bleiben oberhalb der Liste sichtbar, Monatsüberschriften stehen links über dem jeweiligen Raster.
- Virtualisierte FlatList lädt am Ende jeweils zwölf weitere Monate. Berechnete Monatshöhen berücksichtigen Wochenanzahl und System-Schriftvergrößerung; beim Öffnen wird der ausgewählte Monat angezeigt, zurückscrollbar bis zum aktuellen Monat.
- Datumsauswahl, Eventpunkte, deaktivierte vergangene Tage und Zurücksetzen auf alle Termine erhalten. Kalenderdialog auf 85 % Höhe mit fester Kopf-/Fußzeile umgestellt, damit nur die Monatsliste scrollt und keine verschachtelten vertikalen ScrollViews entstehen.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Monatsfolge, Jahreswechsel und Raster mit 4/5/6 Wochen inklusive Schaltjahr per Node geprüft. Native Scrollgesten, VoiceOver und Darstellung auf iOS/Android noch auf Gerät zu prüfen.

## Aktuell: Feinere Radar-Ortssuche

- Kompakte Radar-Suchleiste mit dünnem Rahmen, ruhigem transparentem Hintergrund und stärker gerundeter Kontur; zusätzliche GlassBackdrop-Schicht dort entfernt, um doppelten Rahmen und kräftigen Glanz zu vermeiden.
- Dezente kleinere Symbole und 11-px-Schrift mit Gewicht 400. Suchfunktion, Fokuszustand und 44-px-Eingabefläche erhalten.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Native visuelle Prüfung noch offen.

## Aktuell: Größere Radar-Wortmarke

- Nur im Radar Schriftgröße der Wortmarke samt lila Punkt von 11 auf 15 px erhöht. Farben, Zeichenabstand und Kopfzeilen der anderen Tabs unverändert.
- Lint und TypeScript-Check erfolgreich; native Darstellung noch auf Gerät zu prüfen.

## Aktuell: Kopfzeilen enger an die eingekreiste Vorlage angepasst

- Alle vier Tab-Kopfzeilen vollständig in Großbuchstaben, 11 px, Gewicht 800 und 2,4 px Zeichenabstand. Einheitlicher gedeckter Roséton #b58ca9 nach Bildvorlage; Markenpunkt bleibt #c922ab und verwendet dieselbe Schriftgröße, damit er die Zeilenhöhe nicht vergrößert.
- Vorherige gemischte Groß-/Kleinschreibung und unterschiedliche Textfarben entfernt. Große Seitentitel unverändert.
- Lint, TypeScript und Editor-Diagnosen erfolgreich. Optischer Abgleich auf dem Nutzergerät steht aus; keine pixelgenaue Geräteprüfung erfolgt.

## Aktuell: Kleine Markenkopfzeilen nach Bildvorlage

- Tab-Kopfzeilen verwenden 12-px-Systemschrift, Gewicht 700 und 2,2 px Zeichenabstand nach der eingekreisten Vorlage. Seitenzusätze in Großbuchstaben und gedeckter Farbe; Spots bleibt in bisheriger Schreibweise und heller Farbe mit lila Punkt.
- Punkt proportional auf 18 px abgestimmt. Große Seitenüberschriften unverändert.
- Expo Lint, TypeScript-Check und Editor-Diagnosen erfolgreich. Native visuelle Prüfung noch offen.

## Aktuell: Dezentere Kopfzeilen und fünf heutige Karlsruhe-Testevents

- Gemeinsame Markenschrift auf Gewicht 400 mit normalem Zeichenabstand reduziert. Lila Punkt in allen vier Tab-Kopfzeilen über gemeinsamen Stil auf 32 px vergrößert.
- Fünf ausdrücklich fiktive Testevents für Karlsruhe am 04.11.2026 um 21/22 Uhr ergänzt; feste Termine, eindeutige IDs, bestehende Symbolbilder und öffentliche Beispielkoordinaten. Bei passender Orts-/Filterauswahl in Radar, Heute und Entdecken verfügbar. Frühere Events unverändert erhalten.
- Expo Lint und TypeScript-Check erfolgreich. Visuelle Darstellung auf iOS/Android noch auf Gerät zu prüfen.

## Aktuell: Feinere Markenkopfzeilen

- Punkt hinter Spots auf Radar, Entdecken, Gemerkt und Profil einheitlich in der Designfarbe #c922ab.
- Gemeinsame Kopfzeilen-Typografie von Gewicht 900 auf 500 reduziert und Zeichenabstand auf -0,5 angepasst: feinere, weniger gedrängte Systemschrift ohne zusätzliche Font-Abhängigkeit.
- Lint und TypeScript-Check erfolgreich. Native Darstellung noch auf Gerät zu prüfen.

## Übergabe für die nächste Sitzung

- Aktueller Stand auf Nutzerwunsch als gemeinsamer Zwischenstand gesichert: Radar-/Standortsteuerung, dynamischer Kartenumkreis, einheitliche Filter/Kopfzeilen, Deutschland-Städtesuche, Navigation, Profil und ruhige Herzbuttons sowie bildschirmfüllender Radar-Logo-Startscreen.
- Letzter TypeScript-Check erfolgreich; Lint vor der abschließenden reinen Vollbild-Stylekorrektur erfolgreich. Native GPS-, Kartenanimations- und Layoutprüfung weiterhin auf dem iPhone erforderlich.
- Nächster sinnvoller Schritt: Vollständigen App-Neustart auf dem Handy prüfen (Vollbild-Logo, Übergang zum Radar, 30-km-Start und Standorttaste). Native Splash-Konfiguration benötigt neuen Build. Fiktive Events bleiben fest auf ihre jeweiligen Termine datiert und rollen nicht automatisch auf den 04.11. weiter.

## Aktuell: Bildschirmfüllendes Logo im Startscreen

- Radarbild füllt den gesamten In-App-Startscreen proportional mit Cover-Zuschnitt. Separate Wortmarke und Claim entfernt; Ladeindikator bleibt darüber sichtbar. Auf hochkantigen Geräten werden seitliche Bildteile abgeschnitten, ohne das Motiv zu verzerren.

## Aktuell: Radar-Logo aus Nutzervorlage im Ladescreen

- Nutzervorlage mit pinkem Radarstrahl und dunklem Straßenkartenmotiv per Bildgenerierung verfeinert, als assets/spots-radar-logo.png gespeichert und in den Startscreen eingebunden. Zentrale Logo-Abbildung mit Spots.-Wortmarke, Claim und zurückhaltendem Ladeindikator ersetzt die bisherigen dekorativen Ringe und Zusatztexte.
- App-Launcher-Icon und native Splash-Konfiguration bewusst unverändert; die neue Grafik betrifft den gestalteten In-App-Startscreen. Native Darstellung noch auf Gerät zu prüfen.

## Aktuell: Gleichmäßige Radar-Kartenfläche

- Karte und Heute-Panel ausdrücklich auf dieselbe volle verfügbare Breite gesetzt, seitliche 5-px-Ränder entfernt. Beide schließen links und rechts bündig innerhalb des Safe-Area-Containers ab.
- Negative 18-px-Überlappung des Heute-Panels entfernt. Die Karte endet jetzt oberhalb des Panels, damit native Maps-Logos und Quellenangaben am Kartenboden nicht halb verdeckt werden. Standortsteuerung und Zoom unverändert. Native Darstellung noch auf dem betroffenen Handy zu prüfen.

## Aktuell: Navigation beidseitig verbreitert

- Maximale Breite der mittig ausgerichteten Navigationskapsel von 292 auf 360 px erhöht. Links und rechts bleiben auf schmalen Geräten mindestens 16 px Abstand.

## Aktuell: Einheitliche Markenkopfzeilen und zentrierte Navigation

- Radar, Entdecken, Gemerkt und Profil verwenden dieselbe 25-px-Marken-Typografie der Startseite. Kopfzeilen schreiben „Spots.“ mit Punkt und ergänzen außerhalb des Radars den Seitenkontext.
- Navigation zentriert über symmetrische horizontale Ränder statt gleichzeitiger fester Breite und linker/rechter Positionsangaben. Kompakte Maximalbreite von 292 px bleibt erhalten. Native Darstellung noch zu prüfen.

## Aktuell: Einheitliche Events, Filter und kompakte Navigation

- Sichtbare Kategorie „Party“ sowie Party-/Testparty-Texte auf „Events“/„Testevent“ umgestellt; Event-IDs und bestehende Merkliste bleiben erhalten. Interne Nachtfenster-Funktionsnamen unverändert.
- Alle Kategoriewahlen in Radar, Entdecken und Heute verwenden dieselbe CategoryFilters-Komponente mit identischer Auswahl, aktiver Gestaltung und umbrechenden 44-px-Touchflächen.
- Schwebende Navigation auf maximal 292 px begrenzt, mittig und auf schmalen Geräten mit mindestens 16 px Außenabstand.
- Städtesuche über Open-Meteo mit countryCode=DE eingeschränkt und Antwort zusätzlich auf deutschen Ländercode und bewohnte Orte (PPL-Featurecodes) geprüft. Keine internationalen Suchergebnisse.
- Profil-Kopfzeile „Spots. / Dein Profil“ linksbündig im Stil der anderen Seiten. Native Layoutdarstellung noch auf Gerät zu prüfen.

## Aktuell: Spots-Startbildschirm

- Neuer codebasierter Startscreen: dunkler Violettverlauf, dezente Radarringe, weißes Spots-Logo mit pinkem Punkt, Markenclaim und Ladeindikator. Keine neuen Bildassets nötig.
- Einmalige kurze Marken-Einblendung (850 ms Mindestdauer) beim Mounten; wartet auf Abschluss des lokalen Merklistenladens, auch Fehler lassen die App anschließend öffnen. Kein erneutes Einblenden beim Merken oder Tabwechsel. Radar startet erst danach, damit der Scan sichtbar bleibt.
- expo-splash-screen SDK-kompatibel eingebunden; native Startfläche auf Spots-Dunkel gesetzt und beim ersten Layout an den gestalteten Screen übergeben. Native Konfiguration erfordert neuen Build; Expo Go zeigt vor dem JavaScript-Start weiterhin seine eigene Startdarstellung. Native Release-Darstellung noch nicht geprüft.

## Aktuell: Sanfte Standort-Rückkehr

- Nach der ersten Karteneinrichtung erfolgen Zentrierung und Rückzoom auf 30 km mit nativer Kartenanimation statt abruptem Sprung. Kilometeranzeige folgt der laufenden Bewegung statt sofort auf 30 km zu wechseln.
- Standorttaste wartet vor dem Radius-Reset auf die Standortabfrage, um getrennte Zoom-/Zentriersprünge zu vermeiden. Bei aktivierter Bewegungsreduktion bleibt die Rückkehr ohne Animation. Native Animationsqualität noch auf Gerät zu prüfen.

## Aktuell: Ruhige Herzbuttons beim Speichern

- Globalen Busy-Zustand aus der Deckkraft der Merkbuttons entfernt: Das Speichern eines Events lässt andere Herzen nicht mehr gemeinsam flackern. Schreibsperre bleibt erhalten; nur der tatsächlich gedrückte Button erhält Touch-Feedback.
- Feste 44 × 44 px für Iconbuttons und konstante Breite für beschriftete Merkbuttons verhindern Layoutsprünge beim Wechsel zwischen „Merken“ und „Gemerkt“.

## Aktuell: Nur das gemerkte Herz wird pink

- Gemeinsamer Merkbutton behält beim Speichern den dunklen Hintergrund, neutralen Rahmen und die neutrale Textfarbe. Nur das Herz wird pink und ausgefüllt; Speicherfunktion unverändert.

## Aktuell: Radar-Start und freies Zoomen getrennt

- Fehler entfernt: Kartenbewegungen setzten versehentlich den Filterradius wieder auf 30 km. Zurücksetzen findet jetzt ausschließlich beim Radar-Fokus und bei expliziter Standortzentrierung statt.
- Native Zentrierung passt die tatsächlichen Nord-/Südgrenzen von jeweils 30 km mit fitToCoordinates in den fertigen Kartenausschnitt ein, statt einen geschätzten Regions-Seitenfaktor zu verwenden. Berührung der Karte hebt die Startmeldungs-Sperre auf, sodass Zoomanzeigen nicht festhängen können. Standorttaste setzt auch die Anzeige sofort auf 30 km und zentriert nach erfolgreicher GPS-Abfrage neu.
- TypeScript/Lint werden geprüft; tatsächlicher GPS-Start und Gesten bleiben ohne verfügbares iPhone nicht live verifiziert.

## Aktuell: Initialen nativen Kartenausschnitt korrigiert

- 30-km-Region wird erst nach nativer Kartenbereitschaft und gemessenem Layout gesetzt. Vorher konnte die initiale Region anhand einer temporären Kartengröße angepasst werden und als stark vergrößerter Umkreis (gemeldet: 428 km) zurückkommen.
- Veraltete Regionsmeldungen werden beim programmgesteuerten Zentrieren ignoriert, bis der angeforderte Ausschnitt erreicht ist. Danach folgt die Anzeige wieder den Zoomgesten. Standort-/Radiuswechsel verwenden dieselbe Initialisierung. Verifikation auf echtem iPhone steht noch aus.

## Aktuell: Fünf heutige Testpartys in Karlsruhe

- Auf Nutzerwunsch fünf ausdrücklich fiktive Testpartys für den 03.11.2026 um 21/22 Uhr ergänzt: Fächerstadt Beats, Karlsruhe House Lights, Südstadt Session, Weststadt After Dark und Oststadt Frequenz. Eindeutige IDs, feste Termine, öffentliche Beispielkoordinaten ohne echte Veranstaltungsadressen. Verfügbar in Radar/Heute bei passender Kartenmitte und Filterauswahl sowie in Entdecken; keine automatische Speicherung in der Merkliste.

## Aktuell: Kilometeranzeige folgt Kartenzoom

- Radar-Badge zeigt jetzt den sichtbaren vertikalen Halbausschnitt ab Kartenmitte statt des Event-Suchradius. Native Karten melden den Radius während und nach Zoombewegungen; Browserzoom aktualisiert die Anzeige ebenfalls. Unter einem Kilometer erfolgt die Anzeige in Metern.
- Filterradius und Eventauswahl bleiben unabhängig vom Zoom unverändert; Standortzentrierung setzt weiterhin auf den 30-km-Ausschnitt zurück. Native Gesten müssen noch auf einem Gerät geprüft werden.

## Aktuell: Profil wieder im ursprünglichen Design

- Ursprüngliche Profilgestaltung mit Avatar, „Dein Abend. Dein Ding.“ und privater Infokarte wiederhergestellt. Nur die beiden Buttons „Gemerkte Spots“ und „Zum Radar“ bleiben entfernt. Die zuletzt ergänzten Gaststatus-/Merklistenanzeigen und der neue Footer wurden zurückgenommen. Der separate Gemerkt-Tab und gespeicherte Events bleiben unverändert erhalten.

## Aktuell: Radar-Standort, Filter und Profil

- Radar startet mit 30 km Umkreis; Standorttaste und Standortsuche stellen den Radius wieder auf 30 km. Native Karte bleibt ohne zusätzliche Zoombegrenzung frei zoombar. Kartenausschnitt zeigt initial 60 km in vertikaler Richtung statt des zuvor zusätzlich vergrößerten Ausschnitts.
- Tatsächlich ermittelter Standort wird als blauer Punkt angezeigt, unabhängig von Kartenverschiebung oder Stadtauswahl. Ohne erfolgreiche Standortfreigabe wird kein falscher Standortpunkt dargestellt. Browserkarte erhält außerdem Plus-/Minus-Zoomtasten.
- Permanente Genre-Leiste auf Radar entfernt; Kategorien und Umkreis sind nur über den oben rechts beschrifteten Button „Filter“ einstellbar. Kilometeranzeige bleibt rein informativ.
- Entdecken enthält „Beliebte Events“ als ausdrücklich beschriftete Demo-Vorschau kommender, zur Auswahl passender Events. Keine echten Popularitätsdaten oder erfundene Rangfolge; echte Beliebtheitsauswertung benötigt eine Eventquelle mit entsprechenden Daten.
- Profil: beide Navigationsbuttons entfernt, klarer Gaststatus und tatsächlicher lokaler Merklistenstand ergänzt. Konto bleibt als nicht implementiert gekennzeichnet.
- Native GPS-Darstellung, Zoomgesten und Layout auf iPhone/Android noch auf Geräten zu prüfen.

## Aktuell: Glaskarten und Testpartys auf Gemerkt

- Nur die Eventkarten auf Gemerkt nutzen jetzt die bestehende GlassBackdrop-Komponente (Variante card): natives Liquid Glass auf unterstützten iOS-Geräten mit Berücksichtigung reduzierter Transparenz; bestehender statischer Glasverlauf auf Android/Web. Kopf- und Infobereich erhalten keinen zusätzlichen Glaseffekt. Herz oben rechts entfernt; ausgefülltes Herz ersetzt das Lesezeichen neben „Deine Spots. Für später.“.
- Drei ausdrücklich fiktive Testpartys mit festen Terminen ergänzt: Midnight Pulse (Karlsruhe, 02.11.2026), Velvet House (Karlsruhe, 06.11.2026) und Neon Club (Berlin, 07.11.2026). Sie stehen in Entdecken und den jeweils passenden Radar-/Datumsfiltern bereit. Keine echten Veranstaltungsorte oder privaten Adressen; Termine rollen nicht automatisch weiter.
- Alle drei Testpartys über die regulären Merkbuttons in der laufenden Browser-Vorschau auf Port 8081 gespeichert; keine automatische Befüllung anderer Geräte oder Wiederherstellung nach manuellem Entfernen.
- Verifiziert: drei gespeicherte Testpartys nach Neuladen, Suche und Detailnavigation bei 320/375 px. Lint und Typecheck erfolgreich. Native Liquid-Glass-Darstellung weiterhin auf einem iPhone zu prüfen.

## Aktuell: Gemerkt und lokale Merkfunktion

- Neuer Reiter „Gemerkt“ zwischen Entdecken und Profil: dunkle Eventliste im Spots-Design, Anzahl, Suche nach Name/Ort/Genre, Such-Leerzustand mit Zurücksetzen sowie initialer Leerzustand mit Link zu Entdecken. Eventkarten öffnen die bestehenden Detailseiten. Vergangene Termine sind anhand des Berliner Kalendertags gekennzeichnet; die Liste zeigt absolute Termine.
- Funktionierende Herzen auf Entdecken-Karten, der Heute-Liste und Eventdetails. Entfernen direkt in der Merkliste; zusätzlicher Zugang über das Profil. Radar bleibt unverändert, seine Events können über die Details gemerkt werden.
- Gemeinsamer SavedEventsProvider oberhalb des Router-Stacks; Speicherung ausschließlich von Event-IDs unter `spots.saved-events.v1` mit dem über `npx expo install` eingebundenen SDK-kompatiblen Async Storage 2.2.0. Keine Anmeldung, kein Backend und keine Synchronisation zwischen Geräten. Die frühere Aussage „Speicherung nicht implementiert“ in älteren Einträgen ist damit überholt.
- Speichervorgänge sind gegen parallele Betätigungen gesperrt; die sichtbare Auswahl wird erst nach erfolgreichem Schreiben geändert. Lade- und Schreibfehler erhalten sichtbare Hinweise und Wiederholungsmöglichkeiten. Gespeicherte Daten werden beim Laden validiert; unbekannte Event-IDs werden nicht als erfundene Events dargestellt.
- Browserprüfung bei 375 × 812 und 320 × 640: Merken in Entdecken, Wechsel zu Gemerkt, Erhalt nach Neuladen, Suche ohne Treffer/Zurücksetzen, Eventdetail öffnen, Entfernen/erneutes Merken in Details und Entfernen bis zum Leerzustand erfolgreich. `npx expo lint`, `npx tsc --noEmit` und Editor-Diagnosen erfolgreich.
- Grenzen: ausschließlich bestehende, fiktive Events; keine echten Veranstaltungsdaten. Native Geräte und native Speicherung noch nicht geprüft. Bestehende eigene Development Builds müssen für das neue native Modul neu gebaut werden. Als Nächstes native Bedienung/Persistenz und Speicherfehler auf Geräten prüfen; später echte Eventquelle und optional Kontosynchronisierung ergänzen.

## Aktuell: Radar startet mit 10 km

- Der Radar startet beim App-Start mit einem Umkreis von 10 km; der Radius ist weiterhin über den Filter einstellbar und wird an die „Alle ansehen“-Seite übergeben.

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


