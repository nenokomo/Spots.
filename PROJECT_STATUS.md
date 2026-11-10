# Projektstatus – Spots

Stand: 10.11.2026. Veranstalterseiten, Navigation, Designsystem und Inhalts-Backend auf feature/design-refresh; keine Produktionsänderungen.

## Experiment: komplettes Redesign (Branch experiment/redesign, 11.11.2026)

Eigener Branch von feature/design-refresh. Nur Oberfläche neu; Datenschicht, zentrale Navigation, Statuslogik, Accounts und SQL unverändert. Nicht gepusht. Zum alten Stand zurück: `git checkout feature/design-refresh`.

**Designsprache** (`constants/theme.ts`): echtes Schwarz, Systempalette im iOS-Dunkelstil, Markenfarbe `#c922ab` als einzige Farbe und nur für Primäraktionen und Live-Status, große Titel, Haarlinien statt Kästen, durchgehend abgerundete Ecken (`borderCurve: 'continuous'`), Karten geben beim Antippen leicht nach (`PressableScale`).

**Struktur**
- Drei Tabs statt vier: Radar, Entdecken, Gemerkt. Das Profil öffnet als Sheet über einen runden Button oben rechts (`/profile`, `presentation: 'modal'`).
- **Radar**: Karte randlos im Vollbild, schwebende Glas-Bedienelemente (Ort, Filter, Profil, Standort), unten ein Karussell mit Eventkarten. Zeigt laufende Events und solche, die später am selben Abend starten; Pins unterscheiden beides (gefüllt = läuft, umrandet = startet später). Pin antippen springt im Karussell zur Karte. Ohne Events in der Nähe: nächstgelegene kommende Events als Karten, ohne Pins. Die Seite „Alle ansehen“ (`/today`) entfällt.
- **Entdecken**: redaktioneller Feed mit Story-Leiste, großen Hero-Karten („Als Nächstes“), Regal „Dieses Wochenende“ und Kalender nach Tagen. Suche, Ort/Umkreis, Datum und Genre als Chips; mit aktiven Filtern nur die Ergebnisliste.
- **Eventdetail**: randloses Artwork (Flyer vollständig auf eigenem Farbfeld), Kennzahlen-Zeile Datum/Beginn/Ende, gruppierte Liste, feste Aktionsleiste unten (Tickets, Route, Merken).
- **Veranstalterseite, Gemerkt, Profil, Konto** im selben Stil; neue Bausteine `components/ui/` (Button, IconButton, Chip, Sheet, ListGroup/ListRow, LargeHeader) und `components/EventCards.tsx`.
- Entfernt: EventCard, ExploreEventCard, RadarEventCard, TodayEventCard, AnimatedEventCard, StoryTile, GlassTabIcon, TodayEventsScreen.

**Zweite Runde (Mischung aus altem Aufbau und neuem Stil, auf Wunsch)**
- Wieder vier Tabs; Profil ist eine eigene Seite statt eines Sheets.
- Radar: Vollbildkarte und Glas-Bedienelemente bleiben; unten statt des Karussells ein Panel mit Liste (etwa drei Events gleichzeitig sichtbar, Entfernung je Zeile, Pin antippen markiert die Zeile).
- Entdecken: kompakte Hero-Karten im Querformat, darunter zweispaltiges Raster nach Tagen statt der Zeilenliste; Wochenend-Regal entfällt.
- `EventPoster` und `RadarCard` entfernt, `EventTile` neu.

**Geprüft**: 94/94 Tests (mit PGlite), Expo-Lint, Typecheck. Web-Vorschau 375 × 812: Radar (Karlsruhe mit Testevents, Pins, Listen-Panel), Entdecken, Story-Ansicht, Eventdetail, Gemerkt (leer), Profil.

