# Goabase-Synchronisierung für Spots

## Aktueller Betriebsstand

Letzter belegter Remote-Stand: **09.11.2026 21:37 Europe/Berlin**. Produktion: **yhnxdeypkbzyjappuzmv**, Test: **nfomkdvotqtlyymomksb**. Keine neue Remote-Prüfung während der Projektbereinigung.

Genau ein aktiver Job `spots-import-goabase-2h`, ID 1, Zeitplan **0 */2 * * *** in UTC. Supabase arbeitet unabhängig von VS Code. Kontrollierter Scheduler-Test: HTTP 200, Selbstpause und Datenintegrität bestätigt; erster regulärer Lauf wird vom Nutzer über die Job-Historie geprüft. Kein regulärer Erfolgsnachweis durch Codex behauptet. Details und sichere HTTP-Statusabfrage: [Cron-Abnahme](GOABASE_CRON_ACCEPTANCE.md).

Produktive Function ACTIVE/v3, `verify_jwt=false`, Handler mit `auth: "secret"` und bestehendem Default Secret Key. Secrets bleiben im Backend/Vault. Letzter belegter Bestand: 35 echte Events, 28 veröffentlicht, 0 Duplikate, freie Importsperre; alle ursprünglichen 31 UUIDs erhalten.

## Code und Sicherheitsverhalten

- [index.ts](supabase/functions/import-goabase/index.ts): authentifizierter POST-Handler, Lease erwerben, atomarer Apply-v3, eigene Lease im Fehler-/Erfolgspfad freigeben.
- [sync.ts](supabase/functions/import-goabase/sync.ts): DE/club-Feed plus Detailprüfung aller bereits bekannten IDs; begrenzte Pagination, Fetch-Timeout und keine automatischen HTTP-Wiederholungen.
- Bestätigte Absagen/Verschiebungen werden separat verarbeitet. Exakter geprüfter Goabase-Redirect auf die passende gelöschte ID ergibt `source_removed` und unveröffentlicht, mit UUID-/Datenerhalt.
- Unbekannter oder fehlender Status (einschließlich Moved) wird niemals scheduled: bestehende Events erhalten `source_unconfirmed` und bleiben unveröffentlicht; neue ungeklärte IDs werden übersprungen. Andere gültige Events können weiterlaufen.
- Netzwerk-/HTTP-/JSON-/Identitätsfehler und unerwartete Redirects verhindern die atomare Übernahme. Fehlende Listentreffer führen zu keiner pauschalen Löschung oder Absage.
- Backend schützt mit UNIQUE(source, source_event_id), Lease/Fencing und monotonen Quellversionen vor Duplikaten und veralteten Änderungen. App zeigt ausschließlich veröffentlichte scheduled-Events; Live erfordert tatsächlichen Zeitraum und GPS.
- [Release-Manifest](supabase/functions/import-goabase/production-v3.release.json), Deno-Konfiguration und Lockdatei erhalten. Produktionsbundle wurde byteidentisch in Spots-Test geprüft. Der Handler-Import allein garantiert keinen identischen neuen Build; Build-/Freeze-Werkzeuge und [Abnahmebericht](docs/history/GOABASE_FROZEN_RELEASE_RESULTS.md) beachten.

## Ehrliche API-Grenzen

