> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: Bundle-Abweichung durch unterschiedliche jose-Versionen erklärt

**Fortschreibung nach gezielter Testfreigabe 08.11.2026:** Abweichung inzwischen abgeschlossen: aktuelles Produktions-v3-ESZIP offline eingefroren und ohne Paketauflösung nach Spots-Test als v4 übertragen; heruntergeladenes Test-Artefakt vollständig bytegleich mit Produktion. Auth 401/401/401/405 und genau ein Import HTTP 200 bestanden, alle 35 Testevents/UUIDs unverändert, keine Duplikate/freie Lease. Produktion unverändert. [Abschlussnachweis](GOABASE_FROZEN_RELEASE_RESULTS.md). Die folgende Analyse beschreibt die frühere echte Codeabweichung zu Test-v3.

Stand: 08.11.2026. Untersuchung ausschließlich lesend: Management-API GET für Projektidentität, Function-Metadaten und rohe Function-Bodies beider Projekte, anschließend statische lokale Archivprüfung. Keine Function-Aufrufe, Deployments, Datenbankzugriffe/-änderungen, Imports oder Cron-Aktivierung. Frontend und App-Umgebung unverändert. Die beigefügte schreibgeschützte Frontend-Supabase-Datei wurde gelesen, nicht verändert; sie ist nicht Bestandteil des Edge-Bundles.

## Ergebnis

**Keine bloß harmlose Hash-/Metadatenabweichung.** Der eigene ausführbare Importer-Code stimmt überein, aber eine eingebettete transitive Kryptografie-Abhängigkeit unterscheidet sich tatsächlich:

| Bestandteil | Spots-Test nfomkdvotqtlyymomksb | Produktion yhnxdeypkbzyjappuzmv |
| --- | --- | --- |
| Function | ACTIVE / Version 3 | ACTIVE / Version 3 |
| verify_jwt / import_map | false / true | false / true |
| withSupabase auth | secret | secret |
| Eigene index.ts/sync.ts, deno.json | identisch | identisch |
| Eingebettetes @supabase/server | 1.9.2 | 1.9.2 |
| Eingebettetes @supabase/supabase-js | 2.119.0 | 2.119.0 |
| **Eingebettetes jose** | **6.2.15** | **6.2.16** |
| Raw-Bundle-Format | ESZIP2.3 | ESZIP2.3 |
| Raw-Bundle-Größe | 9.544.115 Bytes | 9.544.304 Bytes |

Sicherheitsrelevante **Einstellungen** und unveränderte withSupabase-Implementierung stimmen überein. Projektbezogene Pfade/Function-IDs sind erwartungsgemäß verschieden. **Das vollständige ausführbare Programm einschließlich Kryptografie-Abhängigkeiten ist nicht identisch.** Keine Aussage, dass die neuere Version fehlerhaft oder unsicher sei; eine Gleichheit zur getesteten Fassung ist aber widerlegt. Deshalb keine vollständige Produktionsabnahme und keine Vorbereitung eines Imports zur Ausführung unter der Bedingung „identisch bestätigt“.

## Tatsächlicher Bundlevergleich