**Nicht geprüft**: kein iOS-/Android-Gerät. Besonders offen: `mapPadding` der nativen Karte (verschiebt Kartenmitte und Anbieter-Logo über das Karussell), neue Pins als native Marker, Profil als natives Modal, Glas-Effekt, Schrift (im Browser Segoe UI statt San Francisco). Veranstalterseite mit Daten und Gemerkt mit Einträgen im neuen Stil nicht visuell geprüft.

## Aktuell: Veranstalterseiten, zentrale Navigation, Designsystem, Inhalte und Ticketing vorbereitet (10.11.2026)

Branch **feature/design-refresh** (Basis origin/main 9dbee1b, plus Merge von feature/organizer-auth). Lokal committet, **nicht gepusht, nicht nach main gemergt**. Keine Remote-SQL-Ausführung, keine Produktionsänderung, keine neuen App-Abhängigkeiten. Details: [docs/CONTENT_ARCHITECTURE.md](docs/CONTENT_ARCHITECTURE.md).

**Umgesetzt**
- **Designsystem**: Tokens für Abstände, Radien und Schrift in `constants/theme.ts`; Bausteine `components/ui/` (Button, Chip, PageHeader, SectionHeader, EmptyState, StatusBadge) und `EventRow`. Eingesetzt in Entdecken, Gemerkt, Eventdetail, Veranstalterseite, Konto und Filter-Chips.
- **Zentrale Eventlogik**: `utils/eventStatus.ts` (läuft, heute, morgen, vorbei; über Mitternacht korrekt; Nacht bis 05:00) und `navigation/eventRoutes.ts` (kontextabhängig: Entdecken + zukünftiges Event + Veranstalter → Veranstalterseite mit hervorgehobenem Event; sonst Eventdetail).
- **Veranstalterseite** komplett neu mit echten Daten aus SQL 15: Kopfbereich, ausgewähltes Event mit „Event ansehen“/„Tickets“, Stories aus Flyern kommender Events, kommende und vergangene Events, Beiträge, Website. Sauberer Zustand, wo Veranstalter nicht existieren (Produktion). Demo-Gerüst (`data/organizers.ts`, `data/organizerPosts.ts`, `OrganizerPostFeed`) entfernt.
- **Eventdetail** neu: Status, Veranstalter-Link (falls vorhanden) oder Quelle, „Tickets kaufen“/„Infos & Tickets“ und „Route“ (Apple Maps / Google Maps), bei vergangenen Events keine Ticket-/Routenaktion. Ticketarten und Live Snaps werden angezeigt, sobald das Backend sie liefert. „BeReels“ in „Live Snaps“ umbenannt (Nähe zu einer Fremdmarke).
- **Entdecken**: Umkreissuche (deutsche Stadt oder eigener Standort; 10/25/50/100 km; Entfernung auf den Kacheln), Chips für Ort, Genre und Datum, „Zurücksetzen“, Navigation über die zentrale Regel.
- **Gemerkt**: getrennt nach Anstehend/Vergangen, nach Datum sortiert, Statusanzeige, Suche ab vier Einträgen, Hinweis auf nicht mehr veröffentlichte Events.
- **Profil/Konto**: Profil verlinkt die vorhandene Anmeldung `/account`, sobald die Testkonfiguration aktiv ist (keine zweite Authentifizierung); Kontoseite im neuen Design.
- **Daten**: `SpotEvent.organizerId`; `club`/`clubs` → Filter „Clubs“ (exakte Synonyme, keine Genre-Rateerei). Damit funktioniert der Clubs-Filter erstmals mit den echten Goabase-Daten.
- **Backend vorbereitet** (nur lokal geprüft): `supabase/ops/17_content_tickets.sql` (live_snaps mit 24-h-Lebensdauer, serverseitigem Status, Upload-Zeitfenster, Rate-Limit und Moderation; content_reports mit Auto-Ausblendung ab 3 Meldungen; saved_events; ticket_types; Bildpfad für Beiträge; Aufräumfunktion für abgelaufene Snaps). `18_content_storage.sql` (private Buckets und Storage-Policies). Leseservice `services/content.ts`.