Die am 04.11.2026 gelesene [Goabase-OpenAPI 1.1.1](https://www.goabase.net/api/schema/goabase.json) dokumentiert `limit <= 500`, aber gleichzeitig **`offset <= 40`**. Öffentliche Leseproben bestätigen Datensatz-Offsets (0/1/2), keinen Seitenindex. Es gibt keine dokumentierte unbegrenzte Pagination, keine Snapshot-Garantie und keinen verlässlichen Löschfeed.

Der Importer hält die dokumentierte Grenze ein: zunächst `limit=500&offset=0`, bei voller Seite noch `offset=40`. Die Überlappung wird dedupliziert. Eine kurze Seite beendet die Entdeckung. Ist auch die letzte Seite voll, endet der Lauf mit `source_pagination_limit`, ohne Events zu schreiben. Damit können bis zu 539 Treffer vollständig gelesen werden; bei 540 oder mehr ist Vollständigkeit nicht bestätigt. Ein ignorierter Offset ohne neue IDs führt ebenfalls zum Fehler. Keine stillschweigende Behauptung, alle Veranstaltungen weltweit abrufen zu können. Für mehr Treffer zuerst Goabase zur widersprüchlichen Grenze befragen und eine dokumentierte Partitionierungs-/Paginationstrategie abnehmen.

Die Suche bleibt auf deutsche Clubs begrenzt. Bekannte IDs werden unabhängig vom aktuellen Suchfilter weiter geprüft; die bisherige Kategoriezuordnung `club` bleibt erhalten. Wenn Quellevents in andere Kategorien wechseln, ist eine gesonderte Kategorienzuordnung nötig. Details mit fehlendem `dateModified` oder dauerhaftem 404 blockieren derzeit den gesamten Lauf. Das bewahrt bestätigte Daten, erfordert aber eine manuelle Klärung mit der Quelle. Maximal 5.000 bekannte/entdeckte IDs und 90 Sekunden sind Betriebsgrenzen, kein unbegrenzter Hintergrundjob. Bei Wachstum ist ein gesondert getestetes Queue-/Checkpoint-Modell erforderlich.


## SQL und Betrieb

SQL-Dateien unter [supabase/ops](supabase/ops) sind geprüfte manuelle Betriebsschritte, keine automatisch anzuwendenden Migrationen. 03/09/10 definieren den Importer; 11–14 die Automatik. 11b verwendet gebundene Vault-Parameter. **Bereits eingerichtete Schritte nicht erneut ausführen.** 02 ist eine überholte gesperrte Vorlage, nur zur Nachvollziehbarkeit erhalten; heutiger Job verwendet 12–14.

Systemverwaltete net-Rechte bleiben gemäß [Plattformprüfung](GOABASE_NET_PLATFORM_REVIEW.md) unverändert. Private Protokolltabelle, Backend-RPC-Rechte und Event-RLS erhalten. Ein succeeded-Eintrag in Cron belegt nur die Einreihung; zusätzlich tatsächliche HTTP-Antwort prüfen.

Für Wiederherstellung: [Backup](PRODUCTION_BACKUP.md), [Rollout/Rückfall](PRODUCTION_ROLLOUT.md). Alte Freigaben und historische Anleitungen sind keine aktuelle Ausführungsfreigabe. Lokale Einmalmarker und Backup-Zeiger nicht löschen.

## Lokale Prüfung

Keine Remote-Skripte zur üblichen Codeprüfung starten. Lokale Node-Tests erzeugen isolierte Fixtures; sie brauchen keine Supabase-Schlüssel.

`npx.cmd expo lint` und `npx.cmd tsc --noEmit` im Projekt ausführen. Alle vorhandenen Tests: `node --test tests/*.test.cjs`.

SQL-Tests benötigen zusätzlich PGlite 0.5.15 in einer separaten Werkzeuginstallation außerhalb der App. `SPOTS_PGLITE_MODULE` auf den absoluten Pfad zu deren `node_modules/@electric-sql/pglite` setzen. Ohne diese Variable werden SQL-Tests ausdrücklich übersprungen; ein solcher Lauf ist keine vollständige SQL-Abnahme. Keine App-Dependency dafür hinzufügen.

Testbereiche: Eventadapter/Live-Zeitfilter, Pagination, Auth-Handler, Absagen/Änderungen, sichere Redirects, Statusquarantäne, UUID-/Versionsschutz, echte SQL-Transaktionen/Rechte und isolierte Cron-Steuerung. Live-Supabase-Rollen und echte Scheduler-Läufe werden damit nicht erneut geprüft.

Historie und Entscheidungen: [Dokumentationsindex](docs/README.md), [frühere Synchronisierungsnotizen](docs/history/GOABASE_SYNC_HISTORY.md).
