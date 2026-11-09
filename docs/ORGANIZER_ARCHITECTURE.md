# Spots – Account- und Veranstaltervertrag

Stand: 09.11.2026. Branch feature/organizer-auth von origin/main 9dbee1b. Gemeinsames Supabase Auth für private Benutzer und Veranstaltermitglieder. Öffentliche Seiten enthalten weder Benutzer-IDs noch E-Mail-Adressen.

## Bestehender Stand und Arbeitsgrenzen

Eventfeed und Goabase nutzen bereits public.events, UUIDs, geprüfte Quellenstatus/RLS, atomaren Importer und Cron. Diese Pfade bleiben unverändert. Der bestehende Client src/lib/supabase.ts liest ohne Auth-Sitzung. ProfileScreen hat bisher keine Anmeldung. Öffentliche Veranstalterseiten und deren Gestaltung bleiben beim Kollegen; src/screens/OrganizerProfileScreen.tsx, src/components/OrganizerPostFeed.tsx und src/data/organizers.ts werden hier nicht bearbeitet.

Neue Account-Funktionen liegen isoliert unter src/features/accounts, öffentliche Verträge unter src/types/accounts.ts und src/services/organizers.ts. Eine minimale Seite /account ist per URL/Deep Link erreichbar; bestehende Screens und Navigation werden nicht umgebaut.

## Gemeinsames Datenmodell

| Tabelle | Inhalt | Leserechte | Schreibrechte |
| --- | --- | --- | --- |
| auth.users | Login, E-Mail, Passwortverwaltung durch Supabase | Auth-Dienst; niemals öffentlicher App-Datensatz | Supabase Auth |
| public.user_profiles | id=auth.uid, privater Anzeigename, Zeitstempel | Nur eigener Benutzer | Eigener Benutzer, keine Rollenfelder |
| public.organizers | UUID, eindeutiger slug, display_name, biography, city, avatar_url, website_url, is_published, Zeitstempel | Publizierte Profile öffentlich; eigene Entwürfe für Mitglieder | owner/editor, eingeschränkte Spalten |
| public.organizer_memberships | organizer_id, user_id, role=owner/editor, created_at | Eigene Mitgliedschaften; Besitzer für ihren Veranstalter | Nur abgesicherte RPCs |
| public.events | Bestehende Spalten plus nullable organizer_id | Bestehender öffentlicher Feed; Mitglieder zusätzlich eigene Spots-Entwürfe | Nur source=spots und eigene Mitgliedschaft; Importer weiter unverändert |
| public.organizer_posts | UUID, organizer_id, body, is_published, Zeitstempel | Publiziert und Veranstalter publiziert; Mitglieder sehen Entwürfe | Mitglieder; Grundlage für spätere Beiträge, noch kein Upload |

Die öffentliche Organizer-Antwort enthält genau id, slug, display_name, biography, city, avatar_url, website_url, is_published, created_at, updated_at. Keine owner_id, Mitgliedschaften, E-Mails oder privaten Profile. Nullable Felder bedeuten fehlende Daten, keine Demo-Fallbacks. TypeScript-Vertrag ist src/types/accounts.ts; öffentliche Leseadapter liefern camelCase. Slugs sind kleingeschrieben, 3–64 Zeichen (a–z, 0–9, Bindestrich), eindeutig. Bearbeiterrechte beruhen auf Datenbankmitgliedschaft, niemals auf frei änderbaren Auth-Metadaten.

Ein Benutzer kann mehrere Veranstalter verwalten. RPC create_organizer erzeugt Profil und erste owner-Mitgliedschaft atomar. Besitzer können über set_organizer_editor gezielt bestehende Benutzer-UUIDs als editor hinzufügen/entfernen. Keine öffentliche E-Mail-Suche, kein automatisches Claiming und keine Besitzerübertragung in dieser Phase. Direkte Membership-INSERT/UPDATE/DELETE sind gesperrt; owner kann sich nicht versehentlich herabstufen. Einladungen/Transfer/Kontolöschung benötigen später eigene Abläufe.

## Eventherkunft und Bestandsschutz

- source=goabase bleibt importiert; organizer_id bleibt NULL. Dasselbe gilt für sonstige importierte Quellen. Keine Zuordnung über Titel, Ort, E-Mail oder neu angelegte Veranstalterprofile.
- Neue selbst erstellte Events müssen source=spots, organizer_id eines berechtigten Veranstalters und source_event_id=NULL haben. Bestehende UUIDs/Daten werden durch die Ergänzung nicht geändert. Kein UPDATE zur Migration bestehender Events.
- Authenticated darf nur freigegebene Inhalts-/Status-/Publikationsspalten eigener Spots-Events bearbeiten; UUID, Quelle, Quell-ID, Veranstalter-ID und created_at bleiben unveränderbar. Keine Client-DELETE-Rechte. Unveröffentlichte scheduled-Events gelten als Entwürfe; keine Erweiterung des Importer-Statusenums erforderlich.
- Private Benutzer erhalten allein durch Registrierung keine Veranstalterrechte. Besitzer/editor können nicht die importierten Goabase-Events ändern; Service-Rolle bleibt ausschließlich im Backend.
- Öffentliche Spots-Events erfordern einen veröffentlichten Veranstalter. Das bestehende öffentliche Event-RLS wird dafür nicht ersetzt; ein zusätzlicher restriktiver Schutz gilt ausschließlich für source=spots. Importierte Events funktionieren unabhängig davon weiter.

