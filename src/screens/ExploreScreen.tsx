import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { CitySearch } from '../components/CitySearch';
import { EventCalendar } from '../components/EventCalendar';
import { EventDataState } from '../components/EventDataState';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { ExploreEventCard } from '../components/ExploreEventCard';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { StoryTile } from '../components/StoryTile';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState, PageHeader, SectionHeader } from '../components/ui/Section';
import { tabBarContentInset } from '../constants/navigation';
import { colors, radius, space, type, type Category } from '../constants/theme';
import { useUpcomingEvents } from '../hooks/useEvents';
import { useLocation } from '../hooks/useLocation';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import type { City } from '../services/cities';
import { isLocatedEvent, matchesCategory } from '../types/events';
import { dayKey, distanceKm, matchesEventPeriod, type Coordinate } from '../utils/events';

const periods = [
  { id: 'all', label: 'Alle Termine' },
  { id: 'today', label: 'Heute' },
  { id: 'friday', label: 'Freitag' },
  { id: 'saturday', label: 'Samstag' },
  { id: 'nextWeek', label: 'Nächste Woche' },
] as const;
type Period = typeof periods[number]['id'];
const radii = [10, 25, 50, 100] as const;
type Area = { label: string; center: Coordinate } | null;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const remote = useUpcomingEvents();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [period, setPeriod] = useState<Period>('all');
  const [datesOpen, setDatesOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [area, setArea] = useState<Area>(null);
  const [areaRadius, setAreaRadius] = useState<number>(50);
  const [waitingForGps, setWaitingForGps] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate && selectedDate >= today ? selectedDate : null;
  const dateLabel = activeDate ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${activeDate}T12:00:00Z`)) : null;
  const [story, setStory] = useState<string | null>(null);
  const [seenStories, setSeenStories] = useState<string[]>([]);
  const markSeen = useCallback((id: string) => setSeenStories((previous) => previous.includes(id) ? previous : [...previous, id]), []);
  const closeStory = useCallback(() => setStory(null), []);

  // A GPS request finishes asynchronously; adopt the fix once it arrives.
  const gpsArea: Area = waitingForGps && location.userCoordinate ? { label: 'Dein Standort', center: location.userCoordinate } : null;
  const activeArea = gpsArea ?? area;

  const events = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de');
    return remote.events.filter((event) => matchesCategory(event, category)
      && (activeDate ? dayKey(new Date(event.startsAt)) === activeDate : matchesEventPeriod(event, period, today))
      && (!activeArea || (isLocatedEvent(event) && distanceKm(activeArea.center, event.coordinate) <= areaRadius))
      && `${event.title} ${event.categories.join(' ')} ${event.genres?.join(' ') ?? ''} ${event.location} ${event.venue ?? ''}`.toLocaleLowerCase('de').includes(query));
  }, [remote.events, category, activeDate, period, today, search, activeArea, areaRadius]);
  const distances = useMemo(() => new Map(activeArea ? events.flatMap((event) => isLocatedEvent(event) ? [[event.id, distanceKm(activeArea.center, event.coordinate)] as const] : []) : []), [events, activeArea]);
  const nextUp = events.slice(0, 4);
  const filtersActive = category !== 'Alle' || period !== 'all' || !!activeDate || !!activeArea || search.trim().length > 0;

  function resetFilters() { setSearch(''); setCategory('Alle'); setPeriod('all'); setSelectedDate(null); setArea(null); setWaitingForGps(false); }
  function chooseCity(city: City) { setWaitingForGps(false); setArea({ label: city.name, center: { latitude: city.latitude, longitude: city.longitude } }); }
  async function chooseGps() {
    setArea(null);
    setWaitingForGps(true);
    await location.locate();
  }
  function clearArea() { setArea(null); setWaitingForGps(false); setAreaOpen(false); }

  return <Screen>
    <FlatList
      key="explore-grid"
      data={events}
      numColumns={2}
      keyExtractor={(event) => event.id}
      renderItem={({ item }) => <View style={styles.gridCell}><StoryTile event={item} today={today} seen={seenStories.includes(item.id)} distanceKm={distances.get(item.id)} onOpen={() => setStory(item.id)} /></View>}
      initialNumToRender={6}
      windowSize={7}
      columnWrapperStyle={styles.gridRow}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={[styles.list, { paddingBottom: tabBarContentInset(insets.bottom) }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      refreshing={remote.loading}
      onRefresh={remote.reload}
      ListHeaderComponent={<View>
        <PageHeader section="ENTDECKEN" title="Entdecken" subtitle="Finde den richtigen Spot für deinen Abend." />
        <View style={styles.search}>
          <Icon name="search" size={18} color="#c3b2c6" />
          <TextInput accessibilityLabel="Events nach Name, Ort oder Genre suchen" value={search} onChangeText={setSearch} placeholder="Event, Stadt oder Genre" placeholderTextColor="#9f90a4" style={styles.input} returnKeyType="search" autoCorrect={false} />
          {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} style={styles.clear}><Icon name="close" size={16} /></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip icon="pin" label={activeArea ? `${activeArea.label} · ${areaRadius} km` : waitingForGps && location.loading ? 'Standort …' : 'Überall'} selected={!!activeArea} onPress={() => setAreaOpen(true)} accessibilityLabel="Ort und Umkreis wählen" />
          <Chip icon="sliders" label={category === 'Alle' ? 'Genre' : category} selected={category !== 'Alle' || genresOpen} onPress={() => setGenresOpen((value) => !value)} accessibilityLabel={`Genre filtern, aktuell ${category}`} />
          <Chip icon="calendar" label={dateLabel ?? 'Datum'} selected={!!activeDate} onPress={() => setDatesOpen(true)} accessibilityLabel="Datum auswählen" />
        </ScrollView>
        {genresOpen && <View style={styles.genrePanel}><CategoryFilters value={category} onChange={(item) => { setCategory(item); setGenresOpen(false); }} /></View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods} keyboardShouldPersistTaps="handled">
          {periods.map((item) => {
            const selected = !activeDate && period === item.id;
            return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => { setPeriod(item.id); setSelectedDate(null); }} style={[styles.period, selected && styles.periodActive]}><Text style={[styles.periodLabel, selected && styles.periodActiveText]}>{item.label}</Text></Pressable>;
          })}
        </ScrollView>

        {nextUp.length > 0 && <>
          <SectionHeader title="Demnächst" note="Die nächsten Termine deiner Auswahl" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nextList}>{nextUp.map((event) => <View key={event.id} style={styles.nextCard}><ExploreEventCard event={event} /></View>)}</ScrollView>
        </>}
        <SectionHeader title={activeDate ? `Events am ${dateLabel}` : 'Alle Events'} note={`${events.length} ${events.length === 1 ? 'Event' : 'Events'} · antippen für die Vorschau`} action={filtersActive ? 'Zurücksetzen' : undefined} onAction={resetFilters} />
        <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
      </View>}
      ListEmptyComponent={remote.loading || remote.error ? undefined : <EmptyState icon="search" title="Keine passenden Events" text={activeArea ? `Im Umkreis von ${areaRadius} km um ${activeArea.label} ist für diese Auswahl nichts geplant. Vergrößere den Umkreis oder setze Filter zurück.` : 'Passe deine Suche oder deine Filter an.'} action="Filter zurücksetzen" onAction={resetFilters} />}
    />

    <Modal visible={datesOpen} transparent animationType="slide" onRequestClose={() => setDatesOpen(false)}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Datumsauswahl schließen" onPress={() => setDatesOpen(false)} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.sheet, styles.tallSheet]}>
          <GlassBackdrop radius={radius.xl} variant="panel" />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeading}><Text style={styles.sheetTitle}>Wann möchtest du los?</Text><Pressable accessibilityRole="button" accessibilityLabel="Datumsauswahl schließen" onPress={() => setDatesOpen(false)} style={styles.clear}><Icon name="close" /></Pressable></View>
            <EventCalendar key={activeDate ?? today} today={today} selectedDate={activeDate} eventDays={remote.events.map((event) => dayKey(new Date(event.startsAt)))} onSelect={(date) => { setSelectedDate(date); setDatesOpen(false); }} />
            <Button label="Alle Termine anzeigen" variant="secondary" onPress={() => { setSelectedDate(null); setPeriod('all'); setDatesOpen(false); }} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>

    <Modal visible={areaOpen} transparent animationType="slide" onRequestClose={() => setAreaOpen(false)}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ortsauswahl schließen" onPress={() => setAreaOpen(false)} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
          <GlassBackdrop radius={radius.xl} variant="panel" />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeading}><Text style={styles.sheetTitle}>Wo möchtest du feiern?</Text><Pressable accessibilityRole="button" accessibilityLabel="Ortsauswahl schließen" onPress={() => setAreaOpen(false)} style={styles.clear}><Icon name="close" /></Pressable></View>
            <View style={styles.citySearch}><CitySearch flush label={activeArea?.label ?? 'Deutschland'} locating={location.loading} onLocate={() => void chooseGps()} onSelect={chooseCity} /></View>
            {waitingForGps && !location.userCoordinate && !location.loading && <Text style={styles.hint}>{location.message}</Text>}
            <Text style={styles.label}>Umkreis</Text>
            <View style={styles.radii}>{radii.map((value) => <Chip key={value} label={`${value} km`} selected={areaRadius === value} onPress={() => setAreaRadius(value)} />)}</View>
            <Text style={styles.hint}>Es werden nur Events mit bestätigtem Standort angezeigt. Dein Standort wird nur auf dem Gerät verwendet.</Text>
            <View style={styles.sheetActions}>
              <Button label="Überall" variant="secondary" onPress={clearArea} style={styles.flex} />
              <Button label="Anzeigen" onPress={() => setAreaOpen(false)} disabled={!activeArea} style={styles.flex} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>

    <Modal visible={story !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={closeStory}>
      {story !== null && <EventStoryViewer events={events} initialId={story} today={today} onClose={closeStory} onSeen={markSeen} onOpenEvent={(event) => { setStory(null); router.push(eventHref(event, 'discover')); }} />}
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: space.lg + 2 },
  search: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: '#ffffff1c', backgroundColor: '#1b1521', flexDirection: 'row', alignItems: 'center', paddingLeft: space.md, gap: space.sm },
  input: { color: colors.text, flex: 1, minWidth: 0, minHeight: 48, fontSize: 14 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: space.sm, paddingTop: space.md },
  genrePanel: { marginTop: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: colors.surfaceRaised },
  periods: { gap: space.xxs, paddingTop: space.sm },
  period: { minHeight: 38, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.sm },
  periodActive: { backgroundColor: '#ffffff12' },
  periodLabel: { ...type.caption, color: colors.faint, fontWeight: '600' },
  periodActiveText: { color: colors.text },
  nextList: { gap: space.md, paddingBottom: space.xxs },
  nextCard: { width: 190 },
  gridRow: { gap: space.md - 2 },
  gridCell: { flex: 1, maxWidth: '50%' },
  separator: { height: space.md - 2 },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#100916b3' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '90%' },
  tallSheet: { height: '85%' },
  sheetContent: { padding: space.xl, gap: space.md },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  sheetTitle: { ...type.headline, fontSize: 19, color: colors.text },
  citySearch: { minHeight: 52, zIndex: 10 },
  label: { ...type.label, color: colors.text, marginTop: space.xs },
  radii: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { ...type.caption, color: colors.muted },
  sheetActions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
