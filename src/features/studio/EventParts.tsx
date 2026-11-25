import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { maxTickets, searchPublicVenues, type MyOrganizer, type PublicVenueChoice } from '../organizer/organizerApi';
import { DateTimeField } from './DateTimeField';
import {
  categoryLabels, endsNextDay, genreChoices, hasOwnPlace, maxGenres, newPriceRow, ownPlace, partLabels, stepOfPart, ticketModeLabels, validateStep,
  type EventForm, type FormErrors, type FormPart, type Place,
} from './eventForm';
import { StudioImageField } from './StudioImageField';
import { studio, studioType } from './theme';
import { Chip, Input, MenuRow, Message, Segmented, StudioButton, StudioSheet, studioStyles } from './ui';

/** Eine Zeile „Bei euch“ / „Anderer Ort“ zum Auswählen. */
function Choice({ selected, title, text, onPress }: { selected: boolean; title: string; text?: string | null; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={title} onPress={onPress}
    style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && styles.pressed]}>
    <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
    <View style={styles.choiceCopy}>
      <Text style={styles.choiceTitle}>{title}</Text>
      {text && <Text style={studioStyles.muted}>{text}</Text>}
    </View>
  </Pressable>;
}

type FormProps = {
  part: FormPart; organizer: MyOrganizer; form: EventForm; isNew: boolean; applyLabel: string;
  /** Vorschlag für das Datum, solange keins gewählt ist. */
  dateHint: string;
  /** Übernimmt die Eingaben; wirft mit einer Meldung, wenn das Speichern nicht klappt. */
  onApply: (next: EventForm) => Promise<void> | void;
};

