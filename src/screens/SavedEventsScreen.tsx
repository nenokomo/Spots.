import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { SaveEventButton } from '../components/SaveEventButton';
import { Screen } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState, LargeHeader } from '../components/ui/Section';
import { tabBarContentInset } from '../constants/navigation';
import { colors, gutter, space, type } from '../constants/theme';
import { useSavedEventDetails } from '../hooks/useEvents';
import { useNow } from '../hooks/useNow';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';

type Section = { key: 'upcoming' | 'past'; title: string; data: SpotEvent[] };

export default function SavedEventsScreen() {
  const { ids, ready, busy, error, reload } = useSavedEvents();
  const remote = useSavedEventDetails(ids);
  const insets = useSafeAreaInsets();
  const today = useToday();
  const now = useNow();

  const saved = useMemo(() => ids.flatMap((id) => remote.events.find((item) => item.id === id) ?? []), [ids, remote.events]);
  const sections = useMemo<Section[]>(() => {
    // Next first: running and upcoming by start time; past ones most recent first.
    const upcoming = saved.filter((event) => eventPhase(event, now) !== 'ended').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const past = saved.filter((event) => eventPhase(event, now) === 'ended').sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    return [
      ...(upcoming.length ? [{ key: 'upcoming' as const, title: 'Anstehend', data: upcoming }] : []),
      ...(past.length ? [{ key: 'past' as const, title: 'Vergangen', data: past }] : []),
    ];
  }, [saved, now]);
  const missing = ready && !remote.loading && !remote.error ? ids.length - saved.length : 0;

  return <Screen>
    <SectionList
      sections={ready ? sections : []}
      keyExtractor={(event) => event.id}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.list, { paddingBottom: tabBarContentInset(insets.bottom) }]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={styles.section}>{section.title}</Text>}
      renderItem={({ item }) => <View style={styles.row}><EventRow event={item} href={eventHref(item, 'saved')} now={now} today={today} trailing={<SaveEventButton id={item.id} title={item.title} size={36} />} /></View>}
      ListHeaderComponent={<View>
        <LargeHeader overline={ready && saved.length > 0 ? `${saved.length} ${saved.length === 1 ? 'Event' : 'Events'}` : undefined} title="Gemerkt" trailing={<IconButton icon="profile" accessibilityLabel="Profil öffnen" onPress={() => router.push('/profile')} size={36} plain style={styles.profile} />} />
        {error && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.note}>{error}</Text><Button label="Erneut versuchen" variant="ghost" size="sm" onPress={reload} disabled={busy} /></View>}
        <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
        {missing > 0 && <Text style={[styles.note, styles.missing]}>{missing === 1 ? 'Ein gemerktes Event ist' : `${missing} gemerkte Events sind`} nicht mehr veröffentlicht, zum Beispiel weil sie abgesagt wurden.</Text>}
      </View>}
      ListEmptyComponent={remote.loading || remote.error ? undefined : !ready
        ? <View style={styles.loading}>{busy && <ActivityIndicator color={colors.faint} />}<Text style={styles.note}>{busy ? 'Deine Merkliste wird geladen …' : 'Deine Merkliste ist gerade nicht verfügbar.'}</Text></View>
        : <EmptyState icon="heart" title="Noch nichts gemerkt" text="Tippe bei einem Event auf das Herz. Hier findest du es wieder, sortiert nach Datum. Gespeichert wird nur auf diesem Gerät." action="Events entdecken" onAction={() => router.navigate('/explore')} />}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
  profile: { backgroundColor: colors.surface, marginBottom: 4 },
  section: { ...type.title3, color: colors.text, paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.xxs },
  row: { paddingHorizontal: gutter },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: gutter + 68 + space.md },
  note: { ...type.footnote, color: colors.faint },
  missing: { paddingHorizontal: gutter, paddingTop: space.sm },
  notice: { marginHorizontal: gutter, padding: space.md, borderRadius: 14, backgroundColor: colors.surface, gap: space.xs },
  loading: { alignItems: 'center', gap: space.md, paddingTop: space.xxxl },
});
