import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Image, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { Backdrop } from '../../components/Screen';
import { IconButton } from '../../components/ui/Button';
import { formatEventAddress } from '../../hooks/useEventAddress';
import { useNow } from '../../hooks/useNow';
import { EventDetailView } from '../../screens/EventDetailScreen';
import { formatPrice } from '../../services/content';
import { saveOrganizerEvent, setShotHidden, setTicketSoldOut, type MyOrganizer, type OrganizerEvent, type StudioShot } from '../organizer/organizerApi';
import { EventPartSheet } from './EventParts';
import { freshForm, initialForm, missingForPublish, missingForSave, partLabels, resolvedPlace, suggestedDate, type EventForm, type FormPart } from './eventForm';
import { eventState, timeFormat } from './format';
import { Funnel } from './Funnel';
import { formEvent, toPublicOrganizer, toPublicTickets, toSpotEvent } from './guestView';
import { useEventImages, useEventStats, useEventTickets, useStudioRefresh } from './hooks';
import { goBack, newEvent } from './routes';
import { saveEventForm } from './saveEvent';
import { shareEvent } from './share';
import { Avatar, EventStory } from './Story';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { ConfirmSheet, MenuRow, Message, Pill, SectionTitle, StudioButton, StudioPage, StudioSheet, studioStyles } from './ui';

const message = (failure: unknown, fallback: string) => failure instanceof Error ? failure.message : fallback;
const needText = (parts: FormPart[]) => `Zum Veröffentlichen fehlt noch: ${parts.map((part) => partLabels[part]).join(', ')}`;

