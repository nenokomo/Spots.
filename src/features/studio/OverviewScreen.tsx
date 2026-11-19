import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import { useNow } from '../../hooks/useNow';
import { dayKey } from '../../utils/events';
import { fetchEventStats, registerOrganizer, reviewLabels, submitOrganizer, type EventStats, type MyOrganizer, type OrganizerEvent } from '../organizer/organizerApi';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { EventCard } from './EventCard';
import { eventState, isUpcoming, timeFormat } from './format';
import { OrganizerSignupFields } from './OrganizerSignupFields';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Kpi, Message, Pill, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

const steps = ['Registriert', 'Prüfung durch Spots', 'Live in Spots'] as const;

function ReviewSteps({ organizer }: { organizer: MyOrganizer }) {
  const reached = organizer.reviewStatus === 'approved' ? 3 : organizer.reviewStatus === 'pending' ? 2 : 1;
  return <View style={styles.steps}>
    {steps.map((label, index) => {
      const done = index < reached - 1 || (index === 2 && reached === 3);
      const current = index === reached - 1 && reached < 3;
      return <View key={label} style={styles.step}>
        <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
          <Text style={[styles.dotLabel, done && styles.dotLabelDone]}>{done ? '✓' : index + 1}</Text>
        </View>
        <Text style={[styles.stepLabel, (done || current) && styles.stepLabelActive]}>{label}</Text>
      </View>;
    })}
  </View>;
}

