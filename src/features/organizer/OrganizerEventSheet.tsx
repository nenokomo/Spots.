import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ListGroup, ListRow } from '../../components/ui/List';
import { Sheet } from '../../components/ui/Sheet';
import { colors, space } from '../../constants/theme';
import { formatBerlinInput, parseBerlinDateTime, parseBerlinEnd } from '../../utils/berlinTime';
import { Choices, Field, formStyles, httpsOrNull } from './formParts';
import { ImageField } from './ImageField';
import { saveOrganizerEvent, searchPublicVenues, type EventCategory, type OrganizerEvent, type PublicVenueChoice } from './organizerApi';

const categoryLabels: Record<EventCategory, string> = { club: 'Clubnacht', concert: 'Konzert', event: 'Event' };

type Props = {
  visible: boolean; organizerId: string; approved: boolean; event: OrganizerEvent | null;
  onClose: () => void; onSaved: () => void;
};

/** Event eines Veranstalters anlegen oder ändern. Öffentlich zeigen geht erst nach der Freigabe des Profils. */
export function OrganizerEventSheet({ visible, organizerId, approved, event, onClose, onSaved }: Props) {
  const start = event ? formatBerlinInput(event.startsAt) : null;
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
  const [venueQuery, setVenueQuery] = useState('');
  const [venues, setVenues] = useState<PublicVenueChoice[]>([]);
  const [ownPlace, setOwnPlace] = useState(!event?.venueId && !!event?.venueName);
  const [placeName, setPlaceName] = useState(event?.venueId ? '' : event?.venueName ?? '');
  const [placeCity, setPlaceCity] = useState(event?.venueId ? '' : event?.city ?? '');
  const [published, setPublished] = useState(event?.isPublished ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelled = event?.status === 'cancelled';

  useEffect(() => {
    if (venue || ownPlace || venueQuery.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchPublicVenues(venueQuery).then((found) => { if (active) setVenues(found); }).catch(() => { if (active) setVenues([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [venueQuery, venue, ownPlace]);

  async function save(status: OrganizerEvent['status'] = event?.status ?? 'scheduled') {
    const startsAt = parseBerlinDateTime(date, startTime);
    const endsAt = startsAt ? parseBerlinEnd(date, startsAt, endTime) : null;
    const tickets = httpsOrNull(ticketUrl);
    const problem = !title.trim() ? 'Bitte einen Titel eingeben.'
      : !startsAt ? 'Datum (TT.MM.JJJJ) und Beginn (HH:MM) prüfen.'
      : !event && startsAt.getTime() < Date.now() - 8 * 3_600_000 ? 'Das Event liegt in der Vergangenheit.'
      : endsAt === 'invalid' ? 'Ende als HH:MM eingeben oder leer lassen.'
      : tickets === 'invalid' ? 'Der Ticket-Link muss mit https:// beginnen.'
      : !venue && !(ownPlace && placeName.trim()) ? 'Bitte einen Ort wählen oder eingeben.'
      : null;
    if (problem || !startsAt || endsAt === 'invalid' || tickets === 'invalid') { setError(problem); return; }
    setBusy(true);
    setError(null);
    try {
      await saveOrganizerEvent(organizerId, {
        title, description: description || null, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null,
        venueId: venue?.id ?? null, venueName: venue ? venue.name : placeName, city: venue ? venue.city : placeCity || null,
        latitude: null, longitude: null, imageUrl, ticketUrl: tickets, genre: genre || null, category, status,
        isPublished: status === 'scheduled' && approved && published,
      }, event?.id);
      onSaved();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  }

  return <Sheet visible={visible} title={event ? 'Event bearbeiten' : 'Event anlegen'} onClose={onClose} tall>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
      {cancelled && <Text style={formStyles.hint}>Dieses Event ist abgesagt und nicht mehr öffentlich.</Text>}
      <Field label="Titel" value={title} onChange={setTitle} placeholder="z. B. Techno Night mit …" maxLength={200} />
      <View style={formStyles.row}>
        <View style={formStyles.flex}><Field label="Datum" value={date} onChange={setDate} placeholder="TT.MM.JJJJ" keyboard="numbers-and-punctuation" /></View>
        <View style={formStyles.flex}><Field label="Beginn" value={startTime} onChange={setStartTime} placeholder="HH:MM" keyboard="numbers-and-punctuation" /></View>
        <View style={formStyles.flex}><Field label="Ende" value={endTime} onChange={setEndTime} placeholder="optional" keyboard="numbers-and-punctuation" /></View>
      </View>

      <View style={formStyles.field}>
        <Text style={formStyles.label}>Ort</Text>
        {venue
          ? <ListGroup><ListRow icon="pin" title={venue.name} subtitle={venue.city ?? undefined} value="Ändern" onPress={() => { setVenue(null); setVenueQuery(''); }} /></ListGroup>
          : ownPlace
            ? <>
                <TextInput value={placeName} onChangeText={setPlaceName} placeholder="Name des Orts" placeholderTextColor={colors.faint} accessibilityLabel="Name des Orts" style={formStyles.input} maxLength={200} />
                <TextInput value={placeCity} onChangeText={setPlaceCity} placeholder="Stadt" placeholderTextColor={colors.faint} accessibilityLabel="Stadt" style={formStyles.input} maxLength={120} />
                <Text style={formStyles.hint}>Ohne Ort aus dem Adressbuch erscheint das Event nicht auf der Karte, nur in Listen und auf deiner Seite.</Text>
                <Button label="Doch im Adressbuch suchen" size="sm" variant="ghost" onPress={() => setOwnPlace(false)} />
              </>
            : <>
                <TextInput value={venueQuery} onChangeText={setVenueQuery} placeholder="Club oder Location suchen" placeholderTextColor={colors.faint}
                  accessibilityLabel="Ort suchen" autoCorrect={false} style={formStyles.input} />
                {venues.length > 0 && <ListGroup>
                  {venues.map((item) => <ListRow key={item.id} title={item.name} subtitle={item.city ?? undefined} onPress={() => setVenue(item)} />)}
                </ListGroup>}
                <Button label="Ort nicht dabei? Selbst eingeben" size="sm" variant="ghost" onPress={() => setOwnPlace(true)} />
              </>}
      </View>

      <Choices label="Art" options={categoryLabels} value={category} onChange={setCategory} />
      <Field label="Genre" value={genre} onChange={setGenre} placeholder="z. B. Techno, House, Hip-Hop" maxLength={40} />
      <Field label="Beschreibung" value={description} onChange={setDescription} placeholder="Was erwartet die Leute?" multiline maxLength={5000} />
      <Field label="Ticket-Link" value={ticketUrl} onChange={setTicketUrl} placeholder="https://…" keyboard="url" maxLength={500} />
      <ImageField label="Flyer" organizerId={organizerId} kind="flyer" value={imageUrl} onChange={setImageUrl} disabled={busy} />

      {!cancelled && <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={formStyles.cardTitle}>Öffentlich zeigen</Text>
          <Text style={formStyles.hint}>{approved ? 'Erscheint sofort in Spots.' : 'Geht erst, wenn das Spots-Team dein Profil freigegeben hat. Bis dahin bleibt es ein Entwurf.'}</Text>
        </View>
        <Switch accessibilityLabel="Öffentlich zeigen" value={approved && published} onValueChange={setPublished} disabled={!approved || busy}
          trackColor={{ true: colors.accent, false: colors.surfaceHigh }} />
      </View>}

      {error && <Text accessibilityRole="alert" style={formStyles.error}>{error}</Text>}
      <Button label="Speichern" icon="calendar" loading={busy} onPress={() => void save()} />
      {event && !cancelled && <Button label="Event absagen" variant="ghost" disabled={busy} onPress={() => void save('cancelled')} />}
      {event && cancelled && <Button label="Absage zurücknehmen" variant="ghost" disabled={busy} onPress={() => void save('scheduled')} />}
    </ScrollView>
  </Sheet>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: space.lg, paddingBottom: space.xxxl * 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  switchCopy: { flex: 1, gap: space.xs },
});
