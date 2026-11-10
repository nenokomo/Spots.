import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CitySearch } from '../components/CitySearch';
import { EventCalendar } from '../components/EventCalendar';
import { EventHero, EventPoster, StoryRail } from '../components/EventCards';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Screen } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState, LargeHeader, SectionHeader } from '../components/ui/Section';
import { Sheet } from '../components/ui/Sheet';
import { tabBarContentInset } from '../constants/navigation';
import { categories, colors, gutter, radius, space, squircle, type, type Category } from '../constants/theme';
import { useUpcomingEvents } from '../hooks/useEvents';
import { useLocation } from '../hooks/useLocation';
import { useNow } from '../hooks/useNow';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import type { City } from '../services/cities';
import { isLocatedEvent, matchesCategory, type SpotEvent } from '../types/events';
import { dayKey, distanceKm, matchesEventPeriod, type Coordinate } from '../utils/events';

const periods = [
  { id: 'all', label: 'Jederzeit' },
  { id: 'today', label: 'Heute' },
  { id: 'friday', label: 'Freitag' },
  { id: 'saturday', label: 'Samstag' },
  { id: 'nextWeek', label: 'Nächste Woche' },
] as const;
type Period = typeof periods[number]['id'];
const radii = [10, 25, 50, 100] as const;
type Area = { label: string; center: Coordinate } | null;
const HERO_GAP = 12;

const headerDate = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const longDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const addDays = (key: string, days: number) => { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };

function dayTitle(key: string, today: string) {
  if (key === today) return 'Heute';
  if (key === addDays(today, 1)) return 'Morgen';
  return longDay.format(new Date(`${key}T12:00:00Z`));
}

