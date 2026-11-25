import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { useNow } from '../../hooks/useNow';
import { fetchEventStatsDaily, submitOrganizer, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { eventChecklist } from './eventForm';
import { count, countdown, eventState, isUpcoming, placeLine, whenLine } from './format';
import { useEventImages, useEventTickets } from './hooks';
import { editEvent, openEvent } from './routes';
import { shareEvent } from './share';
import { EventStory } from './Story';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Check, Empty, Message, Pill, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

const startTexts: Record<Exclude<MyOrganizer['reviewStatus'], 'approved'>, { title: string; text: string | null; tone?: 'amber' | 'red' }> = {
  draft: { title: 'Antrag noch nicht gestellt', text: null },
  pending: { title: 'Wir prüfen euer Profil', text: 'Das dauert meistens ein bis zwei Tage. Events könnt ihr schon vorbereiten.', tone: 'amber' },
  rejected: { title: 'Noch nicht freigegeben', text: 'Passt euer Profil an und stellt den Antrag erneut.', tone: 'red' },
  suspended: { title: 'Euer Profil ist gesperrt', text: 'Bitte meldet euch beim Spots-Team.', tone: 'red' },
};

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
      <Check done={hasEvent} label="Erstes Event anlegen" />
      <Check done={false} label="Freigabe durch Spots" />
    </View>
    {canSubmit && <StudioButton label={status === 'rejected' ? 'Antrag erneut stellen' : 'Antrag stellen'} loading={busy}
      onPress={() => { setBusy(true); setError(null); submitOrganizer(organizer.id).then(reload, (failure: unknown) => setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.')).finally(() => setBusy(false)); }} />}
    <Message error={error} />
  </Card>;
}

/**
 * Das nächste Event als große Karte: Flyer, wie lange noch, Status, die Story über das Profilbild mit „+“ und die
 * Checkliste. Offene Punkte führen direkt zum passenden Schritt. Läuft das Event, zeigt die Karte den Abend.
 * Tippen öffnet die Eventseite – dort sieht man das Event, wie Gäste es sehen.
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
        {open.map((item) => <Check key={item.key} done={false} label={item.label} onPress={() => item.key === 'published' ? openEvent(event.id) : editEvent(event.id, item.step)} />)}
      </View>}

      <View style={styles.actions}>
        <StudioButton small variant="secondary" icon="share" label="Teilen" onPress={() => void shareEvent(event)} />
      </View>
    </View>
  </View>;
}

/** Kurzer Blick auf die letzten 7 Tage. Die ganze Auswertung steht im Reiter „Zahlen“. */
function WeekNumbers({ organizerId }: { organizerId: string }) {
  const [totals, setTotals] = useState<{ views: number; saves: number; ticketClicks: number } | null>(null);
  useEffect(() => {
    let active = true;
    fetchEventStatsDaily(organizerId, 7).then((rows) => {
      if (active) setTotals(rows.reduce((sum, row) => ({ views: sum.views + row.views, saves: sum.saves + row.saves, ticketClicks: sum.ticketClicks + row.ticketClicks }), { views: 0, saves: 0, ticketClicks: 0 }));
    }, () => { /* Ohne Zahlen bleibt der Streifen weg; der Reiter „Zahlen“ zeigt den Fehler. */ });
    return () => { active = false; };
  }, [organizerId]);
  if (!totals) return null;
  const items = [['Aufrufe', totals.views], ['Gemerkt', totals.saves], ['Ticket-Klicks', totals.ticketClicks]] as const;
  return <>
    <SectionTitle>Letzte 7 Tage</SectionTitle>
    <Pressable accessibilityRole="button" accessibilityLabel="Zahlen der letzten 7 Tage, alle Zahlen öffnen" onPress={() => router.navigate('/studio/stats')}
      style={({ pressed }) => [styles.week, pressed && styles.pressed]}>
      {items.map(([label, value], index) => <View key={label} style={[styles.weekItem, index > 0 && styles.weekLine]}>
        <Text style={styles.weekValue}>{count.format(value)}</Text>
        <Text numberOfLines={1} style={styles.weekLabel}>{label}</Text>
      </View>)}
    </Pressable>
  </>;
}

/**
 * Reiter „Übersicht“ (Start des Studios, docs/STUDIO-UMBAU-PLAN.md): beantwortet „Was steht als Nächstes an, ist es fertig, läuft es?“.
 * Bis zur Freigabe die Schritte zum Start, dann das nächste Event mit Checkliste und ein kurzer Blick auf die Zahlen.
 */
export default function OverviewScreen() {
  const { organizer, events, error, reload } = useStudio();
  const now = useNow();
  if (!organizer) return null;
  const next = events.filter((event) => event.status !== 'cancelled' && isUpcoming(event, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;

  return <StudioPage mark title={organizer.displayName}>
    <Message error={error} />
    <StartCard organizer={organizer} hasEvent={events.length > 0} reload={reload} />
    {next
      ? <NextEventCard key={next.id} organizer={organizer} event={next} now={now} />
      : <Empty icon="calendar" title="Kein Event geplant" text="Tippt unten auf das Plus und legt euer nächstes Event an." />}
    {events.length > 0 && <WeekNumbers organizerId={organizer.id} />}
  </StudioPage>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
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
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: studio.radiusSmall, backgroundColor: studio.accentSoft },
  liveText: { ...studioType.body, flex: 1, fontWeight: '600', color: studio.text },
  todo: { gap: 2, padding: 14, borderRadius: studio.radiusSmall, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: studio.line },
  todoLabel: { ...studioType.label, color: studio.amber, marginBottom: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  week: { flexDirection: 'row', padding: 16, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  weekItem: { flex: 1, gap: 2, alignItems: 'center' },
  weekLine: { borderLeftWidth: 1, borderLeftColor: studio.line },
  weekValue: { ...studioType.number, fontSize: 26, lineHeight: 30, color: studio.text },
  weekLabel: { ...studioType.label, fontSize: 10, color: studio.faint },
});