/** Story und Shots der letzten 24 Stunden als Kacheln. Tippen wählt ein Bild; darunter „Ausblenden“ bzw. „Wieder zeigen“. */
function Images({ images }: { images: ReturnType<typeof useEventImages> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shots = images.shots ?? [];
  const selected = shots.find((shot) => shot.id === selectedId) ?? null;
  const kind = (shot: StudioShot) => shot.byOrganizer ? 'Story' : 'Shot';

  async function toggle(shot: StudioShot) {
    setBusy(true); setError(null);
    try { await setShotHidden(shot.id, !shot.hidden); images.reload(); setSelectedId(null); }
    catch (failure) { setError(message(failure, 'Hat nicht geklappt.')); }
    finally { setBusy(false); }
  }

  if (shots.length === 0) return images.error ? <Message error={images.error} /> : null;
  return <>
    <SectionTitle>Story und Shots</SectionTitle>
    <View style={styles.grid}>
      {shots.map((shot) => <Pressable key={shot.id} accessibilityRole="button" accessibilityState={{ selected: shot.id === selectedId }}
        accessibilityLabel={`${kind(shot)} von ${timeFormat.format(new Date(shot.createdAt))} Uhr${shot.hidden ? ', ausgeblendet' : ''}`}
        onPress={() => { setError(null); setSelectedId(shot.id === selectedId ? null : shot.id); }} style={({ pressed }) => [styles.tile, shot.id === selectedId && styles.tileOn, pressed && styles.pressed]}>
        {shot.url && <Image source={{ uri: shot.url }} resizeMode="cover" style={[StyleSheet.absoluteFill, shot.hidden && styles.dimmed]} />}
        <View style={styles.tileTag}><Text style={styles.tileTagText}>{kind(shot)}</Text></View>
        {shot.hidden && <View style={styles.tileHidden}><Icon name="eye" size={18} color={studio.text} /><Text style={styles.tileHiddenText}>Ausgeblendet</Text></View>}
      </Pressable>)}
    </View>
    {selected && (selected.teamLocked
      ? <Pill tone="red" label="Vom Spots-Team gesperrt" />
      : <StudioButton variant={selected.hidden ? 'secondary' : 'danger'} label={selected.hidden ? 'Wieder zeigen' : 'Ausblenden'} loading={busy} onPress={() => void toggle(selected)} />)}
    <Message error={error} />
  </>;
}

type Sheet = 'manage' | 'more' | 'cancel' | 'draft' | 'live' | null;

/**
 * Ein gespeichertes Event: **die Eventseite, wie Gäste sie sehen**. Jeder Teil lässt sich antippen und in einem kleinen Sheet
 * ändern (gespeichert wird sofort). Unten „Verwalten“ (Zahlen, Ausverkauft, Story und Shots) und der nächste Schritt
 * (Veröffentlichen bzw. Teilen). Seltenes steht oben rechts unter „Mehr“: Duplizieren, Zurück auf Entwurf, Absagen.
 */
function ExistingEvent({ organizer, event, reload, initialPart, justPublished }: { organizer: MyOrganizer; event: OrganizerEvent; reload: () => void; initialPart: FormPart | null; justPublished: boolean }) {
  const images = useEventImages(event.id);
  const { tickets, reload: reloadTickets } = useEventTickets(event.id);
  const stats = useEventStats(organizer.id, event);
  const refresh = useStudioRefresh(() => { images.reload(); reloadTickets(); });
  const [part, setPart] = useState<FormPart | null>(initialPart);
  const [sheet, setSheet] = useState<Sheet>(justPublished ? 'live' : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const approved = organizer.reviewStatus === 'approved';
  const cancelled = event.status === 'cancelled';
  const state = eventState(event);
  const numbers = stats.rows?.find((row) => row.eventId === event.id) ?? null;
  const form = initialForm(organizer, event, tickets ?? []);
  const need = cancelled || event.isPublished ? [] : missingForPublish(form, { isNew: false });
  const guest = toSpotEvent(event, organizer.id);
  /** Erst das Sheet schließen lassen, dann das nächste Fenster öffnen (iOS zeigt nicht zwei gleichzeitig). */
  const afterSheet = (run: () => void) => { setSheet(null); setTimeout(run, Platform.OS === 'ios' ? 400 : 0); };

  /** Status oder Sichtbarkeit ändern; alle anderen Angaben bleiben, wie sie sind. Vor der Freigabe bleibt jedes Event ein Entwurf. */
  async function update(key: string, changes: { status?: OrganizerEvent['status']; live?: boolean }, then: Sheet = null) {
    const status = changes.status ?? event.status;
    const live = changes.live ?? event.isPublished;
    const { id, ...rest } = event;
    setBusy(key); setError(null);
    try {
      await saveOrganizerEvent(organizer.id, { ...rest, status, isPublished: status === 'scheduled' && approved && live }, id);
      reload(); setSheet(then);
    } catch (failure) { setError(message(failure, 'Hat nicht geklappt.')); }
    finally { setBusy(null); }
  }

  function publish() {
    if (need.length > 0) { if (tickets !== null) setPart(need[0]); return; }
    void update('publish', { live: true }, 'live');
  }

  async function soldOut(ticketId: string, value: boolean) {
    setBusy(ticketId); setError(null);
    try { await setTicketSoldOut(ticketId, value); reloadTickets(); }
    catch (failure) { setError(message(failure, 'Hat nicht geklappt.')); }
    finally { setBusy(null); }
  }

  if (!guest) return <StudioPage title={event.title} onBack={goBack}><Text style={studioStyles.muted}>Dieses Event lässt sich gerade nicht anzeigen.</Text></StudioPage>;

  const notice = cancelled || !event.isPublished ? <View style={styles.notice}>
    <Pill label={state.label} tone={state.tone} />
    <Text style={styles.noticeText}>{cancelled ? 'Gäste sehen dieses Event nicht mehr.' : 'Gäste sehen dieses Event noch nicht.'}</Text>
  </View> : undefined;

  const bar = <View style={styles.bar}>
    {!sheet && !part && <Message error={error} />}
    {need.length > 0 && approved && <Text style={styles.need}>{needText(need)}</Text>}
    {!cancelled && !event.isPublished && !approved && <Text style={styles.need}>Veröffentlichen geht, sobald Spots euch freigegeben hat.</Text>}
    <View style={styles.barRow}>
      <StudioButton variant="secondary" label="Verwalten" onPress={() => { setError(null); setSheet('manage'); }} />
      {cancelled
        ? <StudioButton variant="secondary" label="Absage zurücknehmen" loading={busy === 'restore'} disabled={!!busy} onPress={() => void update('restore', { status: 'scheduled', live: false })} style={styles.flex} />
        : event.isPublished
          ? <StudioButton icon="share" label="Teilen" onPress={() => void shareEvent(event)} style={styles.flex} />
          : <StudioButton label="Veröffentlichen" loading={busy === 'publish'} disabled={!approved || !!busy} onPress={publish} style={styles.flex} />}
    </View>
  </View>;

  const confirming = sheet === 'cancel' || sheet === 'draft';
  return <>
    <EventDetailView event={guest} organizer={toPublicOrganizer(organizer)} tickets={toPublicTickets(event.id, tickets ?? [])} liveSnaps={[]} trackedId={null} onBack={goBack}
      address={formatEventAddress({ street: event.street, house_number: event.houseNumber, postcode: event.postcode }, event.city)}
      edit={{
        onEdit: (next) => { if (tickets !== null) setPart(next); },
        story: <EventStory organizer={organizer} event={event} images={images} size={76} />,
        toolbar: <IconButton icon="more" accessibilityLabel="Mehr" onPress={() => { setError(null); setSheet('more'); }} />,
        notice, bar, refresh,
      }} />

    <EventPartSheet part={tickets === null ? null : part} organizer={organizer} form={form} isNew={false} applyLabel="Speichern" dateHint={form.date} onClose={() => setPart(null)}
      onApply={async (next: EventForm) => { await saveEventForm({ organizer, event, form: next, live: event.isPublished }); reload(); reloadTickets(); setPart(null); }} />

    <StudioSheet visible={sheet === 'manage'} title="Verwalten" onClose={() => setSheet(null)}>
      <SectionTitle>Zahlen</SectionTitle>
      {numbers ? <Funnel views={numbers.views} saves={numbers.saves} ticketClicks={numbers.ticketClicks} />
        : stats.error ? <Message error={stats.error} /> : stats.rows ? <Funnel views={0} saves={0} ticketClicks={0} /> : <ActivityIndicator color={studio.accent} />}
      {tickets && tickets.length > 0 && <>
        <SectionTitle>Ausverkauft?</SectionTitle>
        {tickets.map((ticket) => <View key={ticket.id} style={styles.ticket}>
          <View style={styles.ticketCopy}>
            <Text style={studioStyles.body}>{ticket.name}</Text>
            <Text style={studioStyles.muted}>{ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, 'EUR')}</Text>
          </View>
          <Switch accessibilityLabel={`${ticket.name} ausverkauft`} value={ticket.soldOut} disabled={!!busy} onValueChange={(value) => void soldOut(ticket.id, value)}
            trackColor={{ true: studio.amber, false: studio.panelHigh }} />
        </View>)}
      </>}
      <Images images={images} />
      <Message error={error} />
    </StudioSheet>

    {/* „Mehr“: Seltenes. Absagen und „Zurück auf Entwurf“ fragen im selben Sheet nach. */}
    <StudioSheet visible={sheet === 'more' || confirming} title={sheet === 'cancel' ? 'Event absagen?' : sheet === 'draft' ? 'Zurück auf Entwurf?' : 'Mehr'} onClose={() => { if (!busy) setSheet(null); }}>
      {sheet === 'more' && <>
        <MenuRow icon="share" title="Teilen" onPress={() => afterSheet(() => void shareEvent(event))} />
        <MenuRow icon="copy" title="Duplizieren" hint="Als Vorlage für ein neues Event" onPress={() => afterSheet(() => newEvent(event.id))} />
        {!cancelled && event.isPublished && <MenuRow icon="eye" title="Zurück auf Entwurf" hint="Gäste sehen das Event dann nicht mehr" onPress={() => setSheet('draft')} />}
        {cancelled
          ? <MenuRow icon="calendar" title="Absage zurücknehmen" onPress={() => void update('restore', { status: 'scheduled', live: false })} />
          : <MenuRow danger icon="close" title="Event absagen" onPress={() => setSheet('cancel')} />}
      </>}
      {confirming && <>
        <Text style={studioStyles.body}>{sheet === 'cancel'
          ? 'Gäste sehen das Event dann nicht mehr. Ihr könnt die Absage später zurücknehmen.'
          : 'Gäste sehen das Event dann nicht mehr, bis ihr es wieder veröffentlicht.'}</Text>
        <Message error={error} />
        {sheet === 'cancel'
          ? <StudioButton variant="danger" label="Ja, absagen" loading={busy === 'cancel'} onPress={() => void update('cancel', { status: 'cancelled' })} />
          : <StudioButton label="Auf Entwurf stellen" loading={busy === 'draft'} onPress={() => void update('draft', { live: false })} />}
        <StudioButton variant="ghost" label="Abbrechen" disabled={!!busy} onPress={() => setSheet(null)} />
      </>}
    </StudioSheet>

    {/* Der Moment nach dem Veröffentlichen: jetzt teilen Veranstalter am ehesten. */}
    <StudioSheet visible={sheet === 'live'} title="Euer Event ist live" onClose={() => setSheet(null)}>
      <Text style={studioStyles.body}>Gäste finden es jetzt auf dem Radar und in Entdecken.</Text>
      <StudioButton icon="share" label="Jetzt teilen" onPress={() => afterSheet(() => void shareEvent(event))} />
      <StudioButton variant="ghost" label="Fertig" onPress={() => setSheet(null)} />
    </StudioSheet>
  </>;
}

/**
 * Kurzes Titelbild nach dem Tipp auf das Plus: „Neues Event“. Es macht klar, was jetzt passiert, und blendet sich nach
 * gut einer Sekunde von selbst aus (Tippen überspringt es) – ohne zusätzlichen Knopf auf dem Weg zum Event.
 */
function NewEventIntro() {
  const [shown, setShown] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));
  const hide = () => Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start(() => setShown(false));
  const onTime = useEffectEvent(hide);
  useEffect(() => {
    const timer = setTimeout(onTime, 1400);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Neues Event erstellen. Tippen, um fortzufahren." onPress={hide} style={styles.intro}>
      <Backdrop />
      <LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.introPlus}><Icon name="plus" size={40} color={studio.onAccent} /></LinearGradient>
      <Text style={styles.introTitle}>Neues Event</Text>
      <Text style={styles.introText}>Erstellt hier euer neues Event. Tippt an, was ihr ausfüllen wollt: Flyer, Titel, Datum.</Text>
    </Pressable>
  </Animated.View>;
}

