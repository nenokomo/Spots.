# Prüfung des übergebenen Importers

Stand: 03.11.2026. [index.ts](index.ts) enthält den vom Nutzer übergebenen Code unverändert. Kein Deployment, kein Function-Aufruf gegen Produktion und kein Cron-Job wurden durch diese Prüfung angelegt. **Für vollständige automatische Synchronisierung noch nicht freigegeben.**

Dashboard rein lesend geprüft: `import-goabase` existiert; Verify JWT ist aus. Unter **Integrations → Cron → Jobs** steht **Cron is not installed**. Es wurde weder installiert noch ein Job angelegt. Externe Scheduler außerhalb dieses Projekts sind damit nicht geprüft.

Unter **Database → Indexes → View definition** wurde außerdem `CREATE UNIQUE INDEX events_source_source_event_id_key ON public.events USING btree (source, source_event_id)` bestätigt. Der passende vollständige Unique-Index für den Upsert ist vorhanden; kein Index wurde angelegt oder geändert.

## Was funktioniert

- `withSupabase({ auth: "secret" })` schützt den privilegierten Handler grundsätzlich mit Supabase-Server-Authentifizierung. Keine Zugangsdaten sind im Quellcode eingebettet, der Admin-Client stammt aus dem Backend-Kontext. Die App importiert diese Datei nicht. Im Dashboard wurde rein lesend bestätigt: **Verify JWT with legacy secret = OFF** (`aria-checked=false`). Das passt zur modernen Secret-Key-Prüfung im Handler; kein Schalter wurde geändert.
- `onConflict: "source,source_event_id"` ist der richtige Konfliktschlüssel für stabile Quellidentität. Der passende vollständige Unique-Index ist im Dashboard bestätigt. Erneut gelieferte Events werden aktualisiert; die UUID wird vom Payload nicht überschrieben. Das gilt nur für die tatsächlich zurückgegebenen Events und schützt nicht vor veralteten Updates.
- Ein erneut geliefertes `Cancelled`- oder `Postponed`-Event erhält `is_published = false`. Das reicht für die bestehende App, es auszublenden.
- Ein HTTP-Fehler der Quelle oder eine fehlende `partylist` führt zu 502 ohne Upsert. Eine leere Liste führt nicht zur gefährlichen Massenlöschung/-absage.
- Quelllinks bleiben als `https://www.goabase.net/{id}` erhalten. Der bestehende Backlink in Spots bleibt unverändert.

## Vor Aktivierung zu beheben oder nachzuweisen

