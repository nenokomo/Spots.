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
| A4 | Claude | Clubs für ganz Deutschland aus OpenStreetMap abrufen (pro Bundesland). Falls die Server wieder überlastet sind: nur die größten Städte. Stichprobe beim Erotik-Filter. Dann in Spots-Test laden. |

## Teil B – Produktion (ca. 1,5–2 Stunden, jeder Schritt mit Freigabe)

| Schritt | Wer | Inhalt |
|---|---|---|
| B0 | Claude | Nur lesen: Welche Tabellen, Funktionen und Zeitpläne gibt es in Produktion? Prüfwert der Events notieren. |
| B1 | Claude | SQL 20 (Ticketmaster), 21 (Clubs und Meldungen), 22 (Admin und Entwürfe, neue leere Spalte `events.venue_id`), 23 (Kontaktanfragen der Website). Danach Prüfsummen mit den Dateien vergleichen. |
| B2 | Jacint | Ticketmaster: API-Key als Secret setzen und Function bereitstellen (Befehle mit `--project-ref yhnxdeypkbzyjappuzmv`), einmal von Hand starten, Ergebnis prüfen. |
| B3 | Claude | Ticketmaster-Zeitplan in Produktion (SQL 24). Nutzt voraussichtlich die vorhandenen Vault-Einträge von Goabase, dann braucht es kein neues Secret (wird in B0 geprüft). |
| B4 | Claude | Clubs in Produktion laden (Daten aus A4). |
| B5 | Jacint | App mit Produktionsdaten auf dem Handy prüfen: Ticketmaster-Events, Filter „Konzerte“, Clubs auf der Karte. |

Danach: Ticketmaster-Events und Clubs sind in Produktion sichtbar. Solange die App nicht im Store ist, sieht das niemand außer dem Team.

**Admin bleibt in Produktion vorerst unsichtbar**, weil Konten dort im Code noch gesperrt sind (`src/features/accounts/configuration.ts`). Siehe Teil C.

## Teil C – heute nicht machbar oder braucht erst eine Entscheidung

- **Konten in Produktion** (SQL 15, Sperre im Code lösen, Konto löschen als Pflicht von Apple und Google, Datenschutztext). Eigene Runde, danach Admin in Produktion.
- **Rechtliches**: Entwürfe in `docs/entwuerfe/` von einer Fachperson prüfen lassen.
- **Website online**: Domain und Hosting (kosten Geld), Impressum-Daten, Kontaktadressen, Store-Links.
- **Store-Release**: Entwicklerkonten bei Apple und Google (kosten Geld), `eas.json`, Bundle-ID, App-Schema `meine-app` → `spots`, Karten-Schlüssel.
- **Live Snaps**: SQL 17–19 und Upload-Oberfläche (braucht einen Development Build).

## Fertig

- Plan geschrieben.

## Läuft gerade

- Warte auf Go für Teil A.