**Geprüft**
- `node --test tests/*.test.cjs` mit `SPOTS_PGLITE_MODULE` (PGlite 0.5.15, separat installiert): **92 Tests, 92 bestanden, 0 übersprungen**. Neu: `navigation.test.cjs` (Mitternacht, Navigationsregel, Kategorie-Synonyme, Rückfall ohne organizer_id auch bei parallelen Anfragen), `content-backend.test.cjs` (echte RLS-Prüfung von SQL 17 in PGlite inklusive unveränderter Bestandsevents und Wiederholungsschutz).
- Expo-Lint und Typecheck erfolgreich.
- Web-Vorschau 375 × 812 gegen Produktionsdaten: Entdecken (Umkreis Hamburg 50 km → 10 Events mit Entfernung), Eventdetail, Gemerkt, Profil, Radar, Veranstalterseite (Leerzustand mit echten Daten; Kopfbereich und Beiträge mit lokal im Browser abgefangenen Testdaten). Dabei zwei Fehler gefunden und behoben: Wettlauf beim Rückfall ohne organizer_id, Layout von `Link asChild` mit Stil-Funktion auf Web.

**Lokale Testevents (nur Entwicklung)**: `services/testEvents.ts` liefert 5 klar mit „TEST ·“ gekennzeichnete Partys in Karlsruhe um die aktuelle Uhrzeit (3 laufen, 2 starten später; erfundene Testlocations, Symbolbild). Sie werden nur geladen, wenn `__DEV__` gilt (Expo Go, Web-Vorschau), nie in einem Release-Build und nie in eine Datenbank geschrieben. Abschalten mit `EXPO_PUBLIC_SPOTS_TEST_EVENTS=0`. Im Radar zuerst Karlsruhe wählen. Test: `tests/test-events.test.cjs` (94 Tests gesamt, alle bestanden).

**Nicht geprüft / offen**
- Kein Test auf iOS/Android-Gerät (Gesten, Modals, Safe Area, Karten-Apps, Unschärfe).
- Veranstalter-Eventlisten und das hervorgehobene Event der Veranstalterseite nur per Typecheck, nicht visuell mit Daten geprüft (Produktion hat keine Veranstalter).
- SQL 17/18 in keinem Supabase-Projekt ausgeführt; SQL 18 (Storage) gar nicht automatisiert getestet.
- In Produktion pro App-Start 2–3 erwartete 400-Antworten (optimistische organizer_id-Abfrage), bis SQL 15 dort eingespielt ist.
- Kein Upload-UI für Live Snaps/Beiträge (benötigt `expo-image-picker`/`expo-video` und eine Development Build). Keine Bestellungen/Zahlungen/QR-Tickets.
- Merkliste weiterhin nur lokal; Synchronisierung mit `saved_events` nach Login noch nicht gebaut.
- Marker-Clustering im Radar bewusst nicht eingebaut (29 Events); ab einigen hundert Markern neu bewerten.
- Abstimmung nötig: ORGANIZER_ARCHITECTURE.md hatte die öffentlichen Veranstalterseiten dem Kollegen zugeordnet; diese Dateien wurden jetzt auf ausdrücklichen Wunsch neu gebaut.

## Vorher: Design-Refresh und Story-Vorschau in Entdecken (10.11.2026)

Branch **feature/design-refresh**, Basis origin/main **9dbee1b**. Committet als cabc652. Keine Backend-, SQL-, Auth- oder Importänderungen, keine neuen Abhängigkeiten. Produktvision verdichtet in [docs/VISION.md](docs/VISION.md).

