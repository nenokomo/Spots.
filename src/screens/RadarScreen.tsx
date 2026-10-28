import { Link, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { CitySearch, type CitySearchHandle } from '../components/CitySearch';
import { EventCard } from '../components/EventCard';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { AnimatedEventCard } from '../components/AnimatedEventCard';
import { Icon } from '../components/Icon';
import RadarMap from '../components/RadarMap';
import { RadiusSlider } from '../components/RadiusSlider';
import { Screen } from '../components/Screen';
import { colors, type Category } from '../constants/theme';
import { tabBarContentInset } from '../constants/navigation';
import { demoEvents, matchesCategory, type DemoEvent } from '../data/events';
import { useLocation } from '../hooks/useLocation';
import { useRadarIntro } from '../hooks/useRadarIntro';
import { usePartyWindow } from '../hooks/useToday';
import { distanceKm, happensToday, type Coordinate } from '../utils/events';

export default function RadarScreen() {
  const [category, setCategory] = useState<Category>('Alle');
  const [radius, setRadius] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);
  const [preview, setPreview] = useState<DemoEvent | null>(null);
  const [mapLayout, setMapLayout] = useState({ y: 100, height: 300 });
  const location = useLocation();
  const citySearch = useRef<CitySearchHandle>(null);
  const { locate } = location;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigationInset = tabBarContentInset(insets.bottom);
  const today = usePartyWindow();
  const [viewport, setViewport] = useState({ source: location.center, center: location.center });
  const searchCenter = viewport.source === location.center ? viewport.center : location.center;
  const onCenterChange = useCallback((center: Coordinate) => {
    setViewport((previous) => previous.source === location.center && distanceKm(previous.center, center) < 0.01 ? previous : { source: location.center, center });
    setPreview(null);
  }, [location.center]);
  const todayEvents = useMemo(() => demoEvents.filter((event) => happensToday(event, today) && matchesCategory(event, category) && distanceKm(searchCenter, event.coordinate) <= radius), [category, radius, searchCenter, today]);
  const radar = useRadarIntro(todayEvents);
  const visibleTodayEvents = radar.visibleEvents;

  useFocusEffect(useCallback(() => {
    setPreview(null);
    void locate({ automatic: true });
    return () => citySearch.current?.dismiss();
  }, [locate]));

  function changeCategory(value: Category) {
    setCategory(value);
    setPreview(null);
  }

  return (
    <Screen>
      <View style={styles.content} onTouchStart={() => citySearch.current?.dismiss()} onPointerDown={() => citySearch.current?.dismiss()}>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.logo}>Spots<Text style={styles.logoDot}>.</Text></Text>
        <CitySearch ref={citySearch} compact label={location.label} locating={location.loading} onLocate={() => { setPreview(null); void location.locate(); }} onSelect={(city) => { setPreview(null); location.selectCity(city); }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Filter und Umkreis einstellen" onPress={() => setFilterOpen(true)} style={styles.filterButton}><Icon name="sliders" size={23} /></Pressable>
      </View>
      <View style={styles.filters}>
        <View style={styles.filterChips}><CategoryFilters value={category} onChange={changeCategory} /></View>
      </View>

      <View style={styles.map} onLayout={(event) => setMapLayout({ y: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height })}>
        <RadarMap center={location.center} radius={radius} events={radar.visibleEvents} onSelect={setPreview} onCenterChange={onCenterChange} scan={radar} />
        <View pointerEvents="none" style={styles.demoBadge}><View style={styles.demoDot} /><Text style={styles.demoBadgeText}>{todayEvents.length} Demo-Partys heute</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Umkreis ${radius} Kilometer, ändern`} onPress={() => setFilterOpen(true)} style={styles.radiusBadge}>
          <Icon name="locate" size={14} color={colors.pink} /><Text style={styles.radiusText}>{radius} km</Text><Icon name="down" size={12} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Aktuellen Standort verwenden" disabled={location.loading} onPress={() => { setPreview(null); void location.locate(); }} style={[styles.locateButton, location.loading && styles.locating]}><Icon name="locate" size={22} color={colors.text} /></Pressable>
        <View pointerEvents="none" style={styles.status}><Text numberOfLines={2} style={styles.statusText}>{radar.scanning ? 'Umgebung wird gescannt …' : location.message}</Text></View>
      </View>

      <LinearGradient testID="radar-today-panel" colors={colors.panelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.eventPanel, { height: Math.min(290, height * 0.35) + navigationInset, paddingBottom: navigationInset }]}>
        <View style={styles.handle} />
        <View style={styles.panelHeading}>
          <Text style={styles.sectionTitle}>Heute in deiner Nähe</Text>
          <Link href={{ pathname: '/today', params: { category, radius: String(radius), latitude: String(searchCenter.latitude), longitude: String(searchCenter.longitude) } }} asChild><Pressable accessibilityLabel="Alle Events von heute in der Nähe ansehen" style={styles.seeAll}><Text style={styles.seeAllText}>Alle ansehen</Text><Icon name="chevron" size={14} color={colors.pink} /></Pressable></Link>
        </View>
        <FlatList
          data={visibleTodayEvents}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => <AnimatedEventCard event={item} reduceMotion={radar.reduceMotion} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.eventList}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{radar.scanning || todayEvents.length > 0 ? 'Deine Umgebung wird entdeckt …' : 'Heute keine Partys in diesem Kartenausschnitt.'}</Text><Text style={styles.emptyText}>{radar.scanning || todayEvents.length > 0 ? 'Die Partys erscheinen gleich zusammen mit den Pins.' : 'Verschiebe die Karte oder ändere Genre und Umkreis.'}</Text></View>}
        />
        <Text style={styles.demoNote}>Demo-Events · keine Live-Daten</Text>
      </LinearGradient>

      {!radar.scanning && preview && (
        <View style={styles.previewLayer} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Eventvorschau schließen" onPress={() => setPreview(null)} style={StyleSheet.absoluteFill} />
          <View testID="event-preview" style={[styles.preview, { top: Math.max(mapLayout.y + 50, mapLayout.y + mapLayout.height - 190) }]}>
            <EventCard event={preview} compact showChevron={false} />
          </View>
        </View>
      )}

      <Modal transparent visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter schließen" onPress={() => setFilterOpen(false)} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
            <GlassBackdrop radius={28} variant="panel" />
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View style={styles.sheetHeading}><Text style={styles.sheetTitle}>Dein Radar</Text><Pressable onPress={() => setFilterOpen(false)} accessibilityRole="button" accessibilityLabel="Filter schließen" style={styles.closeButton}><Icon name="close" /></Pressable></View>
              <Text style={styles.label}>Worauf hast du Lust?</Text>
              <CategoryFilters value={category} onChange={changeCategory} />
              <Text style={styles.label}>Umkreis</Text>
              <RadiusSlider value={radius} onChange={(value) => { setRadius(value); setPreview(null); }} />
              <View style={styles.radii}>{[10, 20, 30, 50].map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: radius === value }} onPress={() => { setRadius(value); setPreview(null); }} style={[styles.radiusOption, radius === value && styles.radiusActive]}><Text style={styles.radiusOptionText}>{value} km</Text></Pressable>)}</View>
              <Text style={styles.sheetHint}>Der Umkreis gilt ab der aktuellen Kartenmitte. Die Liste zeigt nur heutige Demo-Partys; Beispiele gibt es in Berlin und Karlsruhe.</Text>
              <Pressable accessibilityRole="button" onPress={() => setFilterOpen(false)} style={styles.apply}><Text style={styles.applyText}>Radar anzeigen</Text></Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 2, paddingBottom: 2, minHeight: 52, gap: 12, zIndex: 30 },
  logo: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -1.2, width: 80, flexShrink: 0 },
  logoDot: { color: colors.pink },
  filters: { flexDirection: 'row', alignItems: 'center', paddingBottom: 3 },
  filterChips: { flex: 1 },
  filterButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1, minHeight: 130, marginHorizontal: 5, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  demoBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#15121cbb', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  demoDot: { height: 5, width: 5, borderRadius: 3, backgroundColor: colors.pink },
  demoBadgeText: { fontSize: 10, color: '#e2c6df', fontWeight: '600' },
  radiusBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#15121cdd', borderRadius: 15, minHeight: 36, paddingHorizontal: 11 },
  radiusText: { color: '#f0e6f1', fontSize: 11 },
  locateButton: { position: 'absolute', bottom: 37, right: 14, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17101fee', borderWidth: 1, borderColor: '#b872ac40' },
  locating: { opacity: 0.5 },
  status: { position: 'absolute', bottom: 26, left: 12, right: 67, alignItems: 'flex-start' },
  statusText: { color: '#d8c9db', fontSize: 9, backgroundColor: '#17131dc9', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, overflow: 'hidden' },
  previewLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 },
  preview: { position: 'absolute', left: 15, right: 15, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#de5ab970' },
  eventPanel: { marginHorizontal: 5, marginTop: -18, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1, borderBottomWidth: 0, borderColor: '#b872ac50', overflow: 'hidden', paddingTop: 7, paddingBottom: 6, flexShrink: 0 },
  handle: { height: 3, width: 33, borderRadius: 3, backgroundColor: '#d0a2c05c', alignSelf: 'center', marginBottom: 5 },
  panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, gap: 6 },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 15, letterSpacing: -0.3, flexShrink: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 4 },
  seeAllText: { color: colors.pink, fontSize: 12, fontWeight: '700' },
  demoNote: { color: '#d5b3ce', fontSize: 9, paddingHorizontal: 13, marginTop: 5 },
  eventList: { paddingHorizontal: 13, paddingTop: 1 },
  list: { flex: 1 },
  separator: { height: 7 },
  empty: { alignItems: 'center', gap: 9, padding: 15 },
  emptyTitle: { color: colors.text, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#100916b3' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
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