function StatusCard({ organizer, reload }: { organizer: MyOrganizer; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = organizer.reviewStatus;
  const tone = status === 'approved' ? 'green' : status === 'pending' ? 'amber' : status === 'draft' ? undefined : 'red';
  const text = status === 'approved' ? 'Euer Club ist live. Events, die ihr auf „Live“ stellt, erscheinen sofort in Spots.'
    : status === 'pending' ? 'Wir prüfen euer Profil, meistens innerhalb von ein bis zwei Tagen. Ihr könnt schon Events vorbereiten.'
    : status === 'rejected' ? 'Wir konnten euren Club noch nicht freigeben. Passt die Angaben an und stellt den Antrag erneut.'
    : status === 'suspended' ? 'Euer Club ist gesperrt und nicht öffentlich. Bitte meldet euch beim Spots-Team.'
    : 'Euer Antrag ist noch nicht gestellt.';
  return <Card tone={tone}>
    <Text style={studioStyles.heading}>{reviewLabels[status]}</Text>
    <ReviewSteps organizer={organizer} />
    <Text style={studioStyles.muted}>{text}</Text>
    {organizer.reviewNote && <Text style={studioStyles.body}>Hinweis vom Spots-Team: {organizer.reviewNote}</Text>}
    {(status === 'rejected' || status === 'draft') && organizer.role === 'owner' && <StudioButton small label="Antrag stellen" loading={busy}
      onPress={() => { setBusy(true); setError(null); submitOrganizer(organizer.id).then(reload, (failure: unknown) => setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.')).finally(() => setBusy(false)); }} />}
    <Message error={error} />
  </Card>;
}

/** Konto ist Veranstalter, aber der Club fehlt (Angaben bei der Registrierung ungültig): hier nachholen. */
function CompleteSignup({ reload }: { reload: () => void }) {
  const [value, setValue] = useState(emptyOrganizerSignup);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    const checked = validateOrganizerSignup(value);
    if ('error' in checked) { setError(checked.error); return; }
    setBusy(true); setError(null);
    try { await registerOrganizer(checked.data); reload(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Hat nicht geklappt.'); }
    finally { setBusy(false); }
  }
  return <StudioPage title="Fast geschafft" subtitle="Ergänzt die Angaben zu eurem Club. Danach prüft das Spots-Team euer Profil.">
    <Card><OrganizerSignupFields value={value} onChange={setValue} editable={!busy} /></Card>
    <Message error={error} />
    <StudioButton label="Club anlegen und Antrag stellen" loading={busy} onPress={() => void save()} />
  </StudioPage>;
}

const longDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const editHref = (id: string) => ({ pathname: '/studio/event/[id]' as const, params: { id } });

/** The one event that matters today: flyer as background, time, status and the two actions. */
function NextEvent({ event, now }: { event: OrganizerEvent; now: number }) {
  const start = new Date(event.startsAt);
  const state = eventState(event);
  const running = Date.parse(event.startsAt) <= now;
  const tonight = dayKey(start) === dayKey(new Date(now));
  return <View style={styles.hero}>
    {event.imageUrl && <Image source={{ uri: event.imageUrl }} resizeMode="cover" blurRadius={18} style={StyleSheet.absoluteFill} />}
    <LinearGradient pointerEvents="none" colors={event.imageUrl ? ['#0a090c4d', '#0a090ccc', '#0a090cf2'] : ['#3a1530', '#1d1020', '#0a090c']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
    <View style={styles.heroBody}>
      <View style={styles.heroTop}>
        <Text style={styles.heroOverline}>{running ? 'Läuft gerade' : tonight ? 'Heute Nacht' : 'Als Nächstes'}</Text>
        <Pill label={state.label} tone={state.tone} />
      </View>
      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text numberOfLines={2} style={styles.heroTitle}>{event.title}</Text>
          <Text style={styles.heroWhen}>{longDay.format(start)} · {timeFormat.format(start)} Uhr</Text>
          {event.venueName && <Text numberOfLines={1} style={styles.heroPlace}>{event.venueName}</Text>}
        </View>
        {event.imageUrl && <Image source={{ uri: event.imageUrl }} resizeMode="cover" style={styles.heroFlyer} accessibilityLabel={`Flyer: ${event.title}`} />}
      </View>
      <View style={styles.heroActions}>
        <View style={studioStyles.flex}><StudioButton small icon="camera" label="Event-Story posten" onPress={() => router.push(editHref(event.id))} /></View>
        <StudioButton small variant="secondary" label="Bearbeiten" onPress={() => router.push(editHref(event.id))} />
      </View>
    </View>
  </View>;
}

/** To-dos from the event data the app already has: missing flyer, ticket link, not live yet. */
function todos(upcoming: OrganizerEvent[], approved: boolean) {
  return upcoming.filter((event) => event.status === 'scheduled').flatMap((event) => [
    !event.imageUrl && { id: `${event.id}-flyer`, event, text: 'Flyer fehlt', hint: 'Mit Flyer fällt das Event viel mehr auf.' },
    !event.ticketUrl && { id: `${event.id}-ticket`, event, text: 'Kein Ticket-Link', hint: 'Gäste finden sonst keinen Weg zu Tickets.' },
    approved && !event.isPublished && { id: `${event.id}-live`, event, text: 'Noch nicht live', hint: 'Als Entwurf sieht es in Spots niemand.' },
  ].filter((item): item is { id: string; event: OrganizerEvent; text: string; hint: string } => !!item)).slice(0, 4);
}

export default function OverviewScreen() {
  const { organizer, events, error, reload } = useStudio();
  const [stats, setStats] = useState<EventStats[] | null>(null);
  const now = useNow();
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStats(organizerId).then((rows) => { if (active) setStats(rows); }).catch(() => { if (active) setStats([]); });
    return () => { active = false; };
  }, [organizerId, events]);

  if (organizer === undefined) {
    return <View style={styles.loading}>{error ? <Message error={error} /> : <ActivityIndicator color={studio.accent} />}</View>;
  }
  if (organizer === null) return <CompleteSignup reload={reload} />;

  const upcoming = events.filter((event) => isUpcoming(event)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const live = upcoming.filter((event) => event.isPublished && event.status === 'scheduled').length;
  const sum = (key: 'views' | 'saves' | 'ticketClicks') => (stats ?? []).reduce((total, row) => total + row[key], 0);
  const approved = organizer.reviewStatus === 'approved';
  const next = upcoming.find((event) => event.status !== 'cancelled');
  const later = upcoming.filter((event) => event.id !== next?.id).slice(0, 3);
  const tasks = todos(upcoming, approved);

  return <StudioPage title={organizer.displayName} subtitle={longDay.format(new Date(now))}
    trailing={<Pressable accessibilityRole="button" accessibilityLabel="Profil öffnen" onPress={() => router.push('/studio/profile')} style={styles.logo}>
      {organizer.avatarUrl ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={`Logo von ${organizer.displayName}`} /> : <Icon name="profile" size={22} color={studio.muted} />}
    </Pressable>}>
    {/* Review progress only until the club is approved. */}
    {!approved && <StatusCard organizer={organizer} reload={reload} />}

    {next
      ? <NextEvent event={next} now={now} />
      : <Card tone="accent">
          <Text style={studioStyles.heading}>Noch kein Event geplant</Text>
          <Text style={studioStyles.muted}>Legt euer erstes Event an.{approved ? '' : ' Bis zur Freigabe bleibt es ein Entwurf.'}</Text>
          <StudioButton label="Event anlegen" icon="calendar" onPress={() => router.push(editHref('new'))} />
        </Card>}

    <View style={studioStyles.row}>
      <Kpi icon="calendar" label="Kommend" value={upcoming.length} hint={`${live} davon live`} />
      <Kpi icon="search" label="Aufrufe" value={stats ? sum('views') : '–'} hint="alle Events" />
      <Kpi icon="heart" label="Gemerkt" value={stats ? sum('saves') : '–'} hint="Merklisten mit Konto" />
      <Kpi icon="ticket" label="Ticket-Klicks" value={stats ? sum('ticketClicks') : '–'} hint="alle Events" />
    </View>

    {tasks.length > 0 && <>
      <SectionTitle>Zu erledigen</SectionTitle>
      <View style={styles.tasks}>{tasks.map((task) => (
        <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`${task.text}: ${task.event.title}. Bearbeiten`} onPress={() => router.push(editHref(task.event.id))}
          style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
          <View style={styles.taskDot} />
          <View style={studioStyles.flex}>
            <Text style={styles.taskTitle}>{task.text} · <Text style={styles.taskEvent}>{task.event.title}</Text></Text>
            <Text style={studioStyles.muted}>{task.hint}</Text>
          </View>
          <Icon name="chevron" size={15} color={studio.faint} />
        </Pressable>
      ))}</View>
    </>}

    {/* Entdecken-Story (SQL 33, Jacint): own card with a clear way in. */}
    <Pressable accessibilityRole="button" accessibilityLabel="Story in Entdecken bearbeiten" onPress={() => router.push('/studio/story')} style={({ pressed }) => [styles.story, pressed && styles.pressed]}>
      <LinearGradient colors={[studio.pink, studio.accentFill[0], '#7a2bd6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storyRing}>
        <View style={styles.storyInner}><Icon name="camera" size={20} color={studio.text} /></View>
      </LinearGradient>
      <View style={studioStyles.flex}>
        <Text style={studioStyles.heading}>Eure Story in Entdecken</Text>
        <Text style={studioStyles.muted}>So sehen Leute in {organizer.city ?? 'eurer Stadt'} euren Club. Eindrücke von vergangenen Events und Vorfreude auf kommende.</Text>
      </View>
      <Icon name="chevron" size={15} color={studio.faint} />
    </Pressable>

    {later.length > 0 && <>
      <SectionTitle action={<StudioButton small variant="ghost" label="Alle Events" onPress={() => router.push('/studio/events')} />}>Danach</SectionTitle>
      {later.map((event) => <EventCard key={event.id} event={event} />)}
    </>}
  </StudioPage>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg, padding: 24 },
  pressed: { opacity: 0.85 },
  logo: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: studio.panelHigh, borderWidth: 1, borderColor: studio.line },
  hero: { borderRadius: studio.radius, overflow: 'hidden', backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.accentLine, ...squircle },
  heroBody: { padding: 18, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroOverline: { ...studioType.label, color: studio.pink },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  heroCopy: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, color: studio.text },
  heroWhen: { ...studioType.body, fontWeight: '600', color: studio.text },
  heroPlace: { ...studioType.small, color: studio.muted },
  heroFlyer: { width: 78, height: 100, borderRadius: 12, backgroundColor: studio.panel },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tasks: { gap: 8 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: studio.radiusSmall, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line },
  taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: studio.amber },
  taskTitle: { ...studioType.body, fontWeight: '700', color: studio.text },
  taskEvent: { fontWeight: '400', color: studio.muted },
  story: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, ...squircle },
  storyRing: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px 2px #ff4ab84d' },
  storyInner: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: studio.line, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  dotDone: { backgroundColor: studio.accent, borderColor: studio.accent },
  dotCurrent: { borderColor: studio.amber },
  dotLabel: { fontSize: 13, fontWeight: '800', color: studio.faint },
  dotLabelDone: { color: studio.onAccent },
  stepLabel: { ...studioType.small, color: studio.faint },
  stepLabelActive: { color: studio.text },
});
