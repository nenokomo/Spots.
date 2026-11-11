import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { CitySearch } from '../components/CitySearch';
import { EventCalendar } from '../components/EventCalendar';
import { EventHero } from '../components/EventCards';
import { HypeChart } from '../components/HypeChart';
import { EventDataState } from '../components/EventDataState';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { StoryTile } from '../components/StoryTile';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState, PageHeader, SectionHeader } from '../components/ui/Section';
import { Sheet } from '../components/ui/Sheet';
import { tabBarContentInset } from '../constants/navigation';
import { colors, gutter, radius, space, squircle, type, type Category } from '../constants/theme';
import { useUpcomingEvents } from '../hooks/useEvents';
import { useLocation } from '../hooks/useLocation';
import { useNow } from '../hooks/useNow';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import type { City } from '../services/cities';
import { popularEvents } from '../services/popularity';
import { isLocatedEvent, matchesCategory, type SpotEvent } from '../types/events';
import { dayKey, distanceKm, matchesEventPeriod, type Coordinate } from '../utils/events';

const periods = [
  { id: 'all', label: 'Alle Termine' },
  { id: 'today', label: 'Heute' },
  { id: 'friday', label: 'Freitag' },
  { id: 'saturday', label: 'Samstag' },
  { id: 'nextWeek', label: 'Nächste Woche' },
] as const;
type Period = typeof periods[number]['id'];
const radii = [10, 30, 50, 100] as const;
type Area = { label: string; center: Coordinate };
/** auto = around the user when a location is known; everywhere = no distance filter. */
type AreaChoice = { kind: 'auto' } | { kind: 'everywhere' } | { kind: 'gps' } | { kind: 'city'; area: Area };
const HERO_GAP = 12;
const shortDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', day: 'numeric', month: 'long' });

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const today = useToday();
  const now = useNow();
  const remote = useUpcomingEvents();
  const location = useLocation();
  const { locate } = location;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [period, setPeriod] = useState<Period>('all');
  const [datesOpen, setDatesOpen] = useState(false);
  const eventDays = useMemo(() => remote.events.map((event) => dayKey(new Date(event.startsAt))), [remote.events]);
  const [genresOpen, setGenresOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [choice, setChoice] = useState<AreaChoice>({ kind: 'auto' });
  const [areaRadius, setAreaRadius] = useState<number>(30);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [seenStories, setSeenStories] = useState<string[]>([]);
  const markSeen = useCallback((id: string) => setSeenStories((previous) => previous.includes(id) ? previous : [...previous, id]), []);
  const closeStory = useCallback(() => setStory(null), []);

  // Use an existing location permission to show what is on nearby. Never prompts again after a refusal.
  useFocusEffect(useCallback(() => { void locate({ automatic: true }); }, [locate]));

  const activeDate = selectedDate && selectedDate >= today ? selectedDate : null;
  const dateLabel = activeDate ? shortDay.format(new Date(`${activeDate}T12:00:00Z`)) : null;

  const { events, area, fellBack } = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de');
    const base = remote.events.filter((event) => matchesCategory(event, category)
      && (activeDate ? dayKey(new Date(event.startsAt)) === activeDate : matchesEventPeriod(event, period, today))
      && `${event.title} ${event.categories.join(' ')} ${event.genres?.join(' ') ?? ''} ${event.location} ${event.venue ?? ''}`.toLocaleLowerCase('de').includes(query));
    const gps: Area | null = location.userCoordinate ? { label: 'In deiner Nähe', center: location.userCoordinate } : null;
    const wanted = choice.kind === 'city' ? choice.area : choice.kind === 'everywhere' ? null : gps;
    if (!wanted) return { events: base, area: null, fellBack: false };
    const nearby = base.filter((event) => isLocatedEvent(event) && distanceKm(wanted.center, event.coordinate) <= areaRadius);
    // Nothing near the user and no place chosen: show everything rather than an empty page.
    if (choice.kind === 'auto' && nearby.length === 0) return { events: base, area: null, fellBack: base.length > 0 };
    return { events: nearby, area: wanted, fellBack: false };
  }, [remote.events, category, activeDate, period, today, search, choice, location.userCoordinate, areaRadius]);

  const distances = useMemo(() => new Map(area ? events.flatMap((event) => isLocatedEvent(event) ? [[event.id, distanceKm(area.center, event.coordinate)] as const] : []) : []), [events, area]);
  const featured = events.slice(0, 5);
  // Popular in the user's city: chosen city, else the city of the nearest ranked events. Preview data only for now.
  const popular = useMemo(() => popularEvents(remote.events, choice.kind === 'city' ? choice.area.label : null), [remote.events, choice]);
  const heroWidth = Math.min(width - gutter * 2 - 24, 420);
  const filtersActive = category !== 'Alle' || period !== 'all' || !!activeDate || choice.kind !== 'auto' || search.trim().length > 0;
  const areaLabel = area ? `${area.label} · ${areaRadius} km` : choice.kind === 'gps' && location.loading ? 'Standort …' : 'Überall';

  function resetFilters() { setSearch(''); setCategory('Alle'); setPeriod('all'); setSelectedDate(null); setChoice({ kind: 'auto' }); }
  function chooseCity(city: City) { setChoice({ kind: 'city', area: { label: city.name, center: { latitude: city.latitude, longitude: city.longitude } } }); }
  async function chooseGps() { setChoice({ kind: 'gps' }); await locate(); }
  // Where an event leads from here: future events with a verified organizer open the organizer page.
  const destination = (event: SpotEvent) => eventHref(event, 'discover', now);
  const toOrganizer = (event: SpotEvent) => destination(event).pathname === '/organizer/[id]';

  return <Screen>
    <FlatList
      key="explore-grid"
      data={events}
      numColumns={2}
      keyExtractor={(event) => event.id}
      renderItem={({ item }) => <View style={styles.cell}><StoryTile event={item} today={today} now={now} seen={seenStories.includes(item.id)} distanceKm={distances.get(item.id)} onOpen={() => setStory(item.id)} /></View>}
      columnWrapperStyle={styles.gridRow}
      initialNumToRender={6}
      windowSize={7}
      contentContainerStyle={{ paddingBottom: tabBarContentInset(insets.bottom) }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshing={remote.loading}
      onRefresh={remote.reload}
      ListHeaderComponent={<View>
        <PageHeader section="ENTDECKEN" title="Entdecken" subtitle="Finde den richtigen Spot für deinen Abend." />
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput accessibilityLabel="Events nach Name, Ort oder Genre suchen" value={search} onChangeText={setSearch} placeholder="Event, Stadt oder Genre" placeholderTextColor={colors.faint} style={styles.input} returnKeyType="search" autoCorrect={false} />
          {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} hitSlop={10} style={styles.clear}><Icon name="close" size={16} color={colors.muted} /></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip icon="sliders" label={category === 'Alle' ? 'Genre' : category} selected={category !== 'Alle' || genresOpen} onPress={() => setGenresOpen((value) => !value)} accessibilityLabel={`Genre filtern, aktuell ${category}`} />
          <Chip icon="calendar" label={dateLabel ?? 'Datum'} selected={!!activeDate} onPress={() => setDatesOpen(true)} accessibilityLabel="Datum auswählen" />
          <Chip icon="pin" label={areaLabel} selected={!!area} onPress={() => setAreaOpen(true)} accessibilityLabel="Ort und Umkreis wählen" />
        </ScrollView>
        {genresOpen && <View style={styles.genres}><CategoryFilters value={category} onChange={(item) => { setCategory(item); setGenresOpen(false); }} /></View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods} keyboardShouldPersistTaps="handled">
          {periods.map((item) => {
            const selected = !activeDate && period === item.id;
            return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => { setPeriod(item.id); setSelectedDate(null); }} style={[styles.period, selected && styles.periodActive]}><Text style={[styles.periodLabel, selected && styles.periodActiveText]}>{item.label}</Text></Pressable>;
          })}
        </ScrollView>

        {featured.length > 0 && <>
          <SectionHeader title="Als Nächstes" />
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(event) => event.id}
            renderItem={({ item }) => <EventHero event={item} href={destination(item)} today={today} now={now} width={heroWidth} />}
            ItemSeparatorComponent={() => <View style={styles.heroGap} />}
            contentContainerStyle={styles.shelf}
            snapToInterval={heroWidth + HERO_GAP}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
          />
        </>}

        {!filtersActive && popular.ranked.length > 0 && <>
          <SectionHeader title={`Gehypt in ${popular.city ?? 'deiner Nähe'}`} />
          <HypeChart ranked={popular.ranked} today={today} hrefFor={destination} />
        </>}

        <SectionHeader title={area ? `Alle Events · ${area.label}` : 'Alle Events'} action={filtersActive ? 'Zurücksetzen' : undefined} onAction={resetFilters} />
        {fellBack && <Text style={styles.fallback}>In deiner Nähe ist gerade nichts geplant. Das sind alle Events in Deutschland.</Text>}
        <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
      </View>}
      ListEmptyComponent={remote.loading || remote.error ? undefined : <EmptyState icon="search" title="Keine passenden Events" text={area ? `Im Umkreis von ${areaRadius} km um ${area.label} ist für diese Auswahl nichts geplant.` : 'Passe deine Suche oder deine Filter an.'} action="Filter zurücksetzen" onAction={resetFilters} />}
    />

    <Modal visible={datesOpen} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setDatesOpen(false)}>
      <View style={styles.dateModal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zeitraumauswahl schließen" onPress={() => setDatesOpen(false)} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.dateSheet}>
          <GlassBackdrop radius={26} variant="panel" />
          <View style={styles.dateContent}>
            <View style={styles.dateHeading}>
              <Text accessibilityRole="header" style={styles.dateTitle}>Wann möchtest du los?</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Zeitraumauswahl schließen" onPress={() => setDatesOpen(false)} style={styles.clear}><Icon name="close" /></Pressable>
            </View>
            <EventCalendar key={activeDate ?? today} today={today} selectedDate={activeDate} eventDays={eventDays} onSelect={(date) => { setSelectedDate(date); setDatesOpen(false); }} />
            <Pressable accessibilityRole="button" onPress={() => { setSelectedDate(null); setPeriod('all'); setDatesOpen(false); }} style={styles.dateReset}><Text style={styles.dateResetText}>Alle Termine anzeigen</Text></Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>

    <Sheet visible={areaOpen} title="Wo möchtest du feiern?" onClose={() => setAreaOpen(false)} tall>
      <View style={styles.citySearch}><CitySearch flush label={area?.label ?? 'Deutschland'} locating={location.loading} onLocate={() => void chooseGps()} onSelect={chooseCity} /></View>
      {choice.kind === 'gps' && !location.userCoordinate && !location.loading && <Text style={styles.hint}>{location.message}</Text>}
      <View style={styles.group}>
        <Text style={styles.label}>Umkreis</Text>
        <View style={styles.radii}>{radii.map((value) => <Chip key={value} label={`${value} km`} selected={areaRadius === value} onPress={() => setAreaRadius(value)} />)}</View>
      </View>
      <Text style={styles.hint}>Es erscheinen nur Events mit bestätigtem Standort. Dein Standort bleibt auf dem Gerät.</Text>
      <View style={styles.sheetActions}>
        <Button label="Überall" variant="secondary" onPress={() => { setChoice({ kind: 'everywhere' }); setAreaOpen(false); }} style={styles.flex} />
        <Button label="Anzeigen" onPress={() => setAreaOpen(false)} disabled={!area} style={styles.flex} />
      </View>
    </Sheet>

    <Modal visible={story !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={closeStory}>
      {story !== null && <EventStoryViewer events={events} initialId={story} today={today} onClose={closeStory} onSeen={markSeen}
        actionLabel={(event) => toOrganizer(event) ? 'Zum Veranstalter' : 'Event ansehen'}
        onOpenEvent={(event) => { setStory(null); router.push(eventHref(event, 'discover')); }} />}
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { minHeight: 50, marginHorizontal: gutter, borderRadius: radius.md, borderWidth: 1, borderColor: '#ffffff1c', backgroundColor: '#1c1b1f', flexDirection: 'row', alignItems: 'center', paddingLeft: space.md, gap: space.sm, ...squircle },
  input: { ...type.body, lineHeight: undefined, color: colors.text, flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 0 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: space.sm, paddingHorizontal: gutter, paddingTop: space.md },
  genres: { marginTop: space.sm, marginHorizontal: gutter, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: colors.surfaceRaised },
  periods: { gap: space.xxs, paddingHorizontal: gutter - space.md, paddingTop: space.sm },
  period: { minHeight: 40, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.sm },
  periodActive: { backgroundColor: '#ffffff12' },
  periodLabel: { ...type.label, fontSize: 14, color: colors.faint },
  periodActiveText: { color: colors.text },
  shelf: { paddingHorizontal: gutter },
  heroGap: { width: HERO_GAP },
  fallback: { ...type.footnote, color: colors.muted, paddingHorizontal: gutter, paddingBottom: space.md },
  gridRow: { gap: space.md, paddingHorizontal: gutter, paddingBottom: space.md },
  cell: { flex: 1, maxWidth: '50%' },
  dateModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000b3' },
  dateSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  dateContent: { padding: 16, gap: 10 },
  dateHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dateTitle: { color: colors.text, fontWeight: '700', fontSize: 17, flexShrink: 1 },
  dateReset: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#c922ab88', backgroundColor: '#c922ab22', marginTop: 4 },
  dateResetText: { color: '#ffd6f2', fontSize: 12, fontWeight: '700' },
  citySearch: { minHeight: 48, zIndex: 10 },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
  radii: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { ...type.footnote, color: colors.faint },
  sheetActions: { flexDirection: 'row', gap: space.sm },
});