**Umgesetzt und im Browser (375 × 812, Web) geprüft**
- **Entdecken**: Suche, Genre-/Datumsfilter und „Demnächst“ unverändert oben. Darunter ersetzen hochformatige Story-Kacheln (`StoryTile`) die bisherige Kartenliste. Antippen öffnet die Vollbild-Vorschau (`EventStoryViewer`): Fortschrittsbalken, Tippen rechts/links, seitlich wischen zum nächsten/vorherigen Event, Halten pausiert, nach unten wischen schließt, „Event ansehen“ führt zur bestehenden Detailseite, Merken bleibt möglich. Bereits angesehene Kacheln verlieren den Akzentrahmen (nur für die laufende Sitzung). Bei reduzierter Bewegung kein automatisches Weiterschalten.
- Story-Medien stammen ausschließlich aus dem Eventdatensatz (`src/utils/stories.ts`), derzeit genau ein Bild. Ohne Eventbild wird das Symbolfoto gezeigt und als solches beschriftet. BeReels sind bewusst nicht Teil der Vorschau.
- **Eventdetail**: Flyer wird vollständig gezeigt (unscharfer Hintergrund + ganzes Bild statt Beschnitt). Statuschip „Heute/Morgen/Demnächst/Läuft jetzt“. Genres werden zusätzlich zu Kategorien angezeigt. Ohne Ticketlink führt der Hauptbutton zur Originalseite der Quelle statt in einen leeren Dialog. Standortzeile öffnet die Koordinaten in der Karten-App. Leere Abschnitte (Beschreibung, Tags) werden ausgeblendet statt als „nicht vorhanden“ angekündigt. Der wirkungslose Button „Event-Einstellungen“ wurde entfernt.
- **Radar**: Läuft im Umkreis nichts, listet das Panel die nächsten kommenden Events im Umkreis, sonst die drei nächstgelegenen mit Entfernung. Sie erscheinen nur in der Liste, nie als Live-Pin; die Live-Logik ist unverändert.
- **Profil**: Übersichtliche Zeilen für Konto (noch in Entwicklung), gemerkte Events mit Anzahl, Standort/Privatsphäre mit Sprung in die Systemeinstellungen (nur nativ), Datenquelle und Version.
- Neuer Test `tests/explore-stories.test.cjs` (4 Tests). Gesamt `node --test tests/*.test.cjs`: 50 Tests, 43 bestanden, 0 fehlgeschlagen, 7 übersprungen (benötigen `SPOTS_PGLITE_MODULE` für die SQL-Tests). Expo-Lint und Typecheck erfolgreich.

**Nicht geprüft / bekannte Grenzen**
- Kein Test auf echtem iOS-/Android-Gerät: Gesten, Modal-Verhalten, Safe-Area und Unschärfe der Story-Ansicht sind nur im Web bestätigt.
- Alle 29 veröffentlichten Events haben kein Genre, keinen Venue-Namen, keine Beschreibung und keinen Ticketlink; Kategorie ist durchgehend `club`. Dadurch finden die Filter Techno/House/Events/Clubs aktuell nichts (`club` ≠ `Clubs`; der Adapter ordnet bewusst nichts zu).
- Eventbilder sind kleine Goabase-Flyer (`/flyer/small/`); im Vollbild wirken sie weich. Größere Varianten müsste der Importer liefern.
- Videos in Storys benötigen eine Medienrelation im Backend und ein Player-Modul; beides existiert noch nicht.
- BeReels auf der Detailseite sind weiterhin nur ein Platzhalter ohne Upload/Speicher.
- `.claude/launch.json` startet die Web-Vorschau (`spots-web`) für Browserprüfungen.

**Offene Lücken für Phase 1 (priorisiert)**
1. Eventmenge und Datenqualität: nur Goabase, 29 Events, siehe oben.
2. Pins für „startet bald“ auf der Radarkarte (bisher nur Liste) – erst nach Gerätetest der Marker.
3. Kategorien/Genres: Zuordnung `club` → Clubs entscheiden; Hip-Hop und Festivals fehlen.
4. Entdecken: Entfernungsfilter und Veranstaltersuche fehlen; „Beliebt“ bleibt „Demnächst“, solange keine echten Nutzungsdaten existieren.
5. Accounts liegen auf feature/organizer-auth (1 Commit vor main), noch nicht im Profil eingebunden; Passwortreset und Accountlöschung fehlen.
6. Release-Vorbereitung: kein eas.json, slug/scheme „meine-app“, keine Bundle-ID/Package, Android-Icon-Hintergrund Standardblau, kein Google-Maps-Key für Android-Builds.