/**
 * Ein neues Event: **die leere Eventseite mit Platzhaltern** (docs/STUDIO-UMBAU-PLAN.md, „Die Seite ist das Formular“).
 * Antippen füllt den Teil; gespeichert wird erst mit „Veröffentlichen“ oder „Als Entwurf“. Ungespeichertes geht nicht ohne Rückfrage verloren.
 */
function NewEvent({ organizer, seed, dateHint, reload }: { organizer: MyOrganizer; seed: EventForm; dateHint: string; reload: () => void }) {
  const now = useNow();
  const approved = organizer.reviewStatus === 'approved';
  const [form, setForm] = useState(seed);
  const [initial] = useState(() => JSON.stringify(seed));
  const [part, setPart] = useState<FormPart | null>(null);
  const [busy, setBusy] = useState<'draft' | 'live' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Nach dem ersten Speichern: ein zweiter Versuch ändert dieses Event, statt ein zweites anzulegen.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== initial;

  const leave = () => { if (busy) return; if (dirty) setLeaving(true); else goBack(); };
  const onHardwareBack = useEffectEvent(leave);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onHardwareBack(); return true; });
    return () => subscription.remove();
  }, []);

  async function save(live: boolean) {
    const missing = live ? missingForPublish(form, { isNew: true }) : missingForSave(form, { isNew: true });
    if (missing.length > 0) { setPart(missing[0]); return; }
    setBusy(live ? 'live' : 'draft'); setError(null);
    try {
      const id = await saveEventForm({ organizer, event: null, form, live, existingId: createdId, onSaved: setCreatedId });
      reload();
      router.replace({ pathname: '/studio/event/[id]', params: live && approved ? { id, live: '1' } : { id } });
    } catch (failure) { setError(message(failure, 'Speichern hat nicht geklappt.')); setBusy(null); }
  }

  const guest = formEvent(form, organizer, now);
  const shown = resolvedPlace(form, organizer);
  const need = missingForPublish(form, { isNew: true });
  if (!guest.event) return <StudioPage title="Neues Event" onBack={goBack}><Text style={studioStyles.muted}>Das Event lässt sich gerade nicht anzeigen.</Text></StudioPage>;

  const bar = <View style={styles.bar}>
    <Message error={error} />
    {approved && need.length > 0 && <Text style={styles.need}>{needText(need)}</Text>}
    {!approved && <Text style={styles.need}>Veröffentlichen geht, sobald Spots euch freigegeben hat.</Text>}
    <View style={styles.barRow}>
      {approved
        ? <>
            <StudioButton variant="secondary" label="Als Entwurf" loading={busy === 'draft'} disabled={!!busy} onPress={() => void save(false)} />
            <StudioButton label="Veröffentlichen" loading={busy === 'live'} disabled={!!busy} onPress={() => void save(true)} style={styles.flex} />
          </>
        : <StudioButton label="Als Entwurf speichern" loading={busy === 'draft'} disabled={!!busy} onPress={() => void save(false)} style={styles.flex} />}
    </View>
  </View>;

  return <>
    <EventDetailView event={guest.event} organizer={toPublicOrganizer(organizer)} tickets={guest.tickets} liveSnaps={[]} trackedId={null} onBack={leave}
      address={shown.venue ? null : formatEventAddress({ street: shown.place.street, house_number: shown.place.houseNumber, postcode: shown.place.postcode }, shown.place.city)}
      edit={{
        onEdit: setPart, empty: guest.empty, close: true, title: 'Neues Event', bar,
        story: <View style={styles.avatar}><Avatar organizer={organizer} size={76} /></View>,
        toolbar: <View style={styles.toolbarSpace} />,
      }} />
    <EventPartSheet part={part} organizer={organizer} form={form} isNew applyLabel="Übernehmen" dateHint={dateHint} onClose={() => setPart(null)}
      onApply={(next: EventForm) => { setForm(next); setPart(null); }} />
    <ConfirmSheet visible={leaving} title="Event verwerfen?" text="Eure Eingaben sind noch nicht gespeichert." confirmLabel="Verwerfen" cancelLabel="Weiter bearbeiten" danger
      onConfirm={() => { setLeaving(false); goBack(); }} onClose={() => setLeaving(false)} />
    <NewEventIntro />
  </>;
}