## Login und Testbegrenzung

Ein Account-Client mit persistierter Sitzung dient beiden Rollen; kein zweites Login für Veranstalter. Der vorhandene öffentliche Event-Client bleibt unverändert. Account-Client akzeptiert zunächst ausschließlich https://nfomkdvotqtlyymomksb.supabase.co und einen Publishable Key aus EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Bei Produktions-URL bleibt /account gesperrt. Keine Secret-/Service-Keys im Client.

Registrierung per E-Mail/Passwort, Anmeldung, lokale Abmeldung und PKCE-Bestätigungsrückkehr nach /account. Bei aktivierter E-Mail-Bestätigung entsteht erst nach Bestätigung eine Sitzung; keine Einladung/Sicherheitsrolle aus user_metadata. Redirect-Allowlist und Mailzustellung müssen im Testprojekt passen. Native Sitzungen verwenden den bereits vorhandenen AsyncStorage gemäß Supabase-Quickstart, getrennt pro Projekt; Daten im App-Speicher sind nicht zusätzlich verschlüsselt. Web verwendet SDK-Browserstorage. Keine Tokens oder Passwörter in Logs oder Dokumentation.

Zum UI-Test müssen die beiden öffentlichen Variablen in einer bewusst separaten Test-Konfiguration auf Spots-Test zeigen. Die bestehende .env.local wird in dieser Arbeit nicht geändert. Ohne diese Testkonfiguration bleibt der echte Produktionsfeed erreichbar und die Account-Schreibstrecke deaktiviert. Produktionsfreischaltung ist ein späterer ausdrücklich freizugebender Schritt.

## RLS-Vertrag und Umsetzung

user_profiles: auth.uid=id für SELECT/INSERT/UPDATE; anon hat keine Rechte. Organizers/Memberships/Posts: SECURITY-DEFINER-Helfer mit festem leerem search_path prüfen ausschließlich die aktuelle auth.uid und lesen die Mitgliedschaft ohne rekursive RLS. Helfer liegen in einem nicht exponierten Schema; nur erforderliche EXECUTE-Rechte. Ownership/Role/Quellidentität können nicht über normale Inhaltsupdates geändert werden. RPCs prüfen auth.uid serverseitig und serialisieren Mitgliedschaftsänderungen auf dem Veranstalter.

SQL liegt als manueller, transaktionaler Testprojekt-Schritt unter supabase/ops/15_organizer_accounts.sql, nicht als automatische Produktionsmigration. Testausführung nur gegen nfomkdvotqtlyymomksb, nach Schema-/RLS-Vorprüfung. Vorher/Nachher-Vergleich sämtlicher Events/UUIDs und Importmetadaten. Fehlgeschlagene Voraussetzungen führen zum Abbruch; keine stillen Rechteänderungen an vorhandenen fremden Policies.

## Vereinbarung für das öffentliche Design

Der Kollege kann PublicOrganizer, PublicOrganizerPost und OrganizerEventSummary verwenden. Detailabruf erfolgt über die Veranstalter-UUID oder den slug. Liste eigener Events nur source=spots AND organizer_id; keine heuristische Zuordnung von Goabase. Öffentlich nie Mitglieder oder user_profiles abrufen. Nicht vorhanden/unveröffentlicht ergibt null beziehungsweise leere Listen. Keine Dummy-Biografien, Fotos oder Besucherbeiträge. Schreib-UIs nutzen später den Account-Client und die RLS-geschützten Verträge.

Konkrete Lese-Einstiege aus src/services/organizers.ts:

```ts
fetchPublicOrganizer({ id: organizerId }); // oder { slug: 'veranstalter-slug' }
fetchPublicOrganizerEvents(organizerId);  // ausschließlich publizierte scheduled-Spots-Events
fetchPublicOrganizerPosts(organizerId);   // ausschließlich publizierte Textbeiträge
```

Alle Listen sind zunächst auf 100 Einträge begrenzt (Events aufsteigend nach startsAt/id, Beiträge absteigend nach createdAt, danach id). Events enthalten auch vergangene Termine; die Oberfläche kann nach startsAt trennen. Cursor-Pagination und Medienverträge sind noch offen. Der Reader fordert auch beim Einsatz eines angemeldeten Clients explizit veröffentlichte Veranstalter an, damit interne Entwürfe nicht versehentlich als öffentliche Seite erscheinen.

Verwaltungsaktionen aus src/features/accounts/management.ts: createOrganizer, updateOrganizer, setOrganizerEditor, createSpotsEvent, savePrivateProfile und fetchPrivateProfile. Neue Spots-Events starten immer unveröffentlicht. Weitere Bearbeitungs-UIs werden noch nicht eingebaut. Der private Profil-Formularzustand wird bei Benutzerwechsel neu erzeugt; keine vorherigen privaten Eingaben im nächsten Account anzeigen.