| Priorität | Befund | Folge / nötiger nächster Schritt |
| --- | --- | --- |
| Hoch | Nur ein `country=DE&eventtype=club&limit=50`-Abruf, kein Offset und kein Abgleich gespeicherter Quell-IDs. | Nach der ersten Seite fehlende, bereits begonnene, verschobene oder aus dem Suchfilter gefallene Events werden nicht erneut geprüft. Eine bisher gespeicherte Absage kann unbemerkt veröffentlicht bleiben. Vollständige Seiten und gezielte Wiederprüfung bestehender Termine nötig. |
| Hoch | Der Payload schreibt `status` überhaupt nicht. | Absagen ändern nur das Veröffentlichungsflag. Vorhandener Status bleibt bestehen; neue Zeilen hängen vom Datenbank-Default des NOT-NULL-Felds ab. Status und Flag gemeinsam, konsistent zum App-Vertrag (`scheduled`, `cancelled`, `postponed`) aktualisieren. |
| Hoch | Keine Prüfung von Quell-Änderungszeit/Version und keine Importer-Serialisierung. | Ein verspäteter alter Lauf kann eine neuere Absage wieder überschreiben. Eindeutige Quellpaare verhindern Duplikate, aber nicht veraltete Überschreibungen. |
| Hoch | Zwei gleiche Quell-IDs im selben Batch werden nicht zusammengeführt. | PostgreSQL kann das gesamte `ON CONFLICT DO UPDATE` mit einem Kardinalitätsfehler ablehnen. Gleiche IDs vor dem Upsert deterministisch abgleichen. |
| Hoch | `auth: "secret"` akzeptiert den Secret Key mit Namen `default`. Die vorherige Cron-Anleitung schlug einen separaten Key vor. | Die Varianten sind nicht austauschbar. Ohne Codeänderung muss Vault den tatsächlich akzeptierten Default-Secret-Key enthalten. Für einen getrennten Key muss der Handler später ausdrücklich den passenden Modus unterstützen. Anleitung entsprechend korrigiert; JWT-Prüfung ist im Dashboard bereits aus. Echte Auth-Ablehnungstests bleiben offen. |
| Mittel | Kein Fetch-Timeout, keine eigene Behandlung von Netzwerkfehlern, ungültigem JSON oder falschen Feldtypen/null in der Liste. | Fehler verlassen die eigene kontrollierte Fehlerantwort; langsame Quelle kann die Function blockieren. Request begrenzen und Payload zur Laufzeit validieren. Der TypeScript-Cast ist keine Validierung. |
| Mittel | `coordinate` nimmt Whitespace und Booleans über `Number` als 0 an; `Date.parse` akzeptiert auch Zeiten ohne explizite Zeitzone; `end >= start` erlaubt null Dauer. | GPS-Typen/Leerzeichen ablehnen, Zeitstempel mit Zeitzone fordern und Ende strikt nach Start validieren. `active` verwendet zudem `>= now` statt einer exklusiven Endgrenze. |
| Mittel | Keine Beschränkung auf POST. | Auch authentifizierte GET-Aufrufe importieren. Andere Methoden vor dem Quellenabruf ablehnen. |
| Mittel | Die genaue Datenbankfehlermeldung wird an den Aufrufer zurückgegeben. | Fehler generisch nach außen melden, serverseitig redigiert protokollieren. Der Handler ist geschützt; trotzdem keine internen Details unnötig ausgeben. |
| Mittel | `imported` ist nur die Zahl versuchter Payloadzeilen. | Keine Trennung von neuen/geänderten/abgesagten/übersprungenen Events, kein dauerhafter Laufstatus. Betriebsnachweis ergänzen. |

Kein automatisches Unpublishing bloß wegen fehlender IDs im Standardfeed einbauen: Quelle kann begrenzt, fehlerhaft oder anders gefiltert sein. Bestätigte Absagen gezielt prüfen. Zusatzfelder wie Beschreibung/Genre/Tickets werden vom aktuellen Importer nicht synchronisiert.

## Isolierte Verifikation

```sh
node --test tests/event-data.test.cjs tests/import-goabase.test.cjs
```

[Importer-Tests](../../../tests/import-goabase.test.cjs) führen den tatsächlichen gespeicherten Handler mit festem Zeitgeber, künstlichen Quellantworten und einer In-Memory-Tabelle aus. Zwölf Tests belegen sowohl funktionierende Wiederholungen/Änderungen als auch die oben beschriebenen Lücken. **Grüne Tests bedeuten hier, dass das beobachtete Verhalten reproduziert wurde, nicht dass alle Sicherheitsanforderungen erfüllt sind.**

Die Tabelle im Test setzt den Unique-Constraint voraus. Der Supabase-Auth-Wrapper wird ersetzt: Weder die echte Key-Prüfung noch RLS, Datenbank-Constraints, Deno-Typen oder Deploy-Konfiguration werden dadurch getestet. Diese Prüfungen bleiben gesondert erforderlich. Deno ist hier nicht installiert.

Die Function hat eine eigene [deno.json](deno.json). Der App-Typecheck schließt `supabase/functions` aus, damit Expo-TypeScript nicht versucht, Deno-`npm:`-Imports aufzulösen. Nach Einrichtung von Deno zusätzlich aus dem Projektstamm ausführen:

```sh
deno check --config supabase/functions/import-goabase/deno.json supabase/functions/import-goabase/index.ts
```

Keine lokale `supabase/config.toml` mit einer angenommenen Verify-JWT-Einstellung erzeugt und keine Frontend-Abhängigkeit für `@supabase/server` installiert.

## Quellen

- [Supabase: Server-Authentifizierung und benannte Secret Keys](https://supabase.com/docs/guides/functions/auth)
- [Supabase: Upsert](https://supabase.com/docs/reference/javascript/upsert)
- [PostgreSQL: ON CONFLICT und doppelte Batch-IDs](https://www.postgresql.org/docs/current/sql-insert.html)
- [Goabase: Abfragen und Statuswerte](https://www.goabase.net/api/schema/goabase.json)
