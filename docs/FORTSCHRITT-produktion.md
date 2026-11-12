# Fortschritt – Umstellung auf Produktion (Jacint)

Stand: 12.11.2026. Branch `backend/produktion-start`. Plan und Protokoll für diese Runde.

**Regeln dieser Runde**
- Spots-Test (`nfomkdvotqtlyymomksb`): SQL erst lokal (PGlite) testen, dann einspielen.
- Produktion (`yhnxdeypkbzyjappuzmv`): **jeder Schritt nur nach ausdrücklicher Freigabe von Jacint und Noyan** im Chat.
- Vor und nach jedem Produktionsschritt den Prüfwert der bestehenden Events vergleichen. Bestehende Events, UUIDs und Goabase-Daten bleiben unverändert.
- Secrets und Vault fasst Claude nicht an. Das macht Jacint im Terminal oder im Supabase-Dashboard (Anleitung kommt beim jeweiligen Schritt).

## Teil A – Spots-Test fertig machen (ca. 1,5–2 Stunden)

| Schritt | Wer | Inhalt |
|---|---|---|
| A1 | Jacint (5 min) | Bestätigungsmails: im Dashboard von Spots-Test unter Authentication → URL Configuration die Adressen `exp://**` und `meine-app://**` als Redirect URLs erlauben. Dann führt der Link zurück in die App statt auf localhost. |
| A2 | Claude + Jacint | Zeitplan für den Ticketmaster-Import: neue Datei `supabase/ops/24_…` (alle 6 Stunden, gleiche Sicherungen wie bei Goabase: erster Lauf kontrolliert, dann regelmäßig). Lokal testen, dann in Spots-Test. Falls dort Vault-Einträge fehlen, legt Jacint sie an. |
| A3 | Jacint (10 min) | Freigabe-Ablauf auf dem Handy: Event im Admin-Bereich anlegen, freigeben, in der App sichtbar? |
| ~~A4~~ | – | **Gestrichen (13.11., Jacint + Noyan):** Clubs erscheinen nur noch mit Event, kein deutschlandweiter Club-Import. Die Karlsruher Orte bleiben als Adressbuch für den Admin-Bereich. |

## Teil B – Produktion (ca. 1,5–2 Stunden, jeder Schritt mit Freigabe)

| Schritt | Wer | Inhalt |
|---|---|---|
| B0 | Claude | Nur lesen: Welche Tabellen, Funktionen und Zeitpläne gibt es in Produktion? Prüfwert der Events notieren. |
| B1 | Claude | SQL 20 (Ticketmaster), 21 (Clubs und Meldungen), 22 (Admin und Entwürfe, neue leere Spalte `events.venue_id`), 23 (Kontaktanfragen der Website). Danach Prüfsummen mit den Dateien vergleichen. |
| B2 | Jacint | Ticketmaster: API-Key als Secret setzen und Function bereitstellen (Befehle mit `--project-ref yhnxdeypkbzyjappuzmv`), einmal von Hand starten, Ergebnis prüfen. |
| B3 | Claude | Ticketmaster-Zeitplan in Produktion (SQL 24). Nutzt voraussichtlich die vorhandenen Vault-Einträge von Goabase, dann braucht es kein neues Secret (wird in B0 geprüft). |
| B4 | Claude | Nur die Karlsruher Orte (Adressbuch für den Admin-Bereich) in Produktion laden, falls gewünscht. |
| B5 | Jacint | App mit Produktionsdaten auf dem Handy prüfen: Ticketmaster-Events, Filter „Konzerte“. |

Danach: Ticketmaster-Events sind in Produktion sichtbar. Solange die App nicht im Store ist, sieht das niemand außer dem Team.

**Admin bleibt in Produktion vorerst unsichtbar**, weil Konten dort im Code noch gesperrt sind (`src/features/accounts/configuration.ts`). Siehe Teil C.

## Teil C – heute nicht machbar oder braucht erst eine Entscheidung

- **Konten in Produktion** (SQL 15, Sperre im Code lösen, Konto löschen als Pflicht von Apple und Google, Datenschutztext). Eigene Runde, danach Admin in Produktion.
- **Rechtliches**: Entwürfe in `docs/entwuerfe/` von einer Fachperson prüfen lassen.
- **Website online**: Domain und Hosting (kosten Geld), Impressum-Daten, Kontaktadressen, Store-Links.
- **Store-Release**: Entwicklerkonten bei Apple und Google (kosten Geld), `eas.json`, Bundle-ID, App-Schema `meine-app` → `spots`, Karten-Schlüssel.
- **Live Snaps**: SQL 17–19 und Upload-Oberfläche (braucht einen Development Build).

## Fertig

