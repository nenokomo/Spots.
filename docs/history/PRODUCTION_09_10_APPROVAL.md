> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: konkrete Freigabevorlage für Backend 09 und 10

Stand: 08.11.2026. **Nach ausdrücklicher Freigabe produktiv erfolgreich ausgeführt und geprüft; nicht wiederholen.** Ziel ausschließlich **Spots. / yhnxdeypkbzyjappuzmv**. CLI bleibt mit Spots-Test verbunden.

## Tatsächliche produktive Ausführung

**08.11.2026 18:01:18–18:01:54 UTC:** SQL 09 genau einmal erfolgreich, danach vollständige Daten-/Rechteprüfung; erst anschließend SQL 10 genau einmal erfolgreich und erneut geprüft. Ziel-ID/Name und beide unten dokumentierten SHA-256-Werte unmittelbar vor jeder Ausführung bestätigt. Vorhandenes Backup erneut gegen alle 30 Manifestdateien geprüft. Keine Fehler/unerwarteten Abweichungen.

| Kontrolle | Nach SQL 09 | Nach SQL 10 |
| --- | --- | --- |
| Vollständige Events/UUIDs unverändert | 31 / 31 | 31 / 31 |
| Eventspalten, Defaults, Constraints, Indizes, RLS, Grants | unverändert | unverändert |
| Private RLS-Tabellen | 3 | 4 |
| Öffentliche Backend-RPCs / private Core-Funktionen | 4 / 1 | 5 / 2 |
| Eigentümer/Definer/search_path und Backend-Rechte | korrekt | korrekt |
| Verschobener Core-Funktionskörper | identisch zum alten Apply | identisch zum alten Apply-v2 |
| Doppelte Quellpaare / Quellversionen | 0 / 0 | 0 / 0 |
| Importsperre | frei | frei |
| Eventdaten-/UUID-/Statusänderungen | keine | keine |

Clients/PUBLIC erhalten keine Ausführungsrechte; service_role ausschließlich öffentliche RPCs, keine direkten privaten Tabellen-/Core-Rechte. Private Tabellen mit RLS, keine PUBLIC-Grants; Clients ohne Schema-USAGE/CREATE. Leere Entfernungs-/Quarantänemetadaten. source_removed/source_unconfirmed werden vom unveränderten text-Statusfeld und vorhandenen Constraints unterstützt; jeweilige Apply-Definitionen mit Status-/Unpublish-Behandlung lesend bestätigt, ohne RPC-/Importaufruf.

Alle produktiven Edge-Function-Metadaten unverändert, import-goabase weiterhin **ACTIVE/Version 2/verify_jwt=false**, bisheriger Bundle-Fingerprint erhalten. App-Umgebungsdatei per Hash unverändert; kein Deployment/Function-Aufruf/POST/Cron und keine zusätzliche Policyänderung.

Geschützte, Git-ignorierte Vorher-/Nachher-Snapshots, Funktionsdefinitionen/Rechte, SQL-Antworten und Einmalmarker: `supabase/backups/production-backend-09-10-2026-11-08T18-01-17-976Z/`. [Ausführungs-Runner](../../scripts/apply-goabase-production-09-10.cjs) verhindert Wiederholung und stoppt bei Abweichungen. Nachfolgende Vorbereitungsdetails dokumentieren die erteilte Freigabe, keine erneute Ausführung.

## Geprüfter Ausgangspunkt

- Frisches vollständiges logisches PostgreSQL-17.11-Backup ohne Schemaausschlüsse, Rollen ohne Passwort-Hashes, aktuelle produktive Function v2 samt Quellcode/Deno-Konfiguration/Lockdatei/Verify-JWT-Konfiguration gesichert. Geschütztes, Git-ignoriertes Verzeichnis: `supabase/backups/production-backup-2026-11-08T17-46-21-621Z/`.
- Archiv vollständig dekodiert; 43 Tabellen-Datenabschnitte. App-/Importschemas public und spots_sync_private einschließlich Eigentümern, Eventdaten, Constraints, RLS, ACLs und privatem Backend tatsächlich isoliert wiederhergestellt. **Alle 31 Events mit sämtlichen Feldern und UUIDs identisch.** Vollständiger Supabase-Plattformrestore nicht geprüft; keine unabhängige Kopie auf anderem Gerät. Details: [Backupbericht](../../PRODUCTION_BACKUP.md).
- Danach exakt die unten genannten Dateien ausschließlich lokal als postgres ausgeführt: beide erfolgreich, nach jeder Datei sämtliche 31 Eventdaten/UUIDs unverändert. Vier private RLS-Tabellen, fünf öffentliche Backend-RPCs und zwei private Core-Funktionen nachher geprüft: Clients/PUBLIC ohne Zugriff, service_role nur öffentliche RPCs, Eigentümer postgres, SECURITY DEFINER mit leerem search_path.
- Abschließender lesender Produktionsvergleich **08.11.2026 17:55:41 UTC**: vollständige Event-/Lease-/Versions-/Sicherheitsdaten unverändert, weiterhin 31 Events/0 Quellversionen/freie Lease, produktive Function ACTIVE/v2/verify_jwt=false mit unverändertem Bundle. App-Umgebungsdatei unverändert. Keine produktive SQL-Änderung, kein Deployment/Function-Aufruf/POST/Cron.

## Exakter SQL-Umfang

| Reihenfolge | Unveränderte Datei | SHA-256 |
| --- | --- | --- |
| 1 | [09_goabase_source_removals.sql](../../supabase/ops/09_goabase_source_removals.sql) | `c12d7904f08076c9c3bbf3ee53c0785889c244ea47b4c94e88324c08065e8318` |
| 2 | [10_goabase_unconfirmed_status.sql](../../supabase/ops/10_goabase_unconfirmed_status.sql) | `380ede89a1a8b4fc70e2e9bf9a2d839274d00ba9c9017d66731fa9028fcda92a` |

