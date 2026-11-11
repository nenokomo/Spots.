import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { ListGroup, ListRow } from '../../components/ui/List';
import { Sheet } from '../../components/ui/Sheet';
import { colors, radius, space, squircle, type } from '../../constants/theme';
import { venueKindLabels } from '../../types/venues';
import { parseBerlinDateTime, parseBerlinEnd } from '../../utils/berlinTime';
import { approveDraft, createDraft, searchVenues, type DraftCategory, type VenueChoice } from './adminApi';

const categoryLabels: Record<DraftCategory, string> = { club: 'Clubnacht', concert: 'Konzert', event: 'Event' };

function httpsOrNull(value: string): string | null | 'invalid' {
  const raw = value.trim();
  if (!raw) return null;
  try { return new URL(raw).protocol === 'https:' && !/\s/.test(raw) ? raw : 'invalid'; } catch { return 'invalid'; }
}

type Props = { visible: boolean; onClose: () => void; onSaved: () => void };

/** Event von Hand anlegen: immer mit Ort und Herkunft. Keine Bilder, keine kopierten Texte. */
export function NewEventSheet({ visible, onClose, onSaved }: Props) {
  const [venueQuery, setVenueQuery] = useState('');
  const [venues, setVenues] = useState<VenueChoice[]>([]);
  const [venue, setVenue] = useState<VenueChoice | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState<DraftCategory>('club');
  const [ticketUrl, setTicketUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [provenance, setProvenance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (venue || venueQuery.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchVenues(venueQuery).then((found) => { if (active) setVenues(found); }).catch(() => { if (active) setVenues([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [venueQuery, venue]);

  function reset() {
    setVenueQuery(''); setVenues([]); setVenue(null); setTitle(''); setDate(''); setStart(''); setEnd('');
    setGenre(''); setCategory('club'); setTicketUrl(''); setSourceUrl(''); setProvenance(''); setError(null);
  }

  async function save(publish: boolean) {
    const startsAt = parseBerlinDateTime(date, start);
    const endsAt = startsAt ? parseBerlinEnd(date, startsAt, end) : null;
    const tickets = httpsOrNull(ticketUrl);
    const source = httpsOrNull(sourceUrl);
    const problem = !venue ? 'Bitte einen Ort auswählen.'
      : !title.trim() ? 'Bitte einen Titel eingeben.'
      : !startsAt ? 'Datum (TT.MM.JJJJ) und Beginn (HH:MM) prüfen.'
      : startsAt.getTime() < Date.now() - 8 * 3_600_000 ? 'Das Event liegt in der Vergangenheit.'
      : endsAt === 'invalid' ? 'Ende als HH:MM eingeben oder leer lassen.'
      : tickets === 'invalid' || source === 'invalid' ? 'Links müssen mit https:// beginnen.'
      : provenance.trim().length < 3 ? 'Bitte die Herkunft angeben (z. B. „Website des Clubs, Zustimmung per Mail“).'
      : null;
    if (problem || !venue || !startsAt || endsAt === 'invalid' || tickets === 'invalid' || source === 'invalid') {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createDraft({ venueId: venue.id, title, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null,
        genre: genre || null, category, ticketUrl: tickets, sourceUrl: source, provenance });
      if (publish) await approveDraft(id);
      reset();
      onSaved();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, value: string, onChange: (value: string) => void, placeholder: string, options: { keyboard?: 'numbers-and-punctuation' | 'url'; multiline?: boolean } = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint}
        accessibilityLabel={label} autoCapitalize={options.keyboard === 'url' ? 'none' : 'sentences'} autoCorrect={false}
        keyboardType={options.keyboard ?? 'default'} multiline={options.multiline} style={[styles.input, options.multiline && styles.multiline]} />
    </View>
  );

  return (
    <Sheet visible={visible} title="Event anlegen" onClose={onClose} tall>
      <Text style={styles.hint}>Nur echte Events mit Herkunft. Keine Flyer und keine kopierten Beschreibungen ohne Erlaubnis.</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Ort</Text>
        {venue
          ? <ListGroup><ListRow icon="pin" title={venue.name} subtitle={[venueKindLabels[venue.kind], venue.city].filter(Boolean).join(' · ')} value="Ändern" onPress={() => { setVenue(null); setVenueQuery(''); }} /></ListGroup>
          : <>
              <TextInput value={venueQuery} onChangeText={setVenueQuery} placeholder="Club oder Location suchen" placeholderTextColor={colors.faint}
                accessibilityLabel="Ort suchen" autoCorrect={false} style={styles.input} />
              {venues.length > 0 && <ListGroup>
                {venues.map((item) => <ListRow key={item.id} title={item.name} subtitle={[venueKindLabels[item.kind], item.city].filter(Boolean).join(' · ')} onPress={() => setVenue(item)} />)}
              </ListGroup>}
            </>}
      </View>
      {field('Titel', title, setTitle, 'z. B. Techno Night mit …')}
      <View style={styles.row}>
        <View style={styles.flex}>{field('Datum', date, setDate, 'TT.MM.JJJJ', { keyboard: 'numbers-and-punctuation' })}</View>
        <View style={styles.flex}>{field('Beginn', start, setStart, 'HH:MM', { keyboard: 'numbers-and-punctuation' })}</View>
        <View style={styles.flex}>{field('Ende', end, setEnd, 'optional', { keyboard: 'numbers-and-punctuation' })}</View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Art</Text>
        <View style={styles.row}>
          {(Object.keys(categoryLabels) as DraftCategory[]).map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)}
              style={[styles.choice, category === item && styles.choiceActive]}>
              <Text style={[styles.choiceLabel, category === item && styles.choiceActiveLabel]}>{categoryLabels[item]}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {field('Genre', genre, setGenre, 'z. B. Techno, House, Hip-Hop')}
      {field('Ticket-Link', ticketUrl, setTicketUrl, 'https://…', { keyboard: 'url' })}
      {field('Quelle (Link)', sourceUrl, setSourceUrl, 'https://… (Eventseite des Clubs)', { keyboard: 'url' })}
      {field('Herkunft (Pflicht)', provenance, setProvenance, 'z. B. Website des Clubs, Zustimmung per Mail vom 12.11.', { multiline: true })}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label="Speichern und freigeben" icon="ticket" onPress={() => void save(true)} loading={busy} />
      <Button label="Nur als Entwurf speichern" variant="secondary" onPress={() => void save(false)} disabled={busy} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: { ...type.footnote, color: colors.muted },
  field: { gap: space.xs },
  label: { ...type.overline, fontSize: 11, color: colors.faint },
  input: { ...type.body, color: colors.text, minHeight: 44, paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.md, backgroundColor: colors.surfaceHigh, ...squircle },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 90 },
  choice: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh },
  choiceActive: { backgroundColor: colors.text },
  choiceLabel: { ...type.footnote, color: colors.muted },
  choiceActiveLabel: { color: colors.background, fontWeight: '600' },
  error: { ...type.footnote, color: colors.danger },
});
