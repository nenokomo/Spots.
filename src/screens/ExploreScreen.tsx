import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExploreEventCard } from '../components/ExploreEventCard';
import { EventCalendar } from '../components/EventCalendar';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { categories, colors, type Category } from '../constants/theme';
import { tabBarContentInset } from '../constants/navigation';
import { demoEvents, matchesCategory, type DemoEvent } from '../data/events';
import { useToday, usePartyWindow } from '../hooks/useToday';
import { dayKey, happensToday } from '../utils/events';

const periods = [
  { id: 'all', label: 'Alle Termine' },
  { id: 'today', label: 'Heute' },
  { id: 'friday', label: 'Freitag' },
  { id: 'saturday', label: 'Samstag' },
  { id: 'nextWeek', label: 'Nächste Woche' },
] as const;
type Period = typeof periods[number]['id'];

function matchesPeriod(event: DemoEvent, period: Period, today: string) {
  switch (period) {
    case 'today': return happensToday(event, today);
    case 'friday': return event.date.startsWith('Freitag');
    case 'saturday': return event.date.startsWith('Samstag');
    case 'nextWeek': return event.date === 'Nächste Woche';
    default: return true;
  }
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const today = useToday();
  const partyWindow = usePartyWindow();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [period, setPeriod] = useState<Period>('all');
  const [datesOpen, setDatesOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate && selectedDate >= today ? selectedDate : null;
  const dateLabel = activeDate ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${activeDate}T12:00:00Z`)) : null;
  const events = demoEvents.filter((event) => matchesCategory(event, category) && (activeDate ? dayKey(new Date(event.startsAt)) === activeDate : matchesPeriod(event, period, partyWindow)) && `${event.title} ${event.categories.join(' ')} ${event.location}`.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')));
  function resetFilters() { setSearch(''); setCategory('Alle'); setPeriod('all'); setSelectedDate(null); }

  return <Screen>
    <FlatList
      key="explore-grid"
      data={events}
      numColumns={2}
      keyExtractor={(event) => event.id}
      renderItem={({ item }) => <View style={styles.gridCell}><ExploreEventCard event={item} /></View>}
      columnWrapperStyle={styles.gridRow}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={[styles.list, { paddingBottom: tabBarContentInset(insets.bottom) }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View>
        <View style={styles.heading}>
          <View style={styles.headingText}><Text style={styles.eyebrow}>SPOTS / ENTDECKEN</Text><Text accessibilityRole="header" style={styles.title}>Entdecken</Text><Text style={styles.subtitle}>Finde den richtigen Spot für deinen Abend.</Text></View>
        </View>
        <View style={styles.search}>
          <Icon name="search" size={19} color="#c3b2c6" />
          <TextInput accessibilityLabel="Events nach Name, Ort oder Genre suchen" value={search} onChangeText={setSearch} placeholder="Event, Ort oder Genre suchen" placeholderTextColor="#9f90a4" style={styles.input} returnKeyType="search" autoCorrect={false} />
          {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} style={styles.clear}><Icon name="close" size={17} /></Pressable>}
        </View>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Genre filtern, aktuell ${category}`} accessibilityState={{ expanded: genresOpen }} onPress={() => setGenresOpen(!genresOpen)} style={styles.control}><Icon name="sliders" size={16} color={colors.text} /><Text style={styles.controlText}>{category === 'Alle' ? 'Alle Genres' : category}</Text><Icon name="down" size={13} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Zeitraum auswählen" onPress={() => setDatesOpen(true)} style={styles.control}><Icon name="calendar" size={16} color={colors.text} /><Text numberOfLines={1} style={styles.controlText}>{dateLabel ?? 'Datum wählen'}</Text><Icon name="down" size={13} /></Pressable>
        </View>
        {genresOpen && <View style={styles.genrePanel}><Text style={styles.panelLabel}>GENRE AUSWÄHLEN</Text><View style={styles.genreOptions}>{categories.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => { setCategory(item); setGenresOpen(false); }} style={[styles.genreOption, category === item && styles.genreSelected]}><Text style={[styles.genreText, category === item && styles.genreSelectedText]}>{item}</Text></Pressable>)}</View></View>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods} keyboardShouldPersistTaps="handled">
          {periods.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: !activeDate && period === item.id }} onPress={() => { setPeriod(item.id); setSelectedDate(null); }} style={[styles.period, !activeDate && period === item.id && styles.periodActive]}><Text style={[styles.periodLabel, !activeDate && period === item.id && styles.periodActiveText]}>{item.label}</Text></Pressable>)}
        </ScrollView>
        {activeDate && <Pressable accessibilityRole="button" accessibilityLabel="Datumsfilter entfernen" onPress={() => setSelectedDate(null)} style={styles.selectedDate}><Text style={styles.selectedDateText}>{dateLabel}</Text><Icon name="close" size={14} color={colors.pink} /></Pressable>}
        <View style={styles.sectionHeading}><View><Text style={styles.section}>{activeDate ? 'Events an diesem Tag' : 'Events entdecken'}</Text><Text style={styles.note}>Demo-Auswahl · keine Live-Daten</Text></View><Text style={styles.count}>{events.length} {events.length === 1 ? 'Event' : 'Events'}</Text></View>
      </View>}
      ListEmptyComponent={<View style={styles.empty}><Icon name="search" size={25} color={colors.pink} /><Text style={styles.emptyTitle}>Keine passenden Events gefunden.</Text><Text style={styles.emptyText}>Passe deine Suche oder deine Filter an.</Text><Pressable accessibilityRole="button" onPress={resetFilters} style={styles.reset}><Text style={styles.resetText}>Filter zurücksetzen</Text></Pressable></View>}
    />
    <Modal visible={datesOpen} transparent animationType="slide" onRequestClose={() => setDatesOpen(false)}>
      <View style={styles.modal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zeitraumauswahl schließen" onPress={() => setDatesOpen(false)} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
          <GlassBackdrop radius={26} variant="panel" />
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <View style={styles.sheetHeading}><Text style={styles.section}>Wann möchtest du los?</Text><Pressable accessibilityRole="button" accessibilityLabel="Zeitraumauswahl schließen" onPress={() => setDatesOpen(false)} style={styles.clear}><Icon name="close" /></Pressable></View>
            <EventCalendar key={activeDate ?? today} today={today} selectedDate={activeDate} eventDays={demoEvents.map((event) => dayKey(new Date(event.startsAt)))} onSelect={(date) => { setSelectedDate(date); setDatesOpen(false); }} />
            <Pressable accessibilityRole="button" onPress={() => { setSelectedDate(null); setPeriod('all'); setDatesOpen(false); }} style={styles.reset}><Text style={styles.resetText}>Alle Termine anzeigen</Text></Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 19, paddingBottom: 21 },
  headingText: { flex: 1 },
  eyebrow: { color: '#c997bb', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { color: '#c4b3c8', fontSize: 12, lineHeight: 19, marginTop: 4 },
  search: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: '#ffffff1c', backgroundColor: '#1b1521', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
  input: { color: colors.text, flex: 1, minWidth: 0, minHeight: 48, fontSize: 13 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  control: { minHeight: 44, maxWidth: '100%', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff1a', backgroundColor: '#ffffff08' },
  controlText: { color: colors.text, fontSize: 12, flexShrink: 1 },
  genrePanel: { marginTop: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: '#211827' },
  panelLabel: { color: '#bca7be', fontSize: 10, fontWeight: '700', letterSpacing: 0.7, marginBottom: 10 },
  genreOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  genreOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#ffffff15', backgroundColor: '#ffffff08' },
  genreSelected: { borderColor: '#c922ab88', backgroundColor: '#c922ab20' },
  genreText: { color: '#d6c6d8', fontSize: 12 },
  genreSelectedText: { color: '#ffb1e8', fontWeight: '700' },
  periods: { gap: 6, paddingTop: 14, paddingBottom: 4 },
  period: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  periodActive: { backgroundColor: '#c922ab24', borderColor: '#c922ab55' },
  periodLabel: { color: '#c6b6ca', fontSize: 12 },
  periodActiveText: { color: '#ffd5f2', fontWeight: '600' },
  selectedDate: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#c922ab66', borderRadius: 12 },
  selectedDateText: { color: colors.pink, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, paddingTop: 24, paddingBottom: 13, borderTopWidth: 1, borderTopColor: '#ffffff12', marginTop: 14 },
  section: { color: colors.text, fontWeight: '700', fontSize: 17, flexShrink: 1 },
  count: { color: '#c4b3c8', fontSize: 11 },
  note: { color: '#a993ae', fontSize: 10, marginTop: 5 },
  separator: { height: 9 },
  gridRow: { gap: 10 },
  gridCell: { flex: 1, maxWidth: '50%' },
  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 14, gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  reset: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#c922ab88', backgroundColor: '#c922ab22' },
  resetText: { color: '#ffd6f2', fontSize: 12, fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#100916b3' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetContent: { padding: 16, gap: 10 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
