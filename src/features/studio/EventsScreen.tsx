import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { useNow } from '../../hooks/useNow';
import { submitOrganizer, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { EventCard } from './EventCard';
import { eventChecklist, type ChecklistItem, type FormPart } from './eventForm';
import { count, countdown, eventState, isUpcoming, placeLine, whenLine } from './format';
import { useEventImages, useEventTickets, useStudioRefresh } from './hooks';
import { openEvent } from './routes';
import { shareEvent } from './share';
import { EventStory } from './Story';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Check, Empty, Message, Pill, Segmented, StudioButton, StudioPage, studioStyles } from './ui';

const startTexts: Record<Exclude<MyOrganizer['reviewStatus'], 'approved'>, { title: string; text: string | null; tone?: 'amber' | 'red' }> = {
  draft: { title: 'Antrag noch nicht gestellt', text: null },
  pending: { title: 'Wir prüfen euer Profil', text: 'Das dauert meistens ein bis zwei Tage. Events könnt ihr schon vorbereiten.', tone: 'amber' },
  rejected: { title: 'Noch nicht freigegeben', text: 'Passt euer Profil an und stellt den Antrag erneut.', tone: 'red' },
  suspended: { title: 'Euer Profil ist gesperrt', text: 'Bitte meldet euch beim Spots-Team.', tone: 'red' },
};
/** Welcher Teil der Eventseite sich öffnet, wenn man einen offenen Punkt antippt. */
const partOf: Record<ChecklistItem['key'], FormPart | undefined> = { flyer: 'flyer', description: 'description', tickets: 'tickets', published: undefined };