## Prüfumfang und noch offene Arbeit

Zu prüfen: eigene/fremde private Profile, anonyme/public Zugriffe, Besitzer/editor/Fremder, Membership-Eskalation, Entwürfe, publizierte Profile/Posts/Events, Quellen-/UUID-Schutz sowie unveränderter Goabase-Bestand. Lokale echte SQL-Tests ergänzen die vorhandenen 70 Tests. Ein vollständiger E-Mail-/Deep-Link-Test auf iOS und Android ist separat zu dokumentieren, nicht aus SQL-Tests abzuleiten.

Offen: Einladungen, Accountlöschung/Ownership-Transfer, Passwortreset, Medienuploads/Moderation, Veröffentlichungskriterien und spätere Produktionsfreigabe. Bestehende öffentliche Design-Dateien werden nicht angeschlossen oder verändert. Tatsächlicher Umsetzungs-/Remote-Teststand wird nach Abschluss in PROJECT_STATUS.md ergänzt.

## Tatsächlich umgesetzt und geprüft

- SQL 15 einmalig ausschließlich in **Spots-Test / nfomkdvotqtlyymomksb** ausgeführt. Vier Tabellen mit aktiver RLS, nullable events.organizer_id, Herkunfts-/Inhaltsconstraints, Indizes, feste Rechte und drei öffentliche Account-RPCs vorhanden. Keine Produktionsausführung. Vorhandene Tabellen/Spalte führen absichtlich zum Abbruch statt zur stillen Wiederinstallation.
- SQL 16 anschließend erfolgreich gegen das echte Testprojekt ausgeführt: owner, editor, Fremder und anon; private Profile, Rechteeskalation, geschützte importierte Events, mehrere eigene Events, Entwürfe und Publikationsgrenzen. Gesamte Fixture-Transaktion inklusive auth.users zurückgerollt; keine Auth-E-Mails oder API-Registrierungen.
- Danach rein lesend bestätigt: **35 bestehende Events mit unveränderten UUIDs/Daten**. Identischer vollständiger Vergleichs-Hash für Events und Goabase-Versionen/Entfernungs-/Quarantänemetadaten/Lease vor und nach Einrichtung und Fixtures. Keine vorhandene Veranstalterzuordnung angelegt. Alle neuen Accounttabellen und auth.users weiterhin leer, RLS auf allen vier Tabellen aktiv.
- Die vorhandenen 70 lokalen Tests plus sechs neue Tests sind erfolgreich (**76 gesamt, 0 übersprungen**). Der neue lokale SQL-Test führt außerdem die unveränderten Goabase-Backend-RPCs mit der ergänzten Spalte aus und bestätigt deren legitime Aktualisierung bei gleicher UUID und organizer_id=NULL.
- Auth-Aktionen mit injiziertem SDK geprüft: Registrierung mit/ohne Sitzung, E-Mail-Bestätigungsfall, Passwortlogin, PKCE-Codeaustausch, lokale Abmeldung, Validierungs-/Fehlerpfade. Öffentlicher Reader über den echten Supabase-JS-Querybuilder mit isoliertem Fetch geprüft; keine echten Auth-API-Anfragen zur Erstellung persistenter Benutzer.
- Browser mit unveränderter Produktions-.env.local: /account rendert den Testprojekt-Hinweis, blendet Login-Felder aus und ignoriert einen fremden Callback-Code. **0 Auth-Requests, 0 Supabase-Schreibanfragen, keine JavaScript-Fehler.** Der Schutz ist bewusst im Client eingebaut, kein neuer produktiver Feature-Schalter.
- Expo-Lint/Typecheck erfolgreich. Keine neuen Dependencies benötigt; AsyncStorage, Expo Linking und Supabase-JS waren bereits vorhanden.

Lokale Nachweise liegen Git-ignoriert unter supabase/.temp/organizer-accounts/. Runner: scripts/test-organizer-backend.ps1 inspect (rein lesend). apply ist gegen Wiederholung markiert; nicht erneut ausführen. verify führt nur die expliziten zurückgerollten SQL-Fixtures aus. Management-Zugang bleibt im RAM/stdin, keine API-Schlüssel in Artefakten.

Noch nicht abgenommen: echte SMTP-Zustellung, Email-Redirect-Allowlist, Registrierung/Bestätigung/Sitzungswiederaufnahme auf iOS/Android sowie öffentliche Design-Anbindung. Bestätigung per PKCE benötigt den ursprünglichen App-/Browser-Kontext mit seinem Verifier. Passwortregeln und Missbrauchsschutz müssen vor Veröffentlichung auch im Supabase-Auth-Projekt konfiguriert werden; die lokale Mindestlänge allein ist keine serverseitige Policy. Produktionsfreischaltung, echter Account-End-to-End-Test und Kontolöschung sind separate Folgeschritte.

Quellen: [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Native Deep Links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [Expo SDK 58 Linking](https://docs.expo.dev/versions/v58.0.0/sdk/linking/).
