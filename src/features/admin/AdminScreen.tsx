import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../../components/Screen';
import { Button, IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../../constants/theme';
import { venueKindLabels, venueReportReasons } from '../../types/venues';
import { useAccountSession } from '../accounts/useAccountSession';
import {
  approveDraft, fetchOpenDrafts, fetchOpenReports, fetchPendingVenues, rejectDraft, resolveReport, setVenueStatus,
  type AdminDraft, type OpenReport, type PendingVenue,
} from './adminApi';
import { NewEventSheet } from './NewEventSheet';
import { useIsAdmin } from './useIsAdmin';

type Tab = 'drafts' | 'venues' | 'reports';
type Data = { drafts: AdminDraft[]; venues: PendingVenue[]; reports: OpenReport[] };
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
  const back = () => router.canGoBack() ? router.back() : router.replace('/profile');
  const allowed = admin.allowed;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    Promise.all([fetchOpenDrafts(), fetchPendingVenues(), fetchOpenReports()])
      .then(([drafts, venues, reports]) => { if (active) { setData({ drafts, venues, reports }); setError(null); } })
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

  const counts: Record<Tab, number> = { drafts: data?.drafts.length ?? 0, venues: data?.venues.length ?? 0, reports: data?.reports.length ?? 0 };
  const labels: Record<Tab, string> = { drafts: 'Entwürfe', venues: 'Orte', reports: 'Meldungen' };

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
  muted: { ...type.body, color: colors.muted },
  error: { ...type.footnote, color: colors.danger },
});
