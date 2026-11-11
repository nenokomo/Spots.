import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { Screen } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { PressableScale } from '../components/ui/PressableScale';
import { Sheet } from '../components/ui/Sheet';
import { tabBarContentInset } from '../constants/navigation';
import { brandDotStyle, categories, colors, gutter, radius as corner, space, squircle, type, type Category } from '../constants/theme';
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

/** Radar: header with logo, place and filters; map card; panel "Heute in deiner Nähe". */
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
  const select = useCallback((event: LocatedEvent) => setPreview(event), []);
  const previewVisible = !!preview && !radar.scanning && mapEvents.some((event) => event.id === preview.id);

  const loading = live.loading || upcoming.loading;
  const error = live.error ?? upcoming.error;
  const laterCount = mapEvents.length - liveCount;
  const radiusLabel = `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: visibleRadius < 10 ? 1 : 0 }).format(visibleRadius)} km`;
  const noFix = !location.loading && !location.userCoordinate;
  const statusLine = radar.scanning ? 'Umgebung wird gescannt …' : location.message;
  const summary = loading ? 'Events werden geladen …' : error ? 'Events nicht verfügbar'
    : mapEvents.length === 0 ? 'Keine laufenden Events im Umkreis'
      : [liveCount > 0 ? `${liveCount} live` : null, laterCount > 0 ? `${laterCount} später heute` : null].filter(Boolean).join(' · ');

  const reset = useCallback(async () => {
    setPreview(null);
    await locate();
    setRadius(30);
  }, [locate]);

  useFocusEffect(useCallback(() => {
    setPreview(null);
    setRadius(30);
    setVisibleRadius(30);
    void locate({ automatic: true });
  }, [locate]));

  const tabInset = tabBarContentInset(insets.bottom);
  const panelHeight = Math.min(290, height * 0.34) + tabInset;

  return (
    <Screen>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.logo}>Spots<Text style={brandDotStyle}>.</Text></Text>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Ort ändern, aktuell ${location.label}`} onPress={() => setPlaceOpen(true)} scaleTo={0.96} style={styles.place}>
          <Icon name="pin" size={16} color={colors.pink} />
          <Text numberOfLines={1} style={styles.placeLabel}>{location.loading ? 'Standort …' : location.label}</Text>
          <Icon name="down" size={12} color={colors.muted} />
        </PressableScale>
        <IconButton icon="profile" accessibilityLabel="Profil öffnen" onPress={() => router.navigate('/profile')} size={40} plain style={styles.profileButton} />
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          {categories.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => { setCategory(item); setPreview(null); }} />)}
        </ScrollView>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter" onPress={() => setFilterOpen(true)} hitSlop={8} style={styles.filterButton}><Icon name="sliders" size={20} color={colors.text} /></Pressable>
      </View>

      <View style={[styles.map, { marginBottom: panelHeight - tabInset }]}>
        <RadarMap center={location.center} userCoordinate={location.userCoordinate} radius={radius} events={radar.visibleEvents} onSelect={select}
          onCenterChange={onCenterChange} onVisibleRadiusChange={onVisibleRadiusChange} scan={radar} locked={radar.scanning} />
        <View pointerEvents="none" style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>{liveCount > 0 ? `${liveCount} LIVE` : 'RADAR'}</Text></View>
        <View pointerEvents="none" style={styles.radiusBadge}><Icon name="locate" size={14} color={colors.text} /><Text style={styles.radiusText}>{radiusLabel}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Zu meinem Standort, 30 Kilometer Umkreis" disabled={location.loading} onPress={() => void reset()} style={[styles.locateButton, location.loading && styles.locating]}><Icon name="locate" size={20} color={colors.text} /></Pressable>
        <View pointerEvents="none" style={styles.status}><Text numberOfLines={1} style={styles.statusText}>{noFix && !radar.scanning ? `${statusLine} · Mitte: ${location.label}` : statusLine}</Text></View>
        {previewVisible && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Eventvorschau schließen" onPress={() => setPreview(null)} style={StyleSheet.absoluteFill} />
            <View testID="event-preview" style={styles.preview}>
              <GlassBackdrop radius={corner.lg} variant="panel" />
              <EventRow event={preview} href={eventHref(preview, 'radar')} now={now} today={today} distanceKm={distanceKm(searchCenter, preview.coordinate)} trailing={<SaveEventButton id={preview.id} title={preview.title} size={36} />} />
            </View>
          </View>
        )}
      </View>

      <View style={[styles.panel, { height: panelHeight, paddingBottom: tabInset }]}>
        <GlassBackdrop radius={corner.xl} variant="panel" />
        <View style={styles.handle} />
        <View style={styles.panelHeader}>
          <View style={styles.panelCopy}>
            <Text accessibilityRole="header" style={styles.headline}>Heute in deiner Nähe</Text>
            <Text numberOfLines={1} style={styles.summary}>{summary}</Text>
          </View>
          <PressableScale accessibilityRole="button" accessibilityLabel="Alle Events des Radars ansehen" onPress={() => router.push({ pathname: '/today', params: { category, radius: String(radius), latitude: String(searchCenter.latitude), longitude: String(searchCenter.longitude) } })} hitSlop={8} style={styles.more}>
            <Text style={styles.moreText}>Alle ansehen</Text>
            <Icon name="chevron" size={13} color={colors.text} />
          </PressableScale>
        </View>
        <FlatList
          data={radar.visibleEvents}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => <View style={styles.row}><EventRow event={item} href={eventHref(item, 'radar')} now={now} today={today} distanceKm={distanceKm(searchCenter, item.coordinate)} trailing={<SaveEventButton id={item.id} title={item.title} size={36} />} /></View>}
          getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={loading || error ? <EventDataState loading={loading} error={error} onRetry={() => { live.reload(); upcoming.reload(); }} />
            : <View style={styles.empty}>
                <Icon name="radar" size={30} color={colors.pink} />
                <Text style={styles.emptyTitle}>{radar.scanning ? 'Deine Umgebung wird entdeckt …' : 'Hier ist noch Platz für deinen Abend.'}</Text>
                <Text style={styles.emptyText}>{radar.scanning ? 'Die Events erscheinen gleich zusammen mit den Pins.' : category !== 'Alle' ? 'Keine Events für diesen Filter im Umkreis. Wähle „Alle“ oder vergrößere den Radius.' : 'Keine laufenden Events im Umkreis. Vergrößere den Radius oder schau in Entdecken.'}</Text>
              </View>}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Sheet visible={placeOpen} title="Wo bist du unterwegs?" onClose={() => setPlaceOpen(false)} tall>
        <View style={styles.citySearch}><CitySearch flush label={location.label} locating={location.loading} onLocate={() => { setPlaceOpen(false); void reset(); }} onSelect={(city) => { setPreview(null); location.selectCity(city); setPlaceOpen(false); }} /></View>
        <Button label="Meinen Standort verwenden" icon="locate" variant="secondary" onPress={() => { setPlaceOpen(false); void reset(); }} />
        <Text style={styles.hint}>{location.message}. Dein Standort bleibt auf dem Gerät.</Text>
      </Sheet>

      <Sheet visible={filterOpen} title="Filter" onClose={() => setFilterOpen(false)}>
        <View style={styles.group}><Text style={styles.label}>Worauf hast du Lust?</Text><CategoryFilters value={category} onChange={(item) => { setCategory(item); setPreview(null); }} /></View>
        <View style={styles.group}><Text style={styles.label}>Umkreis</Text><RadiusSlider value={radius} onChange={(value) => { setRadius(value); setPreview(null); }} /></View>
        <Button label="Radar anzeigen" onPress={() => setFilterOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: gutter, paddingTop: space.sm, minHeight: 56 },
  logo: { ...type.title, fontSize: 30, color: colors.text, width: 92 },
  place: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, height: 40 },
  placeLabel: { ...type.headline, fontSize: 17, color: colors.text, flexShrink: 1 },
  profileButton: { backgroundColor: colors.accentSoft },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: gutter, paddingTop: space.md, paddingBottom: space.md },
  chipScroll: { flex: 1 },
  chips: { gap: space.sm, paddingRight: space.sm },
  filterButton: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1, marginHorizontal: space.md, borderRadius: corner.xl, overflow: 'hidden', backgroundColor: '#1f1a2e', ...squircle },
  liveBadge: { position: 'absolute', top: space.md, left: space.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 32, borderRadius: 16, backgroundColor: '#100b15cc' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink },
  liveBadgeText: { ...type.overline, fontSize: 11, letterSpacing: 1.6, color: colors.text },
  radiusBadge: { position: 'absolute', top: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 40, borderRadius: 20, backgroundColor: '#100b15cc' },
  radiusText: { ...type.headline, fontSize: 16, color: colors.text },
  locateButton: { position: 'absolute', right: space.md, bottom: space.md, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#100b15cc', borderWidth: 1, borderColor: '#b872ac40' },
  locating: { opacity: 0.5 },
  status: { position: 'absolute', left: space.md, bottom: space.lg, right: 72 },
  statusText: { ...type.footnote, fontSize: 12, color: colors.text, alignSelf: 'flex-start', backgroundColor: '#100b15b3', borderRadius: 8, overflow: 'hidden', paddingHorizontal: space.sm, paddingVertical: 4 },
  preview: { position: 'absolute', left: space.md, right: space.md, top: '50%', marginTop: -46, paddingHorizontal: space.md, borderRadius: corner.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#de5ab970', ...squircle },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: corner.xl, borderTopRightRadius: corner.xl, overflow: 'hidden', ...squircle },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#ffffff40', marginTop: space.sm },
  panelHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.xs },
  panelCopy: { flex: 1, minWidth: 0 },
  headline: { ...type.title2, color: colors.text },
  summary: { ...type.footnote, color: colors.muted, marginTop: 2 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 32, paddingBottom: 2 },
  moreText: { ...type.callout, color: colors.text },
  row: { paddingHorizontal: gutter },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: gutter + 68 + space.md },
  empty: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xxl, paddingTop: space.xl },
  emptyTitle: { ...type.title3, color: colors.text, textAlign: 'center' },
  emptyText: { ...type.callout, color: colors.muted, textAlign: 'center' },
  citySearch: { minHeight: 48, zIndex: 10 },
  hint: { ...type.footnote, color: colors.faint },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
});
