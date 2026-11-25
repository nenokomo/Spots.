import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { useNow } from '../../hooks/useNow';
import { eventDetailHref } from '../../navigation/eventRoutes';
import { formatPrice } from '../../services/content';
import { saveOrganizerEvent, setShotHidden, setTicketSoldOut, type MyOrganizer, type OrganizerEvent, type StudioShot } from '../organizer/organizerApi';
import { eventChecklist } from './eventForm';
import { countdown, eventState, placeLine, timeFormat, whenLine } from './format';
import { Funnel } from './Funnel';
import { useEventImages, useEventStats, useEventTickets } from './hooks';
import { editEvent, goBack, newEvent } from './routes';
import { shareEvent } from './share';
import { EventStory } from './Story';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Check, ConfirmSheet, Message, Pill, RoundButton, SectionTitle, StudioButton, StudioPage, StudioSheet, studioStyles } from './ui';

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
    <View style={styles.actionIcon}><Icon name={icon} size={20} color={studio.accent} /></View>
    <Text numberOfLines={1} style={styles.actionLabel}>{label}</Text>
  </Pressable>;
}

/** Story und Shots der letzten 24 Stunden als Kacheln. Tippen öffnet das Bild mit „Ausblenden“ bzw. „Wieder zeigen“. */
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
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  if (shots.length === 0) return images.error ? <Message error={images.error} /> : null;
  return <>
    <SectionTitle>Story und Shots</SectionTitle>
    <View style={styles.grid}>
      {shots.map((shot) => <Pressable key={shot.id} accessibilityRole="button" accessibilityLabel={`${kind(shot)} von ${timeFormat.format(new Date(shot.createdAt))} Uhr${shot.hidden ? ', ausgeblendet' : ''}`}
        onPress={() => { setError(null); setSelectedId(shot.id); }} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        {shot.url && <Image source={{ uri: shot.url }} resizeMode="cover" style={[StyleSheet.absoluteFill, shot.hidden && styles.dimmed]} />}
        <View style={styles.tileTag}><Text style={styles.tileTagText}>{kind(shot)}</Text></View>
        {shot.hidden && <View style={styles.tileHidden}><Icon name="eye" size={18} color={studio.text} /><Text style={styles.tileHiddenText}>Ausgeblendet</Text></View>}
      </Pressable>)}
    </View>
    <StudioSheet visible={!!selected} title={selected ? `${kind(selected)} · ${timeFormat.format(new Date(selected.createdAt))} Uhr` : ''} onClose={() => setSelectedId(null)}>
      {selected && <>
        <View style={styles.big}>{selected.url && <Image source={{ uri: selected.url }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={kind(selected)} />}</View>
        {selected.teamLocked
          ? <Pill tone="red" label="Vom Spots-Team gesperrt" />
          : <StudioButton variant={selected.hidden ? 'primary' : 'danger'} label={selected.hidden ? 'Wieder zeigen' : 'Ausblenden'} loading={busy} onPress={() => void toggle(selected)} />}
        <Message error={error} />
      </>}
    </StudioSheet>
  </>;
}

/**
 * Eventseite im Studio (docs/STUDIO-UMBAU-PLAN.md): alles zu einem Event an einem Ort.
 * Oben das runde Profilbild mit „+“ für die Story, dann was noch fehlt, die Zahlen, Tickets und die Bilder des Abends.
 * Bearbeitet wird in den Schritten von „Event bearbeiten“. Absagen fragt nach.
 */
