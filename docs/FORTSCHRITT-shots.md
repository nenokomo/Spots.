# Fortschritt – Etappe 3: Shots / Live Snaps (Jacint)

Branch `backend/shots` (von `main`, 15.11.). Alles nur lokal (PGlite) und in Spots-Test (`nfomkdvotqtlyymomksb`); Produktion nicht.

## Entscheidungen (Jacint, 15.11.)

- Shots von Gästen sind **sofort sichtbar**. Schutz: Melden (3 Meldungen blenden automatisch aus), Club blendet bei eigenen Events aus, Spots-Team prüft im Admin-Bereich.
- Posten **nur mit Konto**; ansehen auch als Gast.
- Domain und Mailserver: Jacint, nächste Woche. Entwicklerkonten Apple/Google: kurz vor dem Release. Rechtstexte: Jacint.

## Fertig

- **SQL 19** (Galerien für Beiträge): PGlite-Test `tests/post-galleries.test.cjs` (mit Storage-Modell), in Spots-Test eingespielt, Prüfsumme gleich, Events unverändert.
- **SQL 30** `supabase/ops/30_shots_moderation.sql`, in Spots-Test (Prüfsummen gleich, Importe unverändert `ca4c9cb0…`):
  - Gäste-Shots starten `visible` statt `pending` (Trigger aus SQL 17 ersetzt).
  - Admins lesen alle Shots (auch ausgeblendete) → signierte Bild-Links für die Prüfliste.
  - `spots_admin_snap_queue` (gemeldete/ausgeblendete zuerst, Meldegründe, ohne Konto-IDs) und `spots_admin_set_snap_status` (sichtbar/ausgeblendet/entfernt), nur Admins.
  - `spots_snaps_cleanup_list` / `spots_snaps_cleanup_delete` nur für die Server-Rolle; löscht nur abgelaufene Zeilen.
  - Test `tests/shots-moderation.test.cjs`.
- **Aufräumen nach 24 h**: Edge Function `supabase/functions/cleanup-snaps` (Schutz wie die Importe: `withSupabase(auth: "secret")`), in Spots-Test bereitgestellt (Freigabe Jacint). Ohne Schlüssel und mit öffentlichem Schlüssel: 401. **SQL 31** Zeitplan `spots-cleanup-snaps` stündlich (Minute 43) mit den Vault-Einträgen aus SQL 24; Handlauf: HTTP 200, `expired: 0`.
- **App**:
  - „Shot posten“ (Noyans Kamera-Seite): Auslöser öffnet die Handy-Kamera (expo-image-picker, geht in Expo Go), lädt in `live-snaps/<Konto>/…` und legt den Shot an; als Gast „Bitte anmelden“; nach dem Posten lädt die Eventseite neu. TEST-Events werden abgefangen. Kameratext in `app.json`.
  - Melden (`reportShot`) läuft jetzt über die Sitzung des Kontos (vorher öffentlicher Client → Melden ging nie).
  - Admin-Bereich: neuer Reiter **„Shots“** mit Vorschaubild, Status, Meldungen und Ausblenden / Wieder zeigen / Entfernen.
- Prüfung: 203/203 Tests, Lint, Typecheck. Web-Vorschau: laufendes Club-Event → „Shot posten“ → Auslöser als Gast → „Bitte anmelden“; Adresse in der Karten-Vorschau.

- **Handy (15.11.)**: Shot mit privatem Konto während eines laufenden Club-Events gepostet, unter „Shots“ sichtbar, im Admin-Reiter ausgeblendet und wieder gezeigt. Datenbank: 3 Shots, Dateien im eigenen Konto-Ordner, Lebensdauer genau 24 h.

## Offen

- Echtes Löschen prüfen: die Test-Shots vom 15.11. laufen am 16.11. gegen 22:30 ab; der Job um 23:43 sollte sie samt Dateien löschen (Antwort der Function in `net._http_response`).
- Event-Story für Clubs (Club postet im Studio; Daten-Seite: `by_organizer` gibt es schon).
- Shots im Studio moderieren (Club blendet bei eigenen Events aus – Datenbank kann es seit SQL 17, Oberfläche fehlt).
- Live-Vorschau im Kamera-Rahmen: expo-camera + Development Build. Videos (bis 15 s) später.
- Produktion: SQL 17–19, 30, 31 und die Function erst in der Produktions-Runde.
- Datenschutz: Shots (Fotos von Gästen, 24 h, Melden) in die Rechtstexte.