/** Bis zur Freigabe: die Schritte zum Start an einer Stelle, mit dem Stand der Prüfung. Danach verschwindet die Karte. */
function StartCard({ organizer, hasEvent, reload }: { organizer: MyOrganizer; hasEvent: boolean; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = organizer.reviewStatus;
  if (status === 'approved') return null;
  const copy = startTexts[status];
  const canSubmit = (status === 'draft' || status === 'rejected') && organizer.role === 'owner';
  return <Card tone={copy.tone}>
    <Text style={studioStyles.heading}>{copy.title}</Text>
    {copy.text && <Text style={studioStyles.muted}>{copy.text}</Text>}
    {organizer.reviewNote && <Text style={studioStyles.body}>Hinweis vom Spots-Team: {organizer.reviewNote}</Text>}
    <View>
      <Check done label="Konto erstellt" />
      <Check done={!!organizer.avatarUrl} label="Logo hochladen" onPress={() => router.navigate('/studio/profile')} />
      {/* Ein Event legt man nur über das Plus an: dieser Punkt zeigt den Stand. */}
      <Check done={hasEvent} label="Erstes Event anlegen" />
      <Check done={false} label="Freigabe durch Spots" />
    </View>
    {canSubmit && <StudioButton label={status === 'rejected' ? 'Antrag erneut stellen' : 'Antrag stellen'} loading={busy}
      onPress={() => { setBusy(true); setError(null); submitOrganizer(organizer.id).then(reload, (failure: unknown) => setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.')).finally(() => setBusy(false)); }} />}
    <Message error={error} />
  </Card>;
}

/**
 * Das nächste Event als große Karte: Flyer, wie lange noch, Status, die Story über das Profilbild mit „+“ und was noch offen ist.
 * Offene Punkte öffnen auf der Eventseite gleich den passenden Teil. Läuft das Event, zeigt die Karte den Abend.
 */
function NextEventCard({ organizer, event, now }: { organizer: MyOrganizer; event: OrganizerEvent; now: number }) {
  const images = useEventImages(event.id);
  const { tickets } = useEventTickets(event.id);
  const approved = organizer.reviewStatus === 'approved';
  const time = countdown(event, now);
  const state = eventState(event);
  const open = eventChecklist(event, tickets?.length ?? null).filter((item) => !item.done && (item.key !== 'published' || approved));
  const guests = images.guestShots.length;
  return <View style={[styles.next, time.live && styles.nextLive]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${event.title} öffnen`} onPress={() => openEvent(event.id)} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.poster}>
        {event.imageUrl
          ? <Image source={{ uri: event.imageUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`Flyer: ${event.title}`} />
          : <LinearGradient colors={['#3a1530', '#1d1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.posterEmpty]}><Icon name="image" size={26} color={studio.faint} /></LinearGradient>}
        <LinearGradient pointerEvents="none" colors={['#0a090c99', '#0a090c00', '#0a090ce6']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.posterTop}>
          <View style={[styles.time, time.live && styles.timeLive]}><Text style={styles.timeLabel}>{time.label}</Text></View>
          <Pill label={state.label} tone={state.tone} />
        </View>
      </View>
    </Pressable>
    <View style={styles.nextBody}>
      <View style={styles.identity}>
        <View style={styles.story}><EventStory organizer={organizer} event={event} images={images} size={64} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${event.title} öffnen`} onPress={() => openEvent(event.id)} style={styles.identityCopy}>
          <Text numberOfLines={2} style={styles.nextTitle}>{event.title}</Text>
          <Text numberOfLines={1} style={studioStyles.muted}>{whenLine(event)}</Text>
          {placeLine(event) && <Text numberOfLines={1} style={studioStyles.muted}>{placeLine(event)}</Text>}
        </Pressable>
      </View>

      {time.live && guests > 0 && <Pressable accessibilityRole="button" onPress={() => openEvent(event.id)} style={styles.liveRow}>
        <Icon name="camera" size={16} color={studio.pink} />
        <Text style={styles.liveText}>{guests === 1 ? '1 Shot von Gästen' : `${count.format(guests)} Shots von Gästen`}</Text>
        <Icon name="chevron" size={14} color={studio.faint} />
      </Pressable>}

      {open.length > 0 && <View style={styles.todo}>
        <Text style={styles.todoLabel}>Noch offen</Text>
        {open.map((item) => <Check key={item.key} done={false} label={item.label} onPress={() => openEvent(event.id, partOf[item.key])} />)}
      </View>}

      {event.isPublished && <StudioButton small variant="secondary" icon="share" label="Teilen" onPress={() => void shareEvent(event)} />}
    </View>
  </View>;
}

/**
 * Tab „Events“ (Start des Studios, docs/STUDIO-UMBAU-PLAN.md): beantwortet „Was steht als Nächstes an, ist es fertig, läuft es?“
 * und zeigt darunter alle weiteren und vergangenen Events. Bis zur Freigabe stehen oben die Schritte zum Start.
 * Neu anlegen geht über das Plus neben der Tab-Leiste. Nach unten ziehen lädt neu.
 */
export default function EventsScreen() {
  const { organizer, events, error, reload } = useStudio();
  const refresh = useStudioRefresh();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const now = useNow();
  if (!organizer) return null;

  const upcoming = events.filter((event) => isUpcoming(event, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = events.filter((event) => !isUpcoming(event, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const next = upcoming.find((event) => event.status !== 'cancelled') ?? null;
  const further = upcoming.filter((event) => event.id !== next?.id);
  const shown = view === 'upcoming' ? further : past;

  return <StudioPage mark title="Events" onRefresh={refresh.onRefresh} refreshing={refresh.refreshing}>
    <Message error={error} />
    <StartCard organizer={organizer} hasEvent={events.length > 0} reload={reload} />
    {next
      ? <NextEventCard key={next.id} organizer={organizer} event={next} now={now} />
      : <Empty icon="calendar" title={events.length === 0 ? 'Noch keine Events' : 'Kein Event geplant'} text="Tippt unten auf das Plus und legt euer nächstes Event an." />}

    {(further.length > 0 || past.length > 0) && <>
      <Segmented options={{ upcoming: `Weitere · ${further.length}`, past: `Vergangen · ${past.length}` }} value={view} onChange={setView} />
      {shown.length === 0 && <Text style={[studioStyles.muted, styles.none]}>{view === 'upcoming' ? 'Keine weiteren Events geplant.' : 'Noch keine vergangenen Events.'}</Text>}
      {shown.map((event) => <EventCard key={event.id} event={event} />)}
    </>}
  </StudioPage>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  none: { textAlign: 'center', paddingVertical: 12 },
  next: { borderRadius: 24, overflow: 'hidden', backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  nextLive: { borderColor: studio.accentLine, boxShadow: '0 0 24px 0 #c922ab40' },
  poster: { height: 190, backgroundColor: studio.panelHigh },
  posterEmpty: { alignItems: 'center', justifyContent: 'center' },
  posterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 14 },
  time: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#0a090ccc', borderWidth: 1, borderColor: '#ffffff26' },
  timeLive: { backgroundColor: studio.accent, borderColor: studio.accent },
  timeLabel: { fontSize: 13, lineHeight: 17, fontWeight: '800', color: studio.text },
  nextBody: { gap: 16, paddingHorizontal: 18, paddingBottom: 18 },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  story: { marginTop: -38 },
  identityCopy: { flex: 1, gap: 2, paddingTop: 12 },
  nextTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4, color: studio.text },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: studio.radiusSmall, backgroundColor: studio.accentSoft },
  liveText: { ...studioType.body, flex: 1, fontWeight: '600', color: studio.text },
  todo: { gap: 2, padding: 14, borderRadius: studio.radiusSmall, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: studio.line },
  todoLabel: { ...studioType.label, color: studio.amber, marginBottom: 4 },
});
