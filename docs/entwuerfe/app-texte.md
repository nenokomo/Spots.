> **Entwurf – nicht rechtlich geprüft. Vor Verwendung von einer Fachperson prüfen lassen.**

# App-Texte Deutsch / Englisch

Stand: Code vom 11.11.2026 · Englisch = Vorschlag, noch nicht im Code

**Hinweise**
- Die Dateien in `src/app/` sind fast nur Routen-Hüllen. Die Texte stehen in `src/screens/`, `src/components/`, `src/features/accounts/`, `src/hooks/`, `src/services/` und `src/utils/`; die Tab-Namen in `src/app/(tabs)/_layout.tsx`.
- **Es gibt sehr viele Texte. Diese Liste enthält nur die wichtigen sichtbaren:** Titel, Buttons, Leerzustände, Hinweise und Fehler. Weggelassen: die meisten Bedienhilfe-Texte (`accessibilityLabel`), reine Entwicklungsmeldungen, Datums- und Zeitformate.
- `{…}` = Wert, den die App einsetzt.
- Marken bleiben: Spots, Radar, Live Snaps.
- Deutsch duzt; Englisch neutral mit „you“.

## Für die Umstellung wichtig

- Es gibt noch kein Übersetzungssystem; alle Texte sind fest auf Deutsch im Code.
- Datum und Uhrzeit sind fest auf `de-DE` formatiert, mit „Uhr“ dahinter; die Wochentage im Kalender stehen fest als „Mo … So“ im Code.
- Mehrzahl wird direkt im Code gebildet („1 Event“ / „{n} Events“) und braucht Pluralregeln.
- Der Text der Standortabfrage (iOS) steht nur auf Deutsch in `app.json`. Wie er sich übersetzen lässt, in der Expo-Doku für SDK 58 nachlesen.
- Einige Fehlermeldungen sind technisch (Supabase, Publishable Key, RLS, Schema) und erscheinen so auch bei Nutzern. Vor dem Release durch verständliche Texte ersetzen (in der Tabelle mit „technisch“ markiert).

---

## Navigation und Start

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Tab | Radar | Radar |
| Tab | Entdecken | Explore |
| Tab | Gemerkt | Saved |
| Tab | Profil | Profile |
| Startbildschirm | Dein Radar für die Nacht. | Your radar for the night. |
| Startbildschirm | Gleich geht’s los | Almost there |
| Laden | Spots werden geladen … | Loading spots … |
| Button | Erneut versuchen | Try again |
| Fehler | Die Verbindung dauert zu lange. Bitte erneut versuchen. | The connection is taking too long. Please try again. |
| Fehler | Events konnten nicht geladen werden. Bitte erneut versuchen. | Events couldn’t be loaded. Please try again. |
| Fehler (technisch) | Events konnten nicht geladen werden. Bitte Internetverbindung und Supabase-Konfiguration prüfen. | Events couldn’t be loaded. Please check your internet connection. |
| Fehler (technisch) | Kein Lesezugriff auf Events. Bitte Publishable Key, SELECT-Berechtigung und RLS-Regeln in Supabase prüfen. | Events are unavailable right now. Please try again later. |
| Sheet | Schließen | Close |

## Event-Status (überall)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Status | Live | Live |
| Status | Läuft jetzt | Happening now |
| Status | Hat begonnen | Started |
| Status | Heute | Today |
| Status | Morgen | Tomorrow |
| Status | Demnächst | Coming up |
| Status | Vorbei | Ended |
| Liste | Live · bis {Uhrzeit} | Live · until {time} |
| Liste | Vorbei · {Tag} | Ended · {day} |
| Liste | {Uhrzeit} Uhr | {time} |
| Ort fehlt | Ort nicht angegeben | Location not specified |
| Bild | Symbolbild | Placeholder image |
| Kategorie | Alle · Techno · House · Events · Clubs | All · Techno · House · Events · Clubs |