function EventPage({ organizer, event, reload }: { organizer: MyOrganizer; event: OrganizerEvent; reload: () => void }) {
  const now = useNow();
  const images = useEventImages(event.id);
  const { tickets, reload: reloadTickets } = useEventTickets(event.id);
  const stats = useEventStats(organizer.id, event.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'cancel' | 'draft' | null>(null);
  const approved = organizer.reviewStatus === 'approved';
  const cancelled = event.status === 'cancelled';
  const state = eventState(event);
  const time = countdown(event, now);
  const numbers = stats.rows?.find((row) => row.eventId === event.id) ?? null;
  const checklist = eventChecklist(event, tickets?.length ?? null);
  const open = checklist.filter((item) => !item.done);

  /** Status oder Sichtbarkeit ändern; alle anderen Angaben bleiben, wie sie sind. Vor der Freigabe bleibt jedes Event ein Entwurf. */
  async function update(key: string, changes: { status?: OrganizerEvent['status']; live?: boolean }) {
    const status = changes.status ?? event.status;
    const live = changes.live ?? event.isPublished;
    const { id, ...rest } = event;
    setBusy(key); setError(null);
    try {
      await saveOrganizerEvent(organizer.id, { ...rest, status, isPublished: status === 'scheduled' && approved && live }, id);
      reload(); setConfirm(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(null); }
  }

  async function soldOut(ticketId: string, value: boolean) {
    setBusy(ticketId); setError(null);
    try { await setTicketSoldOut(ticketId, value); reloadTickets(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(null); }
  }

  return <StudioPage title={event.title} onBack={goBack} trailing={<RoundButton icon="edit" label="Event bearbeiten" onPress={() => editEvent(event.id)} />}>
    <View style={styles.hero}>
      <EventStory organizer={organizer} event={event} images={images} size={76} />
      <View style={styles.heroCopy}>
        {!cancelled && time.label !== 'Vorbei' && <Text style={[styles.time, time.live && styles.timeLive]}>{time.label}</Text>}
        <Text style={styles.when}>{whenLine(event)}</Text>
        {placeLine(event) && <Text numberOfLines={1} style={studioStyles.muted}>{placeLine(event)}</Text>}
        <Pill label={state.label} tone={state.tone} />
      </View>
      {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.flyer} accessibilityLabel={`Flyer: ${event.title}`} />}
    </View>
    <Message error={error} />

    {cancelled && <Card tone="red"><Text style={studioStyles.body}>Dieses Event ist abgesagt. Gäste sehen es nicht mehr.</Text></Card>}

    {!cancelled && !event.isPublished && <Card tone="accent">
      <Text style={studioStyles.heading}>Noch ein Entwurf</Text>
      {approved
        ? <StudioButton label="Veröffentlichen" loading={busy === 'publish'} disabled={!!busy} onPress={() => void update('publish', { live: true })} />
        : <Text style={studioStyles.muted}>Veröffentlichen geht, sobald Spots euch freigegeben hat.</Text>}
    </Card>}

    {!cancelled && open.filter((item) => item.key !== 'published').length > 0 && <Card>
      <Text style={styles.label}>Noch offen</Text>
      <View>{checklist.filter((item) => item.key !== 'published').map((item) => <Check key={item.key} done={item.done} label={item.label} onPress={() => editEvent(event.id, item.step)} />)}</View>
    </Card>}

    <View style={styles.actions}>
      <Action icon="edit" label="Bearbeiten" onPress={() => editEvent(event.id)} />
      <Action icon="share" label="Teilen" onPress={() => void shareEvent(event)} />
      <Action icon="copy" label="Duplizieren" onPress={() => newEvent(event.id)} />
      {event.isPublished && <Action icon="eye" label="Als Gast" onPress={() => router.push(eventDetailHref(event.id))} />}
    </View>

    <SectionTitle>Zahlen</SectionTitle>
    <Card>
      {numbers ? <Funnel views={numbers.views} saves={numbers.saves} ticketClicks={numbers.ticketClicks} />
        : stats.error ? <Message error={stats.error} /> : stats.rows ? <Funnel views={0} saves={0} ticketClicks={0} /> : <ActivityIndicator color={studio.accent} />}
    </Card>

    {tickets && tickets.length > 0 && <>
      <SectionTitle>Tickets</SectionTitle>
      <Card>
        {tickets.map((ticket) => <View key={ticket.id} style={styles.ticket}>
          <View style={styles.ticketCopy}>
            <Text style={studioStyles.body}>{ticket.name}</Text>
            <Text style={studioStyles.muted}>{ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, 'EUR')}</Text>
          </View>
          <Text style={studioStyles.muted}>Ausverkauft</Text>
          <Switch accessibilityLabel={`${ticket.name} ausverkauft`} value={ticket.soldOut} disabled={!!busy} onValueChange={(value) => void soldOut(ticket.id, value)}
            trackColor={{ true: studio.amber, false: studio.panelHigh }} />
        </View>)}
      </Card>
    </>}

    <Images images={images} />

    <View style={styles.end}>
      {!cancelled && event.isPublished && <StudioButton variant="ghost" label="Zurück auf Entwurf" disabled={!!busy} onPress={() => setConfirm('draft')} />}
      {cancelled
        ? <StudioButton variant="secondary" label="Absage zurücknehmen" loading={busy === 'restore'} disabled={!!busy} onPress={() => void update('restore', { status: 'scheduled', live: false })} />
        : <StudioButton variant="danger" label="Event absagen" disabled={!!busy} onPress={() => setConfirm('cancel')} />}
    </View>

    <ConfirmSheet visible={confirm === 'cancel'} title="Event absagen?" text="Gäste sehen das Event dann nicht mehr. Ihr könnt die Absage später zurücknehmen." confirmLabel="Ja, absagen" danger
      busy={busy === 'cancel'} error={error} onConfirm={() => void update('cancel', { status: 'cancelled' })} onClose={() => setConfirm(null)} />
    <ConfirmSheet visible={confirm === 'draft'} title="Zurück auf Entwurf?" text="Gäste sehen das Event dann nicht mehr, bis ihr es wieder veröffentlicht." confirmLabel="Auf Entwurf stellen"
      busy={busy === 'draft'} error={error} onConfirm={() => void update('draft', { live: false })} onClose={() => setConfirm(null)} />
  </StudioPage>;
}

/** /studio/event/[id] */
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { organizer, events, reload } = useStudio();
  if (organizer === undefined) return <View style={styles.loading}><ActivityIndicator color={studio.accent} /></View>;
  const event = organizer ? events.find((item) => item.id === id) : undefined;
  if (!organizer || !event) return <StudioPage title="Event" onBack={goBack}><Text style={studioStyles.muted}>Dieses Event gibt es nicht (mehr).</Text></StudioPage>;
  return <EventPage key={event.id} organizer={organizer} event={event} reload={reload} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  pressed: { opacity: 0.8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroCopy: { flex: 1, gap: 4 },
  time: { ...studioType.label, color: studio.muted },
  timeLive: { color: studio.pink },
  when: { ...studioType.body, fontWeight: '700', color: studio.text },
  flyer: { width: 60, height: 75, borderRadius: 10, backgroundColor: studio.panelHigh },
  label: { ...studioType.label, color: studio.amber },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
  actionLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: studio.text },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketCopy: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 9 / 16, overflow: 'hidden', borderRadius: studio.radiusSmall, backgroundColor: studio.panelHigh },
  dimmed: { opacity: 0.35 },
  tileTag: { position: 'absolute', left: 6, top: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#0a090ccc' },
  tileTagText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
  tileHidden: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tileHiddenText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: studio.text },
  big: { alignSelf: 'center', width: 200, height: 356, overflow: 'hidden', borderRadius: studio.radius, backgroundColor: studio.bg },
  end: { gap: 8, marginTop: 8 },
});