- Plan geschrieben.
- **A2 SQL 24** `supabase/ops/24_ticketmaster_cron.sql`: stündlicher Job `spots-import-ticketmaster` (Minute 17), startet den Import höchstens alle 6 Stunden, übernimmt das HTTP-Ergebnis sofort (pg_net vergisst Antworten nach einigen Stunden), pausiert sich bei HTTP ≠ 200/409, Zeitüberschreitung, fehlender Antwort nach 1 Stunde oder falschem Vault-Eintrag. Einschalten bzw. nach geprüfter Pause wieder einschalten: `select spots_sync_private.ticketmaster_cron_resume();`. Nutzt die Vault-Namen `spots_project_url` und `spots_import_goabase_secret_key`.
  - Tests: `tests/ticketmaster-cron.test.cjs` (4, PGlite). Gesamt 149/149, Lint ok.
  - **In Spots-Test eingespielt (12.11.)**: pg_cron und pg_net neu aktiviert, Job angelegt und **aus**, Prüfsummen der beiden Funktionen identisch mit der Datei, Events vorher/nachher gleich (541, Prüfwert `bdd338ed…`).

- **A1 (Jacint, 12.11.)**: Redirect URLs `exp://**` und `meine-app://**` in Spots-Test eingetragen.
- **A2 Zeitplan in Spots-Test aktiv (12.11.)**: Vault-Einträge von Jacint angelegt (je genau einer), Job eingeschaltet, erster Lauf von Hand ausgelöst: HTTP 200 in 16 s, 540 gefunden, 33 neu, 4 aktualisiert, 497 unverändert, 11 einzeln nachgeprüft; Sperre frei; Goabase weiter 35 Events. Ab jetzt automatisch alle 6 Stunden.
- **B0 Produktion gelesen (13.11., Freigabe Jacint + Noyan)**: 39 Goabase-Events (32 sichtbar, Prüfwert `e707dadc…`), Goabase-Cron aktiv, Vault-Einträge `spots_project_url` und `spots_import_goabase_secret_key` je einmal vorhanden, pg_cron/pg_net installiert, SQL 15–23 fehlten. Events-Tabelle ohne SQL 15 (keine organizer_id).
- **B1 SQL 20–23 in Produktion (13.11., Freigabe Jacint + Noyan)**: vorher lokal gegen einen PGlite-Nachbau des Produktionsschemas geprüft (zweimal ausführbar, Goabase unverändert, anon ohne Rechte). Eingespielt in der Reihenfolge 20, 21, 22, 23. Alle 15 Funktionen haben dieselbe Prüfsumme wie Dateien und Spots-Test; Events vorher/nachher gleich (39, `e707dadc…`); neue leere Spalte `events.venue_id`; 0 Orte, 0 Admins; Goabase-Cron unverändert aktiv.
- **B2 (Jacint, 13.11.)**: Secret `TICKETMASTER_API_KEY` in Produktion gesetzt, Function `import-ticketmaster` bereitgestellt.
- **B3 Ticketmaster-Zeitplan in Produktion (13.11., ausdrückliche Freigabe)**: SQL 24 eingespielt, Prüfsummen identisch mit Datei und Spots-Test, nutzt die vorhandenen Goabase-Vault-Einträge. Job eingeschaltet, erster Lauf: HTTP 200, 538 gefunden, 521 neu, 488 sichtbar; Sperre frei; Goabase unverändert (39, `e707dadc…`). Ab jetzt alle 6 Stunden.
- **B5 (Jacint, 13.11.)**: Normale App (Produktion) auf dem Handy geprüft: Ticketmaster-Konzerte sichtbar.
- **Team-Login Produktion (13.11., Branch `backend/team-login`)**: App erlaubt in Produktion nur Anmelden (keine Registrierung, kein privates Profil aus SQL 15), Sitzung pro Projekt getrennt; Spots-Test unverändert. Tests 150/150, Vorschau geprüft.
- **Produktion, Freigabe Jacint + Noyan (13.11.)**: Jacint hat die öffentliche Registrierung ausgeschaltet und sein Konto im Dashboard angelegt (bestätigt). Adressbuch Baden-Württemberg von Jacint per `scripts/load-osm-venues.cjs produktion DE-BW` geladen: 644 Orte, 467 freigegeben, 34 um Karlsruhe. Konto als Admin eingetragen (1 Admin). Events unverändert (560; Goabase-Prüfwert `e707dadc…`).

## Läuft gerade

- Nichts. Teil B abgeschlossen.

## Offen

- Admin-Ablauf auf dem Handy in Produktion (Team-Login) durchspielen.
- Branch `backend/produktion-start` pushen und PR nach `main`.
- Teil C (Konten in Produktion, Rechtliches, Website online, Store-Release, Live Snaps).
- Formular „Event einreichen“ ohne Konto (vorgeschlagen, noch nicht freigegeben).
