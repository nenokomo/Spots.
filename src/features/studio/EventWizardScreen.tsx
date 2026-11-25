import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/ui/Button';
import { squircle } from '../../constants/theme';
import { formatEventAddress } from '../../hooks/useEventAddress';
import { EventDetailView } from '../../screens/EventDetailScreen';
import { geocodeAddress } from '../organizer/geocode';
import {
  addTicket, deleteTicket, fetchTickets, maxTickets, saveOrganizerEvent, searchPublicVenues,
  type MyOrganizer, type OrganizerEvent, type PublicVenueChoice, type StudioTicket,
} from '../organizer/organizerApi';
import { DateTimeField } from './DateTimeField';
import {
  categoryLabels, endsNextDay, eventTimes, firstInvalidStep, genreChoices, genreText, hasOwnPlace, initialForm, maxGenres, newPriceRow, ownPlace,
  resolvedPlace, sameAddress, stepLabels, steps, ticketChanges, ticketModeLabels, ticketPlan, validateStep,
  type EventForm, type FormErrors, type Place, type Step,
} from './eventForm';
import { partStep, toPublicOrganizer, toSpotEvent } from './guestView';
import { useEventTickets } from './hooks';
import { goBack } from './routes';
import { Avatar } from './Story';
import { StudioImageField } from './StudioImageField';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Check, Chip, ConfirmSheet, Input, MenuRow, Message, RoundButton, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const headings: Record<Step, string> = { event: 'Was veranstaltet ihr?', when: 'Wann?', where: 'Wo?', tickets: 'Tickets', preview: 'Es fehlt noch etwas' };

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

type WizardProps = { organizer: MyOrganizer; event: OrganizerEvent | null; template: OrganizerEvent | null; tickets: StudioTicket[]; initialStep: Step; reload: () => void };

/**
 * Event anlegen oder bearbeiten in vier kurzen Schritten und einer Vorschau (docs/STUDIO-UMBAU-PLAN.md):
 * Event (Flyer zuerst) → Wann → Wo → Tickets → Vorschau mit „Veröffentlichen“ oder „Als Entwurf speichern“.
 * Die Vorschau ist **die Eventseite, wie Gäste sie sehen** (EventDetailView der Besucher-App) – schon vor dem Speichern;
 * die Stifte führen zurück zum passenden Schritt.
 * Neu: Schritt für Schritt mit „Weiter“. Bearbeiten: jeder Schritt direkt erreichbar, „Speichern“ überall.
 * Fehler stehen am Feld. Ungespeicherte Eingaben gehen nicht ohne Rückfrage verloren.
 */
