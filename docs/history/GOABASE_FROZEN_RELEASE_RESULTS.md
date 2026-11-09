> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: produktive Importer-Fassung identisch in Test abgenommen

Stand: 08.11.2026, Testabschluss 18:30:09 UTC. Änderungen und Function-Aufrufe ausschließlich in **Spots-Test nfomkdvotqtlyymomksb**. **Produktion yhnxdeypkbzyjappuzmv unverändert, weiterhin ACTIVE/Version 3.** Keine Produktionsimporte/SQL-Änderungen, kein Cron und keine Expo-/Frontendänderung. App-Umgebungsdatei per Hash unverändert.

## Ergebnis und Freigabeentscheidung

**Die produktiv bereits bereitgestellte Version 3 ist hinsichtlich der Abhängigkeitsabweichung jetzt ausreichend durch den Test abgedeckt.** Spots-Test verwendet als Version 4 das **bytegenau identische vollständige unkomprimierte ESZIP**. Dessen Authentifizierungsprüfungen und genau ein realer Import waren erfolgreich. Ein erneutes Produktionsdeployment ist für diesen Nachweis nicht erforderlich.

Der nächste Schritt kann ein separat freizugebender kontrollierter produktiver POST sein. Seine tatsächliche Funktion in der Produktionsumgebung wird damit noch nicht vorweggenommen; es wurde kein produktiver Function-Aufruf ausgeführt.

## Vollständig festgelegter Artefaktstand

Die aktuelle Produktion wurde erneut ausschließlich per Management-GET gelesen: Version 3, ursprünglicher Bundle-Fingerprint unverändert. Ihr Body entspricht weiterhin dem zuvor untersuchten Raw-ESZIP-Hash. Dieses vollständig aufgelöste Artefakt wurde eingefroren, statt erneut aus Quellen mit offenen Versionsbereichen zu bauen.

[production-v3.release.json](../../supabase/functions/import-goabase/production-v3.release.json) hält alle **13 konkreten Pakete mit vollständigem Abhängigkeitsgraph, 807 Bundle-Einträge samt Inhalts-/Sourcemap-Hashes, Deno-Konfiguration und Toolchain** fest:

| Paket | Version |
| --- | --- |
| @supabase/server | 1.9.2 |
| @supabase/middleware | 1.0.0 |
| @supabase/auth-js, functions-js, postgrest-js, realtime-js, storage-js, supabase-js | jeweils 2.119.0 |
| @supabase/phoenix | 0.4.5 |
| iceberg-js | 0.8.1 |
| **jose** | **6.2.16** |
| std-env | 4.3.0 |
| tslib | 2.8.1 |

Eingebettete Deno-Konfiguration unverändert `{ "compilerOptions": { "strict": true } }`, SHA-256 `fc9fc38c21441b7f67a91280ed28b8ca4ad67fc69d713db441f5c0fd9a6abf9f`. Auth-Konfiguration secret/default, verify_jwt=false.

## Reproduzierbare Verpackung und tatsächlicher Bundlevergleich

[build-goabase-production-v3.cjs](../../scripts/build-goabase-production-v3.cjs) verpackt ausschließlich das per SHA-256 fixierte ESZIP offline: EZBR-Präfix plus Brotli Qualität 6, Node-/Brotli-Versionen gegen Release-Manifest geprüft. Zwei lokale Verpackungen liefern dieselben Bytes; Dekompression reproduziert das ursprüngliche Artefakt. Keine Registry, Paketauflösung, Credentials oder Deployment in diesem Buildschritt. Ein zusätzlicher lokaler Lauf nach dem Test bestätigt dieselben Hashes ohne erneuten Import.

```powershell
# Nur lokale Verpackung eines bereits gesicherten Release-Artefakts:
node scripts/build-goabase-production-v3.cjs supabase/backups/bundle-inspection-2026-11-08T18-24-02-142Z/production.body
```

**Abgrenzung:** Dies ist die reproduzierbare Verpackung einer eingefrorenen kompilierten Release-Fassung, kein neu behaupteter reproduzierbarer TypeScript-Quellbuild. Das ursprüngliche Artefakt muss zusammen mit Manifest/Toolchain aufbewahrt werden. Die historische deno.lock bleibt unverändert und beschreibt diesen API-gebauten Stand nicht vollständig; sie wird hier ausdrücklich nicht als Deployment-Garantie verwendet. Neue Quelländerungen benötigen einen gesonderten vollständigen Build-/Abhängigkeitsstand und dessen Abnahme. Bloßes erneutes `functions deploy --use-api` gehört nicht zum reproduzierbaren Verfahren dieser Release.

