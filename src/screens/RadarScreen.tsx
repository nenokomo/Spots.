import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilters } from '../components/CategoryFilters';
import { CitySearch } from '../components/CitySearch';
import { RadarCard } from '../components/EventCards';
import { EventDataState } from '../components/EventDataState';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import RadarMap from '../components/RadarMap';
import { RadiusSlider } from '../components/RadiusSlider';
import { Button, IconButton } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Sheet } from '../components/ui/Sheet';
import { tabBarContentInset } from '../constants/navigation';
import { colors, gutter, space, type, type Category } from '../constants/theme';
import { useLiveEvents, useUpcomingEvents } from '../hooks/useEvents';
import { useLocation } from '../hooks/useLocation';
import { useNow } from '../hooks/useNow';
import { useRadarIntro } from '../hooks/useRadarIntro';
import { useToday } from '../hooks/useToday';
import { eventHref } from '../navigation/eventRoutes';
import { isLocatedEvent, matchesCategory, type LocatedEvent } from '../types/events';
import { isTonight } from '../utils/eventStatus';
import { distanceKm, type Coordinate } from '../utils/events';

const CARD_GAP = 10;
const DECK_HEIGHT = 196;

export default function RadarScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNow();
  const today = useToday();
  const [category, setCategory] = useState<Category>('Alle');
  const [radius, setRadius] = useState(30);
  const [visibleRadius, setVisibleRadius] = useState(30);
  const [filterOpen, setFilterOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const deck = useRef<FlatList<LocatedEvent>>(null);
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

  // Quiet around here: offer the nearest real upcoming events instead of an empty map. List only, no pins.
  const nearest = useMemo(() => mapEvents.length > 0 ? [] : upcoming.events
    .filter((event): event is LocatedEvent => isLocatedEvent(event) && matchesCategory(event, category))
    .map((event) => ({ event, distance: distanceKm(searchCenter, event.coordinate) }))
    .sort((a, b) => a.distance - b.distance).slice(0, 4).map((item) => item.event), [mapEvents.length, upcoming.events, category, searchCenter]);

  const loading = live.loading || upcoming.loading;
  const error = live.error ?? upcoming.error;
  const quiet = !radar.scanning && !loading && !error && mapEvents.length === 0;
  const cards = mapEvents.length > 0 ? radar.visibleEvents : quiet ? nearest : [];
  const cardWidth = Math.min(width - gutter * 2 - 24, 420);
  const laterCount = mapEvents.length - liveCount;
  const filtered = category !== 'Alle' || radius !== 30;
  const radiusLabel = `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: visibleRadius < 10 ? 1 : 0 }).format(visibleRadius)} km`;

  const headline = radar.scanning ? 'Scan läuft' : quiet ? 'Gerade ruhig hier' : liveCount > 0 ? 'Jetzt los' : 'Heute Nacht';
  const summary = radar.scanning ? `${radiusLabel} um ${location.label}`
    : quiet ? (nearest.length > 0 ? 'Die nächsten Events in deiner Nähe' : 'Verschiebe die Karte oder schau in Entdecken.')
      : [liveCount > 0 ? `${liveCount} live` : null, laterCount > 0 ? `${laterCount} später heute` : null, radiusLabel].filter(Boolean).join(' · ');

  const reset = useCallback(async () => {
    await locate();
    setRadius(30);
  }, [locate]);

  useFocusEffect(useCallback(() => {
    setRadius(30);
    setVisibleRadius(30);
    void locate({ automatic: true });
  }, [locate]));

  function select(event: LocatedEvent) {
    const index = cards.findIndex((item) => item.id === event.id);
    if (index >= 0) deck.current?.scrollToIndex({ index, animated: true });
  }

  const bottomInset = tabBarContentInset(insets.bottom) + DECK_HEIGHT;
  const topInset = insets.top + 64;

  return (
    <View style={styles.screen}>
      <RadarMap center={location.center} userCoordinate={location.userCoordinate} radius={radius} events={radar.visibleEvents} onSelect={select}
        onCenterChange={onCenterChange} onVisibleRadiusChange={onVisibleRadiusChange} scan={radar} topInset={topInset} bottomInset={bottomInset} />

      <LinearGradient pointerEvents="none" colors={['#000000b3', '#00000000']} style={[styles.topShade, { height: insets.top + 110 }]} />
      <LinearGradient pointerEvents="none" colors={['#00000000', '#000000cc', '#000000']} locations={[0, 0.45, 1]} style={[styles.bottomShade, { height: bottomInset + 90 }]} />

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Ort ändern, aktuell ${location.label}`} onPress={() => setPlaceOpen(true)} scaleTo={0.96} style={styles.place}>
          <GlassBackdrop radius={22} />
          <Icon name="locate" size={15} color={colors.pink} />
          <Text numberOfLines={1} style={styles.placeLabel}>{location.loading ? 'Standort …' : location.label}</Text>
          <Icon name="down" size={12} color={colors.muted} />
        </PressableScale>
        <View style={styles.topActions}>
          <View>
            <IconButton icon="sliders" accessibilityLabel="Filter" onPress={() => setFilterOpen(true)} />
            {filtered && <View pointerEvents="none" style={styles.filterDot} />}
          </View>
          <IconButton icon="profile" accessibilityLabel="Profil öffnen" onPress={() => router.push('/profile')} />
        </View>
      </View>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: tabBarContentInset(insets.bottom) }]}>
        <View pointerEvents="box-none" style={styles.deckHeader}>
          <View style={styles.deckCopy}>
            <Text accessibilityRole="header" style={styles.headline}>{headline}</Text>
            <Text numberOfLines={1} style={styles.summary}>{summary}</Text>
          </View>
          <IconButton icon="locate" accessibilityLabel="Zu meinem Standort, 30 Kilometer Umkreis" onPress={() => void reset()} />
        </View>
        {(loading || error) && cards.length === 0
          ? <View style={styles.state}><EventDataState loading={loading} error={error} onRetry={() => { live.reload(); upcoming.reload(); }} /></View>
          : <FlatList
              ref={deck}
              horizontal
              data={cards}
              keyExtractor={(event) => event.id}
              renderItem={({ item }) => <RadarCard event={item} href={eventHref(item, 'radar')} today={today} now={now} width={cardWidth} distanceKm={distanceKm(searchCenter, item.coordinate)} />}
              getItemLayout={(_, index) => ({ length: cardWidth + CARD_GAP, offset: (cardWidth + CARD_GAP) * index, index })}
              ItemSeparatorComponent={() => <View style={styles.gap} />}
              contentContainerStyle={styles.deck}
              snapToInterval={cardWidth + CARD_GAP}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              style={styles.deckList}
            />}
      </View>

      <Sheet visible={placeOpen} title="Wo bist du unterwegs?" onClose={() => setPlaceOpen(false)} tall>
        <View style={styles.citySearch}><CitySearch flush label={location.label} locating={location.loading} onLocate={() => { setPlaceOpen(false); void reset(); }} onSelect={(city) => { location.selectCity(city); setPlaceOpen(false); }} /></View>
        <Button label="Meinen Standort verwenden" icon="locate" variant="secondary" onPress={() => { setPlaceOpen(false); void reset(); }} />
        <Text style={styles.hint}>{location.message}. Dein Standort bleibt auf dem Gerät und wird nicht gespeichert.</Text>
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
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg },
  place: { flexShrink: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, borderRadius: 22, overflow: 'hidden' },
  placeLabel: { ...type.headline, fontSize: 16, color: colors.text, flexShrink: 1 },
  topActions: { flexDirection: 'row', gap: space.sm },
  filterDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.background },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  deckHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingHorizontal: gutter, paddingBottom: space.md },
  deckCopy: { flex: 1, minWidth: 0 },
  headline: { ...type.title, color: colors.text },
  summary: { ...type.callout, color: colors.muted, marginTop: 1 },
  deckList: { flexGrow: 0, minHeight: 118 },
  deck: { paddingHorizontal: gutter },
  gap: { width: CARD_GAP },
  state: { minHeight: 118, justifyContent: 'center' },
  citySearch: { minHeight: 48, zIndex: 10 },
  hint: { ...type.footnote, color: colors.faint },
  group: { gap: space.md },
  label: { ...type.headline, color: colors.text },
});
