import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { ExploreEventCard } from '../components/ExploreEventCard';
import { EventCalendar } from '../components/EventCalendar';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { colors, type Category } from '../constants/theme';
import { tabBarContentInset } from '../constants/navigation';
import { demoEvents, matchesCategory, type DemoEvent } from '../data/events';
import { useToday, usePartyWindow } from '../hooks/useToday';
import { dayKey, happensToday } from '../utils/events';

const periods = [
  { id: 'all', label: 'Alle', subtitle: 'Termine' },
  { id: 'today', label: 'Heute', subtitle: 'Demo' },
  { id: 'friday', label: 'Freitag', subtitle: 'ab 21:00' },
  { id: 'saturday', label: 'Samstag', subtitle: 'ab 22:00' },
  { id: 'nextWeek', label: 'Nächste', subtitle: 'Woche' },
] as const;
type Period = typeof periods[number]['id'];

// Quick filters coexist with exact calendar dates, using the event's local day.
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate && selectedDate >= today ? selectedDate : null;
  const dateLabel = activeDate ? new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${activeDate}T12:00:00Z`)) : null;
  const events = demoEvents.filter((event) => matchesCategory(event, category) && (activeDate ? dayKey(new Date(event.startsAt)) === activeDate : matchesPeriod(event, period, partyWindow)) && `${event.title} ${event.categories.join(' ')} ${event.location}`.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de')));
  const [featured, ...remaining] = events;

  function resetFilters() { setSearch(''); setCategory('Alle'); setPeriod('all'); setSelectedDate(null); }

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.headingText}><Text style={styles.title}>Entdecken</Text><Text style={styles.subtitle}>Deine Nacht wartet. Finde den Beat, der dich rauszieht.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Zeitraum auswählen" onPress={() => setDatesOpen(true)} style={styles.calendarButton}><GlassBackdrop radius={22} /><Icon name="calendar" size={21} /></Pressable>
      </View>
      <View style={styles.search}>
        <GlassBackdrop radius={14} />
        <Icon name="search" size={18} />
        <TextInput accessibilityLabel="Events nach Name, Ort oder Genre suchen" value={search} onChangeText={setSearch} placeholder="Event, Ort oder Genre suchen" placeholderTextColor="#b29bb9" style={styles.input} returnKeyType="search" autoCorrect={false} />
        {search.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Suche löschen" onPress={() => setSearch('')} style={styles.clear}><Icon name="close" size={17} /></Pressable>}
      </View>
      <View style={styles.filters}><CategoryFilters value={category} onChange={setCategory} /></View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
          {periods.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.id === 'all' ? 'Alle Termine' : `${item.label} ${item.subtitle}`} accessibilityState={{ selected: !activeDate && period === item.id }} onPress={() => { setPeriod(item.id); setSelectedDate(null); }} style={[styles.period, !activeDate && period === item.id && styles.periodActive]}><Text style={[styles.periodLabel, !activeDate && period === item.id && styles.periodActiveText]}>{item.label}</Text><Text style={[styles.periodSubtitle, !activeDate && period === item.id && styles.periodActiveText]}>{item.subtitle}</Text></Pressable>)}
        </ScrollView>
      </View>
      {activeDate && <Pressable accessibilityRole="button" accessibilityLabel="Datumsfilter entfernen" onPress={() => setSelectedDate(null)} style={styles.selectedDate}><Text style={styles.selectedDateText}>{dateLabel}</Text><Icon name="close" size={14} color={colors.pink} /></Pressable>}
      <View style={styles.sectionHeading}><Text style={styles.section}>{activeDate ? 'Deine Nacht an diesem Tag' : 'Für dich empfohlen'}</Text><Text style={styles.count}>{events.length} {events.length === 1 ? 'Event' : 'Events'}</Text></View>
      <Text style={styles.note}>Demo-Auswahl · keine Live-Daten</Text>
      <FlatList
        data={remaining}
        numColumns={2}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => <View style={styles.gridCell}><ExploreEventCard event={item} /></View>}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarContentInset(insets.bottom) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={featured ? <View style={styles.featured}><ExploreEventCard event={featured} featured /></View> : undefined}
        ListEmptyComponent={!featured ? <View style={styles.empty}><Icon name="search" size={28} color={colors.pink} /><Text style={styles.emptyTitle}>Noch kein Treffer für deinen Abend.</Text><Text style={styles.emptyText}>Versuche einen anderen Suchbegriff oder Zeitraum.</Text><Pressable accessibilityRole="button" onPress={resetFilters} style={styles.reset}><Text style={styles.resetText}>Filter zurücksetzen</Text></Pressable></View> : undefined}
      />
      <Modal visible={datesOpen} transparent animationType="slide" onRequestClose={() => setDatesOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zeitraumauswahl schließen" onPress={() => setDatesOpen(false)} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
            <GlassBackdrop radius={26} variant="panel" />
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.sectionHeading}><Text style={styles.section}>Wann möchtest du los?</Text><Pressable accessibilityRole="button" accessibilityLabel="Zeitraumauswahl schließen" onPress={() => setDatesOpen(false)} style={styles.clear}><Icon name="close" /></Pressable></View>
              <EventCalendar key={activeDate ?? today} today={today} selectedDate={activeDate} eventDays={demoEvents.map((event) => dayKey(new Date(event.startsAt)))} onSelect={(date) => { setSelectedDate(date); setDatesOpen(false); }} />
              <Pressable accessibilityRole="button" onPress={() => { setSelectedDate(null); setPeriod('all'); setDatesOpen(false); }} style={styles.reset}><Text style={styles.resetText}>Alle Termine anzeigen</Text></Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingText: { flex: 1 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  calendarButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff08', alignItems: 'center', justifyContent: 'center' },
  selectedDate: { marginHorizontal: 18, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#c922ab66', borderRadius: 12 },
  selectedDateText: { color: colors.pink, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  search: { marginHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#ffffff08', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9 },
  input: { color: colors.text, flex: 1, minWidth: 0, minHeight: 46, fontSize: 12 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  filters: { marginTop: 8, marginBottom: 5 },
  periods: { paddingHorizontal: 18, gap: 7, paddingBottom: 5 },
  period: { minWidth: 52, minHeight: 48, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: '#ffffff08', alignItems: 'center', justifyContent: 'center', gap: 3 },
  periodActive: { backgroundColor: colors.accent, borderColor: colors.pink },
  periodLabel: { color: colors.text, fontSize: 10, fontWeight: '600' },
  periodSubtitle: { color: colors.muted, fontSize: 9 },
  periodActiveText: { color: colors.text },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 19, marginTop: 12 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, flexShrink: 1 },
  count: { color: colors.pink, fontSize: 10 },
  note: { color: colors.muted, fontSize: 9, paddingHorizontal: 19, marginTop: 4, marginBottom: 9 },
  list: { paddingHorizontal: 18, paddingBottom: 22 },
  featured: { marginBottom: 10 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridCell: { flex: 1, maxWidth: '50%' },
  empty: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 14, gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  reset: { padding: 14, borderRadius: 12, backgroundColor: colors.accent },
  resetText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#100916b3' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetContent: { padding: 16, gap: 10 },
});