09 ergänzt private Entfernungsmetadaten, verschiebt vorhandenen Apply-Code in eine private Core-Funktion und ergänzt Apply-v2 samt kompatiblem alten Zugang. 10 ergänzt private Quarantänemetadaten, private Weiterverwendung des v2-Codes und Apply-v3 samt kompatiblen älteren Zugängen. Beide übernehmen Lease-/Versionsschutz. In Produktion ist das benötigte Backend 03 bereits vorhanden; nicht erneut ausführen.

Keine Eventzeilen durch diese Einrichtung schreiben/löschen, keine UUIDs ändern, kein Events-Schema/Quellindex neu anlegen, keine Event-Policy ändern. Bestehendes status-Feld ist text, vorhandene Constraints erlauben source_removed/source_unconfirmed. Die UPDATE-Anweisungen in den Funktionsdefinitionen werden beim Erstellen der Funktionen nicht ausgeführt; kein Apply-Aufruf Teil der Einrichtung.

## Ausgeführter Ablauf nach ausdrücklicher SQL-Freigabe

Unmittelbar vorher tatsächliche Projekt-ID/Name und beide Datei-Hashes prüfen; aktuelle 31 vollständige Eventzeilen/UUIDs sowie Lease-/Versionszustand für den Vergleich sichern. Bei aktiver Importsperre oder ungeklärter Änderung stoppen. Explizites Produktionsziel bei jedem CLI-Befehl, lokale Verknüpfung nicht ändern.

```powershell
# BEREITS ERFOLGREICH AUSGEFÜHRT – NICHT WIEDERHOLEN
npx supabase db query --remote=yhnxdeypkbzyjappuzmv --file supabase/ops/09_goabase_source_removals.sql --yes --output-format json
# Erst nach erfolgreicher Prüfung von 09:
npx supabase db query --remote=yhnxdeypkbzyjappuzmv --file supabase/ops/10_goabase_unconfirmed_status.sql --yes --output-format json
```

Jede Datei enthält ihre eigene BEGIN/COMMIT-Transaktion. Nach jeder Datei vollständigen Event-/UUID-Erhalt und erwartete Objekte/Rechte lesend kontrollieren. **Bei Fehler sofort stoppen, keine blinde Wiederholung.** Schlägt 10 fehl, kann 09 bereits erfolgreich installiert sein; nicht automatisch DROP/Restore ausführen. Kein Function-Aufruf zur Objektprüfung nötig.

## RLS-Befund – separate Entscheidung

Produktive Lesepolicy Read published events für anon/authenticated prüft ausschließlich is_published=true. Isolierte Rollback-Fixtures auf dem Produktionsrestore bestätigen für source_removed und source_unconfirmed jeweils:

| is_published | anon kann betroffene Zeile lesen |
| --- | --- |
| false | Nein |
| true | Ja |

Die geprüften Apply-Funktionen setzen beide neuen Status stets auf false; damit werden sie unter der aktuellen Policy ausgeblendet. **Eine unabhängige Statussperre in RLS besteht aber nicht.** Empfohlene gesonderte Härtung: bestehende Lesepolicy auf `is_published = true AND status = 'scheduled'` einschränken, ohne zusätzliche permissive Policy. Das wäre eine weitere Änderung mit eigener Prüfung/Freigabe und gehört ausdrücklich nicht zu den beiden SQL-Dateien. Sie ist keine Voraussetzung für deren reine Einrichtung; vor der späteren Import-/Automatisierungsfreigabe den gewünschten Schutzumfang festlegen. [Offizielle RLS-Dokumentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Danach getrennt freigeben

1. Nur denselben in Spots-Test erfolgreich geprüften Function-Kandidaten deployen, explizit Produktion, auth:secret/default und verify_jwt=false beibehalten. Test-Bundle-Fingerprint `ef6e9148dd99db9c1a372b4d5e6531e6208ea84de826b0391c6e3d6b2249ff6a`; bereitgestellten Quellstand gegen den Test-Kandidaten prüfen. Quellen/Fingerprint: [Testergebnis](GOABASE_STATUS_TEST_RESULTS.md). Anschließend gezielte GET-Authentifizierungstests und unveränderten Bestand prüfen.
2. Genau einen produktiven POST separat freigeben, frischen Vorher-/Nachher-Snapshot sichern; tatsächliche Importzahlen, Original-UUIDs, source_removed/source_unconfirmed, Veröffentlichungen, Duplikate, Lease und App-Lesezugriff kontrollieren. Bei Fehler kein Retry.
3. Cron/Vault erst nach erfolgreicher produktiver Abnahme als gesonderten Schritt behandeln. Jetzt keinen Job erstellen/aktivieren.

Rückfall: zusätzliche Backend-Objekte bei Problemen zunächst stehen lassen, keine Metadaten löschen. Aktuelle produktive Function ist gesichert; ein späteres Rückfall-Deployment oder selektiver Datenrestore braucht eine eigene konkrete Freigabe. Archiv/Quellcode ersetzen keinen getesteten vollständigen Plattformrestore.

## Historische Freigabeformulierung – Freigabe erteilt und ausgeführt

> Ich gebe ausschließlich die unveränderten SQL-Erweiterungen 09 und danach 10 mit den oben dokumentierten SHA-256-Prüfsummen für yhnxdeypkbzyjappuzmv frei. Prüfe vor jedem Schritt Ziel und Hash und danach Daten-/UUID-Erhalt sowie Berechtigungen. Bei Fehler stoppen. Keine Eventänderung, RLS-Änderung, Deployments, Function-Aufrufe oder Cron-Aktivierung.