## Vorher: Private Accounts und Veranstalter-Backend vorbereitet

- **feature/organizer-auth** neu von aktuellem origin/main **9dbee1b** erstellt. Die vorherige Integration ist inzwischen über PR #1 in main übernommen. Keine anderen Branches verändert; kein neuer Commit/Push/Merge in dieser Arbeit.
- [Gemeinsamer Architekturvertrag](docs/ORGANIZER_ARCHITECTURE.md) und src/types/accounts.ts definieren private Benutzerprofile, öffentliche Veranstalter, owner/editor-Mitgliedschaften, Spots-Events und spätere Textbeiträge. Öffentliche Profile enthalten keine privaten Benutzer-IDs oder E-Mails. Klare Lese-/Schreibadapter für den Kollegen dokumentiert; seine öffentlichen Design-Dateien nicht verändert.
- Account-Client, E-Mail-Registrierung, Passwortlogin, lokale Abmeldung, persistierte Sitzung und PKCE-Codeaustausch implementiert. Minimale isolierte Route **/account**, keine Änderung an Profilgestaltung/Radar/Entdecken/öffentlichen Veranstalterseiten. Account-Schreibstrecke zunächst hart auf **nfomkdvotqtlyymomksb** begrenzt; mit bestehender Produktions-.env.local deaktiviert. Öffentlicher Event-Client bleibt unverändert.
- SQL **15_organizer_accounts.sql** nach lokalen Tests einmalig ausschließlich in Spots-Test ausgeführt. Vier neue RLS-Tabellen, Backend-RPCs, nullable events.organizer_id und eingeschränkte Spaltenrechte. Importierte Events dürfen keine Veranstalterzuordnung erhalten; nur source=spots ist für berechtigte Mitglieder schreibbar. Keine automatischen Zuordnungen/Claims und keine vorhandenen Eventdaten umgeschrieben.
- SQL **16_test_organizer_accounts.sql** im echten Testprojekt vollständig erfolgreich: Rollen-/Fremdzugriffs-/Privatsphäre-/Publikationsprüfungen mit vollständigem ROLLBACK. Danach **35 bestehende Events/UUIDs/Daten und sämtliche Importmetadaten/Lease unverändert**; 0 Auth-Benutzer, private Profile, Veranstalter, Mitgliedschaften, Beiträge oder verknüpfte Events zurückgeblieben. Alle vier Tabellen mit aktiver RLS.
- **76 lokale Tests bestanden, 0 übersprungen**, Lint/Typecheck erfolgreich. Lokaler echter Goabase-RPC funktioniert unverändert mit neuer Spalte und erhält UUIDs. Browser bestätigt Produktionsschutz von /account: keine Auth-Requests/Schreibanfragen. .env.local unverändert, keine Dependencies neu installiert, keine Goabase-/Cron-Dateien geändert.
- Noch offen: separate Test-App-Konfiguration, tatsächliche Mailzustellung/Redirect-Allowlist und vollständiger Auth-End-to-End-/Gerätetest; später Einladungen, Besitzertransfer, Accountlöschung, Passwortreset und Moderation. Noch keine produktive Accountfreigabe oder Anbindung der öffentlichen Designseiten. Neue SQL-Dateien sind keine Freigabe zur Produktionsausführung.

## Vorher: Design und echte Eventdaten zusammengeführt