/** /studio/event/[id] – `part` öffnet gleich einen Teil, `live=1` zeigt „Euer Event ist live“ (nach dem Anlegen). */
export default function EventScreen() {
  const { id, part, live } = useLocalSearchParams<{ id: string; part?: string; live?: string }>();
  const { organizer, events, reload } = useStudio();
  if (organizer === undefined) return <View style={styles.loading}><ActivityIndicator color={studio.accent} /></View>;
  const event = organizer ? events.find((item) => item.id === id) : undefined;
  if (!organizer || !event) return <StudioPage title="Event" onBack={goBack}><Text style={studioStyles.muted}>Dieses Event gibt es nicht (mehr).</Text></StudioPage>;
  const initialPart = part && part in partLabels ? part as FormPart : null;
  return <ExistingEvent key={event.id} organizer={organizer} event={event} reload={reload} initialPart={initialPart} justPublished={live === '1'} />;
}

/**
 * /studio/new – das ＋. Startet mit den Vorgaben vom letzten Event (Uhrzeiten, Ort, Art, Genre), damit man bei einer
 * Reihe nur Flyer, Titel und Datum ändert. `from` = ein bestimmtes Event als Vorlage (Duplizieren): alles außer dem Datum.
 */
export function NewEventScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { organizer, events, reload } = useStudio();
  const template = from ? events.find((item) => item.id === from) ?? null : null;
  // Die Events kommen nach Beginn sortiert, das späteste zuerst.
  const source = template ?? events.find((item) => item.status !== 'cancelled') ?? null;
  const { tickets } = useEventTickets(source?.id ?? null);
  if (organizer === undefined || (source && tickets === null)) return <View style={styles.loading}><ActivityIndicator color={studio.accent} /></View>;
  if (!organizer) return <StudioPage title="Neues Event" onBack={goBack}><Text style={studioStyles.muted}>Bitte zuerst euer Profil anlegen.</Text></StudioPage>;
  const seed = template ? initialForm(organizer, template, tickets ?? [], true) : freshForm(organizer, source ? { event: source, tickets: tickets ?? [] } : null);
  return <NewEvent key={template?.id ?? 'neu'} organizer={organizer} seed={seed} dateHint={suggestedDate(source)} reload={reload} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  noticeText: { ...studioType.small, color: studio.muted },
  bar: { flex: 1, gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  need: { ...studioType.small, color: studio.muted },
  avatar: { padding: 4, borderRadius: 42, backgroundColor: studio.bg, borderWidth: 2, borderColor: '#ffffff26' },
  toolbarSpace: { width: 44, height: 44 },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 36, backgroundColor: studio.bg },
  introPlus: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#ffffff33', boxShadow: '0 6px 28px #c922ab80' },
  introTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, color: studio.text, textAlign: 'center' },
  introText: { ...studioType.body, fontSize: 17, lineHeight: 24, color: studio.muted, textAlign: 'center' },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  ticketCopy: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: studio.accent },
  dimmed: { opacity: 0.35 },
  tileTag: { position: 'absolute', left: 6, top: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#0a090ccc' },
  tileTagText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
  tileHidden: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileHiddenText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
});
