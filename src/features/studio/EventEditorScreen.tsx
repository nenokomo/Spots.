import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { useNow } from '../../hooks/useNow';
import { eventDetailHref } from '../../navigation/eventRoutes';
import { postShot } from '../../services/content';
import { formatBerlinInput, parseBerlinDateTime, parseBerlinEnd } from '../../utils/berlinTime';
import { geocodeAddress } from '../organizer/geocode';
import { saveOrganizerEvent, searchPublicVenues, type EventCategory, type MyOrganizer, type OrganizerEvent, type PublicVenueChoice } from '../organizer/organizerApi';
import { normalizeWebsite } from '../organizer/signup';
import { useStudio } from './StudioContext';
import { StudioImageField } from './StudioImageField';
import { studio } from './theme';
import { AreaBanner, Card, Input, Message, SectionTitle, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const categories: Record<EventCategory, string> = { club: 'Clubnacht', concert: 'Konzert', event: 'Event' };
const back = () => router.canGoBack() ? router.back() : router.replace('/studio/events');
type Place = { name: string; street: string; houseNumber: string; postcode: string; city: string };

/** Startwerte für den Ort: beim Bearbeiten die Event-Adresse, bei neuen Events der Club mit seiner Adresse. */
function initialPlace(organizer: MyOrganizer, event: OrganizerEvent | null): Place {
  if (event && !event.venueId) {
    return { name: event.venueName ?? '', street: event.street ?? '', houseNumber: event.houseNumber ?? '', postcode: event.postcode ?? '', city: event.city ?? '' };
  }
  return { name: organizer.displayName, street: organizer.street ?? '', houseNumber: organizer.houseNumber ?? '', postcode: organizer.postcode ?? '', city: organizer.city ?? '' };
}
const samePlace = (a: Place, event: OrganizerEvent) => a.street.trim() === (event.street ?? '') && a.houseNumber.trim() === (event.houseNumber ?? '')
  && a.postcode.trim() === (event.postcode ?? '') && a.city.trim() === (event.city ?? '');

/**
 * Event-Story (SQL 33): Club-Mitglieder posten ab dem Anlegen bis zwei Stunden nach dem Ende. Jedes Bild bleibt 24 Stunden
 * und erscheint auf der Eventseite, sobald das Event live ist. Einfache Oberfläche – Design offen für Noyan.
 */
function EventStoryCard({ event }: { event: OrganizerEvent }) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Wie die Datenbank: bis zwei Stunden nach dem Ende (ohne Ende: acht Stunden nach Beginn).
  const open = event.status === 'scheduled' && (event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt) + 8 * 3_600_000) + 2 * 3_600_000 > now;
  async function post() {
    setError(null); setNotice(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try { await postShot(event.id, result.assets[0], { eventStory: true }); setNotice('In der Event-Story. Sichtbar für 24 Stunden.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Posten hat nicht geklappt.'); }
    finally { setBusy(false); }
  }
  return <Card tone={open ? 'accent' : undefined}>
    <View style={styles.storyHead}>
      <LinearGradient colors={open ? [studio.pink, studio.accentFill[0], '#7a2bd6'] : [studio.panelHigh, studio.panelHigh]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storyRing}>
        <View style={styles.storyInner}><Icon name="camera" size={18} color={studio.text} /></View>
      </LinearGradient>
      <View style={styles.venueCopy}>
        <Text style={studioStyles.heading}>Event-Story</Text>
        <Text style={studioStyles.muted}>{open
      ? `Fotos für die Eventseite, zum Beispiel Line-up oder Aufbau. Jedes bleibt 24 Stunden.${event.isPublished ? '' : ' Zu sehen, sobald das Event live ist.'}`
      : 'Für dieses Event ist die Story vorbei.'}</Text>
      </View>
    </View>
    {open && <StudioButton icon="camera" label="Foto in die Event-Story" loading={busy} onPress={() => void post()} />}
    <Message error={error} text={notice} />
  </Card>;
}

