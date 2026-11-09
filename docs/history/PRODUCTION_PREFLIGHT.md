> Historischer Bericht. Maßgeblich sind [Projektstatus](../../PROJECT_STATUS.md) und [Cron-Abnahme](../../GOABASE_CRON_ACCEPTANCE.md). Frühere Freigaben sind keine Aufforderung zur Wiederholung.

# Spots: rein lesende Produktionsbestandsprüfung

Stand: 06.11.2026 (Europe/Berlin). Ausgeführt am 05.11.2026, **23:19:10–23:19:18 UTC**. Ausschließlich SELECTs mit CLI `--read-only` sowie Projekt-/Function-Metadaten gelesen. **Keine produktiven SQL-Änderungen, Function-Aufrufe, Deployments oder Cron-Aktionen.** Keine Schlüsselwerte abgerufen. App-`.env.local` und lokale Testprojekt-Verknüpfung per Vergleich unverändert bestätigt.

## 1. Zielidentität und aktueller Datenbestand

| Umgebung | Tatsächlicher Projektname | Projekt-ID | Eventanzahl |
| --- | --- | --- | ---: |
| Produktion | **Spots.** | **yhnxdeypkbzyjappuzmv** | **31** |
| Erfolgreich getestete Umgebung | **spots. testproject** | **nfomkdvotqtlyymomksb** | **34** |

Beide Projekte liegen in derselben bestätigten Organisation `sssqbihjtvtwifqtfxqv`, Region `eu-central-1`; PostgreSQL 17.11. Die lokale CLI ist weiterhin ausschließlich mit dem **Testprojekt** verbunden. Jede Produktionsabfrage erhielt explizit `--remote=yhnxdeypkbzyjappuzmv` und `--read-only`.

**Produktion:** 31 eindeutige Event-UUIDs, 31 Goabase-Quell-IDs, keine fehlenden Quell-IDs und keine doppelten Quellpaare. Alle 31 `scheduled` und veröffentlicht, alle mit gültigen GPS-Koordinaten und Goabase-Quelllinks mit passender Event-ID. Der vollständige Bestand einschließlich sämtlicher UUIDs und aller Eventfelder wurde vor/nach der Prüfung erneut gelesen und war **identisch**.

## 2. Schema, Constraints und Rechte im Vergleich

| Bestandteil | Produktion | Spots-Test | Konsequenz |
| --- | --- | --- | --- |
| Events-Spalten | 19 | 19 | Namen, Typen, Reihenfolge und NULL-Regeln identisch |
| Default `source` | `'manual'::text` | kein Default | Harmloser Unterschied: Importer setzt explizit `goabase`; produktiven Default erhalten |
| Übrige Defaults | UUID, Zeit, Status und Veröffentlichungsflag | gleich | Keine Anpassung erforderlich |
| Primärschlüssel | `events_pkey (id)` | identisch | Vorhandene UUIDs erhalten |
| Quellidentität | `UNIQUE (source, source_event_id)` | identisch | Passender vollständiger Unique-Btree-Index bereits vorhanden; keinen zweiten anlegen |
| Weitere Event-Constraints | keine zusätzlichen CHECK/FK-Constraints gefunden | identisch | Kein Constraint-Umbau erforderlich |
| Verweisende Fremdschlüssel | keine gefunden | geprüft | Kein Tabellenersatz vorgesehen |
| Event-Trigger | keine gefunden | geprüft | Keine zusätzlichen Event-Schreibtrigger entdeckt |
| RLS | aktiviert, nicht FORCED | identisch | RLS erhalten |
| Öffentliche Rollen | SELECT für `anon`/`authenticated` | identisch | Keine Client-Schreibrechte; auch TRUNCATE/REFERENCES/TRIGGER nicht gewährt |
| `service_role` | volle Tabellenrechte | identisch | Backendzugriff vorhanden, kein Frontend-Schlüssel |
| SELECT-Policy | `Read published events`: `is_published = true` | `events_public_read`: `is_published AND status = 'scheduled'` | Sicherheitsabweichung vor Übernahme ausdrücklich entscheiden |

Die Rechte wurden mit `has_table_privilege` für die tatsächlichen Rollen geprüft. Eine leere `information_schema.role_table_grants`-Ansicht unter der Inspektionsrolle ist **kein** Beweis fehlender Grants.

### Empfohlene RLS-Angleichung

Vor produktiver Freigabe die bestehende Policy nach eigener Zustimmung an die getestete Bedingung angleichen. Das verändert keine Eventdaten/UUIDs; alle aktuell 31 geplanten, veröffentlichten Events bleiben lesbar. Es verhindert zusätzlich, dass ein versehentlich noch veröffentlichtes abgesagtes/verschobenes Event über direkte Data-API-Aufrufe sichtbar bleibt.

