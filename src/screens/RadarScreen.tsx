import { LinearGradient } from 'expo-linear-gradient';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { CitySearch } from '../components/CitySearch';
import { EventCard } from '../components/EventCard';
import { Icon } from '../components/Icon';
import RadarMap from '../components/RadarMap';
import { RadiusSlider } from '../components/RadiusSlider';
import { Screen } from '../components/Screen';
import { colors, type Category } from '../constants/theme';
import { demoEvents, matchesCategory, type DemoEvent } from '../data/events';
import { useLocation } from '../hooks/useLocation';
import { useRadarIntro } from '../hooks/useRadarIntro';

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2
    + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export default function RadarScreen() {
  const [category, setCategory] = useState<Category>('Alle');
  const [radius, setRadius] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);
  const [preview, setPreview] = useState<DemoEvent | null>(null);
  const location = useLocation();
  const { height } = useWindowDimensions();
  const events = useMemo(() => demoEvents.filter((event) => matchesCategory(event, category) && distanceKm(location.center, event.coordinate) <= radius), [category, radius, location.center]);
  const radar = useRadarIntro(`${location.center.latitude}:${location.center.longitude}`, events);

  useFocusEffect(useCallback(() => { setPreview(null); }, []));

  function changeCategory(value: Category) {
    setCategory(value);
    setPreview(null);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.logo}>App<Text style={styles.logoDot}>.</Text></Text>
        <CitySearch label={location.label} locating={location.loading} onLocate={() => { setPreview(null); void location.locate(); }} onSelect={(city) => { setPreview(null); location.selectCity(city); }} />
      </View>
      <View style={styles.filters}>
        <View style={styles.filterChips}><CategoryFilters value={category} onChange={changeCategory} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter und Umkreis einstellen" onPress={() => setFilterOpen(true)} style={styles.filterButton}><Icon name="sliders" size={20} /></Pressable>
      </View>

      <View style={styles.map}>
        <RadarMap center={location.center} radius={radius} events={radar.visibleEvents} onSelect={setPreview} scan={radar} />
        <View pointerEvents="none" style={styles.demoBadge}><View style={styles.demoDot} /><Text style={styles.demoBadgeText}>DEMO</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Umkreis ${radius} Kilometer, ändern`} onPress={() => setFilterOpen(true)} style={styles.radiusBadge}>
          <Icon name="locate" size={14} color="#f1e3f3" /><Text style={styles.radiusText}>{radius} km</Text>
        </Pressable>
        <View pointerEvents="none" style={styles.status}><Text numberOfLines={2} style={styles.statusText}>{radar.scanning ? 'Umgebung wird gescannt …' : location.message}</Text></View>
        {!radar.scanning && preview && (
          <View style={styles.preview}>
            <View style={styles.previewEvent}><EventCard event={preview} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Eventvorschau schließen" onPress={() => setPreview(null)} style={styles.previewClose}><Icon name="close" size={16} /></Pressable>
          </View>
        )}
      </View>

      <RadiusSlider value={radius} onChange={(value) => { setRadius(value); setPreview(null); }} />

      <LinearGradient colors={colors.panelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.eventPanel, { maxHeight: height < 700 ? height * 0.25 : 270 }]}>
        <View style={styles.handle} />
        <View style={styles.panelHeading}>
          <Text style={styles.sectionTitle}>Heute in deiner Nähe</Text>
          <Link href="/explore" asChild><Pressable accessibilityLabel="Alle Demo-Events entdecken" style={styles.seeAll}><Text style={styles.seeAllText}>Alle ansehen</Text><Icon name="chevron" size={12} /></Pressable></Link>
        </View>
        <Text style={styles.demoNote}>Demo-Events · keine Live-Daten</Text>
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => <EventCard event={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.eventList}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Icon name="radar" size={26} color={colors.pink} /><Text style={styles.emptyTitle}>Hier ist noch Platz für deinen Abend.</Text><Text style={styles.emptyText}>Keine Demo-Events für diesen Filter im Umkreis. Wähle „Alle“ oder vergrößere den Radius.</Text></View>}
        />
      </LinearGradient>

      <Modal transparent visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter schließen" onPress={() => setFilterOpen(false)} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.sheetHeading}><Text style={styles.sheetTitle}>Dein Radar</Text><Pressable onPress={() => setFilterOpen(false)} accessibilityRole="button" accessibilityLabel="Filter schließen" style={styles.closeButton}><Icon name="close" /></Pressable></View>
              <Text style={styles.label}>Worauf hast du Lust?</Text>
              <CategoryFilters value={category} onChange={changeCategory} />
              <Text style={styles.label}>Umkreis</Text>
              <View style={styles.radii}>{[5, 10, 20, 30, 50].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: radius === value }} onPress={() => { setRadius(value); setPreview(null); }} style={[styles.radiusOption, radius === value && styles.radiusActive]}><Text style={styles.radiusOptionText}>{value} km</Text></Pressable>)}</View>
              <Text style={styles.sheetHint}>Filter gelten für die Karte und die Liste. Die angezeigten Events sind Designbeispiele in Berlin.</Text>
              <Pressable accessibilityRole="button" onPress={() => setFilterOpen(false)} style={styles.apply}><Text style={styles.applyText}>Radar anzeigen</Text></Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 7, paddingBottom: 5, minHeight: 56, gap: 10, zIndex: 30 },
  logo: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -1.2, width: 60, flexShrink: 0 },
  logoDot: { color: colors.pink },
  filters: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  filterChips: { flex: 1 },
  filterButton: { width: 42, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  map: { flex: 1, minHeight: 130, marginHorizontal: 7, borderRadius: 17, overflow: 'hidden' },
  demoBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#15121cbb', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  demoDot: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.pink },
  demoBadgeText: { fontSize: 8, color: '#e2c6df', letterSpacing: 1.2, fontWeight: '700' },
  radiusBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#15121cdd', borderRadius: 15, minHeight: 36, paddingHorizontal: 11 },
  radiusText: { color: '#f0e6f1', fontSize: 11 },
  status: { position: 'absolute', bottom: 11, left: 12, right: 12, alignItems: 'flex-start' },
  statusText: { color: '#d8c9db', fontSize: 9, backgroundColor: '#17131dc9', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden' },
  preview: { position: 'absolute', bottom: 30, left: 10, right: 10, borderRadius: 15, backgroundColor: colors.surface, flexDirection: 'row', borderWidth: 1, borderColor: '#de5ab970', alignItems: 'center' },
  previewEvent: { flex: 1 },
  previewClose: { width: 32, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  eventPanel: { marginHorizontal: 7, borderTopLeftRadius: 23, borderTopRightRadius: 23, borderWidth: 1, borderBottomWidth: 0, borderColor: '#b872ac30', overflow: 'hidden', paddingTop: 9 },
  handle: { height: 3, width: 33, borderRadius: 3, backgroundColor: '#d0a2c05c', alignSelf: 'center', marginBottom: 5 },
  panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, gap: 6 },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 17, letterSpacing: -0.4, flexShrink: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 34 },
  seeAllText: { color: '#e3cbe2', fontSize: 10 },
  demoNote: { color: '#d5b3ce', fontSize: 9, paddingHorizontal: 13, marginBottom: 9 },
  eventList: { paddingHorizontal: 9, paddingBottom: 9 },
  list: { flexGrow: 0, flexShrink: 1 },
  separator: { height: 7 },
  empty: { alignItems: 'center', gap: 9, padding: 15 },
  emptyTitle: { color: colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#100916b3' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  sheetContent: { padding: 22, gap: 14 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.text, fontSize: 24, fontWeight: '800' },
  closeButton: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  radii: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  radiusOption: { paddingHorizontal: 15, minHeight: 44, justifyContent: 'center', borderRadius: 15, backgroundColor: '#ffffff0c', borderWidth: 1, borderColor: colors.border },
  radiusActive: { backgroundColor: colors.accent, borderColor: colors.pink },
  radiusOptionText: { color: colors.text, fontSize: 13 },
  sheetHint: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  apply: { backgroundColor: colors.accent, borderRadius: 16, alignItems: 'center', padding: 16, marginTop: 3 },
  applyText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