## Radar (`src/screens/RadarScreen.tsx`, `src/hooks/useLocation.ts`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Panel-Titel | Scan läuft | Scanning … |
| Panel-Titel | Partys heute | Parties tonight |
| Panel-Titel | Heute Nacht | Tonight |
| Panel-Titel | Gerade ruhig hier | Quiet around here |
| Panel-Zeile | {n} live · {n} später · um dich | {n} live · {n} later · around you |
| Panel-Zeile | um {Ort} | around {place} |
| Panel-Zeile | Die nächsten Events in der Nähe | The nearest upcoming events |
| Panel-Zeile | Karte verschieben oder Entdecken öffnen | Move the map or open Explore |
| Panel-Zeile | Kein Standort · {Stadt} als Mitte | No location · centered on {city} |
| Button | Alle | See all |
| Leer | Die Events erscheinen gleich zusammen mit den Pins. | Events will appear with the pins in a moment. |
| Leer | In diesem Kartenausschnitt ist heute nichts geplant. | Nothing planned in this area today. |
| Ort-Sheet | Wo bist du unterwegs? | Where are you heading out? |
| Ort-Sheet | Meinen Standort verwenden | Use my location |
| Ort-Sheet | Dein Standort bleibt auf dem Gerät. | Your location stays on your device. |
| Ort-Button | Standort … | Locating … |
| Filter-Sheet | Filter | Filters |
| Filter-Sheet | Worauf hast du Lust? | What are you in the mood for? |
| Filter-Sheet | Umkreis | Radius |
| Filter-Sheet | Dein Umkreis | Your radius |
| Filter-Sheet | Fertig | Done |
| Standort | Dein Standort | Your location |
| Standort | Kartenmitte · Berlin | Map center · Berlin |
| Standort | {Stadt} · gewählte Kartenmitte | {city} · chosen map center |
| Standort | Keine Standortfreigabe · Stadt manuell wählen | No location access · choose a city |
| Standort | Bitte die Standortdienste aktivieren | Please turn on location services |
| Standort | Standort gefunden · Umkreis ab Kartenmitte | Location found · radius from map center |
| Standort | Standort nicht verfügbar · bitte erneut versuchen | Location unavailable · please try again |
| Web-Karte | Karte nicht verfügbar · Internetverbindung prüfen | Map unavailable · check your connection |
| Web-Karte | © OpenStreetMap | © OpenStreetMap |
| Systemdialog (`app.json`) | Spots verwendet deinen Standort, um die Karte auf deine Umgebung auszurichten. | Spots uses your location to center the map on your surroundings. |

## Stadtsuche (`src/components/CitySearch.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Eingabe | {Ort} · Stadt suchen | {place} · Search city |
| Eingabe | Standort wird gesucht … | Finding your location … |
| Hinweis | Gib mindestens 3 Buchstaben ein. | Type at least 3 letters. |
| Laden | Städte werden gesucht … | Searching cities … |
| Fehler | Ortssuche gerade nicht erreichbar. | City search is unavailable right now. |
| Fehler | Verbindung prüfen und hier erneut versuchen. | Check your connection and tap here to try again. |
| Leer | Keine Stadt gefunden. Versuche einen anderen Namen. | No city found. Try a different name. |
| Quelle | Ortssuche: Open-Meteo / GeoNames | City search: Open-Meteo / GeoNames |

## Heute Nacht (`src/screens/TodayEventsScreen.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Titel | Heute Nacht | Tonight |
| Zeile | RADAR · {n} KM · {KATEGORIE} | RADAR · {n} KM · {CATEGORY} |
| Zahlen | live · später · nächstes | live · later · nearest |
| Abschnitt | Läuft jetzt · {n} Events · nach Entfernung | Happening now · {n} events · by distance |
| Abschnitt | Später heute · Nach Startzeit | Later today · By start time |
| Karte | LIVE · BIS {Uhrzeit} | LIVE · UNTIL {time} |
| Leer | Deine Nacht ist noch offen | Your night is still open |
| Leer | In diesem Umkreis ist heute nichts bestätigt. Probiere ein anderes Genre oder einen größeren Umkreis. | Nothing confirmed in this radius today. Try another genre or a larger radius. |
| Button | Filter anpassen | Adjust filters |