function Wizard({ organizer, event, template, tickets, initialStep, reload }: WizardProps) {
  const isNew = !event;
  const approved = organizer.reviewStatus === 'approved';
  const own = ownPlace(organizer);
  const [form, setForm] = useState<EventForm>(() => initialForm(organizer, event ?? template, tickets, isNew && !!template));
  const [initial] = useState(() => JSON.stringify(form));
  const [step, setStep] = useState<Step>(initialStep);
  // Neu: nur schon besuchte Schritte lassen sich direkt anwählen.
  const [reached, setReached] = useState(isNew ? steps.indexOf(initialStep) : steps.length - 1);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [otherGenre, setOtherGenre] = useState(form.otherGenre.length > 0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicVenueChoice[]>([]);
  // Nach dem ersten Speichern eines neuen Events: ein zweiter Versuch ändert dieses Event, statt ein zweites anzulegen.
  const [createdId, setCreatedId] = useState<string | null>(null);

  const index = steps.indexOf(step);
  const dirty = JSON.stringify(form) !== initial;
  const errors: FormErrors = attempted ? validateStep(form, step, { isNew }) : {};
  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const setPlace = (key: keyof Place) => (text: string) => setForm((current) => ({ ...current, place: { ...current.place, [key]: text } }));

  const go = (next: Step) => { setStep(next); setAttempted(false); setError(null); setReached((value) => Math.max(value, steps.indexOf(next))); };
  const leave = () => { if (dirty && !busy) setLeaving(true); else if (!busy) goBack(); };
  /** Pfeil oben links und die Zurück-Taste von Android: beim Anlegen einen Schritt zurück, sonst verlassen. */
  const back = () => { if (isNew && index > 0) go(steps[index - 1]); else leave(); };
  const onHardwareBack = useEffectEvent(back);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onHardwareBack(); return true; });
    return () => subscription.remove();
  }, []);

  const searching = form.placeMode === 'other' && !form.venue;
  useEffect(() => {
    if (!searching || query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchPublicVenues(query).then((found) => { if (active) setResults(found); }).catch(() => { if (active) setResults([]); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, searching]);

  function next() {
    if (Object.keys(validateStep(form, step, { isNew })).length > 0) { setAttempted(true); return; }
    go(steps[index + 1]);
  }

  async function save(live: boolean) {
    const invalid = firstInvalidStep(form, { isNew });
    if (invalid) { setStep(invalid); setAttempted(true); return; }
    const times = eventTimes(form);
    if (!times) return;
    const { venue, place } = resolvedPlace(form, organizer);
    const plan = ticketPlan(form);
    setBusy(true); setError(null);
    try {
      // Eigene Adresse → Kartenposition. Unveränderte Adresse behält ihre Position (keine neue Anfrage).
      let position: { latitude: number | null; longitude: number | null } = { latitude: null, longitude: null };
      if (!venue) {
        if (event && !event.venueId && sameAddress(place, event) && event.latitude !== null && event.longitude !== null) {
          position = { latitude: event.latitude, longitude: event.longitude };
        } else {
          const found = await geocodeAddress(place);
          if (!found) { setStep('where'); throw new Error('Diese Adresse haben wir nicht gefunden. Bitte Straße, Hausnummer, PLZ und Stadt prüfen.'); }
          position = { latitude: found.latitude, longitude: found.longitude };
        }
      }
      const status = event?.status ?? 'scheduled';
      const existingId = event?.id ?? createdId ?? undefined;
      const savedId = await saveOrganizerEvent(organizer.id, {
        title: form.title, description: form.description || null, startsAt: times.startsAt.toISOString(), endsAt: times.endsAt.toISOString(),
        venueId: venue?.id ?? null, venueName: venue ? venue.name : place.name,
        street: venue ? null : place.street, houseNumber: venue ? null : place.houseNumber, postcode: venue ? null : place.postcode,
        city: venue ? venue.city : place.city, latitude: position.latitude, longitude: position.longitude,
        imageUrl: form.imageUrl, ticketUrl: plan.ticketUrl, genre: genreText(form), category: form.category, status,
        isPublished: status === 'scheduled' && approved && live,
      }, existingId);
      if (!existingId) setCreatedId(savedId);
      // Ticketarten angleichen: frisch gelesen, damit ein zweiter Versuch nichts doppelt anlegt.
      const current = existingId ? await fetchTickets(savedId) : [];
      const changes = ticketChanges(current, plan.desired);
      for (const ticketId of changes.remove) await deleteTicket(ticketId);
      const kept = current.length - changes.remove.length;
      for (const [offset, ticket] of changes.add.entries()) await addTicket(savedId, ticket, kept + offset);
      reload();
      // Neues Event: weiter zur Eventseite (dort Story, Teilen, Zahlen). Bearbeiten: zurück, woher man kam.
      if (isNew) router.replace({ pathname: '/studio/event/[id]', params: { id: savedId } });
      else goBack();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Speichern hat nicht geklappt.');
      setBusy(false);
    }
  }

  const times = eventTimes(form);
  const shown = resolvedPlace(form, organizer);
  const plan = ticketPlan(form);
  const missing = steps.filter((key) => key !== 'preview' && Object.keys(validateStep(form, key, { isNew })).length > 0);
  const wasPublished = !!event?.isPublished;
  const cancelled = event?.status === 'cancelled';
  const leaveSheet = <ConfirmSheet visible={leaving} title="Änderungen verwerfen?" text="Eure Eingaben sind noch nicht gespeichert." confirmLabel="Verwerfen" cancelLabel="Weiter bearbeiten" danger
    onConfirm={() => { setLeaving(false); goBack(); }} onClose={() => setLeaving(false)} />;
  /** Speichern in der Vorschau: je nach Stand veröffentlichen, als Entwurf speichern oder nur speichern. */
  const finish = cancelled || wasPublished
    ? <StudioButton label="Speichern" loading={busy} onPress={() => void save(wasPublished)} style={styles.flex} />
    : approved
      ? <>
          <StudioButton variant="secondary" label="Als Entwurf" disabled={busy} onPress={() => void save(false)} />
          <StudioButton label="Veröffentlichen" loading={busy} onPress={() => void save(true)} style={styles.flex} />
        </>
      : <StudioButton label="Als Entwurf speichern" loading={busy} onPress={() => void save(false)} style={styles.flex} />;

  // Vorschau: das Event aus den Eingaben, gelesen mit den Regeln der Besucher-App. Die Kartenposition gibt es erst nach
  // dem Speichern (oder bei unveränderter Adresse); bis dahin steht der Ort als Text da.
  const samePosition = !!event && !shown.venue && !event.venueId && sameAddress(shown.place, event);
  const guest = step === 'preview' && missing.length === 0 && times ? toSpotEvent({
    id: event?.id ?? 'vorschau', title: form.title.trim(), description: form.description.trim() || null,
    startsAt: times.startsAt.toISOString(), endsAt: times.endsAt.toISOString(),
    venueId: shown.venue?.id ?? null, venueName: shown.venue ? shown.venue.name : shown.place.name,
    street: shown.venue ? null : shown.place.street, houseNumber: shown.venue ? null : shown.place.houseNumber, postcode: shown.venue ? null : shown.place.postcode,
    city: shown.venue ? shown.venue.city : shown.place.city,
    latitude: samePosition || (event?.venueId && event.venueId === shown.venue?.id) ? event?.latitude ?? null : null,
    longitude: samePosition || (event?.venueId && event.venueId === shown.venue?.id) ? event?.longitude ?? null : null,
    imageUrl: form.imageUrl, ticketUrl: plan.ticketUrl, genre: genreText(form), category: form.category, status: 'scheduled', isPublished: false,
  }, organizer.id) : null;

  if (guest) return <>
    <EventDetailView event={guest} organizer={toPublicOrganizer(organizer)} liveSnaps={[]} trackedId={null} onBack={back}
      tickets={plan.desired.map((ticket, position) => ({ id: ticket.id ?? `neu-${position}`, eventId: guest.id, name: ticket.name, description: null, priceCents: ticket.priceCents,
        currency: 'EUR', externalUrl: ticket.externalUrl ?? null, salesEnd: null, soldOut: tickets.find((item) => item.id === ticket.id)?.soldOut ?? false }))}
      address={shown.venue ? null : formatEventAddress({ street: shown.place.street, house_number: shown.place.houseNumber, postcode: shown.place.postcode }, shown.place.city)}
      edit={{
        onEdit: (part) => go(partStep[part]),
        story: <View style={styles.previewAvatar}><Avatar organizer={organizer} size={76} /></View>,
        toolbar: <IconButton icon="close" accessibilityLabel="Schließen" onPress={leave} />,
        notice: <Text style={styles.previewNote}>{dirty || isNew ? 'Vorschau – noch nicht gespeichert.' : 'So sehen Gäste euer Event.'}{!approved && !wasPublished ? ' Veröffentlichen geht, sobald Spots euch freigegeben hat.' : ''}</Text>,
        bar: <View style={styles.finish}>
          <Message error={error} />
          <View style={styles.finishRow}>{finish}</View>
        </View>,
      }} />
    {leaveSheet}
  </>;

  return <StudioPage title={headings[step]}
    fixedTop={<>
      <View style={styles.bar}>
        <RoundButton icon="back" label={isNew && index > 0 ? 'Einen Schritt zurück' : 'Zurück'} onPress={back} disabled={busy} />
        <Text numberOfLines={1} style={styles.barTitle}>{isNew ? 'Neues Event' : 'Event bearbeiten'}</Text>
        <RoundButton icon="close" label="Schließen" onPress={leave} disabled={busy} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps}>
        {steps.map((key, position) => {
          const enabled = position <= reached && !busy;
          return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: key === step, disabled: !enabled }} accessibilityLabel={`Schritt ${position + 1}: ${stepLabels[key]}`}
            disabled={!enabled} onPress={() => go(key)} style={[styles.step, key === step && styles.stepOn, !enabled && styles.stepOff]}>
            <Text style={[styles.stepLabel, key === step && styles.stepLabelOn]}>{stepLabels[key]}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </>}
    footer={<>
      <Message error={error} />
      {step !== 'preview' && isNew && <StudioButton label="Weiter" onPress={next} />}
      {step !== 'preview' && !isNew && <StudioButton label="Speichern" loading={busy} onPress={() => void save(wasPublished)} />}
      {step === 'preview' && <View style={styles.finishRow}>{finish}</View>}
    </>}>

    {step === 'event' && <>
      <Card><StudioImageField label="Flyer" organizerId={organizer.id} kind="flyer" value={form.imageUrl} onChange={(url) => set('imageUrl', url)} disabled={busy} /></Card>
      <Input label="Titel" value={form.title} onChange={(text) => set('title', text)} placeholder="z. B. Techno Night" maxLength={200} editable={!busy} error={errors.title} />
      <View style={studioStyles.stack}>
        <Text style={styles.label}>Art</Text>
        <Segmented options={categoryLabels} value={form.category} onChange={(value) => set('category', value)} />
      </View>
      <View style={studioStyles.stack}>
        <Text style={styles.label}>Genre  <Text style={styles.optional}>bis zu {maxGenres}</Text></Text>
        <View style={styles.wrap}>
          {genreChoices.map((genre) => {
            const selected = form.genres.includes(genre);
            return <Chip key={genre} label={genre} selected={selected} disabled={busy || (!selected && form.genres.length >= maxGenres)}
              onPress={() => set('genres', selected ? form.genres.filter((item) => item !== genre) : [...form.genres, genre])} />;
          })}
          <Chip label="Anderes" selected={otherGenre} disabled={busy} onPress={() => { if (otherGenre) set('otherGenre', ''); setOtherGenre(!otherGenre); }} />
        </View>
        {otherGenre && <Input label="Anderes Genre" value={form.otherGenre} onChange={(text) => set('otherGenre', text)} placeholder="z. B. Goa" maxLength={30} editable={!busy} />}
      </View>
      <Input label="Beschreibung" optional value={form.description} onChange={(text) => set('description', text)} placeholder="Line-up, Dresscode, Einlass …" multiline maxLength={5000} editable={!busy} />
    </>}

    {step === 'when' && <>
      <DateTimeField label="Datum" mode="date" value={form.date} onChange={(value) => set('date', value)} placeholder="Tag wählen" fromToday={isNew} error={errors.date} disabled={busy} />
      <View style={styles.pair}>
        <View style={styles.flex}><DateTimeField label="Beginn" mode="time" value={form.startTime} onChange={(value) => set('startTime', value)} placeholder="Uhrzeit" fallback="23:00" error={errors.startTime} disabled={busy} /></View>
        <View style={styles.flex}><DateTimeField label="Ende" mode="time" value={form.endTime} onChange={(value) => set('endTime', value)} placeholder="Uhrzeit" fallback="05:00"
          note={endsNextDay(form) ? 'Am nächsten Tag' : null} error={errors.endTime} disabled={busy} /></View>
      </View>
    </>}

    {step === 'where' && <>
      {hasOwnPlace(own) && <View accessibilityRole="radiogroup" style={studioStyles.stack}>
        <Choice selected={form.placeMode === 'own'} title="Bei euch" text={`${own.name} · ${own.street} ${own.houseNumber}, ${own.postcode} ${own.city}`} onPress={() => set('placeMode', 'own')} />
        <Choice selected={form.placeMode === 'other'} title="Anderer Ort" onPress={() => set('placeMode', 'other')} />
      </View>}
      {form.placeMode === 'other' && (form.venue
        ? <MenuRow icon="pin" title={form.venue.name} hint={form.venue.city ?? undefined} trailing={<StudioButton small variant="secondary" label="Ändern" disabled={busy} onPress={() => { set('venue', null); setQuery(''); setResults([]); }} />} />
        : <>
            <Input label="Ort suchen" optional value={query} onChange={setQuery} placeholder="Club oder Location" editable={!busy} />
            {query.trim().length >= 2 && results.map((item) => <MenuRow key={item.id} icon="pin" title={item.name} hint={item.city ?? undefined} onPress={() => set('venue', item)} />)}
            <Card>
              <Input label="Name des Orts" value={form.place.name} onChange={setPlace('name')} placeholder="z. B. eine Halle, ein Hinterhof" maxLength={200} editable={!busy} error={errors.placeName} />
              <View style={styles.pair}>
                <View style={[styles.flex, { flexGrow: 3 }]}><Input label="Straße" value={form.place.street} onChange={setPlace('street')} maxLength={200} editable={!busy} autoComplete="street-address" error={errors.street} /></View>
                <View style={styles.flex}><Input label="Nr." value={form.place.houseNumber} onChange={setPlace('houseNumber')} maxLength={20} editable={!busy} /></View>
              </View>
              <View style={styles.pair}>
                <View style={styles.flex}><Input label="PLZ" value={form.place.postcode} onChange={setPlace('postcode')} keyboard="number-pad" maxLength={5} editable={!busy} autoComplete="postal-code" error={errors.postcode} /></View>
                <View style={[styles.flex, { flexGrow: 2 }]}><Input label="Stadt" value={form.place.city} onChange={setPlace('city')} maxLength={120} editable={!busy} error={errors.city} /></View>
              </View>
            </Card>
          </>)}
    </>}

    {step === 'tickets' && <>
      <Segmented options={ticketModeLabels} value={form.ticketMode} onChange={(mode) => setForm((current) => ({ ...current, ticketMode: mode,
        prices: mode === 'door' && current.prices.length === 0 ? [newPriceRow('Abendkasse')] : current.prices }))} />
      {form.ticketMode === 'online' && <Input label="Ticket-Link" value={form.ticketUrl} onChange={(text) => set('ticketUrl', text)} placeholder="tickets.example.de/…" keyboard="url" maxLength={500} editable={!busy} error={errors.ticketUrl} />}
      {form.ticketMode === 'free' && <Text style={studioStyles.muted}>Auf der Eventseite steht „Eintritt frei“.</Text>}
      {form.ticketMode !== 'free' && <View style={studioStyles.stack}>
        <Text style={styles.label}>Preise  {form.ticketMode === 'online' && <Text style={styles.optional}>freiwillig</Text>}</Text>
        {form.prices.map((row) => <View key={row.key} style={styles.priceRow}>
          <TextInput value={row.name} onChangeText={(text) => set('prices', form.prices.map((item) => item.key === row.key ? { ...item, name: text } : item))}
            placeholder="z. B. Early Bird" placeholderTextColor={studio.faint} accessibilityLabel="Name des Tickets" maxLength={80} editable={!busy} autoCorrect={false} selectionColor={studio.accent} style={[styles.rowInput, styles.rowName]} />
          <TextInput value={row.price} onChangeText={(text) => set('prices', form.prices.map((item) => item.key === row.key ? { ...item, price: text } : item))}
            placeholder="12 €" placeholderTextColor={studio.faint} accessibilityLabel="Preis in Euro" keyboardType="decimal-pad" maxLength={9} editable={!busy} selectionColor={studio.accent} style={[styles.rowInput, styles.rowPrice]} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${row.name || 'Ticket'} entfernen`} disabled={busy} hitSlop={8} onPress={() => set('prices', form.prices.filter((item) => item.key !== row.key))} style={styles.rowRemove}>
            <Icon name="close" size={15} color={studio.faint} />
          </Pressable>
        </View>)}
        {errors.prices && <Text accessibilityRole="alert" style={styles.fieldError}>{errors.prices}</Text>}
        {form.prices.length < maxTickets && <StudioButton small variant="secondary" icon="plus" label="Preis hinzufügen" disabled={busy} onPress={() => set('prices', [...form.prices, newPriceRow()])} />}
      </View>}
    </>}

    {step === 'preview' && <Card tone="amber">
      {missing.map((key) => <Check key={key} done={false} label={stepLabels[key]} onPress={() => { setStep(key); setAttempted(true); }} />)}
    </Card>}

    {leaveSheet}
  </StudioPage>;
}

/** /studio/edit/[id]: „new“ für ein neues Event (mit `from` ein früheres als Vorlage), sonst die Event-ID. `step` öffnet direkt einen Schritt. */
export default function EventWizardScreen() {
  const { id, step, from } = useLocalSearchParams<{ id: string; step?: string; from?: string }>();
  const { organizer, events, reload } = useStudio();
  const event = id === 'new' ? null : events.find((item) => item.id === id) ?? null;
  const template = id === 'new' && from ? events.find((item) => item.id === from) ?? null : null;
  const source = event ?? template;
  const { tickets } = useEventTickets(source?.id ?? null);

  if (organizer === undefined || (source && tickets === null)) return <View style={styles.loading}><ActivityIndicator color={studio.accent} /></View>;
  if (!organizer || (id !== 'new' && !event)) return <StudioPage title="Event" onBack={goBack}>
    <Text style={studioStyles.muted}>Dieses Event gibt es nicht (mehr).</Text>
  </StudioPage>;
  const initialStep = !!event && (steps as readonly string[]).includes(step ?? '') ? step as Step : 'event';
  return <Wizard key={event?.id ?? `new-${template?.id ?? ''}`} organizer={organizer} event={event} template={template} tickets={tickets ?? []} initialStep={initialStep} reload={reload} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  pressed: { opacity: 0.85 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 21, fontWeight: '700', color: studio.text },
  steps: { gap: 6 },
  step: { minHeight: 34, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 17, backgroundColor: studio.panelHigh },
  stepOn: { backgroundColor: studio.accent },
  stepOff: { opacity: 0.4 },
  stepLabel: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: studio.muted },
  stepLabelOn: { color: studio.onAccent, fontWeight: '800' },
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
  rowRemove: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.panelHigh },
  fieldError: { ...studioType.small, color: studio.red },
  // Vorschau = Eventseite der Gäste: rundes Bild wie dort, Hinweis und die Knöpfe zum Speichern.
  previewAvatar: { padding: 4, borderRadius: 42, backgroundColor: studio.bg, borderWidth: 2, borderColor: '#ffffff26' },
  previewNote: { ...studioType.small, color: studio.muted, marginTop: 4 },
  finish: { flex: 1, gap: 8 },
  finishRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