Geplanter, **nicht ausgeführter** Einzelschritt:

```sql
-- PLAN ONLY, eigene Freigabe und vorheriger Policy-Abgleich erforderlich
alter policy "Read published events" on public.events
  using (is_published and status = 'scheduled');
```

Keine zweite permissive SELECT-Policy daneben anlegen: permissive Policies werden mit OR kombiniert und würden die bestehende großzügigere Policy nicht einschränken. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Technisch benötigt der Importer diese RLS-Änderung nicht für den Upsert; sie ist die empfohlene Angleichung an die abgenommene Sicherheitskonfiguration. Ohne Zustimmung unverändert lassen und die Abweichung bewusst festhalten.

## 3. Noch fehlende Backend-Bausteine

In Produktion ist im geprüften öffentlichen Bereich nur die Events-Tabelle vorhanden. Kein Schema `spots_sync_private`, keine gleichnamigen privaten Tabellen und keine öffentlichen Importer-RPCs gefunden. Im Testprojekt sind diese vorhanden und geprüft:

- `spots_sync_private.goabase_lease`
- `spots_sync_private.goabase_versions`
- `public.spots_goabase_begin()`
- `public.spots_goabase_apply(uuid, jsonb)`
- `public.spots_goabase_release(uuid)`

Für die Übernahme ist ausschließlich der bereits getestete [Backendentwurf 03](../../supabase/ops/03_goabase_sync_backend.sql) erforderlich: neues privates Schema, zwei Tabellen mit RLS, drei backendexklusive SECURITY-DEFINER-RPCs mit leerem search_path. **Kein neues `public.events`, kein Tabellenersatz, keine Änderung bestehender Event-UUIDs.** Die Test-Bootstrap-/Fixture-Dateien 05/06 und der kombinierte Test-Setup-Snapshot gehören niemals auf Produktion.

## 4. Extensions, Cron, Vault und Function-Status

In beiden Projekten vorhanden:

- `plpgsql` 1.0
- `pg_stat_statements` 1.11
- `uuid-ossp` 1.1
- `pgcrypto` 1.3
- `supabase_vault` 0.3.1

**Weder `pg_cron` noch `pg_net` installiert; `cron.job` fehlt.** Damit wurden keine internen Supabase-Cron-Jobs gefunden. Externe Scheduler oder manuelle Aufrufer außerhalb des Projekts sind durch Datenbank-Lesezugriff nicht vollständig ausschließbar.

Vault ist installiert. Für die geplanten Namen `spots_project_url` und `spots_import_goabase_secret_key` existieren in beiden Projekten **keine Einträge**. Ausschließlich Namen/Anzahlen gelesen, keine entschlüsselten Werte.

| Function-Metadaten | Produktion | Spots-Test |
| --- | --- | --- |
| Name | `import-goabase` | `import-goabase` |
| Status | **ACTIVE** | **ACTIVE** |
| Version | **1** | **1** |
| Verify JWT | **false** | **false** |
| Function-ID | `d1e82fa9-2874-487a-9a9c-15fb8adf6b83` | `ccedcf0f-1c2b-4973-8b4a-ec46ce2091cc` |
| Bundle-SHA-256 | `533190a2c6690a52fbdf0e2773ea897cf3e00e462692b6b5a006b1f7683dd868` | `f30f017ec6ce42eba8419bd1a8e2c5122b76fb357f27aba5f9c25e3e11a0497c` |

Gleiche Versionsnummern sind projektlokal und bedeuten nicht gleichen Code. Der produktive Entrypoint ist `source/index.ts`, der getestete `source/supabase/functions/import-goabase/index.ts`. **Kein Function-Aufruf** Teil dieser Prüfung. Den aktuellen produktiven Quelltext vor einem späteren Deployment zusätzlich isoliert herunterladen/sichern und mit dem ursprünglichen Repository-Stand abgleichen; die Metadaten ersetzen diese Code-Sicherung nicht.

## 5. Sicherung und Erhalt der 31 UUIDs

Lokal angelegt, durch [supabase/.gitignore](../../supabase/.gitignore) von Git ausgeschlossen:

- [31 produktive UUIDs und Quell-IDs](../../supabase/backups/production-preflight-2026-11-05T23-19-10-290Z/production-event-identities.json)
- [Vollständiger produktiver Eventbestand und Schema-/Rechtemetadaten](../../supabase/backups/production-preflight-2026-11-05T23-19-10-290Z/production-snapshot.json)
- [Testprojekt-Vergleichsstand](../../supabase/backups/production-preflight-2026-11-05T23-19-10-290Z/test-snapshot.json)
- [Prüfbericht](../../supabase/backups/production-preflight-2026-11-05T23-19-10-290Z/inspection-report.json) und [SHA-256-Manifest](../../supabase/backups/production-preflight-2026-11-05T23-19-10-290Z/sha256-manifest.json)