## Entdecken (`src/screens/ExploreScreen.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Kopf | SPOTS. / ENTDECKEN | SPOTS. / EXPLORE |
| Titel | Entdecken | Explore |
| Untertitel | Finde den richtigen Spot für deinen Abend. | Find the right spot for your night. |
| Suche | Event, Stadt oder Genre | Event, city or genre |
| Chip | Genre · Datum · Überall | Genre · Date · Everywhere |
| Chip | In deiner Nähe · {n} km | Near you · {n} km |
| Zeitraum | Alle Termine · Heute · Freitag · Samstag · Nächste Woche | All dates · Today · Friday · Saturday · Next week |
| Abschnitt | Als Nächstes | Up next |
| Abschnitt (nur Entwicklung) | Gehypt in {Stadt} | Trending in {city} |
| Abschnitt | Alle Events · {Ort} | All events · {place} |
| Button | Zurücksetzen | Reset |
| Hinweis | In deiner Nähe ist gerade nichts geplant. Das sind alle Events in Deutschland. | Nothing planned near you right now. Here are all events in Germany. |
| Leer | Keine passenden Events | No matching events |
| Leer | Im Umkreis von {n} km um {Ort} ist für diese Auswahl nichts geplant. | Nothing planned within {n} km of {place} for this selection. |
| Leer | Passe deine Suche oder deine Filter an. | Adjust your search or filters. |
| Button | Filter zurücksetzen | Reset filters |
| Datum-Sheet | Wann möchtest du los? | When do you want to go out? |
| Datum-Sheet | Alle Termine anzeigen | Show all dates |
| Kalender | Tage mit Events · vergangene Tage sind deaktiviert | Days with events · past days are disabled |
| Ort-Sheet | Wo möchtest du feiern? | Where do you want to go out? |
| Ort-Sheet | Es erscheinen nur Events mit bestätigtem Standort. Dein Standort bleibt auf dem Gerät. | Only events with a confirmed location appear. Your location stays on your device. |
| Ort-Sheet | Überall · Anzeigen | Everywhere · Show |
| Story | SPOTS. VORSCHAU | SPOTS. PREVIEW |
| Story | {n} von {m} | {n} of {m} |
| Story | Symbolbild · für dieses Event liegt noch kein Bild vor | Placeholder image · no picture for this event yet |
| Story | {TAG} · {Uhrzeit} UHR | {DAY} · {time} |
| Story-Button | Event ansehen | View event |
| Story-Button | Zum Veranstalter | Go to organizer |

## Eventdetail (`src/screens/EventDetailScreen.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Fehler | Event nicht verfügbar | Event not available |
| Link | Zurück zum Radar | Back to radar |
| Karte | bis {Uhrzeit} · Beginn · Ort | until {time} · Start · Venue |
| Veranstalter | Veranstalter | Organizer |
| Zeile | Route anzeigen | Get directions |
| Ticket-Zeile | Tickets beim Anbieter | Tickets from the provider |
| Ticket-Zeile | Infos & Tickets bei {Quelle} | Info & tickets on {source} |
| Ticket-Zeile | Noch keine Ticketinformationen | No ticket information yet |
| Ticket-Zeile | Öffnet den Anbieter | Opens the provider |
| Ticket-Zeile | Event beendet | This event has ended |
| Fehler | Der Link konnte nicht geöffnet werden. Bitte erneut versuchen. | The link couldn’t be opened. Please try again. |
| Abschnitt | Ticketarten | Ticket types |
| Preis | Ausverkauft · Kostenlos · Preis auf Anfrage | Sold out · Free · Price on request |
| Abschnitt | Über das Event | About the event |
| Abschnitt | Live Snaps · 24 h | Live Snaps · 24 h |
| Leer | Noch keine Eindrücke von heute Nacht. | No impressions from tonight yet. |
| Leer | Eindrücke von Besuchern erscheinen, sobald das Event läuft. | Visitor impressions appear once the event has started. |
| Fußzeile | Original auf {Quelle} öffnen ↗ | Open original on {source} ↗ |
| Fußzeile | Veranstaltungen von Goabase ↗ | Events from Goabase ↗ |
| Fußzeile | Zeiten in Europe/Berlin · Angaben der Veranstaltungsquelle ({Quelle}) | Times in Europe/Berlin · Information from the event source ({source}) |
| Leiste unten | Tickets kaufen | Buy tickets |
| Leiste unten | Infos & Tickets | Info & tickets |
| Leiste unten | {Uhrzeit} Uhr · {Ort} | {time} · {place} |
| Bildansicht | Eventbild · {n} / {m} | Event image · {n} / {m} |
| Bildansicht | Seitlich wischen zum Blättern · Hoch oder runter zum Schließen | Swipe sideways to browse · Swipe up or down to close |