function Editor({ organizer, event, reload }: { organizer: MyOrganizer; event: OrganizerEvent | null; reload: () => void }) {
  const start = event ? formatBerlinInput(event.startsAt) : null;
  const approved = organizer.reviewStatus === 'approved';
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(start?.date ?? '');
  const [startTime, setStartTime] = useState(start?.time ?? '');
  const [endTime, setEndTime] = useState(event?.endsAt ? formatBerlinInput(event.endsAt).time : '');
  const [category, setCategory] = useState<EventCategory>(event?.category ?? 'club');
  const [genre, setGenre] = useState(event?.genre ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [ticketUrl, setTicketUrl] = useState(event?.ticketUrl ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(event?.imageUrl ?? null);
  const [venue, setVenue] = useState<PublicVenueChoice | null>(event?.venueId ? { id: event.venueId, name: event.venueName ?? 'Ort', city: event.city } : null);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<Place>(() => initialPlace(organizer, event));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicVenueChoice[]>([]);
  const [live, setLive] = useState(event?.isPublished ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = event?.status === 'cancelled';
  const setPlaceField = (key: keyof Place) => (text: string) => setPlace((current) => ({ ...current, [key]: text }));

  useEffect(() => {
    if (!searching || query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchPublicVenues(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, searching]);

  async function save(status: OrganizerEvent['status'] = event?.status ?? 'scheduled') {
    const startsAt = parseBerlinDateTime(date, startTime);
    const endsAt = startsAt ? parseBerlinEnd(date, startsAt, endTime) : null;
    const tickets = normalizeWebsite(ticketUrl);
    const problem = !title.trim() ? 'Bitte einen Titel eingeben.'
      : !startsAt ? 'Datum (TT.MM.JJJJ) und Beginn (HH:MM) prüfen.'
      : !event && startsAt.getTime() < Date.now() - 8 * 3_600_000 ? 'Das Event liegt in der Vergangenheit.'
      : !endTime.trim() ? 'Bitte das Ende eingeben (HH:MM). Endet es nach Mitternacht, gilt der nächste Tag.'
      : endsAt === 'invalid' || !endsAt ? 'Ende als HH:MM eingeben.'
      : tickets === 'invalid' ? 'Der Ticket-Link ist ungültig.'
      : !venue && !place.name.trim() ? 'Bitte den Namen des Orts eingeben.'
      : !venue && (!place.street.trim() || !place.houseNumber.trim()) ? 'Bitte Straße und Hausnummer eingeben.'
      : !venue && !/^[0-9]{5}$/.test(place.postcode.trim()) ? 'Bitte eine fünfstellige Postleitzahl eingeben.'
      : !venue && !place.city.trim() ? 'Bitte die Stadt eingeben.' : null;
    if (problem || !startsAt || !endsAt || endsAt === 'invalid' || tickets === 'invalid') { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      // Eigene Adresse → Kartenposition. Unveränderte Adresse behält ihre Position (keine neue Anfrage).
      let position: { latitude: number | null; longitude: number | null } = { latitude: null, longitude: null };
      if (!venue) {
        if (event && !event.venueId && samePlace(place, event) && event.latitude !== null && event.longitude !== null) {
          position = { latitude: event.latitude, longitude: event.longitude };
        } else {
          const found = await geocodeAddress(place);
          if (!found) throw new Error('Diese Adresse haben wir nicht gefunden. Bitte Straße, Hausnummer, PLZ und Stadt prüfen.');
          position = { latitude: found.latitude, longitude: found.longitude };
        }
      }
      await saveOrganizerEvent(organizer.id, {
        title, description: description || null, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
        venueId: venue?.id ?? null, venueName: venue ? venue.name : place.name,
        street: venue ? null : place.street, houseNumber: venue ? null : place.houseNumber, postcode: venue ? null : place.postcode,
        city: venue ? venue.city : place.city, latitude: position.latitude, longitude: position.longitude,
        imageUrl, ticketUrl: tickets, genre: genre || null, category, status,
        isPublished: status === 'scheduled' && approved && live,
      }, event?.id);
      reload();
      back();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.');
      setBusy(false);
    }
  }

  return <StudioPage title={event ? 'Event bearbeiten' : 'Neues Event'} bottomInset={40}
    trailing={<StudioButton small variant="secondary" label="Zurück" onPress={back} />}>
    {cancelled && <Card tone="red"><Text style={studioStyles.body}>Dieses Event ist abgesagt und nicht mehr in Spots zu sehen.</Text></Card>}
    <AreaBanner icon="calendar" area="Eventseite" text={event ? `Ihr bearbeitet die Eventseite von „${event.title}“.` : 'Ein neues Event bekommt seine eigene Eventseite in Spots.'}
      preview={event?.isPublished ? 'Ansehen' : undefined} onPreview={event ? () => router.push(eventDetailHref(event.id)) : undefined} />
    {/* Story first: „Event-Story posten“ on Heute lands right here. */}
    {event && <EventStoryCard event={event} />}
    <SectionTitle>Was & wann</SectionTitle>
    <Card>
      <Input label="Titel" value={title} onChange={setTitle} placeholder="z. B. Techno Night mit …" maxLength={200} editable={!busy} />
      <View style={studioStyles.row}>
        <View style={[studioStyles.flex, { flexGrow: 2 }]}><Input label="Datum" value={date} onChange={setDate} placeholder="TT.MM.JJJJ" keyboard="numbers-and-punctuation" editable={!busy} /></View>
        <View style={studioStyles.flex}><Input label="Beginn" value={startTime} onChange={setStartTime} placeholder="HH:MM" keyboard="numbers-and-punctuation" editable={!busy} /></View>
        <View style={studioStyles.flex}><Input label="Ende" value={endTime} onChange={setEndTime} placeholder="HH:MM" keyboard="numbers-and-punctuation" editable={!busy} /></View>
      </View>
      <Text style={studioStyles.muted}>Endet das Event nach Mitternacht (z. B. 23:00 bis 05:00), gilt das Ende automatisch am nächsten Tag.</Text>
      <Segmented options={categories} value={category} onChange={setCategory} />
      <Input label="Genre" optional value={genre} onChange={setGenre} placeholder="Techno, House, Hip-Hop …" maxLength={40} editable={!busy} />
    </Card>

    <SectionTitle>Wo</SectionTitle>
    <Card>
      {venue ? <View style={styles.venue}>
        <View style={styles.venueCopy}><Text style={studioStyles.heading}>{venue.name}</Text>{venue.city && <Text style={studioStyles.muted}>{venue.city} · aus dem Spots-Adressbuch</Text>}</View>
        <StudioButton small variant="secondary" label="Eigene Adresse" onPress={() => { setVenue(null); setSearching(false); }} />
      </View> : searching ? <>
        <Input label="Ort im Spots-Adressbuch suchen" value={query} onChange={setQuery} placeholder="Club oder Location" editable={!busy} />
        {results.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setVenue(item); setSearching(false); }} style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}>
          <Text style={studioStyles.body}>{item.name}</Text>{item.city && <Text style={studioStyles.muted}>{item.city}</Text>}
        </Pressable>)}
        {query.trim().length >= 2 && results.length === 0 && <Text style={studioStyles.muted}>Nichts gefunden.</Text>}
        <StudioButton small variant="ghost" label="Doch eigene Adresse eingeben" onPress={() => setSearching(false)} />
      </> : <>
        <Input label="Name des Orts" value={place.name} onChange={setPlaceField('name')} placeholder="z. B. euer Club, eine Halle, ein Hinterhof" maxLength={200} editable={!busy} />
        <View style={studioStyles.row}>
          <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Straße" value={place.street} onChange={setPlaceField('street')} maxLength={200} editable={!busy} autoComplete="street-address" /></View>
          <View style={studioStyles.flex}><Input label="Nr." value={place.houseNumber} onChange={setPlaceField('houseNumber')} maxLength={20} editable={!busy} /></View>
        </View>
        <View style={studioStyles.row}>
          <View style={studioStyles.flex}><Input label="PLZ" value={place.postcode} onChange={setPlaceField('postcode')} keyboard="number-pad" maxLength={5} editable={!busy} autoComplete="postal-code" /></View>
          <View style={[studioStyles.flex, { flexGrow: 3 }]}><Input label="Stadt" value={place.city} onChange={setPlaceField('city')} maxLength={120} editable={!busy} /></View>
        </View>
        <Text style={studioStyles.muted}>Aus der Adresse berechnen wir beim Speichern den Punkt auf der Karte (über OpenStreetMap). Die Adresse steht auf der Eventseite.</Text>
        <StudioButton small variant="ghost" label="Ort aus dem Spots-Adressbuch wählen" onPress={() => { setSearching(true); setQuery(''); setResults([]); }} />
      </>}
    </Card>

    <SectionTitle>Flyer & Tickets</SectionTitle>
    <Card>
      <StudioImageField label="Flyer" organizerId={organizer.id} kind="flyer" value={imageUrl} onChange={setImageUrl} disabled={busy} />
      <Input label="Ticket-Link" optional value={ticketUrl} onChange={setTicketUrl} placeholder="tickets.example.de/…" keyboard="url" maxLength={500} editable={!busy} />
      <Text style={studioStyles.muted}>Mit Ticket-Link zeigt Spots „Tickets kaufen“ auf der Eventseite und eurer Veranstalterseite. Verkauft wird beim Anbieter.</Text>
    </Card>

    <SectionTitle>Beschreibung</SectionTitle>
    <Card>
      <Input label="Über das Event" optional value={description} onChange={setDescription} placeholder="Line-up, Dresscode, Einlass …" multiline maxLength={5000} editable={!busy} />
    </Card>

    {!cancelled && <SectionTitle>Veröffentlichen</SectionTitle>}

    {!cancelled && <Card tone={approved && live ? 'accent' : undefined}>
      <View style={styles.liveRow}>
        <View style={styles.venueCopy}>
          <Text style={studioStyles.heading}>Live in Spots</Text>
          <Text style={studioStyles.muted}>{approved ? 'Sofort sichtbar auf Radar, Entdecken und eurer Seite.' : 'Geht, sobald das Spots-Team euren Club freigegeben hat. Bis dahin ein Entwurf.'}</Text>
        </View>
        <Switch accessibilityLabel="Live in Spots" value={approved && live} onValueChange={setLive} disabled={!approved || busy}
          trackColor={{ true: studio.accent, false: studio.panelHigh }} thumbColor={approved && live ? studio.onAccent : undefined} />
      </View>
    </Card>}

    <Message error={error} />
    <StudioButton label="Speichern" loading={busy} onPress={() => void save()} />
    {event && !cancelled && <StudioButton variant="danger" label="Event absagen" disabled={busy} onPress={() => void save('cancelled')} />}
    {event && cancelled && <StudioButton variant="secondary" label="Absage zurücknehmen" disabled={busy} onPress={() => void save('scheduled')} />}
  </StudioPage>;
}

/** /studio/event/[id]: „new“ für ein neues Event, sonst die Event-ID. */
export default function EventEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { organizer, events, reload } = useStudio();
  if (organizer === undefined) return <View style={styles.loading}><ActivityIndicator color={studio.accent} /></View>;
  if (!organizer) return <StudioPage title="Event"><Text style={studioStyles.muted}>Bitte zuerst die Angaben zum Club ergänzen.</Text></StudioPage>;
  const event = id === 'new' ? null : events.find((item) => item.id === id);
  if (event === undefined) return <StudioPage title="Event" trailing={<StudioButton small variant="secondary" label="Zurück" onPress={back} />}>
    <Text style={studioStyles.muted}>Dieses Event gibt es nicht (mehr).</Text>
  </StudioPage>;
  return <Editor key={event?.id ?? 'new'} organizer={organizer} event={event} reload={reload} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  venue: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  venueCopy: { flex: 1, gap: 4 },
  result: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: studio.radiusSmall, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, gap: 2 },
  resultPressed: { borderColor: studio.accent },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storyHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  storyRing: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  storyInner: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
});
