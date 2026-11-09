# Projektstatus – Spots

Stand: 09.11.2026. Lokale Design-/Datenintegration; kein Push und kein Merge nach main, keine produktiven Backend-Änderungen.

## Aktuell: Design und echte Eventdaten zusammengeführt

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
