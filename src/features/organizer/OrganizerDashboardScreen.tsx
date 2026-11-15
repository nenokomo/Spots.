import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../../components/Screen';
import { Button, IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Section';
import { colors, gutter, radius, space, type } from '../../constants/theme';
import { useAccountSession } from '../accounts/useAccountSession';
import { Field, formStyles, httpsOrNull } from './formParts';
import { ImageField } from './ImageField';
import {
  fetchEventStats, fetchMyOrganizer, fetchOrganizerEvents, reviewLabels, submitOrganizer, updateOrganizerProfile, withdrawOrganizer,
  type EventStats, type MyOrganizer, type OrganizerEvent,
} from './organizerApi';
import { OrganizerEventSheet } from './OrganizerEventSheet';

type Tab = 'profile' | 'events' | 'stats';
const tabLabels: Record<Tab, string> = { profile: 'Profil', events: 'Events', stats: 'Statistik' };
const when = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const eventState = (event: OrganizerEvent) => event.status === 'cancelled' ? 'Abgesagt' : event.status === 'postponed' ? 'Verschoben' : event.isPublished ? 'Öffentlich' : 'Entwurf';

/** /dashboard/[id]: Profil, Events und Statistik eines Veranstalters. Die Datenbank prüft jede Aktion selbst. */
export default function OrganizerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccountSession();
  const userId = account.session?.user.id ?? null;
  const [organizer, setOrganizer] = useState<MyOrganizer | null | undefined>(undefined);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [stats, setStats] = useState<EventStats[] | null>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OrganizerEvent | 'new' | null>(null);
  // Profilformular
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [biography, setBiography] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const back = () => router.canGoBack() ? router.back() : router.replace('/dashboard');
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId || !id) return;
    let active = true;
    Promise.all([fetchMyOrganizer(id), fetchOrganizerEvents(id)]).then(([found, list]) => {
      if (!active) return;
      setOrganizer(found);
      setEvents(list);
      if (found) {
        setDisplayName(found.displayName); setCity(found.city ?? ''); setBiography(found.biography ?? '');
        setWebsiteUrl(found.websiteUrl ?? ''); setAvatarUrl(found.avatarUrl);
      }
      setError(null);
    }).catch((failure: unknown) => { if (active) { setOrganizer(null); setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); } });
    return () => { active = false; };
  }, [userId, id, revision]);

  useEffect(() => {
    if (tab !== 'stats' || !id || !organizer) return;
    let active = true;
    fetchEventStats(id).then((rows) => { if (active) setStats(rows); })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
    return () => { active = false; };
  }, [tab, id, organizer, revision]);

  async function run(task: () => Promise<void>, done: string) {
    setBusy(true); setError(null); setMessage(null);
    try { await task(); setMessage(done); reload(); } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Aktion hat nicht geklappt.');
    } finally { setBusy(false); }
  }

  async function saveProfile(): Promise<void> {
    const website = httpsOrNull(websiteUrl);
    if (displayName.trim().length < 1) throw new Error('Bitte einen Namen eingeben.');
    if (website === 'invalid') throw new Error('Die Website muss mit https:// beginnen.');
    await updateOrganizerProfile(id!, { displayName, city: city || null, biography: biography || null, websiteUrl: website, avatarUrl });
  }

  const bar = <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}><IconButton icon="back" accessibilityLabel="Zurück" onPress={back} /></View>;
  if (!userId || organizer === null || organizer === undefined) {
    return <View style={styles.screen}><Backdrop />{bar}
      <View style={[styles.state, { paddingTop: insets.top + 96 }]}>
        {account.loading || (userId && organizer === undefined && !error) ? <Text style={styles.muted}>Wird geladen …</Text>
          : <EmptyState icon="calendar" title="Nicht verfügbar" text={error ?? (userId ? 'Diesen Veranstalter gibt es nicht oder du gehörst nicht zum Team.' : 'Bitte melde dich an.')}
              action={userId ? 'Zurück' : 'Anmelden'} onAction={userId ? back : () => router.push('/account')} />}
      </View>
    </View>;
  }

  const owner = organizer.role === 'owner';
  const approved = organizer.reviewStatus === 'approved';
  const canSubmit = owner && (organizer.reviewStatus === 'draft' || organizer.reviewStatus === 'rejected');

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: Math.max(insets.bottom, 16) + space.xl }]}>
      <Text style={styles.eyebrow}>VERANSTALTER</Text>
      <Text accessibilityRole="header" style={styles.title}>{organizer.displayName}</Text>

      <View style={[formStyles.card, approved ? styles.okCard : organizer.reviewStatus === 'rejected' || organizer.reviewStatus === 'suspended' ? styles.warnCard : null]}>
        <Text style={formStyles.cardTitle}>{reviewLabels[organizer.reviewStatus]}</Text>
        <Text style={formStyles.hint}>{
          approved ? 'Dein Profil ist öffentlich. Events, die du auf „Öffentlich“ stellst, erscheinen sofort.'
          : organizer.reviewStatus === 'pending' ? 'Das Spots-Team prüft dein Profil. Du kannst schon Events als Entwurf anlegen.'
          : organizer.reviewStatus === 'rejected' ? 'Das Spots-Team hat den Antrag abgelehnt. Passe dein Profil an und stelle ihn erneut.'
          : organizer.reviewStatus === 'suspended' ? 'Dein Profil ist gesperrt und nicht öffentlich. Bitte melde dich beim Spots-Team.'
          : 'Ergänze dein Profil und stelle dann den Antrag. Bis zur Freigabe ist nichts öffentlich.'}</Text>
        {organizer.reviewNote && <Text style={formStyles.meta}>Hinweis vom Spots-Team: {organizer.reviewNote}</Text>}
        {canSubmit && <Button label="Antrag stellen" size="sm" disabled={busy} onPress={() => void run(async () => {
          await saveProfile();
          await submitOrganizer(organizer.id);
        }, 'Antrag gestellt. Wir melden uns per E-Mail.')} />}
        {owner && organizer.reviewStatus === 'pending' && <Button label="Antrag zurückziehen" size="sm" variant="ghost" disabled={busy}
          onPress={() => void run(() => withdrawOrganizer(organizer.id), 'Antrag zurückgezogen.')} />}
        {approved && <Button label="Öffentliche Seite ansehen" size="sm" variant="ghost" onPress={() => router.push({ pathname: '/organizer/[id]', params: { id: organizer.id } })} />}
      </View>

      <View style={styles.tabs}>
        {(Object.keys(tabLabels) as Tab[]).map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === item && styles.tabActiveLabel]}>{tabLabels[item]}</Text>
          </Pressable>
        ))}
      </View>
      {error && <Text accessibilityRole="alert" style={formStyles.error}>{error}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={formStyles.hint}>{message}</Text>}

      {tab === 'profile' && <View style={styles.section}>
        <Field label="Name" value={displayName} onChange={setDisplayName} maxLength={120} editable={!busy} />
        <Field label="Stadt" value={city} onChange={setCity} placeholder="z. B. Karlsruhe" maxLength={120} editable={!busy} />
        <Field label="Über euch" value={biography} onChange={setBiography} placeholder="Was macht ihr, welche Musik, seit wann?" multiline maxLength={5000} editable={!busy} />
        <Field label="Website" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://…" keyboard="url" maxLength={500} editable={!busy} />
        <ImageField label="Logo" organizerId={organizer.id} kind="logo" value={avatarUrl} onChange={setAvatarUrl} disabled={busy} />
        <Button label="Profil speichern" loading={busy} onPress={() => void run(saveProfile, 'Profil gespeichert.')} />
      </View>}

      {tab === 'events' && <View style={styles.section}>
        <Button label="Event anlegen" icon="calendar" onPress={() => setEditing('new')} />
        {!approved && <Text style={formStyles.hint}>Bis zur Freigabe bleiben alle Events Entwürfe.</Text>}
        {events.length === 0 && <Text style={styles.muted}>Noch keine Events.</Text>}
        {events.map((event) => <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`${event.title} bearbeiten`} onPress={() => setEditing(event)} style={formStyles.card}>
          <Text style={formStyles.cardTitle}>{event.title}</Text>
          <Text style={formStyles.meta}>{when.format(new Date(event.startsAt))}{event.venueName ? ` · ${event.venueName}` : ''}</Text>
          <Text style={[formStyles.meta, event.isPublished && styles.live]}>{eventState(event)}</Text>
        </Pressable>)}
      </View>}

      {tab === 'stats' && <View style={styles.section}>
        <Text style={formStyles.hint}>Nur Summen, nichts über einzelne Personen. Aufrufe und Ticket-Klicks zählen pro Gerät höchstens einmal am Tag. „Gemerkt“ zählt Merklisten mit Konto.</Text>
        {!stats && !error && <Text style={styles.muted}>Wird geladen …</Text>}
        {stats && stats.length === 0 && <Text style={styles.muted}>Noch keine Events.</Text>}
        {stats?.map((row) => <View key={row.eventId} style={formStyles.card}>
          <Text style={formStyles.cardTitle}>{row.title}</Text>
          <Text style={formStyles.meta}>{when.format(new Date(row.startsAt))}</Text>
          <View style={styles.numbers}>
            {([['Aufrufe', row.views], ['Gemerkt', row.saves], ['Ticket-Klicks', row.ticketClicks], ['Snaps', row.snaps]] as const).map(([label, value]) => (
              <View key={label} style={styles.number}><Text style={styles.numberValue}>{value}</Text><Text style={formStyles.meta}>{label}</Text></View>
            ))}
          </View>
        </View>)}
      </View>}
    </ScrollView>
    {bar}
    {editing && <OrganizerEventSheet key={editing === 'new' ? 'new' : editing.id} visible organizerId={organizer.id} approved={approved}
      event={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setMessage('Event gespeichert.'); reload(); }} />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.lg },
  state: { flex: 1, paddingHorizontal: gutter },
  content: { paddingHorizontal: gutter, gap: space.lg, maxWidth: 720, width: '100%', alignSelf: 'center' },
  section: { gap: space.lg },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5 },
  title: { ...type.largeTitle, fontSize: 34, lineHeight: 40, color: colors.text, marginTop: -space.sm },
  muted: { ...type.body, color: colors.muted },
  okCard: { borderWidth: 1, borderColor: colors.accentLine },
  warnCard: { borderWidth: 1, borderColor: colors.danger },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tab: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.text },
  tabLabel: { ...type.footnote, color: colors.muted },
  tabActiveLabel: { color: colors.background, fontWeight: '600' },
  live: { color: colors.pink },
  numbers: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginTop: space.sm },
  number: { minWidth: 72 },
  numberValue: { ...type.headline, color: colors.text },
});
