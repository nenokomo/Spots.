> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: Function v3 bereitgestellt, Bundle-Abnahme gestoppt

**Abschluss 08.11.2026:** Nach gezielter Testfreigabe ist das unveränderte vollständige Produktions-v3-ESZIP nun als Test-v4 bytegleich bereitgestellt und erfolgreich abgenommen: Auth 401/401/401/405, genau ein Testimport HTTP 200, alle 35 Testdaten/UUIDs unverändert, keine Duplikate/freie Lease. Dependency-Abweichung damit geschlossen, kein erneutes Produktionsdeployment notwendig. Keine Produktionsaufrufe oder Produktionsänderung. [Aktueller Abschlussnachweis](GOABASE_FROZEN_RELEASE_RESULTS.md). Die folgenden Stopp-/Analyseangaben sind historisch.

**Lesende Aufklärung 08.11.2026:** Die tatsächlichen Bodies wurden inzwischen statisch verglichen. Kein reiner Metadaten-/Hashunterschied: Test enthält **jose 6.2.15**, Produktion **6.2.16**, mit fünf unterschiedlichen ausführbaren jose-JS-Dateien. Eigener Importer-Code und Auth-Konfiguration identisch; vollständiges Bundle nicht identisch. Transitive Versionsauflösung im API-Build driftet trotz lokaler Lockdatei. Keine weitere Remote-Änderung/Function-Aufrufe. [Detaillierte Bundleanalyse](GOABASE_BUNDLE_ANALYSIS.md). Die folgenden Angaben dokumentieren den ursprünglichen Deploymentstopp.

Stand: 08.11.2026. Ausschließlich **Spots. / yhnxdeypkbzyjappuzmv**. Genau ein freigegebenes Deployment von import-goabase; keine SQL-Änderung, keine Function-Aufrufe/POST-Imports, kein Cron, kein Frontend-/Umgebungswechsel.

## Tatsächliches Ergebnis

- Produktions-ID/Name unmittelbar vor dem Deployment bestätigt, lokale CLI-Verknüpfung weiter Test. Erfolgreichen Testlauf HTTP 200/Version 3 und abgeschlossene produktive Backend-09/10-Einrichtung geprüft.
- Aktuelle Test-Function Version 3 über CLI heruntergeladen. Lokale Dateien index.ts, sync.ts und deno.json stimmen mit diesem bereitgestellten Test-Quellstand überein. Alle vier lokalen Kandidaten-Hashes einschließlich deno.lock entsprechen dem erfolgreichen Testnachweis.
- Ein Deployment ausschließlich von import-goabase mit explizitem Produktionsziel erfolgreich an Supabase übermittelt. Tatsächlich danach **ACTIVE, Version 3, verify_jwt=false**, gleiche Function-ID d1e82fa9-2874-487a-9a9c-15fb8adf6b83. Handler unverändert withSupabase(auth:secret); Default-Secret-Verfahren erhalten, keine Schlüssel gelesen/ausgegeben/geändert. Keine erneuten Authentifizierungsaufrufe durchgeführt.
- Bereitgestellte Produktionsquellen danach heruntergeladen: index.ts, sync.ts und deno.json stimmen mit der Testfassung überein. **Serverseitiger Bundle-Hash weicht jedoch ab**, deshalb Abschlussprüfung fehlgeschlagen und sofort gestoppt. Kein weiterer Deploymentversuch oder Rollback.
- **Alle 31 vollständigen Events einschließlich UUIDs unverändert**, Lease frei, 0 Quellversionen und leere Entfernungs-/Quarantänemetadaten vor/nach identisch. Event-Policies unverändert. Andere produktive Functions und Test-Functions unverändert. App-Umgebungsdatei per Hash identisch, CLI bleibt Test.

| Fingerprint | SHA-256 |
| --- | --- |
| Erfolgreich getestetes Server-Bundle | `ef6e9148dd99db9c1a372b4d5e6531e6208ea84de826b0391c6e3d6b2249ff6a` |
| Jetzt produktiv bereitgestelltes Server-Bundle | `54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8` |
| Lokale index.ts | `05095eb4d29c49cec06438addec6e986c76d34fee8fff29a1d155b7b539e8bfb` |
| Lokale sync.ts | `4cc59c33aa81fc944dfdffbc9a9ccc6b2a07a68bba9418aedad44ae180d34ae2` |
| Lokale deno.json | `fc9fc38c21441b7f67a91280ed28b8ca4ad67fc69d713db441f5c0fd9a6abf9f` |
| Lokale deno.lock | `41f44cfb0e5d2bc4bd3bcfd57c6655b447e95d780714e03851d42be0d3e6122f` |

Der Function-Download enthält keine deno.lock. Der unveränderte lokale Lockfile-Hash und gleiche heruntergeladene Quellen beweisen deshalb nicht allein einen identischen aufgelösten Dependency-/Bundle-Inhalt. **Ursache des Bundle-Unterschieds ungeklärt**; weder als harmlos noch als fachlicher Codefehler nachgewiesen. Kein vollständiger Erfolg der Produktionsabnahme behauptet.

## Belege und weiterer Schritt

Geschützt/Git-ignoriert unter `supabase/backups/production-function-v3-deploy-2026-11-08T18-05-59-675Z/`: Ergebnisbericht mit einzeln ausgewiesenen Prüfungen, Deploymentantwort, Vorher-/Nachher-Snapshots, Function-Metadaten sowie heruntergeladene Test-/Produktionsquellen. Vorherige produktive Version 2 zusätzlich als Quellcode und Konfiguration für einen freizugebenden Rückfall gesichert. [Einmaliger Deployment-Runner](../../scripts/deploy-goabase-production-v3.cjs) verweigert eine Wiederholung.

Als Nächstes ausschließlich lesend die Ursache der Bundle-Differenz untersuchen; insbesondere verfügbare Build-/Abhängigkeitsinformationen und Reproduzierbarkeit vergleichen. Noch keine erneute Veröffentlichung, kein Function-Aufruf, kein Import oder Cron. Ein späterer Deployment-/Rollback-/Testschritt braucht die passende ausdrückliche Freigabe. Gleiche Quelldateien sind kein Anlass, die fehlgeschlagene Bundle-Prüfung nachträglich als bestanden zu markieren.
