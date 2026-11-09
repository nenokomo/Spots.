# Spots mit Supabase verbinden

Die bestehende App verwendet jetzt einen gemeinsamen Supabase-Client und getrennte Leseabfragen für kommende und laufende Events. Navigation, Farben, Kartenlayout und lokale Merkfunktion bleiben erhalten. Die ungenutzte alte Demo-Datei wurde bei der Projektbereinigung entfernt. Fehler und leere Antworten erzeugen keine Ersatz-Events.

## Bestätigtes Tabellenschema

Das Schema wurde am 03.11.2026 vom Nutzer bereitgestellt und die Zuordnung in [eventSchema.ts](src/services/eventSchema.ts) darauf angepasst. Der anschließende reale Abruf mit dem Publishable Key bestätigt 31 veröffentlichte zukünftige Events mit GPS und 0 laufende Events weltweit. Detail- und Merkliste-Abfrage für ein echtes Event waren ebenfalls erfolgreich.

Bei späteren Schemaänderungen kann diese rein lesende SQL-Abfrage zum Abgleich verwendet werden:

```sql
select column_name, data_type, udt_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'events'
order by ordinal_position;
```

Die bestätigte Zuordnung:

| App-Feld | Datenbankspalte |
| --- | --- |
| ID | `id` (UUID) |
| Titel | `title` |
| Start / Ende | `starts_at` / `ends_at` (Zeitstempel mit Zeitzone) |
| Veröffentlichung | `is_published = true` |
| Bestätigter Termin | zusätzlich `status = 'scheduled'` |
| GPS | `latitude` / `longitude` (numerisch) |
| Öffentlicher Ort / Venue | `city` / `venue_name` |
| Beschreibung | `description` |
| Genres / Kategorie | `genre` (Text) / `category` |
| Bild | `image_url` |
| Quelle / Quellseite | `source` / `source_url` |
| Ticketseite | `ticket_url` |

`genre` wird für die bestehenden Karten in eine Liste umgewandelt. Die 31 aktuell gelesenen Events haben keine Genreangaben; Spots erfindet dafür kein Genre. `is_published` steuert die öffentliche Sichtbarkeit. Zusätzlich ist für alle Ansichten `status = 'scheduled'` erforderlich, damit Absagen und unbestätigte Verschiebungen ausgeschlossen sind. Der Status allein ist kein Live-Kennzeichen. Radar benötigt bestätigte Start-/Endzeit und GPS. Fehlende Endzeiten werden niemals durch eine angenommene Partydauer ersetzt.

## Öffentliche Verbindungswerte

Im Supabase-Projekt den **Connect**-Dialog öffnen und **Project URL** sowie **Publishable key** holen. Alternativ sind die Werte in den Projekteinstellungen bei Data API / API Keys zu finden. Nur den Schlüssel mit Präfix `sb_publishable_` verwenden. Kein Secret Key, keine Datenbank-Zugangsdaten und kein Service-Role-Key.