Die beiden tatsächlich bereitgestellten Bodies wurden über den offiziellen [GET-Body-Endpunkt](https://supabase.com/docs/reference/api/v1-get-a-function-body) abgerufen und lokal ohne Ausführung geparst. CLI-Token ausschließlich im RAM; keine API-/Edge-Secrets abgerufen. Versions-/Projektprüfung vor jedem Abruf. Gesicherte rohe Bodies und Analyse unter dem geschützten, Git-ignorierten Verzeichnis `supabase/backups/bundle-inspection-2026-11-08T18-11-14-982Z/`.

- Beide Archive: **807 Einträge**, gleiche Modulnamen/-reihenfolge, gleiche Formatoptionen, keine nachfolgenden ungeprüften Restbytes. Das Format nutzt intern NoChecksum; unabhängig davon vollständige SHA-256-Werte der Bodies und jedes Modulpayloads berechnet. Quellen-/Sourcemap-Offsets mit Bounds-Prüfung gemäß [Supabase-eszip-Formatimplementierung](https://raw.githubusercontent.com/supabase/eszip/fix-pub-vis-0-80-1/src/v2.rs) gelesen.
- **800 Einträge vollständig identisch**, einschließlich eigener ausführbarer Importer-Module, Quellkarten und sämtlicher anderer eingebetteter Bibliotheks-Payloads.
- **7 Payloads unterscheiden sich:** Edge-Runtime-Metadaten, jose-package.json und fünf jose-JavaScript-Dateien (vfs://707, 724, 727, 743, 747). Außerdem unterscheidet sich die npm-Auflösungstabelle: gleicher Paketgraph, aber jose-ID/Abhängigkeitsziel 6.2.15 gegenüber 6.2.16. Das Paket ist über package.json und den tatsächlich gespeicherten npm-Graph eindeutig identifiziert.
- Code-Diffs enthalten unter anderem geänderte Validierungsreihenfolge für PBES2-/Dekompressionsoptionen und geänderte Fehlerbehandlung bei allgemeinen JWS-Signaturen. Ein weiterer Diff ändert die jose-User-Agent-Version. Somit kein bloßer Build-Zeitstempel, Pfad- oder Kompressionsunterschied.

Die Analyse-Skripte [download-goabase-bundles-readonly.ps1](../../scripts/download-goabase-bundles-readonly.ps1) und [compare-goabase-bundles.cjs](../../scripts/compare-goabase-bundles.cjs) verändern keine Remote-Ressourcen. Lokale Manifeste enthalten pro Eintrag SHA-256/Größen; comparison.json enthält Paketauflösung und sämtliche Unterschiede. Kein importierter Bundle-Code wird ausgeführt.

## Unterschiedliche Hash-Ebenen

| Hash | Test | Produktion |
| --- | --- | --- |
| Management-Metadatum ezbr_sha256 | ef6e9148dd99db9c1a372b4d5e6531e6208ea84de826b0391c6e3d6b2249ff6a | 54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8 |
| SHA-256 des tatsächlich per GET erhaltenen unkomprimierten ESZIP | ff08387ab8da365924b43000af1191964d73a0f0cada8cc5775e0c9e8e3e5d55 | e160bae41b3fb10e614339720ce2606b67e8d8d9f078ee0a9102d6f153396743 |

SHA-256 einzelner TS-Dateien, Hash des unkomprimierten ESZIP und Fingerprint des komprimierten Containers sind verschiedene Vergleiche. Der [offizielle CLI-Bündelpfad](https://raw.githubusercontent.com/supabase/cli/main/apps/cli/src/shared/functions/deploy.ts) berechnet SHA-256 über EZBR-Präfix plus Brotli-komprimiertes ESZIP. Unsere beiden Deployments nutzten jedoch denselben **--use-api**-Quellupload mit serverseitigem Build. Dessen originale komprimierte Bytes/Kompressorparameter sind im hier abgerufenen Body nicht enthalten. Lokales Rekompimieren mit Node-Brotli (Qualitätsstufen 4–11) reproduziert die Metadaten-Hashes nicht; daher keine erfolgreiche bytegenaue Rekonstruktion dieses Fingerprints behaupten. Diese verbleibende Container-Reproduktionsgrenze ändert den eindeutigen Befund des direkten Modulvergleichs nicht.

**Ein anderer Hash allein** könnte bei gleichem Inhalt durch Verpackung entstehen. **Hier unterscheiden sich bereits die unkomprimierten ausführbaren Inhalte.** Die ursprüngliche Deploymentprüfung hat deshalb zu Recht gestoppt.

## Ursache der Versionsabweichung

Die tatsächlich eingebettete package.json von @supabase/server 1.9.2 erlaubt **jose: ^6.2.0**. Beide beobachteten Patch-Versionen erfüllen diesen Bereich. Der Import [index.ts](../../supabase/functions/import-goabase/index.ts) nutzt zudem npm:@supabase/server@1. Der bisherige API-Build hat die transitive Version nicht reproduzierbar auf denselben Stand festgelegt.

Die lokale [deno.lock](../../supabase/functions/import-goabase/deno.lock) enthält jose 6.2.15. Trotzdem enthält Produktion 6.2.16. Außerdem sind im Lockfile Supabase-Peer-Abhängigkeiten auf 2.118.0 festgehalten, während beide tatsächlichen Remote-Bundles 2.119.0 enthalten. **Die unveränderte lokale Lockdatei war somit kein Nachweis, dass der API-Build diese Auflösung übernimmt.** Quellenidentität und eingefrorene lokale Dateien allein reichen hier nicht zur vollständigen Bundle-Abnahme. Nicht nur den direkten Server-Paketnamen genauer pinnen: das würde dessen transitive Versionsbereiche weiterhin offen lassen.

Die abweichende Auflösung ist unmittelbar am Artefakt belegt. Ob eine zwischenzeitliche Veröffentlichung oder ein unterschiedlicher Build-Cache den Wechsel ausgelöst hat, wurde nicht nachgewiesen; dafür werden keine unbelegten historischen Registry-/Cachebehauptungen gemacht. Keine Hinweise auf unterschiedliche angeforderte Build-Verfahren oder auf abweichende Auth-Konfiguration gefunden.

## Sicherer nächster Schritt – vor produktivem Import

1. Zunächst einen reproduzierbaren **vollständigen Abhängigkeits-/Bundle-Stand** festlegen und das Build-Verfahren prüfen, das diese Auflösung tatsächlich erzwingt. Alle Änderungen zunächst lokal; keine stillschweigende Abhängigkeitsänderung oder Produktionskorrektur in dieser Untersuchung.
2. Den so festgelegten Stand nach eigener Deployment-/Testfreigabe ausschließlich in Spots-Test prüfen, insbesondere gezielte Authentifizierung mit der tatsächlich eingebetteten jose-Version und Importverhalten. Keine unnötige Wiederholung unabhängiger Frontendtests oder alter Fixture-Szenarien. Alternativ die exakte bereits gespeicherte Produktionsartefakt-Fassung in Test abnehmen; ein geeignetes Artefakt-Uploadverfahren muss zuvor geprüft werden.
3. Erst bei belegter Übereinstimmung der relevanten ausführbaren Inhalte und erfolgreicher Abnahme weitere produktive Schritte getrennt freigeben. Keine Patch-Version pauschal als identisch erklären und nicht ungeprüft auf eine ältere Kryptografie-Version zurücksetzen.
4. Der spätere kontrollierte Produktionsimport bleibt ein eigener Schritt: Ziel/Backup prüfen, frischen vollständigen Event-/UUID-Snapshot sichern, genau ein freigegebener POST, anschließend Importzahlen/Quellstatus/UUIDs/Duplikate/Lease/App-Lesezugriff vergleichen. **Jetzt nicht zur Ausführung freigegeben.**

Der bestehende Produktionsstand bleibt ACTIVE/v3, Test bleibt ACTIVE/v3. Keine erneute Veröffentlichung und kein GET-/POST-Function-Test in dieser Untersuchung. Eine unmittelbare Importfreigabe wäre verfrüht; zuerst die unterschiedliche Abhängigkeit abnehmen.
