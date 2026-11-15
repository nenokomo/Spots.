import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fetchEventStats, registerOrganizer, reviewLabels, submitOrganizer, type EventStats, type MyOrganizer } from '../organizer/organizerApi';
import { emptyOrganizerSignup, validateOrganizerSignup } from '../organizer/signup';
import { EventCard } from './EventCard';
import { isUpcoming } from './format';
import { OrganizerSignupFields } from './OrganizerSignupFields';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';
import { Card, Kpi, Message, SectionTitle, StudioButton, StudioPage, studioStyles } from './ui';

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

export default function OverviewScreen() {
  const { organizer, events, error, reload } = useStudio();
  const [stats, setStats] = useState<EventStats[] | null>(null);
  const organizerId = organizer?.id;

  useEffect(() => {
    if (!organizerId) return;
    let active = true;
    fetchEventStats(organizerId).then((rows) => { if (active) setStats(rows); }).catch(() => { if (active) setStats([]); });
    return () => { active = false; };
  }, [organizerId, events]);

  if (organizer === undefined) {
    return <View style={styles.loading}>{error ? <Message error={error} /> : <ActivityIndicator color={studio.lime} />}</View>;
  }
  if (organizer === null) return <CompleteSignup reload={reload} />;

  const upcoming = events.filter((event) => isUpcoming(event)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const live = upcoming.filter((event) => event.isPublished && event.status === 'scheduled').length;
  const sum = (key: 'views' | 'saves' | 'ticketClicks') => (stats ?? []).reduce((total, row) => total + row[key], 0);

  return <StudioPage title={organizer.displayName} subtitle={[organizer.street && `${organizer.street} ${organizer.houseNumber ?? ''}`.trim(), organizer.city].filter(Boolean).join(', ')}>
    <StatusCard organizer={organizer} reload={reload} />
    <View style={studioStyles.row}>
      <Kpi label="Kommende Events" value={upcoming.length} hint={`${live} davon live`} />
      <Kpi label="Aufrufe" value={stats ? sum('views') : '–'} hint="alle Events" />
      <Kpi label="Gemerkt" value={stats ? sum('saves') : '–'} hint="Merklisten mit Konto" />
      <Kpi label="Ticket-Klicks" value={stats ? sum('ticketClicks') : '–'} hint="alle Events" />
    </View>
    <SectionTitle action={<StudioButton small variant="ghost" icon="calendar" label="Neues Event" onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: 'new' } })} />}>Als Nächstes</SectionTitle>
    {upcoming.length === 0 && <Card>
      <Text style={studioStyles.heading}>Noch kein Event geplant</Text>
      <Text style={studioStyles.muted}>Legt euer erstes Event an. Bis zur Freigabe bleibt es ein Entwurf.</Text>
      <StudioButton label="Event anlegen" icon="calendar" onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: 'new' } })} />
    </Card>}
    {upcoming.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}
  </StudioPage>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg, padding: 24 },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: studio.line, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
  dotDone: { backgroundColor: studio.lime, borderColor: studio.lime },
  dotCurrent: { borderColor: studio.amber },
  dotLabel: { fontSize: 13, fontWeight: '800', color: studio.faint },
  dotLabelDone: { color: studio.limeInk },
  stepLabel: { ...studioType.small, color: studio.faint },
  stepLabelActive: { color: studio.text },
});
