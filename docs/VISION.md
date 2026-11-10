# Spots – Produktvision (Kurzfassung)

Verdichtete Fassung der vollständigen Projektbeschreibung vom 10.11.2026. Nur lesen, wenn eine Aufgabe Produkt-, Geschäfts- oder Veranstalterentscheidungen berührt. Der aktuelle Code und [PROJECT_STATUS.md](../PROJECT_STATUS.md) sind maßgeblich für den tatsächlichen Stand.

**Leitfrage:** „Wir wollen heute ausgehen. Wo ist gerade etwas los?“
**Markt:** zunächst Deutschland, später international.
**Zielgruppen:** Besucher (kostenlos) und Veranstalter/Clubs (eigene Accounts, Eventverwaltung, später Ticketing).

## Hauptbereiche

1. **Radar (Startseite)** – Karte mit Events in der Nähe.
   - Standardumkreis ca. 30 km, blauer Punkt für eigenen Standort, freies Zoomen/Verschieben.
   - Standortbutton springt zurück auf Position + 30 km.
   - Ohne Standortfreigabe: manuelle Stadtauswahl.
   - Fokus auf laufende Events; bald beginnende berücksichtigen; beendete nie als live zeigen. „Live“ nur, wenn die Daten es belegen.
   - Filter (Techno, House, Hip-Hop, Clubs, Festivals, Events …) hinter **einem** „Filter“-Button – Karte nicht überladen.
   - Marker antippen → Event öffnen. Muss auch mit vielen Events performant bleiben.
2. **Entdecken** – kommende Events (Wochenende, nächste Woche, Monate).
   - Suche nach Name, Stadt (zunächst nur deutsche Städte), Veranstalter, Musikrichtung.
   - Filter nach Datum, Entfernung, Genre. Speichern.
   - „Beliebt“/„Empfohlen“ nur auf Basis echter, nachvollziehbarer Daten (Aufrufe, Merkungen, Ticketinteraktionen) – nie erfunden.
   - Eventkarten: Bild, Name, Datum, Uhrzeit, Ort, Genre; dezenter Farbverlauf aus dem Bild, nicht zu bunt.
3. **Gemerkt** – gespeicherte Events als Karten im gleichen Design wie Entdecken; öffnen, entfernen, vergangene/abgesagte kennzeichnen. Erinnerungen sind eine spätere Erweiterung.
4. **Profil** – Registrierung, Login, Logout, Kontoverwaltung, Einstellungen. Minimal und privat, keine Follower/Freundeslisten/öffentlichen Profile. Gemerkte Events brauchen hier keinen großen eigenen Button.

**Eventdetailseite:** großes (aber kontrolliertes) Bild, Titel, Beschreibung, Datum, Beginn/Ende, Ort/freigegebene Adresse, Genre, Kategorie, Ticketpreise/-infos/-link, Veranstalter, ggf. Live Snaps. Das Wichtigste (was, wann, wo, welche Musik, wie Tickets) sofort erkennbar.

**Live Snaps:** Fotos/kurze Videos von Besuchern und Veranstaltern, einem Event zugeordnet, max. 24 h sichtbar, Meldefunktion und Moderation. Datenschutz/Persönlichkeitsrechte beachten; private Orte nie ohne Berechtigung zeigen. Kein Instagram/Snapchat-Klon – rein praktischer Zweck.

**Veranstalter:** eigener Account, getrennte Rolle (normale Nutzer haben keine Veranstalterrechte). Events erstellen/bearbeiten/absagen, Bilder, Beschreibung, Zeit, Ort, Genre, Tickets. Später öffentliche Veranstalterseiten und ein einfaches Dashboard (Events, Aufrufe, Ticketinteraktionen, Merkungen, Verkäufe). Keine überkomplexe Verwaltungssoftware vor stabilen Kernfunktionen.

## Geschäftsmodell

- Basisnutzung für Besucher kostenlos.
- **Keine** monatlichen Premium-Abos für Veranstalter (aktuelle Strategie).
- Einnahmen: Ticketprovision/Servicegebühr, klar gekennzeichnete gesponserte Events (dürfen den Radar nicht verschlechtern), später eigene Ticketing-Infrastruktur (digitale Tickets, QR, Einlasskontrolle, Wallet, Kategorien, Kontingente, Rabattcodes, Rückerstattungen, Verkaufsübersicht). Provision und Ticketing sind nicht zwingend zwei getrennte Gebühren.
- Reihenfolge: Nutzerbasis → Veranstalter gewinnen → Transaktionen.

## Eventdaten

Externe APIs/Quellen, eigene Veranstaltereinträge, direkte Partnerschaften. Pflicht: echte Daten, korrekte Orte und Zeiten, Aktualität, keine Duplikate, Absagen erkennen, nachvollziehbare und rechtmäßige Quellen. **Niemals Demo-Events als echt darstellen.**

## Design

Dunkel (Schwarz/Anthrazit/Grautöne), modern, jugendlich, hochwertig, minimalistisch. Akzentfarbe `#c922ab` gezielt für aktive Navigation, wichtige Buttons, ausgewählte Filter, Highlights – nicht übermäßig. Keine übertriebenen Animationen. Hochwertige Eventbilder, kontrolliert eingebunden. Einheitliche Designsprache über alle Bereiche. Logo: Radar-Motiv mit dezenter Kartenstruktur, Schriftzug „Spots.“. Kompakte Navigation mit vier Tabs: Radar, Entdecken, Gemerkt, Profil.

## Technik

React Native, Expo, TypeScript, Expo Router; Supabase (Events, Auth, Rollen, RLS, Importe). Sichere RLS und klare Rechtetrennung. Performance: effiziente Marker, sinnvolle Abfragen, Bildoptimierung, gute Ladezustände. Standort nur bewusst erteilt und nur soweit nötig.

## Phasen (Richtung, nicht streng sequenziell)

1. **Event Discovery perfektionieren** – zuverlässiger Radar, echte aktuelle Events, Standortsuche, Filter, Entdecken, Gemerkt, Detailseiten, einfache Accounts.
2. **Veranstalterintegration** – Registrierung, Profile, Eventerstellung/-bearbeitung, Bilder, Veröffentlichung.
3. **Live Snaps**
4. **Ticketing** – Zahlung, digitale Tickets, QR, Einlass, Wallet, Rückerstattungen.
5. **Wachstum & Monetarisierung** – mehr Städte, Partnerschaften, Sponsoring.

## Zusammenarbeit mit KI

Erst Code prüfen, dann ändern. Nur die angefragte Funktion bearbeiten, Design nicht eigenständig ersetzen, größere Änderungen vorher erklären (Vorhaben, Dateien, Auswirkungen, Prüfung). Kritisch mitdenken und widersprechen, wenn etwas unnötig kompliziert oder wirtschaftlich wenig sinnvoll ist. Einfache, robuste, wartbare Lösungen. Nach Änderungen: Lint, Typecheck, relevante Tests; danach berichten, was wirklich geändert und geprüft wurde.
