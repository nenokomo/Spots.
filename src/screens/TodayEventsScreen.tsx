import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { RadiusSlider } from '../components/RadiusSlider';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Section';
import { Sheet } from '../components/ui/Sheet';
import { categories, colors, gutter, space, type, type Category } from '../constants/theme';
import { useLiveEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useNow } from '../hooks/useNow';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import { isLocatedEvent, matchesCategory, type LocatedEvent } from '../types/events';
import { isTonight } from '../utils/eventStatus';
import { distanceKm } from '../utils/events';

function coordinate(value: string | undefined, fallback: number, limit: number) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : fallback;
}

/** Sub page of the radar: every event the radar shows tonight, same centre, same filters. */
export default function TodayEventsScreen() {
  const params = useLocalSearchParams<{ category?: string; radius?: string; latitude?: string; longitude?: string }>();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const today = useToday();
  const live = useLiveEvents();
  const upcoming = useUpcomingEvents();
  const [filterOpen, setFilterOpen] = useState(false);
  const category: Category = categories.includes(params.category as Category) ? params.category as Category : 'Alle';
  const radius = Math.max(10, Math.min(50, Number(params.radius) || 30));
  const center = { latitude: coordinate(params.latitude, 52.52, 90), longitude: coordinate(params.longitude, 13.405, 180) };

  const { events, liveCount } = useMemo(() => {
    const inReach = (event: LocatedEvent) => matchesCategory(event, category) && distanceKm(center, event.coordinate) <= radius;
    const running = live.events.filter(inReach);
    const later = upcoming.events.filter((event): event is LocatedEvent => isLocatedEvent(event) && isTonight(event, now) && inReach(event))
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    return { events: [...running, ...later], liveCount: running.length };
  }, [live.events, upcoming.events, category, center.latitude, center.longitude, radius, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = live.loading || upcoming.loading;
  const error = live.error ?? upcoming.error;
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <View style={styles.screen}>
      <Backdrop />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon="back" accessibilityLabel="Zurück zum Radar" onPress={back} />
        <IconButton icon="sliders" accessibilityLabel="Filter" onPress={() => setFilterOpen(true)} />
      </View>
      <FlatList
        data={events}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => <View style={styles.row}><EventRow event={item} href={eventHref(item, 'radar')} now={now} today={today} distanceKm={distanceKm(center, item.coordinate)} trailing={<SaveEventButton id={item.id} title={item.title} size={36} />} /></View>}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + space.xl }}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => { live.reload(); upcoming.reload(); }}
        ListHeaderComponent={<View style={styles.heading}>
          <Text style={styles.eyebrow}>RADAR · {radius} KM</Text>
          <Text accessibilityRole="header" style={styles.title}>Heute Nacht</Text>
          <Text style={styles.subtitle}>{[liveCount > 0 ? `${liveCount} live` : null, events.length - liveCount > 0 ? `${events.length - liveCount} später` : null, category !== 'Alle' ? category : null].filter(Boolean).join(' · ') || 'Alles, was der Radar gerade findet'}</Text>
          <EventDataState loading={loading} error={error} onRetry={() => { live.reload(); upcoming.reload(); }} />
        </View>}
        ListEmptyComponent={loading || error ? undefined : <EmptyState icon="radar" title="Deine Nacht ist noch offen" text="In diesem Umkreis ist heute nichts bestätigt. Probiere ein anderes Genre oder einen größeren Umkreis." />}
      />
      <Sheet visible={filterOpen} title="Filter" onClose={() => setFilterOpen(false)}>
        <View style={styles.group}><Text style={styles.label}>Worauf hast du Lust?</Text><CategoryFilters value={category} onChange={(item) => router.setParams({ category: item })} /></View>
        <View style={styles.group}><Text style={styles.label}>Umkreis</Text><RadiusSlider value={radius} onChange={(value) => router.setParams({ radius: String(value) })} /></View>
        <Button label="Fertig" onPress={() => setFilterOpen(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  heading: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.md },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5, marginBottom: space.xs },
  title: { ...type.largeTitle, color: colors.text },
  subtitle: { ...type.callout, color: colors.muted, marginTop: space.xxs },
  row: { paddingHorizontal: gutter },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: gutter + 68 + space.md },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
});
