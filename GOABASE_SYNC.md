# Goabase-Synchronisierung für Spots vorbereiten

Stand: 03.11.2026. **Vorbereitet, nicht aktiviert.** Keine SQL-Datei dieser Vorbereitung wurde gegen die bestehende Datenbank ausgeführt. Die SQL-Vorlagen wurden nicht in einem PostgreSQL-Testprojekt ausgeführt und sind noch keine abgenommenen Migrationen.

## Geprüfter Bestand und gespeicherter Import-Code

- Der Nutzer hat den vollständigen Handler bereitgestellt; er liegt unverändert unter [supabase/functions/import-goabase/index.ts](supabase/functions/import-goabase/index.ts), mit eigener Deno-Konfiguration. Der Import wird nicht von der App aufgerufen.
- Der Dashboard-Zugriff endete bei der ursprünglichen Vorbereitung an der Anmeldung; inzwischen ist die freigegebene Sitzung angemeldet. Rein lesend bestätigt: `import-goabase` existiert, Verify JWT ist aus, Vault ist installiert. Der vollständige Unique-Index `events_source_source_event_id_key` auf `(source, source_event_id)` ist vorhanden. **Integrations → Cron → Jobs** meldet **Cron is not installed**. Nichts installiert/aktiviert. Externe Scheduler und echte Backend-Integrationstests bleiben gesondert zu prüfen.
- Der vorhandene Publishable Key erlaubt Event-Lesezugriffe, aber keine administrativen Prüfungen von Cron, Vault, Constraints oder Edge-Function-Code. Dafür keinen Secret Key in die App oder den Chat kopieren.
- Rein lesender API-Audit: 31 öffentlich sichtbare Goabase-Events, alle `scheduled`, keine doppelten/fehlenden `source_event_id` in diesen sichtbaren Zeilen. Nicht veröffentlichte/verdeckte Zeilen und tatsächliche Unique-Constraints sind damit nicht geprüft.
- Alle 31 Quelllinks verwenden HTTPS und den Goabase-Host; die letzte Pfadkomponente stimmt jeweils mit der Quell-ID überein. Die ersten zwei Links (117895, 118240) lieferten HTTP 200. Nicht alle 31 Ziele wurden per HTTP abgerufen.
- Die bestehenden Eventdetails enthalten den Link „Event bei goabase ansehen“, auch der vorhandene Teilen-Text enthält den Quelllink. Dieser Backlink bleibt erhalten. Goabase verlangt bei Weiterverwendung einen Rückverweis. [Goabase-API-Hinweise](https://www.goabase.net/api/party/)

Der übergebene Handler braucht keinen POST-Body und verwendet ausschließlich `npm:@supabase/server@1`; eigene Hilfsdateien sind darin nicht importiert. [REVIEW.md](supabase/functions/import-goabase/REVIEW.md) dokumentiert die genaue Prüfung: Upsert-Schlüssel und bedingtes Ausblenden gelieferter Absagen sind vorhanden, aber Pagination, Abgleich fehlender Events, Status-Updates und Schutz vor veralteten Läufen fehlen. Zwölf isolierte Handler-Tests reproduzieren das Verhalten, ersetzen aber keine echte Auth-/Datenbank-/Deno-Prüfung. **Noch nicht zur automatischen Synchronisierung freigegeben.** Keine Function wurde ersetzt oder aufgerufen.

## 1. Zuerst vorhandene Jobs prüfen

1. Im richtigen Supabase-Projekt anmelden und **SQL Editor → New query** öffnen. Als Projektadministrator prüfen, damit Job-Sichtbarkeit nicht auf eigene Jobs beschränkt ist.
2. [00_inspect_environment.sql](supabase/ops/00_inspect_environment.sql) ausführen. Ausschließlich SELECTs in einer Read-only-Transaktion: Extensions, Zeitzone, Index-/Constraint-Definitionen, Duplikate und unbestätigte veröffentlichte Events.
3. Sind `cron.job` und `vault.secrets` vorhanden, [01_inspect_jobs.sql](supabase/ops/01_inspect_jobs.sql) ausführen. Das Ergebnis enthält Jobnamen, Zeitpläne, IDs und Kandidatenmarkierungen, aber keine möglicherweise geheimen Job-Befehle und keine entschlüsselten Vault-Werte.
4. Im Dashboard zusätzlich **Integrations → Cron → Jobs** ansehen. Alle Jobs einschließlich deaktivierter Jobs auf Goabase prüfen. Auch SQL-Wrapper/RPCs, anders benannte Jobs und externe Automationen berücksichtigen: Eine Textsuche nach `import-goabase` erkennt indirekte Aufrufe nicht zuverlässig.
5. Bereits ein passender Job vorhanden: seine ID weiterverwenden; keinen zweiten anlegen. Mehrere Kandidaten: zuerst klären, welcher der richtige ist. Bestehende Jobs nicht blind löschen, deaktivieren oder überschreiben. Job-Befehle vor Weitergabe redigieren, falls sie bisher Schlüssel enthalten.
6. Fehlende Extensions noch nicht unkontrolliert installieren. Nach Prüfung im Testprojekt Cron/`pg_cron`, `pg_net` und Vault über die entsprechenden Dashboard-Integrationen/Extensions einrichten. Keine vorhandene Extension löschen oder neu installieren.

Die Sichtbarkeit von `cron.job` hängt von der Datenbankrolle ab. [pg_cron-Dokumentation](https://github.com/citusdata/pg_cron), [Supabase Cron](https://supabase.com/docs/guides/cron)

## 2. Importer vor Aktivierung abnehmen

Diese Regeln sind Anforderungen an den vorhandenen Code, keine Behauptung seiner bisherigen Implementierung:

| Fall | Erforderliches Verhalten |
| --- | --- |
| Wiederholter Import | Stabile Identität aus `source = 'goabase'` und unveränderter `source_event_id`; UUID des Spots-Events behalten. |
| Duplikatschutz | Datenbankseitiger vollständiger Unique-Constraint/Unique-Index auf `(source, source_event_id)` und passender atomarer Upsert, beispielsweise `onConflict: 'source,source_event_id'`. Nicht nur vorher SELECT und danach INSERT. |
| Quell-ID fehlt | Datensatz ablehnen und Lauf mit Fehlerzähler melden. Keine wechselnde Ersatz-ID aus Titel, Datum oder Position erzeugen. Leere IDs verhindern. |
| Änderung | Titel, Inhalt, öffentliche Location/GPS, Termine, Bilder und Links anhand derselben Quell-ID aktualisieren; keine neue UUID. Herkunftsinformationen erhalten. |
| Absage | Explizite Quellabsage auf `status = 'cancelled'` und `is_published = false` abbilden. Zeile/UUID erhalten, nicht löschen. |
| Verschiebung | Solange kein bestätigter neuer Termin vorliegt: `postponed`, nicht veröffentlichen. Erst nach geprüftem neuem Datum wieder `scheduled` und veröffentlichen. |
| Liste unvollständig/leer | Nicht als Massenabsage interpretieren. Timeout, 429, 5xx, Parserfehler oder fehlende Seiten dürfen bestehende Events nicht pauschal deaktivieren. |
| Parallelaufruf | Serverseitige dauerhafte Lease/vergleichbare Serialisierung prüfen. Keine Session-Advisory-Locks über unabhängige gepoolte REST-Aufrufe annehmen. Ältere Antworten dürfen neuere Änderungen/Absagen nicht überschreiben. |
| Teilfehler | Datenbank-/Mappingfehler sichtbar melden; kein erfolgreiches `ok` für einen gescheiterten Lauf. Keine still verschluckten Upsert-Fehler. |

Der frühere Schemaauszug enthielt nur Spalten. Inzwischen wurde der passende vollständige Unique-Index auf `(source, source_event_id)` über die Dashboard-Definition bestätigt. **Keinen zweiten Index anlegen.** Das Hinzufügen weiterer Constraints, Leases oder Sync-Metadaten braucht eine getestete, separat geprüfte Migration. Aktuell fehlen beispielsweise Quell-Änderungszeit und Sync-Lauf-Metadaten im bekannten Schema.

Die Quellabfrage muss neben neu entdeckten Terminen auch schon gespeicherte Termine erneut prüfen, einschließlich begonnener/gerade vergangener und verschobener Events. Quelländerungen und Absagen dürfen nicht allein vom zukünftigen Standardfeed abhängen. Die API bietet separate Statusfilter und Detailabrufe. `canceled` als API-Filter und `Cancelled` als Payloadwert sind verschiedene Schreibweisen. Pagination und deren Grenzen anhand des tatsächlich verwendeten Endpoints testen; ein erreichtes Limit ist keine vollständige Bestandsaufnahme. [Goabase-OpenAPI-Spezifikation](https://www.goabase.net/api/schema/goabase.json)

Als zusätzlicher Schutz liest Spots jetzt in Explore, Radar, Details und Merkliste nur `is_published = true AND status = 'scheduled'`. Der Adapter prüft das ebenfalls. Damit verschwindet eine Absage auch bei versehentlich weiterhin wahrem Veröffentlichungsflag. Zeit/GPS entscheiden weiterhin gesondert über Live-Anzeige. Das ersetzt weder korrekte Backend-Updates noch RLS.

## 3. Backend-Authentifizierung und Vault

1. Zuerst die aktuelle Authentifizierung des Handlers prüfen. Keine bestehende Function öffentlich schalten, um einen 401-Fehler zu umgehen.
2. Der jetzt gespeicherte Handler verwendet `auth: 'secret'` und akzeptiert damit den Secret Key namens **default** unter **Settings → API Keys**. Ein anders benannter separater Key passt ohne spätere Codeänderung nicht. Der Key darf nur im Backend verwendet werden.
3. Für den unveränderten Handler müsste Vault den passenden Default-Secret-Key enthalten. Ein separater Key bleibt eine mögliche spätere Verbesserung mit passendem `auth: 'secret:spots-import-goabase'`. Erst zusammen mit getesteter Handler-Prüfung passt `verify_jwt = false` zu modernen Secret Keys. Ein `sb_secret_…`-Key ist kein Benutzer-JWT; nicht als Bearer-JWT behandeln. Die vorhandene Einstellung vor jeder Änderung prüfen. [Supabase Function-Authentifizierung](https://supabase.com/docs/guides/functions/auth)
4. In **Vault → Secrets** (über die Dashboard-Suche auffindbar) genau je einen Eintrag anlegen bzw. vorhandenen Eintrag gezielt aktualisieren:

   | Vault-Name | Backend-Wert |
   | --- | --- |
   | `spots_project_url` | HTTPS-Projekt-URL, ohne Function-Pfad |
   | `spots_import_goabase_secret_key` | Der vom Handler akzeptierte Secret Key; beim aktuellen unveränderten Code der Key namens `default` |

   Werte in der Vault-Oberfläche eingeben, nicht als SQL-Literal in gespeicherten SQL-Editor-Abfragen und nicht in Git. Secret-Namen sind kein Geheimnis. Die App-Variablen in `.env.local` bleiben ausschließlich öffentlich; dort keinen Backend-Key ergänzen.
5. Der Importer verwendet seine serverseitigen Supabase-Zugänge/Function-Secrets für Schreibzugriffe. Vault-Werte werden vom Cron-Befehl bei jedem Aufruf gelesen, nicht in den Jobtext eingebettet. Keine Header oder Vault-Werte in Logs schreiben. `pg_net` hält entschlüsselte Header kurzzeitig in seiner Backend-Queue; deren Zugriffe ebenfalls beschränken und die Queue nicht exportieren. [Zeitgesteuerte Functions mit Vault](https://supabase.com/docs/guides/functions/schedule-functions), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)

## 4. Zeitplan im Testprojekt vorbereiten

Ziel: **`0 */2 * * *`** – alle zwei Stunden zur vollen geraden UTC-Stunde. Die Vorlage verlangt UTC/GMT als Cron-Zeitzone; die Einstellung wird vorher gelesen. Die Ortszeit in Deutschland verschiebt sich mit Sommer-/Winterzeit. Es handelt sich nicht um einen Timer zwei Stunden nach dem App-Start.

[02_prepare_disabled_job.sql](supabase/ops/02_prepare_disabled_job.sql) liegt bewusst außerhalb von `supabase/migrations`:

- Standardmäßig bricht die Vorlage bei `inventory_reviewed = false` ab.
- Erst nach Bestandsprüfung und Codeprüfung im **Testprojekt** den lokalen Prüfwert auf `true` setzen.
- Bei irgendeinem gefundenen Goabase-Job beendet sie sich ohne Änderung. Auch inaktive Kandidaten zählen. Indirekte Wrapper müssen zusätzlich manuell geprüft sein.
- Fehlt ein Job, wird genau ein benannter Job **inaktiv** vorbereitet; Anlage und Deaktivierung liegen in derselben Transaktion. Wiederholte Ausführung erstellt keinen weiteren passenden Job.
- Der Job liest URL und Key erst zur Laufzeit aus Vault und sendet POST mit `apikey` an `/functions/v1/import-goabase`. Der geplante Body `{}` passt zum übergebenen Handler, der den Request-Body nicht auswertet. Die oben dokumentierten Sync-Lücken müssen vor Aktivierung trotzdem behoben werden.
- `pg_net` arbeitet asynchron. Seine erfolgreiche Einreihung und der Cron-Status sind kein Beleg für einen erfolgreichen Import. Ein SQL-Advisory-Lock um die Einreihung verhindert keine parallelen HTTP-Importe.

Für einen bestehenden Job wird stattdessen dessen geprüfter Befehl mit Vault-Aufruf weiterverwendet und der Zeitplan gezielt auf zwei Stunden angepasst. Die Vorlage überschreibt ihn nicht.

## 5. Abnahmetests und erst danach aktivieren

Tests mit isolierten Fixture-Daten in einem Testprojekt, nicht mit erfundenen Events in Produktion:

1. Import zweimal identisch ausführen: Zeilenzahl stabil, dieselben UUIDs, keine doppelten Quellpaare.
2. Datum, Titel und GPS desselben Quellevents ändern: genau diese Zeile ändert sich; gespeicherte UUID bleibt gültig.
3. Explizite Absage testen: Status/Flag korrekt, Event weder in Explore noch Radar/Details/Merkliste sichtbar. Verschiebung und spätere bestätigte Wiederveröffentlichung gesondert prüfen.
4. Mehrere Seiten, abgeschnittene Antworten, Fehler auf späterer Seite, 429 und Zeitüberschreitungen simulieren: keine Massenabsage/ungewollte Löschung, Fehler erkennbar.
5. Zwei gleichzeitige Aufrufe und einen verspäteten alten Response testen: keine Duplikate, keine Rücknahme neuerer Absagen/Änderungen.
6. Ohne Key, mit Publishable Key und mit falschem Secret: 401/403 und **keine Datenänderung**. Mit dem vorgesehenen Key: vollständiger erfolgreicher Durchlauf.
7. Über den vorbereiteten Vault/`pg_net`-Aufruf testen: tatsächlichen HTTP-Status und Import-Ergebnis prüfen, nicht nur `cron.job_run_details`. Der Handler muss innerhalb des geplanten 120-s-HTTP-Zeitlimits abschließen oder ein gesondert überprüfbares Laufmodell besitzen.

Erst wenn diese Tests bestehen, die gleiche geprüfte Vorbereitung in Produktion durchführen. Die vorhandene Function dabei nicht ungeprüft neu deployen. Vor Aktivierung erneut Jobbestand prüfen. Das folgende Beispiel ist **ebenfalls gesperrt und nicht ausgeführt**:

```sql
begin;
do $activate$
declare
  importer_tests_passed boolean := false;
  target_job_id bigint := null; -- geprüfte bestehende/vorbereitete Job-ID einsetzen
begin
  if not importer_tests_passed or target_job_id is null then
    raise exception 'Blocked: importer tests and exact target job ID required.';
  end if;
  perform pg_advisory_xact_lock(732481, 2);
  if not exists (select 1 from cron.job where jobid = target_job_id) then
    raise exception 'Target job not found.';
  end if;
  if exists (
    select 1 from cron.job
    where jobid <> target_job_id
      and (command ilike '%import-goabase%' or jobname ilike '%goabase%')
  ) then
    raise exception 'Other Goabase candidates exist. Resolve duplicates before activation.';
  end if;
  -- Zielbefehl, Vault und indirekte Aufrufer zuvor manuell prüfen.
  perform cron.alter_job(target_job_id, schedule := '0 */2 * * *', active := true);
end;
$activate$;
commit;
```

## 6. Betrieb und Rücknahme

Unter **Cron → Jobs → History** und **Edge Functions → import-goabase → Logs/Invocations** mindestens zwei geplante Läufe prüfen. Erfassen: Lauf-ID, Dauer, gelesen/neu/geändert/abgesagt/übersprungen/fehlerhaft; keine Zugangsdaten. HTTP-Status/Timeouts ohne Response-Header aus `net._http_response` kontrollieren; diese Antworten werden nur begrenzte Zeit aufbewahrt. Inhalt/Logs erst nach redigierter Prüfung weitergeben.

Bei Problemen den **genau geprüften Job** im Dashboard pausieren oder `cron.alter_job(JOB_ID, active := false)` verwenden. Kein Löschen von Events oder Jobs erforderlich. Bereits eingereihte/laufende HTTP-Aufrufe werden durch das Pausieren nicht abgebrochen.

Aktuell offen: Status-Default/weitere Constraints und externe Scheduler bei Bedarf prüfen, dokumentierte Sync-Lücken beheben, Backend-Abnahmetests mit Deno/Testdatenbank und Aktivierung. Der übergebene Handler ist lokal gespeichert und isoliert geprüft. Der benötigte Unique-Index ist bestätigt. Verify JWT ist bereits aus; Cron ist laut Dashboard nicht installiert. Kein aktiver Zwei-Stunden-Job wurde durch diese Vorbereitung angelegt.