- Neuer lokaler Branch **integration/spots-supabase-design**, Basis origin/main **7d5f654**. Zuerst origin/Jacint-branch **ee0c270**, anschließend aktueller Design-Branch origin/noyan-design **c8f0217** integriert. origin/Noyan-branch-design **3c0732d** ist ein älterer Vorfahr, nicht der aktuelle Designstand. Bestehende Branches unverändert.
- 14 Konfliktdateien einzeln aufgelöst: Startscreen/Provider, Kalender, vier Eventkarten, Kartentypen, fünf Screens, Projektstatus und gelöschte Demo-Datei. Neues Layout, Farben, Navigation, Kalender und Kartensteuerung erhalten; echte Services, UUID-Routen, Lade-/Leer-/Fehlerzustände und Live-Zeitfilter weiterverwendet. src/data/events.ts bleibt gelöscht.
- Browserprüfung bei 390 × 844: **28 echte kommende Events**, Navigation zur UUID und neue Eventdetails mit Titel/Zeit/Quelle, Original-Link und Goabase-Backlink erfolgreich. Radar korrekt **0 laufende Events**, keine zukünftigen Events als live. Ausschließlich Supabase-GETs, keine Schreibanfrage; keine JavaScript-Fehler oder untersuchten React-Prop-Warnungen im abschließenden Durchlauf.
- Lokal alle bisherigen **67 Tests** plus **3 neue Design-/Datenintegrationsprüfungen** bestanden, nichts übersprungen. Expo-Lint ohne Cache und Typecheck erfolgreich. Native Geräte-/Release-Prüfung steht noch aus, insbesondere Splashscreen/Map-Gesten.
- Function, SQL/Cron, Backend-Skripte und App-Lese-Service gegenüber Jacint-branch unverändert. .env.local per Hash identisch. expo-splash-screen aus dem Design-Branch SDK-kompatibel installiert; keine Backend-Deployments/Imports/SQL-Ausführungen.
- Fachliche Grenze dokumentiert: public.events enthält keine bestätigte Veranstalterrelation und keine Besucher-/Veranstaltermedien. Deshalb keine aus Demo-Titeln erfundenen Profile oder Beiträge; Profilroute zeigt ehrlich fehlende Verfügbarkeit, Layout bleibt erhalten. Eventkarten öffnen echte Eventdetails. „Demnächst“ ersetzt unbelegte Beliebtheitsbehauptung. Vollständiger Design-Zwischenstand im Archiv erhalten.
- [Integrationsbericht mit Konfliktentscheidungen und Prüfgrenzen](docs/DESIGN_INTEGRATION.md). Kombinierter Stand für einen Pull-Request-Review vorbereitet; lokaler Integrationsbranch noch nicht veröffentlicht. Weder main noch fremde Branches verändert.

## Implementiert und Architektur

- Expo SDK 58, React Native und TypeScript; Einstieg über index.ts / Expo Router, Routen unter src/app. Screens, Komponenten, Hooks, Services und Typen bleiben getrennt. Design und Navigation unverändert.
- Supabase-Lesezugriff über src/lib/supabase.ts und src/services/events.ts; im Frontend ausschließlich EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Lade-, Leer- und Fehlerzustände ohne erfundene Ersatz-Events.
- Explore zeigt zukünftige veröffentlichte scheduled-Events, Radar tatsächlich laufende Events mit GPS und Radiusfilter. Eventdetails, echte Quellenlinks und lokale Merkfunktion vorhanden. Profil ist noch keine vollständige Konto-/Auth-Implementierung; Live Snaps nicht implementiert.
- Goabase-Importer mit Pagination innerhalb dokumentierter Grenzen, erneuter Detailprüfung bekannter Events, sicheren Löschungsredirects, Statusquarantäne, atomarem Upsert, Lease/Fencing und Schutz vor alten Quellversionen. [Aktuelle technische Dokumentation](GOABASE_SYNC.md).

## Letzter bestätigter Produktionsstand

Projekt yhnxdeypkbzyjappuzmv, Spots-Test nfomkdvotqtlyymomksb. CLI-Verknüpfung bleibt Test. Keine neue Remote-Abfrage während der Bereinigung.