Der dokumentierte [Update-Endpunkt](https://supabase.com/docs/reference/api/v1-update-a-function) akzeptiert fertige EZBR-Artefakte ohne neue Quellauflösung. Erster Uploadversuch HTTP 500: fälschlich application/octet-stream verwendet. Lesend bestätigt, dass Test unverändert ACTIVE/v3 blieb; kein Import. Danach Anfrageformat entsprechend dem [offiziellen API-Vertrag](https://raw.githubusercontent.com/supabase/cli/main/packages/api/src/generated/openapi.json) korrigiert auf **application/vnd.denoland.eszip** und explizite bestehende Entrypoint-/Importmap-Metadaten. Korrigierter Upload **HTTP 200**, Test **ACTIVE/Version 4**. Beide Versuche dokumentiert, keine automatischen Wiederholungen oder neuen Paket-Builds.

| Nachweis | Ergebnis |
| --- | --- |
| Raw-ESZIP-SHA-256 Produktion v3 | e160bae41b3fb10e614339720ce2606b67e8d8d9f078ee0a9102d6f153396743 |
| Raw-ESZIP-SHA-256 tatsächlich heruntergeladene Test-v4 | **derselbe Hash, vollständige Bytes gleich** |
| Komprimierter Fingerprint Produktion v3 | 54a39f2b3daed9cf593c5217df5ece61f63fe4f6e311b68311265f14c4806ea8 |
| Neu verpackter komprimierter Fingerprint Test v4 | e2c83d155896bd84d9311e24e5be486d6330d6e84996a22f8251a6c1d48962ad |
| Auth / verify_jwt / import_map | secret/default / false / true, übereinstimmend |
| Produktionsmetadaten und Body vor/nach Testdeployment | unverändert |

Die jetzt noch unterschiedlichen **komprimierten** Fingerprints sind durch andere Verpackung bei nachgewiesen vollständig gleichen unkomprimierten Bytes unbedenklich für die Codegleichheit. Die frühere tatsächliche jose-Codeabweichung besteht zwischen diesen aktuellen Fassungen nicht mehr. Alle 807 Einträge, transitive Pakete, Runtime-Metadaten und Deno-Konfiguration sind durch vollständige Bytegleichheit abgedeckt. Projektbezogene Metadatenpfade/Function-IDs bleiben verschieden; Test verwendet weiterhin seine eigenen Runtime-Credentials und Datenbank.

## Tatsächliche Tests ausschließlich in Spots-Test

Vier GET-Authentifizierungsprüfungen auf dem identischen Artefakt:

| Aufruf | Tatsächlich |
| --- | --- |
| ohne API-Key | HTTP 401 |
| falscher API-Key | HTTP 401 |
| Publishable Key | HTTP 401 |
| gültiger Default Secret Key | HTTP 405, POST erforderlich, Allow: POST |

Vor/nach GETs vollständiger Testbestand und Backendzustand identisch. Schlüssel ausschließlich im Prozessspeicher, nicht ausgegeben/gespeichert. Anschließend **genau ein POST**, **HTTP 200**, Run-ID `7d2f1975-acda-4291-9a6e-57c910f54c28`:

| Zähler | Ergebnis |
| --- | ---: |
| discovered / checked | 29 / 36 |
| inserted / updated / unchanged | 0 / 0 / 34 |
| removed / removed_unchanged / removed_unknown | 0 / 1 / 0 |
| quarantined / quarantined_unchanged / skipped_unconfirmed | 0 / 0 / 1 |
| rejected_versions / cancelled / postponed | 0 / 0 / 0 |

**35 → 35 Events**, alle vollständigen Eventdaten einschließlich UUIDs/created_at identisch; sämtliche 35 Quellversionsdatensätze und Entfernungsmetadaten ebenfalls unverändert. **28 veröffentlicht, 7 ausgeblendet**; Status 34 scheduled/1 source_removed. Entfernte ID 118240 bleibt unveröffentlicht, neue ungeklärte ID 118652/Moved bleibt übersprungen. **0 Duplikate, Lease frei**, Event-Policies unverändert, keine Quarantänemetadaten angelegt. Keine Eventdaten manipuliert oder Test-Fixtures eingefügt. Kein zweiter Import.

Geschützte/Git-ignorierte Belege: `supabase/backups/frozen-release-test-2026-11-08T18-27-01-414Z/`; Originalartefakt und reproduzierbares EZBR unter `supabase/backups/bundle-inspection-2026-11-08T18-24-02-142Z/`. [Einmaliger Testablauf](../../scripts/test-goabase-frozen-release.cjs), [geschützte Credential-Übergabe](../../scripts/deploy-goabase-frozen-test.ps1). Einmalmarker verhindern Wiederholung des POST. **Expo-Lint/App-Typecheck und ausgeführte Skripte erfolgreich**; unabhängige Import-/Fixture-Suiten wurden nicht wiederholt.

## Nächste konkrete Freigabe

> Ich gebe genau einen kontrollierten produktiven POST für import-goabase im Projekt yhnxdeypkbzyjappuzmv frei. Prüfe unmittelbar vorher Version 3 und den hier abgenommenen Artefaktstand sowie das geprüfte Backup. Sichere die aktuellen 31 Events vollständig einschließlich UUIDs. Führe den Import einmal aus und prüfe danach Ergebniszähler, ursprüngliche UUIDs, Quellstatus/Veröffentlichung, Duplikate, Lease und App-Lesezugriff. Bei Fehler kein Retry. Keine weiteren Deployments, SQL- oder RLS-Änderungen und kein Cron.

Diese Formulierung bereitet die nächste Freigabe vor, führt sie nicht aus. Produktions-RLS bleibt wie zuvor flagbasiert; deren mögliche zusätzliche Statushärtung ist ein unabhängiger Schritt und wurde hier nicht verändert.
