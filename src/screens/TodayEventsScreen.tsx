import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { RadiusSlider } from '../components/RadiusSlider';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { EmptyState } from '../components/ui/Section';
import { Sheet } from '../components/ui/Sheet';
import { categories, colors, gutter, radius as corner, space, squircle, type, type Category } from '../constants/theme';
import { useLiveEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useNow } from '../hooks/useNow';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import { isLocatedEvent, matchesCategory, type LocatedEvent } from '../types/events';
import { isTonight } from '../utils/eventStatus';
import { distanceKm, eventTimeLabel } from '../utils/events';

type Row = { kind: 'heading'; title: string; note?: string } | { kind: 'live'; event: LocatedEvent } | { kind: 'later'; event: LocatedEvent };

function coordinate(value: string | undefined, fallback: number, limit: number) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : fallback;
}
const km = (value: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} km`;

/** Running event as a wide poster: artwork left, live state and the "until" time right. */
function LiveCard({ event, distance, today, now }: { event: LocatedEvent; distance: number; today: string; now: number }) {
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, läuft jetzt, ${event.location}, öffnen`} onPress={() => router.push(eventHref(event, 'radar', now))} style={styles.liveCard}>
      <Image source={event.image} resizeMode="cover" blurRadius={30} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.liveDim]} />
      <Image source={event.image} resizeMode="cover" style={styles.liveArt} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`} />
      <View style={styles.liveBody}>
        <View style={styles.liveState}><View style={styles.liveDot} /><Text style={styles.liveLabel}>LIVE{event.endsAt ? ` · BIS ${eventTimeLabel(event.endsAt)}` : ''}</Text></View>
        <Text numberOfLines={2} style={styles.liveTitle}>{event.title}</Text>
        <Text numberOfLines={1} style={styles.livePlace}>{event.venue ?? event.location} · {km(distance)}</Text>
        {(event.genres?.length ?? 0) > 0 && <Text numberOfLines={1} style={styles.liveGenre}>{event.genres!.slice(0, 2).join(' · ')}</Text>}
      </View>
      <SaveEventButton id={event.id} title={event.title} overlay size={36} />
    </PressableScale>
  );
}

/** Sub page of the radar: every event the radar shows tonight, same centre, same filters. */
export default function TodayEventsScreen() {
  const params = useLocalSearchParams<{ category?: string; radius?: string; latitude?: string; longitude?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow();
  const today = useToday();
  const live = useLiveEvents();
  const upcoming = useUpcomingEvents();
  const [filterOpen, setFilterOpen] = useState(false);
  const category: Category = categories.includes(params.category as Category) ? params.category as Category : 'Alle';
  const radius = Math.max(10, Math.min(50, Number(params.radius) || 30));
  const latitude = coordinate(params.latitude, 52.52, 90);
  const longitude = coordinate(params.longitude, 13.405, 180);

  const { running, later, distances } = useMemo(() => {
    const center = { latitude, longitude };
    const inReach = (event: LocatedEvent) => matchesCategory(event, category) && distanceKm(center, event.coordinate) <= radius;
    const running = live.events.filter(inReach).sort((a, b) => distanceKm(center, a.coordinate) - distanceKm(center, b.coordinate));
    const later = upcoming.events.filter((event): event is LocatedEvent => isLocatedEvent(event) && isTonight(event, now) && inReach(event))
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const distances = new Map([...running, ...later].map((event) => [event.id, distanceKm(center, event.coordinate)] as const));
    return { running, later, distances };
  }, [live.events, upcoming.events, category, latitude, longitude, radius, now]);

  const rows = useMemo<Row[]>(() => [
    ...(running.length ? [{ kind: 'heading', title: 'Läuft jetzt', note: `${running.length} ${running.length === 1 ? 'Event' : 'Events'} · nach Entfernung` } as Row, ...running.map((event) => ({ kind: 'live', event }) as Row)] : []),
    ...(later.length ? [{ kind: 'heading', title: 'Später heute', note: 'Nach Startzeit' } as Row, ...later.map((event) => ({ kind: 'later', event }) as Row)] : []),
  ], [running, later]);
  const loading = live.loading || upcoming.loading;
  const error = live.error ?? upcoming.error;
  const hero = running[0] ?? later[0];
  const heroHeight = Math.min(300, Math.max(220, width * 0.62)) + insets.top;
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const nearest = hero ? distances.get(hero.id) : undefined;

  return (
    <View style={styles.screen}>
      <Backdrop />
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={rows}
        keyExtractor={(row, index) => row.kind === 'heading' ? `h-${index}` : row.event.id}
        renderItem={({ item }) => item.kind === 'heading'
          ? <View style={styles.heading}><Text accessibilityRole="header" style={styles.headingTitle}>{item.title}</Text>{item.note && <Text style={styles.headingNote}>{item.note}</Text>}</View>
          : item.kind === 'live'
            ? <View style={styles.inset}><LiveCard event={item.event} distance={distances.get(item.event.id) ?? 0} today={today} now={now} /></View>
            : <View style={styles.inset}><EventRow event={item.event} href={eventHref(item.event, 'radar', now)} now={now} today={today} showDay={false} distanceKm={distances.get(item.event.id)} trailing={<SaveEventButton id={item.event.id} title={item.event.title} size={36} />} /></View>}
        ItemSeparatorComponent={({ leadingItem }) => <View style={(leadingItem as Row).kind === 'live' ? styles.cardGap : styles.rowGap} />}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + space.xl }}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => { live.reload(); upcoming.reload(); }}
        ListHeaderComponent={<View>
          <View style={[styles.hero, { height: heroHeight }]}>
            {hero && <Image source={hero.image} resizeMode="cover" blurRadius={hero.imageIsPlaceholder ? 6 : 28} style={StyleSheet.absoluteFill} />}
            <LinearGradient pointerEvents="none" colors={['#100b1566', '#100b15a6', colors.background]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>RADAR · {radius} KM{category !== 'Alle' ? ` · ${category.toLocaleUpperCase('de')}` : ''}</Text>
              <Text accessibilityRole="header" style={styles.title}>Heute Nacht</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>{running.length}</Text><Text style={styles.statLabel}>live</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statValue}>{later.length}</Text><Text style={styles.statLabel}>später</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statValue}>{nearest === undefined ? '–' : km(nearest)}</Text><Text style={styles.statLabel}>nächstes</Text></View>
          </View>
          <EventDataState loading={loading} error={error} onRetry={() => { live.reload(); upcoming.reload(); }} />
        </View>}
        ListEmptyComponent={loading || error ? undefined : <EmptyState icon="radar" title="Deine Nacht ist noch offen" text="In diesem Umkreis ist heute nichts bestätigt. Probiere ein anderes Genre oder einen größeren Umkreis." action="Filter anpassen" onAction={() => setFilterOpen(true)} />}
      />
      <View pointerEvents="box-none" style={[styles.bar, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon="back" accessibilityLabel="Zurück zum Radar" onPress={back} />
        <IconButton icon="sliders" accessibilityLabel="Filter" onPress={() => setFilterOpen(true)} />
      </View>
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
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  hero: { justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.surface },
  heroCopy: { paddingHorizontal: gutter, paddingBottom: space.md },
  eyebrow: { ...type.overline, fontSize: 11, color: colors.pink, letterSpacing: 1.5, marginBottom: space.xs },
  title: { ...type.largeTitle, fontSize: 38, lineHeight: 44, color: colors.text },
  stats: { flexDirection: 'row', alignItems: 'center', marginHorizontal: gutter, marginTop: space.xs, paddingVertical: space.md, borderRadius: corner.lg, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...type.title2, color: colors.text },
  statLabel: { ...type.overline, fontSize: 10, color: colors.faint },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: colors.separator },
  heading: { paddingHorizontal: gutter, paddingTop: space.xxl, paddingBottom: space.md },
  headingTitle: { ...type.title2, color: colors.text },
  headingNote: { ...type.footnote, color: colors.faint, marginTop: 2 },
  inset: { paddingHorizontal: gutter },
  cardGap: { height: space.md },
  rowGap: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: gutter + 68 + space.md },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingRight: space.lg, borderRadius: corner.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#c922ab59', ...squircle },
  liveDim: { backgroundColor: '#100b15b3' },
  liveArt: { width: 96, height: 120, borderRadius: corner.md, backgroundColor: colors.surfaceHigh, ...squircle },
  liveBody: { flex: 1, minWidth: 0, gap: 3 },
  liveState: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink },
  liveLabel: { ...type.overline, fontSize: 11, color: colors.pink },
  liveTitle: { ...type.title3, color: colors.text },
  livePlace: { ...type.footnote, color: colors.muted },
  liveGenre: { ...type.footnote, fontSize: 12, color: colors.faint },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
});
