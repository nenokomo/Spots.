import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../../components/Screen';
import { Button, IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../../constants/theme';
import { venueKindLabels, venueReportReasons } from '../../types/venues';
import { useAccountSession } from '../accounts/useAccountSession';
import {
  approveDraft, fetchOpenDrafts, fetchOpenReports, fetchOrganizerQueue, fetchPendingVenues, rejectDraft, resolveReport, reviewOrganizer, setVenueStatus,
  type AdminDraft, type OpenReport, type OrganizerRequest, type OrganizerStatus, type PendingVenue,
} from './adminApi';
import { NewEventSheet } from './NewEventSheet';
import { useIsAdmin } from './useIsAdmin';

type Tab = 'drafts' | 'organizers' | 'venues' | 'reports';
type Data = { drafts: AdminDraft[]; organizers: OrganizerRequest[]; venues: PendingVenue[]; reports: OpenReport[] };
const organizerStatusLabels: Record<OrganizerStatus, string> = { pending: 'Antrag offen', approved: 'Freigegeben', rejected: 'Abgelehnt', suspended: 'Gesperrt' };
const when = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const reasonLabel = (id: string) => venueReportReasons.find((item) => item.id === id)?.label ?? id;

/** Freigaben für das Spots-Team. Sichtbar nur mit Konto und Admin-Rolle; die Datenbank prüft jede Aktion selbst. */
export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const account = useAccountSession();
  const userId = account.session?.user.id ?? null;
  const admin = useIsAdmin(userId);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>('drafts');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const back = () => router.canGoBack() ? router.back() : router.replace('/profile');
  const allowed = admin.allowed;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    Promise.all([fetchOpenDrafts(), fetchOrganizerQueue(), fetchPendingVenues(), fetchOpenReports()])
      .then(([drafts, organizers, venues, reports]) => { if (active) { setData({ drafts, organizers, venues, reports }); setError(null); } })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Laden hat nicht geklappt.'); });
    return () => { active = false; };
  }, [allowed, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try { await action(); reload(); } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Aktion hat nicht geklappt.');
    } finally { setBusy(null); }
  }

  const bar = <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}><IconButton icon="back" accessibilityLabel="Zurück" onPress={back} /></View>;
  if (!allowed) {
    const checking = account.loading || admin.checking;
    return <View style={styles.screen}><Backdrop />{bar}
      <View style={[styles.state, { paddingTop: insets.top + 96 }]}>
        {checking ? <Text style={styles.muted}>Zugang wird geprüft …</Text>
          : <EmptyState icon="profile" title="Nur für das Spots-Team" text={userId ? 'Dein Konto hat keinen Zugang zu den Freigaben.' : 'Melde dich mit deinem Team-Konto an.'}
              action={userId ? undefined : 'Anmelden'} onAction={userId ? undefined : () => router.push('/account')} />}
      </View>
    </View>;
  }

  const counts: Record<Tab, number> = { drafts: data?.drafts.length ?? 0, organizers: data?.organizers.filter((item) => item.status === 'pending').length ?? 0,
    venues: data?.venues.length ?? 0, reports: data?.reports.length ?? 0 };
  const labels: Record<Tab, string> = { drafts: 'Entwürfe', organizers: 'Veranstalter', venues: 'Orte', reports: 'Meldungen' };

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: Math.max(insets.bottom, 16) + space.xl }]}>
      <Text style={styles.eyebrow}>SPOTS-TEAM</Text>
      <Text accessibilityRole="header" style={styles.title}>Freigaben</Text>
      <View style={styles.tabs}>
        {(Object.keys(labels) as Tab[]).map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === item && styles.tabActiveLabel]}>{`${labels[item]} (${counts[item]})`}</Text>
          </Pressable>
        ))}
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!data && !error && <Text style={styles.muted}>Wird geladen …</Text>}

      {data && tab === 'drafts' && <>
        <Button label="Event anlegen" icon="calendar" onPress={() => setFormOpen(true)} />
        {data.drafts.length === 0 && <Text style={styles.muted}>Keine offenen Entwürfe.</Text>}
        {data.drafts.map((draft) => <View key={draft.id} style={styles.card}>
          <Text style={styles.cardTitle}>{draft.title}</Text>
          <Text style={styles.meta}>{when.format(new Date(draft.startsAt))}{draft.venue ? ` · ${draft.venue.name}` : ' · kein Ort'}{draft.genre ? ` · ${draft.genre}` : ''}</Text>
          <Text style={styles.small}>Herkunft: {draft.provenance}</Text>
          {(draft.sourceUrl || draft.ticketUrl) && <Text style={styles.small} numberOfLines={1}>{draft.sourceUrl ?? draft.ticketUrl}</Text>}
          <View style={styles.actions}>
            <Button label="Freigeben" size="sm" onPress={() => void run(draft.id, () => approveDraft(draft.id))} loading={busy === draft.id} disabled={!draft.venue} style={styles.flex} />
            <Button label="Ablehnen" size="sm" variant="secondary" onPress={() => void run(draft.id, () => rejectDraft(draft.id))} disabled={!!busy} style={styles.flex} />
          </View>
        </View>)}
      </>}

      {data && tab === 'organizers' && <>
        <Text style={styles.small}>Einmal prüfen: Gibt es den Club an dieser Adresse wirklich (Website, Instagram, Impressum, kurzer Anruf)? Nach der Freigabe erscheinen seine Events ohne weitere Prüfung. Mail und Telefon nur für Rückfragen nutzen.</Text>
        {data.organizers.length === 0 && <Text style={styles.muted}>Keine Anträge.</Text>}
        {data.organizers.map((item) => <View key={item.id} style={styles.card}>
          <View style={styles.organizerHead}>
            {item.avatarUrl && <Image source={{ uri: item.avatarUrl }} accessibilityLabel={`Logo von ${item.displayName}`} style={styles.logo} />}
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{item.displayName}</Text>
              <Text style={styles.meta}>{[organizerStatusLabels[item.status], `${item.eventCount} Events`, item.emailConfirmed ? 'E-Mail bestätigt' : 'E-Mail noch nicht bestätigt'].join(' · ')}</Text>
            </View>
          </View>
          {item.address && <Text style={styles.small}>Adresse: {item.address}</Text>}
          {item.biography && <Text style={styles.small} numberOfLines={4}>{item.biography}</Text>}
          {item.websiteUrl && <Text style={styles.small} numberOfLines={1}>Website: {item.websiteUrl}</Text>}
          {item.socialUrl && <Text style={styles.small} numberOfLines={1}>Social Media: {item.socialUrl}</Text>}
          {(item.contactName || item.phone) && <Text style={styles.small}>Ansprechperson: {[item.contactName, item.phone].filter(Boolean).join(' · ')}</Text>}
          {item.ownerEmail && <Text style={styles.small} numberOfLines={1}>E-Mail: {item.ownerEmail}</Text>}
          {item.submittedAt && <Text style={styles.small}>Antrag vom {when.format(new Date(item.submittedAt))}</Text>}
          {item.note && <Text style={styles.small}>Hinweis: {item.note}</Text>}
          {(item.status === 'pending' || item.status === 'approved') && <TextInput value={notes[item.id] ?? ''} onChangeText={(text) => setNotes((all) => ({ ...all, [item.id]: text }))}
            placeholder={item.status === 'pending' ? 'Begründung bei Ablehnung (sieht der Veranstalter)' : 'Grund für die Sperre (sieht der Veranstalter)'}
            placeholderTextColor={colors.faint} accessibilityLabel="Hinweis an den Veranstalter" maxLength={500} style={styles.note} />}
          <View style={styles.actions}>
            {item.status === 'pending' && <>
              <Button label="Freigeben" size="sm" onPress={() => void run(item.id, () => reviewOrganizer(item.id, 'approved'))} loading={busy === item.id} style={styles.flex} />
              <Button label="Ablehnen" size="sm" variant="secondary" onPress={() => void run(item.id, () => reviewOrganizer(item.id, 'rejected', notes[item.id]))} disabled={!!busy} style={styles.flex} />
            </>}
            {item.status === 'approved' && <Button label="Sperren" size="sm" variant="secondary" onPress={() => void run(item.id, () => reviewOrganizer(item.id, 'suspended', notes[item.id]))} loading={busy === item.id} style={styles.flex} />}
            {item.status === 'suspended' && <Button label="Sperre aufheben" size="sm" onPress={() => void run(item.id, () => reviewOrganizer(item.id, 'approved'))} loading={busy === item.id} style={styles.flex} />}
          </View>
        </View>)}
      </>}

      {data && tab === 'venues' && <>
        <Text style={styles.small}>Ungeprüfte Orte aus OpenStreetMap (z. B. Eventlocations ohne Website). Freigeben nur, wenn der Ort echt und passend ist.</Text>
        {data.venues.length === 0 && <Text style={styles.muted}>Keine Orte zu prüfen.</Text>}
        {data.venues.map((venue) => <View key={venue.id} style={styles.card}>
          <Text style={styles.cardTitle}>{venue.name}</Text>
          <Text style={styles.meta}>{[venueKindLabels[venue.kind], venue.city].filter(Boolean).join(' · ')}</Text>
          {venue.website && <Text style={styles.small} numberOfLines={1}>{venue.website}</Text>}
          <View style={styles.actions}>
            <Button label="Freigeben" size="sm" onPress={() => void run(venue.id, () => setVenueStatus(venue.id, 'approved'))} loading={busy === venue.id} style={styles.flex} />
            <Button label="Ausblenden" size="sm" variant="secondary" onPress={() => void run(venue.id, () => setVenueStatus(venue.id, 'hidden'))} disabled={!!busy} style={styles.flex} />
          </View>
        </View>)}
      </>}

      {data && tab === 'reports' && <>
        {data.reports.length === 0 && <Text style={styles.muted}>Keine offenen Meldungen.</Text>}
        {data.reports.map((report) => <View key={report.id} style={styles.card}>
          <Text style={styles.cardTitle}>{report.venue?.name ?? 'Unbekannter Ort'}</Text>
          <Text style={styles.meta}>{reasonLabel(report.reason)} · {when.format(new Date(report.createdAt))}</Text>
          {report.note && <Text style={styles.small}>„{report.note}“</Text>}
          <View style={styles.actions}>
            <Button label="Erledigt" size="sm" onPress={() => void run(report.id, () => resolveReport(report.id, 'resolved'))} loading={busy === report.id} style={styles.flex} />
            <Button label="Verwerfen" size="sm" variant="secondary" onPress={() => void run(report.id, () => resolveReport(report.id, 'dismissed'))} disabled={!!busy} style={styles.flex} />
          </View>
          {report.venue && <Button label="Ort ausblenden und erledigen" size="sm" variant="ghost" disabled={!!busy}
            onPress={() => void run(report.id, async () => { await setVenueStatus(report.venue!.id, 'hidden'); await resolveReport(report.id, 'resolved'); })} />}
        </View>)}
      </>}
    </ScrollView>
    {bar}
    <NewEventSheet visible={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.lg },
  state: { flex: 1, paddingHorizontal: gutter },
  content: { paddingHorizontal: gutter, gap: space.md },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5 },
  title: { ...type.largeTitle, fontSize: 34, lineHeight: 40, color: colors.text, marginTop: -space.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tab: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.text },
  tabLabel: { ...type.footnote, color: colors.muted },
  tabActiveLabel: { color: colors.background, fontWeight: '600' },
  card: { gap: space.xs, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, ...squircle },
  cardTitle: { ...type.headline, color: colors.text },
  meta: { ...type.footnote, color: colors.muted },
  small: { ...type.caption, color: colors.faint },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  flex: { flex: 1 },
  organizerHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  note: { ...type.footnote, color: colors.text, minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, marginTop: space.sm },
  muted: { ...type.body, color: colors.muted },
  error: { ...type.footnote, color: colors.danger },
});