- Stand 09.11.2026 21:37 Europe/Berlin: Function ACTIVE/v3, verify_jwt=false, auth:secret/Default Secret. 35 echte Events, 28 veröffentlicht, 0 Duplikate, freie Lease; 31 ursprüngliche UUIDs erhalten.
- Genau ein aktiver Job ID 1 / spots-import-goabase-2h, Zeitplan **0 */2 * * *** UTC. Bestehende Vault-Einträge und private Protokolltabelle eingerichtet. Keine lokale Dauerüberwachung erforderlich.
- Kontrollierter Scheduler-Lauf 09.11.2026 21:19 Europe/Berlin: HTTP 200, Selbstpause und Datenintegrität geprüft. Erster regulärer Lauf wurde an den Nutzer zur Kontrolle über Supabase übergeben; **kein regulärer Erfolgsnachweis durch Codex**. [Cron-Abnahme mit HTTP-Prüfung](GOABASE_CRON_ACCEPTANCE.md).

## Bereinigung für den nächsten Commit

- Entfernt: src/data/events.ts, 180 Zeilen ausschließlich ungenutzte alte Demo-Veranstaltungen und zugehöriger Filter. Keine Importe oder anderen Codeverwendungen gefunden. Echte Datenversorgung unverändert.
- 15 historische Berichte nach docs/history verschoben; lokale Markdown-Links angepasst. Vollständige frühere PROJECT_STATUS-/GOABASE_SYNC-Texte dort erhalten. Aktuelle Status-/Betriebsdokumentation konsolidiert; veraltete Freigaben nicht mehr als aktueller Zustand dargestellt.
- SQL 00–14 einschließlich 11b, sämtliche Tests, Release-Manifest/Lockdatei, Backup-/Restore-/Build-/Diagnose-/Integrationsskripte und Design-Assets bewusst erhalten. Hinweise und Einordnung: [Bereinigungsbericht](docs/PROJECT_CLEANUP.md).
- .gitignore um lokale Logs, temporäre Verzeichnisse und Datenbank-/Bundle-Exporte ergänzt. .env.local, pws, Backups und Supabase-CLI-/Einmalmarker bleiben ignoriert und lokal erhalten.
- Prüfungen dieser Bereinigung: Expo-Lint/Typecheck erfolgreich, alle 67 lokalen Tests bestanden (0 übersprungen), relative Codeimporte/Markdown-Ziele und Git-Schutz geprüft. Ergebnisse im Bereinigungsbericht. Keine Datenbankänderung, kein Import, Deployment oder Cron-Aufruf.
- Abschluss nach VS-Code-Hänger: gespeicherten Stand und Archivvollständigkeit erneut geprüft, keine laufenden Node-Testprozesse. Vier ausschließlich hierfür erzeugte lokale Bereinigungshelfer entfernt; Betriebs-/Einmalmarker erhalten. Bereits erfolgreiche Tests nicht wiederholt. Lokale Bereinigung abgeschlossen, Branch für Commit vorbereitet; nichts gestaged/committet/gepusht/gemergt.

## Grenzen und nächste Schritte

- Ersten regulären Cron-Lauf über Supabase prüfen; cron succeeded allein bestätigt noch keinen HTTP-Erfolg. pg_net-Antworten haben eine begrenzte Aufbewahrung.
- Goabase-Pagination kann bei mindestens 540 Treffern Vollständigkeit nicht bestätigen; fehlende Quellversionen/echte Quellenfehler bleiben sichere Abbrüche. Keine erfundenen Genre-/Ticket-/Live-Daten.
- Vollständiger Restore aller verwalteten Supabase-Plattformdienste nicht nachgewiesen. Logische Backups und isolierte Event-/Backend-Restore-Nachweise erhalten; [Wiederherstellungsgrenzen](PRODUCTION_BACKUP.md).
- Native Geräteprüfung nach späteren Designänderungen weiterhin erforderlich. Design-Branch nur nach separater Freigabe zusammenführen; Konfliktfreiheit kann vor dem tatsächlichen Vergleich nicht bestätigt werden.

[Dokumentationsindex](docs/README.md) · [Vollständige Projektgeschichte](docs/history/PROJECT_STATUS_HISTORY.md)
