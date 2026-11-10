# Spots – Veranstalter, Navigation, Inhalte und Ticketing

Stand: 10.11.2026, Branch `feature/design-refresh`. Ergänzt [ORGANIZER_ARCHITECTURE.md](ORGANIZER_ARCHITECTURE.md) (Accounts, Veranstalter, RLS aus SQL 15).

## Datenmodell

```
organizers 1 ── n events (organizer_id, nur source = 'spots')
organizers 1 ── n organizer_posts   (dauerhaft, Text + optional ein Bild)
events     1 ── n live_snaps        (max. 24 h, Foto/Video)
organizers 1 ── n live_snaps        (Veranstalter-Snaps ohne konkretes Event)
events     1 ── n ticket_types      (Kategorien, Preise, externer Link)
auth.users 1 ── n saved_events      (Merkliste pro Konto)
live_snaps / organizer_posts 1 ── n content_reports
```

- **Ein Event gehört genau einem Veranstalter** gilt für selbst erstellte Spots-Events. Importierte Events (Goabase) haben bewusst `organizer_id = NULL`. Es gibt keine Zuordnung über Titel, Ort oder Namensähnlichkeit, weil das erfundene Identitäten erzeugen würde. Eine spätere Zuordnung braucht einen überprüfbaren Claim-Prozess, zum Beispiel einen Nachweis durch den Veranstalter mit manueller Freigabe.
- **Beiträge** sind dauerhaft (`organizer_posts`, SQL 15 plus `image_path` aus SQL 17). **Live Snaps** sind zeitlich begrenzt (`live_snaps`, SQL 17). Beide liegen in getrennten Tabellen und Buckets.
- **BeReels** heißen jetzt **Live Snaps**. Der alte Name lag zu nah an einer bestehenden Fremdmarke.

## Zentrale Navigation (`src/navigation/eventRoutes.ts`)

| Einstieg | Event heute oder laufend | Event in der Zukunft mit Veranstalter | Event ohne Veranstalter (Import) |
| --- | --- | --- | --- |
| Radar | Eventdetail | Eventdetail | Eventdetail |
| Entdecken (`discover`) | Eventdetail | **Veranstalterseite, Event hervorgehoben** (`/organizer/[id]?event=…`) | Eventdetail |
| Gemerkt, Links, Veranstalterseite | Eventdetail | Eventdetail | Eventdetail |

- Direkte Links `/event/[id]` öffnen immer das Event, `/organizer/[id]` immer den Veranstalter.
- Der Status kommt aus `src/utils/eventStatus.ts`. Er rechnet mit absoluten Zeitstempeln, sodass ein Event von 23:00 bis 04:00 über Mitternacht `live` bleibt. Die Nacht zählt bis 05:00 Uhr Berliner Zeit zum Vorabend. Ohne bestätigtes Ende gilt ein Event höchstens 8 Stunden als begonnen.
- Ist eine Veranstalterseite in einer Umgebung nicht verfügbar, bietet die Seite „Zum Event“ an.

## Rückwärtskompatibilität mit Produktion

Produktion hat SQL 15 und 17 noch nicht. Die App funktioniert dort trotzdem:

- `services/events.ts` fragt `organizer_id` optimistisch mit ab. Bei `42703` wiederholt es die Anfrage einmal ohne die Spalte und merkt sich das für die Sitzung. Pro App-Start entstehen dadurch 2–3 fehlgeschlagene Anfragen in den Browser- und Netzwerklogs. Sobald SQL 15 eingespielt ist, fallen sie weg.
- Fehlen `organizers`, `live_snaps` oder `ticket_types` (`PGRST205`), zeigt die App „kommt bald“ beziehungsweise leere Bereiche. Pro Sitzung gibt es höchstens eine Anfrage je Tabelle.

## Live Snaps (SQL 17 + 18)

- Upload nur mit Konto, in den eigenen Storage-Ordner `<auth.uid()>/…`, privater Bucket `live-snaps`. Lesen läuft über Signed URLs, die Storage nur ausstellt, solange die Zeile per RLS lesbar ist. Abgelaufene oder versteckte Snaps lassen sich daher nicht mehr signieren.
- Ein Trigger setzt Autor, `created_at`, `expires_at = +24 h`, Veranstalter und den Startstatus serverseitig. Veranstaltermitglieder veröffentlichen sofort. Besucher-Snaps sind `pending`, bis der Veranstalter sie freigibt. Bei importierten Events ohne Veranstalter gibt nur die Spots-Moderation über den Service-Role-Zugang frei.
- Besucher können von 1 Stunde vor Beginn bis 2 Stunden nach Ende hochladen, mit höchstens 20 Snaps pro Stunde und Konto.
- Ab drei Meldungen wird ein Snap automatisch versteckt. Meldungen sieht nur die meldende Person.
- `spots_content_private.expired_snaps()` (nur Service-Role) liefert abgelaufene Dateien zum Löschen über die Storage-API.

## Ticketing-Vorbereitung

`ticket_types` enthält Name, Beschreibung, Preis in Cent, Währung, Kontingent, Verkaufsfenster, externen HTTPS-Link und „ausverkauft“. Pflegen können das nur Veranstaltermitglieder für eigene Spots-Events. Die Eventdetailseite zeigt veröffentlichte Ticketarten an, aber nur für nicht vergangene Events.

Es gibt **keine** Bestellungen, Zahlungen oder QR-Codes. Der nächste Schritt dafür (orders, tickets mit signiertem QR, Zahlungsanbieter-Webhooks, Rückerstattungen, Wallet-Pässe) braucht Verträge mit einem Zahlungsanbieter und ein eigenes Sicherheitskonzept.

## Merkliste mit Konto

`saved_events` liegt mit RLS bereit. Die App speichert weiterhin lokal mit AsyncStorage. Geplante Umstellung: Nach dem Login werden lokale und serverseitige IDs vereinigt, lokal wird nichts gelöscht, und danach wird beidseitig synchronisiert. Ohne Konto bleibt alles lokal.

## Rollout-Reihenfolge (jeweils erst Spots-Test, dann Freigabe)

1. SQL 17 in Spots-Test ausführen, mit dem Vorher/Nachher-Hash der Events wie bei SQL 15.
2. SQL 18 (Storage) in Spots-Test ausführen. Upload, Lesen und Löschen mit drei Testkonten prüfen.
3. Edge Function oder Cron für `expired_snaps()` einrichten, die Dateien über die Storage-API löscht.
4. Upload-Oberfläche bauen. Dafür sind `expo-image-picker` und für Videos `expo-video` nötig. Beide sind native Module, also Development Build statt Expo Go.
5. Produktion: SQL 15, 17 und 18 erst nach ausdrücklicher Freigabe, mit Backup nach [PRODUCTION_BACKUP.md](../PRODUCTION_BACKUP.md).