Eine lokale `.env.local` im Projektstamm anlegen und diese beiden Werte eintragen:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://DEINE-PROJEKT-ID.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=DEIN-PUBLISHABLE-KEY
```

Die App liest ausschließlich diese beiden Umgebungsvariablen. Lokale Env-Dateien und die bestehende private Datei `pws` sind von Git ausgeschlossen. `EXPO_PUBLIC_*` wird sichtbar in das App-Bundle eingebaut. Ein versehentlich dort eingetragener Secret Key wäre auch bei einer Fehlermeldung nicht geschützt.

Die vorhandene `.env.local` wurde am 03.11.2026 von `NEXT_PUBLIC_SUPABASE_*` auf `EXPO_PUBLIC_SUPABASE_*` korrigiert, ohne die Werte zu verändern oder auszugeben. Beide Werte funktionieren beim anonymen API-Abruf. Die Datei ist durch Git ignoriert und nicht versioniert.

## Lesezugriff und Datenschutz

Die App greift ohne Anmeldung als `anon` zu. Das Projekt benötigt einen freigegebenen Data-API-Zugriff auf `public.events`, ein passendes SELECT-Grant und eine RLS-SELECT-Policy, die nur tatsächlich veröffentlichte, öffentlich sichtbare Events erlaubt. Clientfilter ersetzen keine RLS-Policy. Keine Schreibberechtigungen für den Client freigeben und RLS nicht zum Testen abschalten.

Eine leere API-Antwort kann auch durch eine fehlende RLS-Policy entstehen, obwohl im SQL Editor 31 Zeilen sichtbar sind. Bei fehlenden Treffern daher neben Filtern und Terminen die Berechtigungen der Rolle `anon` prüfen. Bestehende Policies müssen vor Änderungen geprüft werden; diese Integration führt keine SQL-Änderungen durch.

Die App projiziert nur die zugeordneten Eventfelder, keine Straßen-/Privatadressen oder Import-Rohdaten. Die veröffentlichte Quelle muss öffentliche Venue-/GPS-Angaben enthalten; bei privaten Veranstaltungen muss deren öffentliche Freigabe vor Veröffentlichung serverseitig geregelt sein. Standort und Radius werden wie bisher lokal ab der aktuellen Kartenmitte berechnet; die App übermittelt den Nutzerstandort nicht an Supabase.

Die Edge Function `import-goabase` bleibt serverseitig. Sie wird nicht aus der App aufgerufen; Import-Zugangsdaten bleiben in Supabase.

Der lokal verbesserte Importer, die Datenbankvorbereitung und die erforderlichen Tests vor dem Deployment sind in [GOABASE_SYNC.md](GOABASE_SYNC.md) dokumentiert. Es wurde noch kein geplanter Import aktiviert.

## Verhalten und Verbindungstest

1. Tabellenschema abgleichen, Env-Werte lokal eintragen und Lesezugriff prüfen.
2. `npx expo start --clear` starten bzw. den bestehenden Server neu starten. Die App vollständig neu laden. Auf iOS und Android Expo Go bzw. den bisherigen Development Build verwenden; für die beiden neuen JavaScript-Abhängigkeiten wurden keine zusätzlichen nativen Module installiert.
3. **Entdecken → Alle Termine → Alle Genres**, leeres Suchfeld: Die aktuell veröffentlichten zukünftigen Events sollten erscheinen. Es müssen nur dann noch genau 31 sein, wenn die ursprüngliche SQL-Zählung weiterhin aktuell ist und dieselben Zeilen für `anon` sichtbar sind.
4. Namen/Ort/Genre suchen, einen passenden Termin im Kalender wählen, eine Karte öffnen. Beschreibung, Ort, Zeitpunkt, vorhandene Quell-/Ticketlinks und Bild prüfen. Ohne Bild nutzt Spots das vorhandene Symbolfoto, in den Details entsprechend gekennzeichnet. Uhrzeiten werden in `Europe/Berlin` angezeigt.
5. Herz betätigen, zu **Gemerkt** wechseln, App neu laden und die Detailseite erneut öffnen. Die lokale Speicherung bleibt erhalten; nicht mehr veröffentlichte Events und frühere Demo-IDs werden nicht durch erfundene Einträge ersetzt. Vergangene veröffentlichte Events können aus der Merkliste weiterhin geladen werden.
6. **Radar**: Standort freigeben oder Stadt wählen, Karte verschieben und Radius ändern. Live bedeutet exakt `starts_at <= jetzt < ends_at`, zusätzlich gültige GPS-Koordinaten und Entfernung innerhalb des gewählten Radius. Die Unterseite **Alle ansehen** verwendet denselben Live-Datensatz und übernommene Kartenfilter. Bei 31 ausschließlich zukünftigen Events ist der leere Live-Radar das korrekte Ergebnis.
7. Netzwerk deaktivieren und eine Liste aktualisieren: sichtbare Fehlermeldung statt vorgetäuschter Events; nach Wiederherstellung **Erneut versuchen**. Fehlende Konfiguration und Schemafehler haben eigene Hinweise.

Abfragen aktualisieren sich im Vordergrund ungefähr jede Minute und bei Rückkehr zur App. Bereits geladene Events werden an ihren Zeitgrenzen aus der jeweiligen Liste entfernt. Neu beginnende Events werden beim nächsten Live-Abruf aufgenommen. Keine Realtime-Subscription, kein Tracking und keine Hintergrundortung.

Für die aktuelle kleine Datenmenge werden passende veröffentlichte kommende/laufende Events in Seiten à 200 Datensätzen gelesen; der Radiusfilter erfolgt lokal mit der Haversine-Formel. Bei deutlich größerem Bestand sollten serverseitige Geo-Abfragen mit räumlichem Index und eine suchabhängige Pagination ergänzt werden.

## Bisherige Prüfung

- `npx expo lint` und `npx tsc --noEmit` erfolgreich.
- `node --test tests/event-data.test.cjs`: Adapter, Zeitgrenzen/Nachtwechsel, GPS, Radius, Datumsauswahl, URL-Prüfung sowie Supabase-SDK-Abfragefilter und Fehler getestet. Netzwerkantworten sind Testantworten; kein Zugriff auf euer Supabase-Projekt.
- Browser-Vorschau: fehlende Konfiguration wird auf Radar und Entdecken sichtbar und ohne Absturz angezeigt.
- Reale Verbindung am 03.11.2026 mit den lokalen öffentlichen Projektwerten und dem tatsächlichen Supabase-SDK geprüft: 31 kommende veröffentlichte Events, 31 mit GPS, 0 laufende Events; Detail- und Merkliste-Abfrage für ein Event erfolgreich. Keine Schreibzugriffe.
- Browser nach Neustart bei 375 × 812: Entdecken zeigt 31 echte Events; direkte Detailseite für Cosmic Drift Vol. V zeigt Bild, Stadt, Start-/Endzeit und Quelllink. Keine Änderung des bisherigen Layouts.
- **Offen:** Tests auf iOS/Android. Der erfolgreiche anonyme Lesezugriff ist kein vollständiges Audit sämtlicher RLS-Policies.

## Gelesene Dokumentation

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Expo-Dokumentationsindex und API-Korrekturen](https://docs.expo.dev/llms.txt)
- [Expo: Supabase](https://docs.expo.dev/guides/using-supabase/)
- [Expo: Umgebungsvariablen](https://docs.expo.dev/guides/environment-variables/)
- [Supabase: Expo / React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Supabase: API-Schlüssel](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
