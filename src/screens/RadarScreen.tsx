import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { CitySearch } from '../components/CitySearch';
import { EventDataState } from '../components/EventDataState';
import { EVENT_ROW_HEIGHT, EventRow } from '../components/EventRow';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import RadarMap from '../components/RadarMap';
import { RadiusSlider } from '../components/RadiusSlider';
import { SaveEventButton } from '../components/SaveEventButton';
import { Button, IconButton } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Sheet } from '../components/ui/Sheet';
import { tabBarContentInset } from '../constants/navigation';
import { colors, gutter, radius as corner, space, squircle, type, type Category } from '../constants/theme';
import { useLiveEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useLocation } from '../hooks/useLocation';
import { useNow } from '../hooks/useNow';
import { useRadarIntro } from '../hooks/useRadarIntro';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import { isLocatedEvent, matchesCategory, type LocatedEvent } from '../types/events';
import { isTonight } from '../utils/eventStatus';
import { distanceKm, type Coordinate } from '../utils/events';

const ROW = EVENT_ROW_HEIGHT + StyleSheet.hairlineWidth;

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const now = useNow();
  const today = useToday();
  const [category, setCategory] = useState<Category>('Alle');
  const [radius, setRadius] = useState(30);
  const [visibleRadius, setVisibleRadius] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [preview, setPreview] = useState<LocatedEvent | null>(null);
  const location = useLocation();
  const { locate } = location;
  const live = useLiveEvents();
  const upcoming = useUpcomingEvents();

  const onVisibleRadiusChange = useCallback((value: number) => {
    if (Number.isFinite(value) && value > 0) setVisibleRadius(Math.round(value * 100) / 100);
  }, []);
  const [viewport, setViewport] = useState({ source: location.center, center: location.center });
  const searchCenter = viewport.source === location.center ? viewport.center : location.center;
  const onCenterChange = useCallback((center: Coordinate) => {
    setPreview(null);
    setViewport((previous) => previous.source === location.center && distanceKm(previous.center, center) < 0.01 ? previous : { source: location.center, center });
  }, [location.center]);

  // Running events first, then everything that starts later tonight.
  const { mapEvents, liveCount } = useMemo(() => {
    const inReach = (event: LocatedEvent) => matchesCategory(event, category) && distanceKm(searchCenter, event.coordinate) <= radius;
    const running = live.events.filter(inReach);
    const tonight = upcoming.events.filter((event): event is LocatedEvent => isLocatedEvent(event) && isTonight(event, now) && inReach(event))
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    return { mapEvents: [...running, ...tonight], liveCount: running.length };
  }, [live.events, upcoming.events, category, searchCenter, radius, now]);
  const radar = useRadarIntro(mapEvents);

  // Quiet around here: offer the nearest real upcoming events instead of an empty panel. List only, no pins.
  const nearest = useMemo(() => mapEvents.length > 0 ? [] : upcoming.events
    .filter((event): event is LocatedEvent => isLocatedEvent(event) && matchesCategory(event, category))
    .map((event) => ({ event, distance: distanceKm(searchCenter, event.coordinate) }))
    .sort((a, b) => a.distance - b.distance).slice(0, 4).map((item) => item.event), [mapEvents.length, upcoming.events, category, searchCenter]);

  const loading = live.loading || upcoming.loading;
  const error = live.error ?? upcoming.error;
  const quiet = !radar.scanning && !loading && !error && mapEvents.length === 0;
  const rows = mapEvents.length > 0 ? radar.visibleEvents : quiet ? nearest : [];
  const laterCount = mapEvents.length - liveCount;
  const filtered = category !== 'Alle' || radius !== 30;
  const radiusLabel = `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: visibleRadius < 10 ? 1 : 0 }).format(visibleRadius)} km`;

  const headline = radar.scanning ? 'Scan läuft' : quiet ? 'Gerade ruhig hier' : liveCount > 0 ? 'Partys heute' : 'Heute Nacht';
  const summary = radar.scanning ? `${radiusLabel} um ${location.label}`
    : quiet ? (nearest.length > 0 ? 'Die nächsten Events in der Nähe' : 'Karte verschieben oder Entdecken öffnen')
      : [liveCount > 0 ? `${liveCount} live` : null, laterCount > 0 ? `${laterCount} später` : null, location.userCoordinate ? 'um dich' : `um ${location.label}`].filter(Boolean).join(' · ');
  const noFix = !location.loading && !location.userCoordinate && location.label !== 'Dein Standort';

  const reset = useCallback(async () => {
    await locate();
    setRadius(30);
  }, [locate]);

  useFocusEffect(useCallback(() => {
    setPreview(null);
    setRadius(30);
    setVisibleRadius(30);
    void locate({ automatic: true });
  }, [locate]));

  const select = useCallback((event: LocatedEvent) => setPreview(event), []);
  const previewVisible = !!preview && !radar.scanning && mapEvents.some((event) => event.id === preview.id);

  // The panel shows about three events at once; the map keeps the rest of the screen.
  const tabInset = tabBarContentInset(insets.bottom);
  const panelHeight = Math.min(Math.max(250, height * 0.36), 340) + tabInset;
  const topInset = insets.top + 64;

  return (
    <View style={styles.screen}>
      <View style={[styles.map, { bottom: panelHeight }]}>
        <RadarMap center={location.center} userCoordinate={location.userCoordinate} radius={radius} events={radar.visibleEvents} onSelect={select}
          onCenterChange={onCenterChange} onVisibleRadiusChange={onVisibleRadiusChange} scan={radar} topInset={topInset} locked={radar.scanning} />
      </View>

      <LinearGradient pointerEvents="none" colors={['#100b15b3', '#100b1500']} style={[styles.topShade, { height: insets.top + 110 }]} />

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Ort ändern, aktuell ${location.label}`} onPress={() => setPlaceOpen(true)} scaleTo={0.96} style={styles.place}>
          <GlassBackdrop radius={22} />
          <Icon name="pin" size={15} color={colors.pink} />
          <Text numberOfLines={1} style={styles.placeLabel}>{location.loading ? 'Standort …' : location.label}</Text>
          <Icon name="down" size={12} color={colors.muted} />
        </PressableScale>
        <View>
          <IconButton icon="sliders" accessibilityLabel="Filter" onPress={() => setFilterOpen(true)} />
          {filtered && <View pointerEvents="none" style={styles.filterDot} />}
        </View>
      </View>

      {previewVisible && (
        <View style={[styles.previewLayer, { bottom: panelHeight }]} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Eventvorschau schließen" onPress={() => setPreview(null)} style={StyleSheet.absoluteFill} />
          <View testID="event-preview" style={styles.preview}>
            <GlassBackdrop radius={corner.xl} variant="panel" />
            <EventRow event={preview} href={eventHref(preview, 'radar')} now={now} today={today} distanceKm={distanceKm(searchCenter, preview.coordinate)} trailing={<SaveEventButton id={preview.id} title={preview.title} size={36} />} />
          </View>
        </View>
      )}

      <View pointerEvents="none" style={[styles.radiusPill, { bottom: panelHeight + space.md + 4 }]}>
        <GlassBackdrop radius={18} />
        <Icon name="radar" size={14} color={colors.pink} />
        <Text style={styles.radiusText}>{radiusLabel} Umkreis</Text>
      </View>

      <View pointerEvents="box-none" style={[styles.locate, { bottom: panelHeight + space.md }]}>
        <IconButton icon="locate" accessibilityLabel="Zu meinem Standort, 30 Kilometer Umkreis" onPress={() => void reset()} />
      </View>

      <View style={[styles.panel, { height: panelHeight, paddingBottom: tabInset }]}>
        <LinearGradient pointerEvents="none" colors={colors.panelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.panelHeader}>
          <View style={styles.panelCopy}>
            <Text accessibilityRole="header" style={styles.headline}>{headline}</Text>
            <Text numberOfLines={1} style={styles.summary}>{noFix ? `Kein Standort · ${location.label} als Mitte` : summary}</Text>
          </View>
          <PressableScale accessibilityRole="button" accessibilityLabel="Alle Events des Radars ansehen" onPress={() => router.push({ pathname: '/today', params: { category, radius: String(radius), latitude: String(searchCenter.latitude), longitude: String(searchCenter.longitude) } })} hitSlop={8} style={styles.more}>
            <Text style={styles.moreText}>Alle</Text>
            <Icon name="chevron" size={12} color={colors.pink} />
          </PressableScale>
        </View>
        <FlatList
          data={rows}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <EventRow event={item} href={eventHref(item, 'radar')} now={now} today={today} distanceKm={distanceKm(searchCenter, item.coordinate)} trailing={<SaveEventButton id={item.id} title={item.title} size={36} />} />
            </View>
          )}
          getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={loading || error ? <EventDataState loading={loading} error={error} onRetry={() => { live.reload(); upcoming.reload(); }} />
            : radar.scanning ? <Text style={styles.empty}>Die Events erscheinen gleich zusammen mit den Pins.</Text>
              : <Text style={styles.empty}>In diesem Kartenausschnitt ist heute nichts geplant.</Text>}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Sheet visible={placeOpen} title="Wo bist du unterwegs?" onClose={() => setPlaceOpen(false)} tall>
        <View style={styles.citySearch}><CitySearch flush label={location.label} locating={location.loading} onLocate={() => { setPlaceOpen(false); void reset(); }} onSelect={(city) => { location.selectCity(city); setPlaceOpen(false); }} /></View>
        <Button label="Meinen Standort verwenden" icon="locate" variant="secondary" onPress={() => { setPlaceOpen(false); void reset(); }} />
        <Text style={styles.hint}>{location.message}. Dein Standort bleibt auf dem Gerät.</Text>
      </Sheet>

      <Sheet visible={filterOpen} title="Filter" onClose={() => setFilterOpen(false)}>
        <View style={styles.group}><Text style={styles.label}>Worauf hast du Lust?</Text><CategoryFilters value={category} onChange={setCategory} /></View>
        <View style={styles.group}><Text style={styles.label}>Umkreis</Text><RadiusSlider value={radius} onChange={setRadius} /></View>
        <Button label="Fertig" onPress={() => setFilterOpen(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  map: { position: 'absolute', top: 0, left: 0, right: 0 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg },
  place: { flexShrink: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, borderRadius: 22, overflow: 'hidden' },
  placeLabel: { ...type.headline, fontSize: 16, color: colors.text, flexShrink: 1 },
  radiusPill: { position: 'absolute', left: space.lg, height: 36, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, borderRadius: 18, overflow: 'hidden' },
  radiusText: { ...type.label, fontSize: 13, color: colors.text },
  filterDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.background },
  locate: { position: 'absolute', right: space.lg },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.background, borderTopLeftRadius: corner.xl, borderTopRightRadius: corner.xl, borderTopWidth: 1, borderColor: '#b872ac50', overflow: 'hidden', ...squircle },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xs },
  panelCopy: { flex: 1, minWidth: 0 },
  headline: { ...type.title2, color: colors.text },
  summary: { ...type.footnote, color: colors.muted, marginTop: 1 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 32 },
  moreText: { ...type.callout, color: colors.pink },
  row: { paddingHorizontal: gutter },
  previewLayer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 },
  preview: { position: 'absolute', left: space.lg, right: space.lg, top: '50%', marginTop: -46, paddingHorizontal: space.md, borderRadius: corner.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#de5ab970', ...squircle },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: gutter + 68 + space.md },
  empty: { ...type.callout, color: colors.faint, paddingHorizontal: gutter, paddingTop: space.lg },
  citySearch: { minHeight: 48, zIndex: 10 },
  hint: { ...type.footnote, color: colors.faint },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
});