SHA-256 der produktiven Identitätsliste: `2261d4b666568ec2ee07fc6fd93da75521d2b908792afa124790b4d34aebe576`.

Dies ist ein überprüfbarer Daten-/Metadatenabzug, **kein vollständiges wiederherstellbares Datenbankbackup und kein getesteter Restore**. Vor tatsächlichen Produktionsänderungen zusätzlich vollständigen Schema-/Datenbackup samt Rollen/RLS und den produktiven Function-Artefakt sichern, Speicherort/Restore-Weg prüfen und bei Bedarf außerhalb dieses Rechners geschützt vorhalten. Verfügbarkeit von Dashboard-Backups/PITR hängt vom Projektplan ab und wurde hier nicht geprüft; nichts eingerichtet. [Supabase Backups](https://supabase.com/docs/guides/platform/backups)

Für die spätere Übernahme:

1. Identitätsliste unmittelbar vor Änderungen frisch sichern und auf Änderungen seit dieser Prüfung vergleichen.
2. Backend-Metadaten ergänzen, ohne bestehende Events anzufassen. Nach SQL-Einrichtung müssen sämtliche 31 vollständigen Eventzeilen exakt gleich sein.
3. Beim ersten später freigegebenen Import nach Quellpaar vergleichen: jede der 31 bestehenden Quell-IDs muss ihre **produktive** UUID behalten. Kein Kopieren der unabhängigen Testprojekt-UUIDs.
4. Der Upsert setzt keine vorhandene Event-ID neu. Neue Quellevents erhalten neue UUIDs; korrekte Änderungen/Absagen ändern Felder/Veröffentlichungsflag statt Identität.

Alle 31 produktiven Quell-IDs existieren auch im Testbestand. Dort gibt es zusätzlich 118637, 118641 und 118646. Das sind verschiedene Quellevents, keine Duplikate. Bei den 31 gemeinsamen Events unterscheiden sich gegenüber dem Testbestand die kanonischen Quelllinks und bei zwei Events das Bild; UUID/`created_at` sind umgebungsabhängig. Keine Daten blind aus Test nach Produktion kopieren und keine feste zukünftige Zielzahl 34 versprechen.

## 6. Konkrete Reihenfolge vor Freigabe

1. Diesen Befund und insbesondere die RLS-Abweichung bestätigen; produktiven Function-Code, vollständiges Backup/Restore-Verfahren und externe Schreiber prüfen.
2. Nach eigener SQL-Freigabe nur Backend 03 ergänzen; optional separat die bestehende RLS-Policy angleichen. Danach die 31 UUIDs/Daten und Rechte lesend prüfen.
3. Nach eigener Deployment-Freigabe ausschließlich `import-goabase` auf **yhnxdeypkbzyjappuzmv** bereitstellen; `auth: secret` und produktiven Default-Key beibehalten, Verify JWT false serverseitig bestätigen. Keine App-Konfigurationsänderung.
4. Nach eigener Testfreigabe GET-Authentifizierung und dann einen kontrollierten POST mit Vorher-/Nachher-Vergleich abnehmen.
5. Automatisierung später separat: Vault/pg_net/Cron zuerst im Testprojekt Ende-zu-Ende prüfen, danach produktspezifische Vault-Werte und genau einen inaktiven Zwei-Stunden-Job vorbereiten. Aktivierung benötigt nochmals eigene Freigabe.

**Rückfall:** Bei Problemen weitere Aufrufe pausiert halten, Bestand/Lease/Logs nur lesen. Vorheriges Function-Artefakt nur nach Freigabe wiederherstellen und Scheduler pausiert lassen, da der alte Importer die neue Lease nicht berücksichtigt. Neue Metadaten nicht blind löschen und keine alten Eventzeilen pauschal zurückspielen, die inzwischen korrekte Absagen überschreiben könnten. Benötigt eine Datenwiederherstellung einen Eingriff, erst anhand Backup und Quellversionen einen konkreten selektiven Restore planen und freigeben.

Vollständiger Ablauf mit expliziten Zielbefehlen: [PRODUCTION_ROLLOUT.md](../../PRODUCTION_ROLLOUT.md). **Die Freigabe für produktive Änderungen wurde noch nicht erteilt und wird hiermit nicht vorweggenommen.**
