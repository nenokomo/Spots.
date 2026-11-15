import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { formatBerlinInput, parseBerlinDateTime, parseBerlinEnd } from '../../utils/berlinTime';
import { saveOrganizerEvent, searchPublicVenues, type EventCategory, type MyOrganizer, type OrganizerEvent, type PublicVenueChoice } from '../organizer/organizerApi';
import { normalizeWebsite } from '../organizer/signup';
import { useStudio } from './StudioContext';
import { StudioImageField } from './StudioImageField';
import { studio } from './theme';
import { Card, Input, Message, SectionTitle, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const categories: Record<EventCategory, string> = { club: 'Clubnacht', concert: 'Konzert', event: 'Event' };
const back = () => router.canGoBack() ? router.back() : router.replace('/studio/events');

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
  const [ownPlace, setOwnPlace] = useState(!!event && !event.venueId);
  const [placeName, setPlaceName] = useState(event && !event.venueId ? event.venueName ?? '' : '');
  const [placeCity, setPlaceCity] = useState(event && !event.venueId ? event.city ?? '' : '');
  const [query, setQuery] = useState(event ? '' : organizer.displayName);
  const [results, setResults] = useState<PublicVenueChoice[]>([]);
  const [live, setLive] = useState(event?.isPublished ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = event?.status === 'cancelled';

  useEffect(() => {
    if (venue || ownPlace || query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchPublicVenues(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, venue, ownPlace]);

  async function save(status: OrganizerEvent['status'] = event?.status ?? 'scheduled') {
    const startsAt = parseBerlinDateTime(date, startTime);
    const endsAt = startsAt ? parseBerlinEnd(date, startsAt, endTime) : null;
    const tickets = normalizeWebsite(ticketUrl);
    const problem = !title.trim() ? 'Bitte einen Titel eingeben.'
      : !startsAt ? 'Datum (TT.MM.JJJJ) und Beginn (HH:MM) prüfen.'
      : !event && startsAt.getTime() < Date.now() - 8 * 3_600_000 ? 'Das Event liegt in der Vergangenheit.'
      : endsAt === 'invalid' ? 'Ende als HH:MM eingeben oder leer lassen.'
      : tickets === 'invalid' ? 'Der Ticket-Link ist ungültig.'
      : !venue && !(ownPlace && placeName.trim()) ? 'Bitte einen Ort wählen oder eingeben.' : null;
    if (problem || !startsAt || endsAt === 'invalid' || tickets === 'invalid') { setError(problem); return; }
    setBusy(true); setError(null);
    try {
      await saveOrganizerEvent(organizer.id, {
        title, description: description || null, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null,
        venueId: venue?.id ?? null, venueName: venue ? venue.name : placeName, city: venue ? venue.city : placeCity || null,
        latitude: null, longitude: null, imageUrl, ticketUrl: tickets, genre: genre || null, category, status,
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
    <SectionTitle>Was und wann</SectionTitle>
    <Card>
      <Input label="Titel" value={title} onChange={setTitle} placeholder="z. B. Techno Night mit …" maxLength={200} editable={!busy} />
      <View style={studioStyles.row}>
        <View style={[studioStyles.flex, { flexGrow: 2 }]}><Input label="Datum" value={date} onChange={setDate} placeholder="TT.MM.JJJJ" keyboard="numbers-and-punctuation" editable={!busy} /></View>
        <View style={studioStyles.flex}><Input label="Beginn" value={startTime} onChange={setStartTime} placeholder="HH:MM" keyboard="numbers-and-punctuation" editable={!busy} /></View>
        <View style={studioStyles.flex}><Input label="Ende" optional value={endTime} onChange={setEndTime} placeholder="HH:MM" keyboard="numbers-and-punctuation" editable={!busy} /></View>
      </View>
      <Segmented options={categories} value={category} onChange={setCategory} />
      <Input label="Genre" optional value={genre} onChange={setGenre} placeholder="Techno, House, Hip-Hop …" maxLength={40} editable={!busy} />
    </Card>

    <SectionTitle>Wo</SectionTitle>
    <Card>
      {venue ? <View style={styles.venue}>
        <View style={styles.venueCopy}><Text style={studioStyles.heading}>{venue.name}</Text>{venue.city && <Text style={studioStyles.muted}>{venue.city} · auf der Karte</Text>}</View>
        <StudioButton small variant="secondary" label="Ändern" onPress={() => { setVenue(null); setQuery(''); }} />
      </View> : ownPlace ? <>
        <Input label="Name des Orts" value={placeName} onChange={setPlaceName} maxLength={200} editable={!busy} />
        <Input label="Stadt" value={placeCity} onChange={setPlaceCity} maxLength={120} editable={!busy} />
        <Text style={studioStyles.muted}>Ohne Ort aus dem Adressbuch erscheint das Event nicht auf der Karte, nur in Listen und auf eurer Seite.</Text>
        <StudioButton small variant="ghost" label="Doch im Adressbuch suchen" onPress={() => setOwnPlace(false)} />
      </> : <>
        <Input label="Ort im Spots-Adressbuch suchen" value={query} onChange={setQuery} placeholder="Club oder Location" editable={!busy} />
        {results.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => setVenue(item)} style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}>
          <Text style={studioStyles.body}>{item.name}</Text>{item.city && <Text style={studioStyles.muted}>{item.city}</Text>}
        </Pressable>)}
        {query.trim().length >= 2 && results.length === 0 && <Text style={studioStyles.muted}>Nichts gefunden.</Text>}
        <StudioButton small variant="ghost" label="Ort nicht dabei? Selbst eingeben" onPress={() => { setOwnPlace(true); setPlaceName(organizer.displayName); setPlaceCity(organizer.city ?? ''); }} />
      </>}
    </Card>

    <SectionTitle>Details</SectionTitle>
    <Card>
      <StudioImageField label="Flyer" organizerId={organizer.id} kind="flyer" value={imageUrl} onChange={setImageUrl} disabled={busy} />
      <Input label="Beschreibung" optional value={description} onChange={setDescription} placeholder="Line-up, Dresscode, Einlass …" multiline maxLength={5000} editable={!busy} />
      <Input label="Ticket-Link" optional value={ticketUrl} onChange={setTicketUrl} placeholder="tickets.example.de/…" keyboard="url" maxLength={500} editable={!busy} />
    </Card>

    {!cancelled && <Card tone={approved && live ? 'lime' : undefined}>
      <View style={styles.liveRow}>
        <View style={styles.venueCopy}>
          <Text style={studioStyles.heading}>Live in Spots</Text>
          <Text style={studioStyles.muted}>{approved ? 'Sofort sichtbar auf Radar, Entdecken und eurer Seite.' : 'Geht, sobald das Spots-Team euren Club freigegeben hat. Bis dahin ein Entwurf.'}</Text>
        </View>
        <Switch accessibilityLabel="Live in Spots" value={approved && live} onValueChange={setLive} disabled={!approved || busy}
          trackColor={{ true: studio.lime, false: studio.panelHigh }} thumbColor={approved && live ? studio.limeInk : undefined} />
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
  if (organizer === undefined) return <View style={styles.loading}><ActivityIndicator color={studio.lime} /></View>;
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
  result: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: studio.radiusSmall, backgroundColor: studio.bg, borderWidth: 1, borderColor: studio.line, gap: 2 },
  resultPressed: { borderColor: studio.lime },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