/** Die Felder eines Teils. Arbeitet auf einer Kopie; erst „Übernehmen“ bzw. „Speichern“ gibt sie zurück. */
function PartForm({ part, organizer, form, isNew, applyLabel, dateHint, onApply }: FormProps) {
  const own = ownPlace(organizer);
  // „Wann“ startet mit einem Vorschlag, damit die Auswahl immer einen Wert zeigt.
  const [draft, setDraft] = useState<EventForm>(() => part === 'when'
    ? { ...form, date: form.date || dateHint, startTime: form.startTime || '23:00', endTime: form.endTime || '05:00' } : form);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherGenre, setOtherGenre] = useState(form.otherGenre.length > 0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicVenueChoice[]>([]);
  const step = stepOfPart[part];
  const errors: FormErrors = attempted && step ? validateStep(draft, step, { isNew }) : {};
  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setPlace = (key: keyof Place) => (text: string) => setDraft((current) => ({ ...current, place: { ...current.place, [key]: text } }));

  const searching = part === 'place' && draft.placeMode === 'other' && !draft.venue;
  useEffect(() => {
    if (!searching || query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchPublicVenues(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, searching]);

  async function apply() {
    if (step && Object.keys(validateStep(draft, step, { isNew })).length > 0) { setAttempted(true); return; }
    setBusy(true); setError(null);
    try { await onApply(draft); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.'); setBusy(false); }
  }

  return <>
    {part === 'flyer' && <StudioImageField label="Flyer" organizerId={organizer.id} kind="flyer" value={draft.imageUrl} onChange={(url) => set('imageUrl', url)} disabled={busy} />}

    {part === 'title' && <>
      <Input label="Titel" value={draft.title} onChange={(text) => set('title', text)} placeholder="z. B. Techno Night" maxLength={200} editable={!busy} error={errors.title} />
      <View style={studioStyles.stack}>
        <Text style={styles.label}>Art</Text>
        <Segmented options={categoryLabels} value={draft.category} onChange={(value) => set('category', value)} />
      </View>
      <View style={studioStyles.stack}>
        <Text style={styles.label}>Genre  <Text style={styles.optional}>bis zu {maxGenres}</Text></Text>
        <View style={styles.wrap}>
          {genreChoices.map((genre) => {
            const selected = draft.genres.includes(genre);
            return <Chip key={genre} label={genre} selected={selected} disabled={busy || (!selected && draft.genres.length >= maxGenres)}
              onPress={() => set('genres', selected ? draft.genres.filter((item) => item !== genre) : [...draft.genres, genre])} />;
          })}
          <Chip label="Anderes" selected={otherGenre} disabled={busy} onPress={() => { if (otherGenre) set('otherGenre', ''); setOtherGenre(!otherGenre); }} />
        </View>
        {otherGenre && <Input label="Anderes Genre" value={draft.otherGenre} onChange={(text) => set('otherGenre', text)} placeholder="z. B. Goa" maxLength={30} editable={!busy} />}
      </View>
    </>}

    {part === 'when' && <>
      <DateTimeField inline label="Datum" mode="date" value={draft.date} onChange={(value) => set('date', value)} placeholder="Tag wählen" fromToday={isNew} error={errors.date} disabled={busy} />
      <DateTimeField inline label="Beginn" mode="time" value={draft.startTime} onChange={(value) => set('startTime', value)} placeholder="Uhrzeit" fallback="23:00" error={errors.startTime} disabled={busy} />
      <DateTimeField inline label="Ende" mode="time" value={draft.endTime} onChange={(value) => set('endTime', value)} placeholder="Uhrzeit" fallback="05:00"
        note={endsNextDay(draft) ? 'Am nächsten Tag' : null} error={errors.endTime} disabled={busy} />
    </>}

    {part === 'description' && <Input label="Beschreibung" optional value={draft.description} onChange={(text) => set('description', text)} placeholder="Line-up, Dresscode, Einlass …" multiline maxLength={5000} editable={!busy} />}

    {part === 'place' && <>
      {hasOwnPlace(own) && <View accessibilityRole="radiogroup" style={studioStyles.stack}>
        <Choice selected={draft.placeMode === 'own'} title="Bei euch" text={`${own.name} · ${own.street} ${own.houseNumber}, ${own.postcode} ${own.city}`} onPress={() => set('placeMode', 'own')} />
        <Choice selected={draft.placeMode === 'other'} title="Anderer Ort" onPress={() => set('placeMode', 'other')} />
      </View>}
      {draft.placeMode === 'other' && (draft.venue
        ? <MenuRow icon="pin" title={draft.venue.name} hint={draft.venue.city ?? undefined} trailing={<StudioButton small variant="secondary" label="Ändern" disabled={busy} onPress={() => { set('venue', null); setQuery(''); setResults([]); }} />} />
        : <>
            <Input label="Ort suchen" optional value={query} onChange={setQuery} placeholder="Club oder Location" editable={!busy} />
            {query.trim().length >= 2 && results.map((item) => <MenuRow key={item.id} icon="pin" title={item.name} hint={item.city ?? undefined} onPress={() => set('venue', item)} />)}
            <Input label="Name des Orts" value={draft.place.name} onChange={setPlace('name')} placeholder="z. B. eine Halle, ein Hinterhof" maxLength={200} editable={!busy} error={errors.placeName} />
            <View style={styles.pair}>
              <View style={[styles.flex, { flexGrow: 3 }]}><Input label="Straße" value={draft.place.street} onChange={setPlace('street')} maxLength={200} editable={!busy} autoComplete="street-address" error={errors.street} /></View>
              <View style={styles.flex}><Input label="Nr." value={draft.place.houseNumber} onChange={setPlace('houseNumber')} maxLength={20} editable={!busy} /></View>
            </View>
            <View style={styles.pair}>
              <View style={styles.flex}><Input label="PLZ" value={draft.place.postcode} onChange={setPlace('postcode')} keyboard="number-pad" maxLength={5} editable={!busy} autoComplete="postal-code" error={errors.postcode} /></View>
              <View style={[styles.flex, { flexGrow: 2 }]}><Input label="Stadt" value={draft.place.city} onChange={setPlace('city')} maxLength={120} editable={!busy} error={errors.city} /></View>
            </View>
          </>)}
    </>}

    {part === 'tickets' && <>
      <Segmented options={ticketModeLabels} value={draft.ticketMode} onChange={(mode) => setDraft((current) => ({ ...current, ticketMode: mode,
        prices: mode === 'door' && current.prices.length === 0 ? [newPriceRow('Abendkasse')] : current.prices }))} />
      {draft.ticketMode === 'online' && <Input label="Ticket-Link" value={draft.ticketUrl} onChange={(text) => set('ticketUrl', text)} placeholder="tickets.example.de/…" keyboard="url" maxLength={500} editable={!busy} error={errors.ticketUrl} />}
      {draft.ticketMode === 'free' && <Text style={studioStyles.muted}>Auf der Eventseite steht „Eintritt frei“.</Text>}
      {draft.ticketMode !== 'free' && <View style={studioStyles.stack}>
        <Text style={styles.label}>Preise  {draft.ticketMode === 'online' && <Text style={styles.optional}>freiwillig</Text>}</Text>
        {draft.prices.map((row) => <View key={row.key} style={styles.priceRow}>
          <TextInput value={row.name} onChangeText={(text) => set('prices', draft.prices.map((item) => item.key === row.key ? { ...item, name: text } : item))}
            placeholder="z. B. Early Bird" placeholderTextColor={studio.faint} accessibilityLabel="Name des Tickets" maxLength={80} editable={!busy} autoCorrect={false} selectionColor={studio.accent} style={[styles.rowInput, styles.rowName]} />
          <TextInput value={row.price} onChangeText={(text) => set('prices', draft.prices.map((item) => item.key === row.key ? { ...item, price: text } : item))}
            placeholder="12 €" placeholderTextColor={studio.faint} accessibilityLabel="Preis in Euro" keyboardType="decimal-pad" maxLength={9} editable={!busy} selectionColor={studio.accent} style={[styles.rowInput, styles.rowPrice]} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${row.name || 'Ticket'} entfernen`} disabled={busy} hitSlop={8} onPress={() => set('prices', draft.prices.filter((item) => item.key !== row.key))} style={styles.rowRemove}>
            <Icon name="close" size={15} color={studio.faint} />
          </Pressable>
        </View>)}
        {errors.prices && <Text accessibilityRole="alert" style={styles.fieldError}>{errors.prices}</Text>}
        {draft.prices.length < maxTickets && <StudioButton small variant="secondary" icon="plus" label="Preis hinzufügen" disabled={busy} onPress={() => set('prices', [...draft.prices, newPriceRow()])} />}
      </View>}
    </>}

    <Message error={error} />
    <StudioButton label={applyLabel} loading={busy} onPress={() => void apply()} />
  </>;
}

type SheetProps = Omit<FormProps, 'part'> & { part: FormPart | null; onClose: () => void };

/**
 * Ein Teil des Events bearbeiten (docs/STUDIO-UMBAU-PLAN.md, „Die Seite ist das Formular“): öffnet sich, wenn man auf der
 * Eventseite den Flyer, den Titel, die Zeit, die Beschreibung, die Tickets oder den Ort antippt – beim Anlegen genauso wie später.
 */
export function EventPartSheet({ part, onClose, ...rest }: SheetProps) {
  return <StudioSheet visible={part !== null} title={part ? partLabels[part] : ''} onClose={onClose}>
    {part && <PartForm key={part} part={part} {...rest} />}
  </StudioSheet>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  label: { ...studioType.label, color: studio.muted },
  optional: { color: studio.faint, textTransform: 'none', letterSpacing: 0, fontWeight: '400' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pair: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  choiceOn: { borderColor: studio.accent, backgroundColor: studio.accentSoft },
  choiceCopy: { flex: 1, gap: 2 },
  choiceTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: studio.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: studio.faint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: studio.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: studio.accent },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowInput: { ...studioType.body, fontSize: 16, color: studio.text, minHeight: 50, paddingHorizontal: 14, borderRadius: studio.radiusSmall, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: studio.line },
  rowName: { flex: 1 },
  rowPrice: { width: 92, textAlign: 'right' },
  rowRemove: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.panelHigh },
  fieldError: { ...studioType.small, color: studio.red },
});