/** Friday to Sunday of the current week, starting no earlier than today. */
function weekendDays(today: string) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const untilSunday = (7 - weekday) % 7;
  return Array.from({ length: untilSunday + 1 }, (_, offset) => addDays(today, offset)).filter((key) => [5, 6, 0].includes(new Date(`${key}T12:00:00Z`).getUTCDay()));
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const today = useToday();
  const now = useNow();
  const remote = useUpcomingEvents();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [period, setPeriod] = useState<Period>('all');
  const [datesOpen, setDatesOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [area, setArea] = useState<Area>(null);
  const [areaRadius, setAreaRadius] = useState<number>(50);
  const [waitingForGps, setWaitingForGps] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [seenStories, setSeenStories] = useState<string[]>([]);
  const markSeen = useCallback((id: string) => setSeenStories((previous) => previous.includes(id) ? previous : [...previous, id]), []);
  const closeStory = useCallback(() => setStory(null), []);

  const activeDate = selectedDate && selectedDate >= today ? selectedDate : null;
  const dateLabel = activeDate ? shortDay.format(new Date(`${activeDate}T12:00:00Z`)) : period !== 'all' ? periods.find((item) => item.id === period)?.label : null;
  // A GPS request finishes asynchronously; adopt the fix once it arrives.
  const gpsArea: Area = waitingForGps && location.userCoordinate ? { label: 'Dein Standort', center: location.userCoordinate } : null;
  const activeArea = gpsArea ?? area;
  const filtersActive = category !== 'Alle' || period !== 'all' || !!activeDate || !!activeArea || search.trim().length > 0;

  const events = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de');
    return remote.events.filter((event) => matchesCategory(event, category)
      && (activeDate ? dayKey(new Date(event.startsAt)) === activeDate : matchesEventPeriod(event, period, today))
      && (!activeArea || (isLocatedEvent(event) && distanceKm(activeArea.center, event.coordinate) <= areaRadius))
      && `${event.title} ${event.categories.join(' ')} ${event.genres?.join(' ') ?? ''} ${event.location} ${event.venue ?? ''}`.toLocaleLowerCase('de').includes(query));
  }, [remote.events, category, activeDate, period, today, search, activeArea, areaRadius]);

  const sections = useMemo(() => {
    const days = new Map<string, SpotEvent[]>();
    for (const event of events) { const key = dayKey(new Date(event.startsAt)); days.set(key, [...(days.get(key) ?? []), event]); }
    return [...days].map(([key, data]) => ({ key, title: dayTitle(key, today), data }));
  }, [events, today]);
  const featured = events.slice(0, 5);
  const stories = useMemo(() => events.filter((event) => !event.imageIsPlaceholder).slice(0, 12), [events]);
  const weekend = useMemo(() => { const days = weekendDays(today); return events.filter((event) => days.includes(dayKey(new Date(event.startsAt)))).slice(0, 10); }, [events, today]);
  const heroWidth = Math.min(width - gutter * 2 - 28, 400);

  function resetFilters() { setSearch(''); setCategory('Alle'); setPeriod('all'); setSelectedDate(null); setArea(null); setWaitingForGps(false); }
  function chooseCity(city: City) { setWaitingForGps(false); setArea({ label: city.name, center: { latitude: city.latitude, longitude: city.longitude } }); }
  async function chooseGps() { setArea(null); setWaitingForGps(true); await location.locate(); }

  return <Screen>
    <SectionList
      sections={sections}
      keyExtractor={(event) => event.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshing={remote.loading}
      onRefresh={remote.reload}
      initialNumToRender={8}
      contentContainerStyle={{ paddingBottom: tabBarContentInset(insets.bottom) }}
      renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={styles.day}>{section.title}</Text>}
      renderItem={({ item }) => <View style={styles.row}><EventRow event={item} href={eventHref(item, 'discover')} now={now} today={today} showDay={false} trailing={<SaveEventButton id={item.id} title={item.title} size={36} />} /></View>}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={<View>
        <LargeHeader overline={headerDate.format(new Date(now))} title="Entdecken" trailing={<IconButton icon="profile" accessibilityLabel="Profil öffnen" onPress={() => router.push('/profile')} size={36} plain style={styles.profile} />} />
        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.faint} />
          <TextInput accessibilityLabel="Events nach Name, Ort oder Genre suchen" value={search} onChangeText={setSearch} placeholder="Events, Städte, Genres" placeholderTextColor={colors.faint} style={styles.input} returnKeyType="search" autoCorrect={false} />
          {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} hitSlop={10} style={styles.clear}><Icon name="close" size={11} color={colors.background} /></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip icon="pin" trailingIcon="down" label={activeArea ? `${activeArea.label} · ${areaRadius} km` : waitingForGps && location.loading ? 'Standort …' : 'Überall'} selected={!!activeArea} onPress={() => setAreaOpen(true)} accessibilityLabel="Ort und Umkreis wählen" />
          <Chip icon="calendar" trailingIcon="down" label={dateLabel ?? 'Jederzeit'} selected={!!dateLabel} onPress={() => setDatesOpen(true)} accessibilityLabel="Datum auswählen" />
          <View style={styles.chipDivider} />
          {categories.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} accessibilityLabel={`Genre ${item}`} />)}
        </ScrollView>

        {!filtersActive && stories.length > 0 && <View style={styles.rail}><StoryRail events={stories} today={today} seen={seenStories} onOpen={setStory} /></View>}

        {!filtersActive && featured.length > 0 && <>
          <SectionHeader title="Als Nächstes" note="Die nächsten Events in Deutschland" />
          <FlatList
            horizontal
            data={featured}
            keyExtractor={(event) => event.id}
            renderItem={({ item }) => <EventHero event={item} href={eventHref(item, 'discover')} today={today} now={now} width={heroWidth} />}
            ItemSeparatorComponent={() => <View style={styles.heroGap} />}
            contentContainerStyle={styles.shelf}
            snapToInterval={heroWidth + HERO_GAP}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
          />
        </>}

        {!filtersActive && weekend.length > 0 && <>
          <SectionHeader title="Dieses Wochenende" action="Samstag" onAction={() => { setPeriod('saturday'); setSelectedDate(null); }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.shelf, styles.posters]}>
            {weekend.map((event) => <EventPoster key={event.id} event={event} href={eventHref(event, 'discover')} today={today} />)}
          </ScrollView>
        </>}

        <SectionHeader title={filtersActive ? 'Ergebnisse' : 'Kalender'} note={`${events.length} ${events.length === 1 ? 'Event' : 'Events'}`} action={filtersActive ? 'Zurücksetzen' : undefined} onAction={resetFilters} />
        <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
      </View>}
      ListEmptyComponent={remote.loading || remote.error ? undefined : <EmptyState icon="search" title="Nichts gefunden" text={activeArea ? `Im Umkreis von ${areaRadius} km um ${activeArea.label} ist für diese Auswahl nichts geplant.` : 'Probier einen anderen Begriff oder weniger Filter.'} action="Filter zurücksetzen" onAction={resetFilters} />}
    />

    <Sheet visible={datesOpen} title="Wann?" onClose={() => setDatesOpen(false)} tall>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets} style={styles.presetRow}>
        {periods.map((item) => <Chip key={item.id} label={item.label} selected={!activeDate && period === item.id} onPress={() => { setPeriod(item.id); setSelectedDate(null); setDatesOpen(false); }} />)}
      </ScrollView>
      <View style={styles.calendar}>
        <EventCalendar key={activeDate ?? today} today={today} selectedDate={activeDate} eventDays={remote.events.map((event) => dayKey(new Date(event.startsAt)))} onSelect={(date) => { setSelectedDate(date); setPeriod('all'); setDatesOpen(false); }} />
      </View>
    </Sheet>

    <Sheet visible={areaOpen} title="Wo?" onClose={() => setAreaOpen(false)} tall>
      <View style={styles.citySearch}><CitySearch flush label={activeArea?.label ?? 'Deutschland'} locating={location.loading} onLocate={() => void chooseGps()} onSelect={chooseCity} /></View>
      {waitingForGps && !location.userCoordinate && !location.loading && <Text style={styles.hint}>{location.message}</Text>}
      <View style={styles.group}>
        <Text style={styles.label}>Umkreis</Text>
        <View style={styles.radii}>{radii.map((value) => <Chip key={value} label={`${value} km`} selected={areaRadius === value} onPress={() => setAreaRadius(value)} />)}</View>
      </View>
      <Text style={styles.hint}>Es erscheinen nur Events mit bestätigtem Standort. Dein Standort bleibt auf dem Gerät.</Text>
      <View style={styles.sheetActions}>
        <Button label="Überall" variant="secondary" onPress={() => { setArea(null); setWaitingForGps(false); setAreaOpen(false); }} style={styles.flex} />
        <Button label="Anzeigen" onPress={() => setAreaOpen(false)} disabled={!activeArea} style={styles.flex} />
      </View>
    </Sheet>

    <Modal visible={story !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={closeStory}>
      {story !== null && <EventStoryViewer events={stories} initialId={story} today={today} onClose={closeStory} onSeen={markSeen} onOpenEvent={(event) => { setStory(null); router.push(eventHref(event, 'discover')); }} />}
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { backgroundColor: colors.surface, marginBottom: 4 },
  search: { height: 44, marginHorizontal: gutter, borderRadius: radius.md, backgroundColor: colors.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, gap: space.sm, ...squircle },
  input: { ...type.body, lineHeight: undefined, color: colors.text, flex: 1, minWidth: 0, height: 44, paddingVertical: 0 },
  clear: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.faint },
  chips: { gap: space.sm, paddingHorizontal: gutter, paddingTop: space.md, alignItems: 'center' },
  chipDivider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.separator, marginHorizontal: space.xxs },
  rail: { paddingTop: space.xl },
  shelf: { paddingHorizontal: gutter },
  posters: { gap: space.md },
  heroGap: { width: HERO_GAP },
  day: { ...type.headline, color: colors.text, paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xxs },
  row: { paddingHorizontal: gutter },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: gutter + 68 + space.md },
  presetRow: { flexGrow: 0 },
  presets: { gap: space.sm },
  calendar: { flex: 1 },
  citySearch: { minHeight: 48, zIndex: 10 },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
  radii: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { ...type.footnote, color: colors.faint },
  sheetActions: { flexDirection: 'row', gap: space.sm },
});