## Merken (`src/components/SaveEventButton.tsx`, `src/hooks/useSavedEvents.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Button | Merken | Save |
| Button | Gemerkt | Saved |
| Fehler | Nicht gespeichert | Not saved |
| Fehler | Deine Merkliste konnte nicht geladen werden. Bitte versuche es erneut. | Your saved list couldn’t be loaded. Please try again. |
| Fehler | Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut. | Your change couldn’t be saved. Please try again. |

## Gemerkt (`src/screens/SavedEventsScreen.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Kopf | SPOTS. / DEINE AUSWAHL | SPOTS. / YOUR PICKS |
| Titel | Gemerkt | Saved |
| Untertitel | {n} Events · nur auf diesem Gerät | {n} events · on this device only |
| Untertitel | Gute Nächte beginnen mit einem Plan. | Great nights start with a plan. |
| Abschnitt | Anstehend · Vergangen | Upcoming · Past |
| Hinweis | {n} gemerkte Events sind nicht mehr veröffentlicht, zum Beispiel weil sie abgesagt wurden. | {n} saved events are no longer published, for example because they were cancelled. |
| Laden | Deine Merkliste wird geladen … | Loading your saved list … |
| Fehler | Deine Merkliste ist gerade nicht verfügbar. | Your saved list is unavailable right now. |
| Leer | Noch nichts gemerkt | Nothing saved yet |
| Leer | Tippe bei einem Event auf das Herz. Hier findest du es wieder, sortiert nach Datum. Gespeichert wird nur auf diesem Gerät. | Tap the heart on an event to find it here, sorted by date. It’s saved on this device only. |
| Button | Events entdecken | Explore events |

## Profil (`src/screens/ProfileScreen.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Kopf | SPOTS. / DEIN PROFIL | SPOTS. / YOUR PROFILE |
| Titel | Profil | Profile |
| Kopfzeile | Ohne Konto unterwegs | Out without an account |
| Kopfzeile | Dein Profil bleibt privat. | Your profile stays private. |
| Kopfzeile | Angemeldet · privat | Signed in · private |
| Zeile | Konto · Startet bald | Account · Coming soon |
| Zeile | Anmelden · Anmelden oder Konto erstellen | Sign in · Sign in or create an account |
| Zeile | Konto verwalten | Manage account |
| Zeile | Sitzung wird geprüft … | Checking session … |
| Zeile | Gemerkt | Saved |
| Gruppe | Privatsphäre | Privacy |
| Zeile | Standort · Nur bei Nutzung | Location · While using the app |
| Zeile | Berechtigungen | Permissions |
| Fußnote | Standort nur für die Karte, solange du Spots nutzt. Kein Tracking, keine Speicherung. | Location is only used for the map while you use Spots. No tracking, no storage. |
| Gruppe | Über Spots | About Spots |
| Zeile | Eventdaten · Goabase | Event data · Goabase |
| Zeile | Version | Version |
| Fußnote | Echte Veranstaltungen aus öffentlichen Quellen. | Real events from public sources. |

