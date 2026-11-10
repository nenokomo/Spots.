import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Screen } from '../components/Screen';
import { Button } from '../components/ui/Button';
import { EmptyState, PageHeader } from '../components/ui/Section';
import { tabBarContentInset } from '../constants/navigation';
import { colors, radius, space, type } from '../constants/theme';
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
  const [search, setSearch] = useState('');

  const saved = useMemo(() => ids.flatMap((id) => remote.events.find((item) => item.id === id) ?? []), [ids, remote.events]);
  const sections = useMemo<Section[]>(() => {
    const query = search.trim().toLocaleLowerCase('de');
    const matches = saved.filter((event) => `${event.title} ${event.location} ${event.venue ?? ''} ${event.categories.join(' ')} ${event.genres?.join(' ') ?? ''}`.toLocaleLowerCase('de').includes(query));
    // Next first: running and upcoming by start time; past ones most recent first.
    const upcoming = matches.filter((event) => eventPhase(event, now) !== 'ended').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const past = matches.filter((event) => eventPhase(event, now) === 'ended').sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    return [
      ...(upcoming.length ? [{ key: 'upcoming' as const, title: 'Anstehend', data: upcoming }] : []),
      ...(past.length ? [{ key: 'past' as const, title: 'Vergangen', data: past }] : []),
    ];
  }, [saved, search, now]);
  const missing = ready && !remote.loading && !remote.error ? ids.length - saved.length : 0;

  return <Screen>
    <SectionList
      sections={ready ? sections : []}
      keyExtractor={(event) => event.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.list, { paddingBottom: tabBarContentInset(insets.bottom) }]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.count}>{section.data.length}</Text></View>}
      renderItem={({ item }) => <EventRow event={item} href={eventHref(item, 'saved')} now={now} today={today} trailing={<SaveEventButton id={item.id} title={item.title} />} />}
      ListHeaderComponent={<View>
        <PageHeader section="DEINE AUSWAHL" title="Gemerkt" subtitle={ready && saved.length > 0 ? `${saved.length} ${saved.length === 1 ? 'Event' : 'Events'} · nur auf diesem Gerät gespeichert` : 'Gute Nächte beginnen mit einem Plan.'} />
        {ready && saved.length > 3 && <View style={styles.search}><Icon name="search" size={17} /><TextInput value={search} onChangeText={setSearch} accessibilityLabel="Gemerkte Events durchsuchen" placeholder="In deiner Merkliste suchen" placeholderTextColor="#9f90a4" style={styles.input} autoCorrect={false} returnKeyType="search" />{search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} style={styles.clear}><Icon name="close" size={16} /></Pressable>}</View>}
        {error && <View style={styles.error}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text><Button label="Erneut versuchen" variant="ghost" size="sm" onPress={reload} disabled={busy} /></View>}
        <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
        {missing > 0 && <Text style={styles.note}>{missing === 1 ? 'Ein gemerktes Event ist' : `${missing} gemerkte Events sind`} nicht mehr veröffentlicht, zum Beispiel weil sie abgesagt wurden.</Text>}
      </View>}
      ListEmptyComponent={remote.loading || remote.error ? undefined : !ready
        ? <View style={styles.loading}>{busy && <ActivityIndicator color={colors.pink} />}<Text style={styles.note}>{busy ? 'Deine Merkliste wird geladen …' : 'Deine Merkliste ist gerade nicht verfügbar.'}</Text></View>
        : saved.length > 0
          ? <EmptyState icon="search" title="Kein Treffer" text="Suche nach einem anderen Namen, Ort oder Genre." action="Suche zurücksetzen" onAction={() => setSearch('')} />
          : <EmptyState icon="heart" title="Deine nächste Nacht wartet" text="Tippe bei einem Event auf das Herz. Hier findest du alles wieder, sortiert nach Datum." action="Events entdecken" onAction={() => router.navigate('/explore')} />}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingHorizontal: space.lg + 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: '#1b1521', marginBottom: space.xs },
  input: { flex: 1, minWidth: 0, minHeight: 46, color: colors.text, fontSize: 14 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: space.xl, paddingBottom: space.md },
  sectionTitle: { ...type.headline, color: colors.text },
  count: { ...type.caption, color: colors.faint },
  separator: { height: space.sm },
  note: { ...type.caption, fontSize: 11, color: colors.faint, marginTop: space.sm },
  loading: { alignItems: 'center', gap: space.md, paddingTop: space.xxl },
  error: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.accentSoft, marginBottom: space.md },
  errorText: { ...type.caption, color: colors.muted },
});