## Konto (`src/features/accounts/`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Titel | Anmelden · Konto erstellen · Dein Konto | Sign in · Create account · Your account |
| Hinweis | Ein Login für dich und deine Veranstalterseiten. Private Profildaten sind nicht öffentlich. | One login for you and your organizer pages. Private profile data is not public. |
| Felder | E-Mail · Passwort | Email · Password |
| Button | Anmelden · Registrieren | Sign in · Sign up |
| Button | Neues Konto erstellen · Ich habe schon ein Konto | Create a new account · I already have an account |
| Button | Abmelden | Sign out |
| Zeile | Angemeldet als {E-Mail} | Signed in as {email} |
| Feld | Privater Anzeigename | Private display name |
| Button | Privates Profil speichern | Save private profile |
| Erfolg | Privates Profil gespeichert. | Private profile saved. |
| Erfolg | Bitte deine E-Mail bestätigen und danach anmelden. | Please confirm your email, then sign in. |
| Erfolg | Registrierung erfolgreich. | You’re signed up. |
| Erfolg | E-Mail bestätigt. Du bist angemeldet. | Email confirmed. You’re signed in. |
| Fehler | Bitte eine gültige E-Mail-Adresse eingeben. | Please enter a valid email address. |
| Fehler | Bitte mindestens acht Zeichen für das Passwort verwenden. | Please use at least eight characters for your password. |
| Fehler | Registrierung nicht möglich. Bitte Angaben, Mailzustellung und Verbindungsstatus prüfen. | Sign-up failed. Please check your details and connection. |
| Fehler | Anmeldung fehlgeschlagen. Bitte Zugangsdaten und E-Mail-Bestätigung prüfen. | Sign-in failed. Please check your details and confirm your email. |
| Fehler | Abmeldung fehlgeschlagen. Bitte erneut versuchen. | Sign-out failed. Please try again. |
| Fehler | Bestätigungslink ungültig oder abgelaufen. Bitte erneut anmelden. | The confirmation link is invalid or has expired. Please sign in again. |
| Fehler | Sitzung konnte nicht geladen werden. | Your session couldn’t be loaded. |
| Fehler | Privates Profil konnte nicht gespeichert werden. | Your private profile couldn’t be saved. |
| Fehler | Aktion fehlgeschlagen. Bitte erneut versuchen. | Something went wrong. Please try again. |

## Veranstalterseite (`src/screens/OrganizerProfileScreen.tsx`)

| Bereich | Deutsch (aktuell im Code) | English (Vorschlag) |
|---|---|---|
| Zahlen | Beiträge · Kommend · Vergangen | Posts · Upcoming · Past |
| Zeile | Veranstalter · {Stadt} | Organizer · {city} |
| Hervorhebung | DEIN EVENT | YOUR EVENT |
| Button | Event ansehen | View event |
| Reiter | Beiträge · Events | Posts · Events |
| Leer | Noch keine Beiträge veröffentlicht. | No posts yet. |
| Abschnitt | Kommende Events · Weitere Events · Vergangene Events | Upcoming events · More events · Past events |
| Leer | Gerade keine Termine angekündigt. | No dates announced right now. |
| Leer | Veranstalterseiten kommen bald | Organizer pages are coming soon |
| Leer | Clubs und Veranstalter können ihre Seiten hier bald selbst gestalten. | Clubs and organizers will soon be able to set up their own pages here. |
| Leer | Veranstalter nicht gefunden | Organizer not found |
| Leer | Dieses Profil ist nicht (mehr) öffentlich. | This profile isn’t public (anymore). |
| Button | Zum Event · Zurück | Go to event · Back |
| Fehler | Veranstalterprofil konnte nicht geladen werden. | The organizer profile couldn’t be loaded. |

---

## Vorschläge für geplante Funktionen (noch nicht im Code)

| Bereich | Deutsch (Vorschlag) | English (Vorschlag) |
|---|---|---|
| Ortsseite | Fehler melden | Report a problem |
| Fehler melden | Was stimmt nicht? | What’s wrong? |
| Fehler melden | Details (optional, max. 500 Zeichen) | Details (optional, max. 500 characters) |
| Fehler melden | Bitte keine persönlichen Daten eintragen. | Please don’t include personal information. |
| Fehler melden | Danke! Wir prüfen deinen Hinweis. | Thanks! We’ll look into it. |
| Ort ohne Event | Kein Event eingetragen | No event listed |
| Ortsdaten | © OpenStreetMap-Mitwirkende | © OpenStreetMap contributors |
| Ticketmaster | Tickets bei Ticketmaster | Tickets on Ticketmaster |
| Kategorien | Konzerte · Hip-Hop | Concerts · Hip-Hop |
| Profil | Datenschutz · Nutzungsbedingungen · Impressum · Quellen & Lizenzen | Privacy policy · Terms of use · Legal notice · Sources & licenses |
| Konto | Konto löschen | Delete account |
| Profil | Eventdaten: Goabase, Ticketmaster · Orte: OpenStreetMap | Event data: Goabase, Ticketmaster · Venues: OpenStreetMap |
