import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View, Vibration } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

const fallbackRegion: Region = { latitude: 51.1657, longitude: 10.4515, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const filters = ['Techno', 'House', 'Clubs', 'Events'];
const upcomingEvents = [
  { title: 'Demo: Neon Nights', category: 'Techno', date: 'Freitag, 21:00', location: 'In deiner Stadt' },
  { title: 'Demo: House Session', category: 'House', date: 'Samstag, 22:00', location: 'In deiner Stadt' },
  { title: 'Demo: Club Open Air', category: 'Clubs', date: 'Nächste Woche', location: 'In deiner Stadt' },
];
type EventItem = (typeof upcomingEvents)[number];

export default function App() {
  const [showRadar, setShowRadar] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [locationMessage, setLocationMessage] = useState('Standort wird gesucht ...');
  const [activeFilter, setActiveFilter] = useState('Events');
  const [activePage, setActivePage] = useState<'radar' | 'explore'>('radar');
  const [searchText, setSearchText] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<EventItem | null>(null);
  const [radarScale] = useState(() => new Animated.Value(0.7));
  const [radarOpacity] = useState(() => new Animated.Value(0.9));

  async function findLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setLocationMessage('Standort bitte freigeben, um Events in deiner Nähe zu sehen');
      setRegion(null);
      return;
    }
    const currentLocation = await Location.getCurrentPositionAsync({});
    setRegion({ latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 });
    setLocationMessage('Dein Standort');
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowRadar(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showRadar || showMap) return;
    const animation = Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(radarScale, { toValue: 1.25, duration: 1600, useNativeDriver: true }),
        Animated.timing(radarScale, { toValue: 0.7, duration: 0, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(radarOpacity, { toValue: 0, duration: 1600, useNativeDriver: true }),
        Animated.timing(radarOpacity, { toValue: 0.9, duration: 0, useNativeDriver: true }),
      ]),
    ]));
    animation.start();
    Vibration.vibrate([0, 120, 260, 120, 700], true);
    const mapTimer = setTimeout(() => setShowMap(true), 3600);
    return () => {
      animation.stop();
      clearTimeout(mapTimer);
      Vibration.cancel();
    };
  }, [showRadar, showMap, radarOpacity, radarScale]);

  useEffect(() => {
    if (!showMap) return;
    const locationTimer = setTimeout(() => void findLocation(), 0);
    return () => clearTimeout(locationTimer);
  }, [showMap]);

  if (!showRadar) {
    return (
      <View style={styles.welcomeScreen}>
        <Text style={styles.logo}>Spotz.</Text>
        <Text style={styles.welcomeTitle}>Was geht heute?</Text>
        <Text style={styles.welcomeText}>Entdecke Events und Partys in deiner Nähe.</Text>
        <ActivityIndicator color="#c922ab" size="large" style={styles.loader} />
        <StatusBar style="light" />
      </View>
    );
  }

  const markerBase = region ?? fallbackRegion;

  if (selectedEvent) {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setSelectedEvent(null)} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Zurück zum Radar</Text>
        </Pressable>
        <View style={styles.detailHeader}>
          <View style={styles.detailIcon}><Text style={styles.detailIconText}>♫</Text></View>
          <Text style={styles.eyebrow}>{selectedEvent.category.toUpperCase()}</Text>
          <Text style={styles.detailTitle}>{selectedEvent.title}</Text>
          <Text style={styles.detailNote}>Demo-Event</Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>WANN?</Text>
          <Text style={styles.detailValue}>{selectedEvent.date}</Text>
          <Text style={styles.detailLabel}>WO?</Text>
          <Text style={styles.detailValue}>{selectedEvent.location}</Text>
          <Text style={styles.detailDescription}>
            Hier werden später die Beschreibung, Veranstalter, Tickets und weitere Informationen zu diesem Event angezeigt.
          </Text>
        </View>
        <StatusBar style="light" />
      </View>
    );
  }

  if (activePage === 'explore') {
    const visibleEvents = upcomingEvents.filter((event) =>
      `${event.title} ${event.category}`.toLowerCase().includes(searchText.toLowerCase()),
    );

    return (
      <View style={styles.container}>
        <View style={styles.exploreHeader}>
          <Text style={styles.eyebrow}>ENTDECKEN</Text>
          <Text style={styles.title}>Was steht an?</Text>
          <Text style={styles.location}>Kommende Partys und Events</Text>
        </View>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Nach Party, Genre oder Ort suchen ..."
          placeholderTextColor="#95889d"
          style={styles.searchInput}
        />
        <Text style={styles.sectionTitle}>Als Nächstes</Text>
        <Text style={styles.helperText}>Demo-Termine – echte Veranstaltungen kommen später aus einer Datenquelle.</Text>
        <View style={styles.eventList}>
          {visibleEvents.map((event) => (
            <View key={event.title} style={styles.eventCard}>
              <View style={styles.eventIcon}><Text style={styles.eventIconText}>♫</Text></View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{event.category} · {event.date}</Text>
                <Text style={styles.eventLocation}>{event.location}</Text>
              </View>
            </View>
          ))}
          {visibleEvents.length === 0 && <Text style={styles.emptyText}>Keine passenden Demo-Events gefunden.</Text>}
        </View>
        <BottomNavigation activePage={activePage} onChange={setActivePage} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>LIVE RADAR</Text><Text style={styles.title}>Was geht heute?</Text></View>
        <Text style={styles.location}>{locationMessage}</Text>
      </View>
      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, activeFilter === filter && styles.activeFilter]}>
            <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
          </Pressable>
        ))}
      </View>
      {showMap ? <View style={styles.mapFrame}>
        {region ? (
          <MapView style={styles.map} region={region} showsUserLocation>
            <Marker coordinate={markerBase} title="Dein Standort" pinColor="#c922ab" />
            <Marker onPress={() => setSelectedPreview(upcomingEvents[0])} coordinate={{ latitude: markerBase.latitude + 0.008, longitude: markerBase.longitude + 0.006 }} title="Demo-Event" description="Antippen für Vorschau" pinColor="#ff4acb" />
            <Marker onPress={() => setSelectedPreview(upcomingEvents[1])} coordinate={{ latitude: markerBase.latitude - 0.006, longitude: markerBase.longitude - 0.009 }} title="Demo-Club" description="Antippen für Vorschau" pinColor="#7d5cff" />
          </MapView>
        ) : (
          <View style={styles.mapLoading}>
            <ActivityIndicator color="#c922ab" />
            <Text style={styles.mapLoadingText}>{locationMessage}</Text>
          </View>
        )}
        <Animated.View style={[styles.radarRing, { opacity: radarOpacity, transform: [{ scale: radarScale }] }]} />
        <View style={styles.radarCenter} />
        <View style={styles.mapLabel}><Text style={styles.mapLabelText}>Events im Umkreis</Text></View>
        {selectedPreview && (
          <View style={styles.previewCard}>
            <Pressable onPress={() => setSelectedEvent(selectedPreview)} style={styles.previewContent}>
              <Text style={styles.previewCategory}>{selectedPreview.category}</Text>
              <Text style={styles.previewTitle}>{selectedPreview.title}</Text>
              <Text style={styles.previewMeta}>{selectedPreview.date} · {selectedPreview.location}</Text>
              <Text style={styles.previewHint}>Antippen für Event-Profil</Text>
            </Pressable>
            <Pressable onPress={() => setSelectedPreview(null)} style={styles.closePreview}>
              <Text style={styles.closePreviewText}>×</Text>
            </Pressable>
          </View>
        )}
      </View> : <RadarScanScreen />}
      <Text style={styles.sectionTitle}>{activeFilter} in deiner Nähe</Text>
      <Text style={styles.helperText}>Demo-Marker. Echte Events kommen später aus einer Datenquelle.</Text>
      <BottomNavigation activePage={activePage} onChange={setActivePage} />
      <StatusBar style="light" />
    </View>
  );
}

function RadarScanScreen() {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const scan = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2600, useNativeDriver: true }),
    );
    scan.start();
    return () => scan.stop();
  }, [rotation]);

  const scanRotation = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.mapFrame}>
      <View style={styles.radarHeader}>
      <Text style={styles.radarEyebrow}>LIVE RADAR</Text>
      <Text style={styles.radarTitle}>Suche Events in deiner Nähe</Text>
      </View>
      <View style={styles.radarFilterRow}>
        {filters.map((filter) => <Text key={filter} style={styles.filter}>{filter}</Text>)}
      </View>
      <View style={styles.radarInnerFrame}>
        <View style={styles.radarGraphic}>
        <View style={styles.radarStage}>
        <View style={[styles.radarCircle, styles.radarCircleOuter]} />
        <View style={[styles.radarCircle, styles.radarCircleMiddle]} />
        <View style={[styles.radarCircle, styles.radarCircleInner]} />
        <View style={styles.radarHorizontal} />
        <View style={styles.radarVertical} />
        <Animated.View style={[styles.scanBeam, { transform: [{ rotate: scanRotation }] }]} />
        <View style={[styles.radarDot, styles.dotOne]} />
        <View style={[styles.radarDot, styles.dotTwo]} />
        <View style={[styles.radarDot, styles.dotThree]} />
        <View style={styles.radarCenterDot} />
        </View>
        </View>
        <View style={styles.mapLabel}><Text style={styles.mapLabelText}>Standort wird gesucht ...</Text></View>
      </View>
      <Text style={styles.radarHint}>Radar wird aktiviert ...</Text>
      <StatusBar style="light" />
    </View>
  );
}

function BottomNavigation({ activePage, onChange }: { activePage: 'radar' | 'explore'; onChange: (page: 'radar' | 'explore') => void }) {
  return (
    <View style={styles.bottomNavigation}>
      <Pressable onPress={() => onChange('radar')} style={styles.navItem}>
        <Text style={[styles.navIcon, activePage === 'radar' && styles.activeNavText]}>◉</Text>
        <Text style={[styles.navText, activePage === 'radar' && styles.activeNavText]}>Radar</Text>
      </Pressable>
      <Pressable onPress={() => onChange('explore')} style={styles.navItem}>
        <Text style={[styles.navIcon, activePage === 'explore' && styles.activeNavText]}>⌕</Text>
        <Text style={[styles.navText, activePage === 'explore' && styles.activeNavText]}>Entdecken</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#120d18', paddingTop: 58 },
  welcomeScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#120d18', padding: 28 },
  logo: { color: '#c922ab', fontSize: 20, fontWeight: '800', letterSpacing: 4 },
  welcomeTitle: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 28 },
  welcomeText: { color: '#cfc5d4', fontSize: 17, marginTop: 12, textAlign: 'center' },
  loader: { marginTop: 42 },
  header: { paddingHorizontal: 20 },
  eyebrow: { color: '#c922ab', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 5 },
  location: { color: '#aaa0b2', fontSize: 12, marginTop: 8 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 18 },
  filter: { borderColor: '#49344d', borderRadius: 18, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  activeFilter: { backgroundColor: '#c922ab', borderColor: '#c922ab' },
  filterText: { color: '#cfc5d4', fontSize: 13, fontWeight: '600' },
  activeFilterText: { color: '#fff' },
  mapFrame: { flex: 1, marginHorizontal: 14, overflow: 'hidden', borderRadius: 24, backgroundColor: '#20172a' },
  map: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapLoadingText: { color: '#cfc5d4', marginTop: 12 },
  radarRing: { position: 'absolute', alignSelf: 'center', top: '45%', width: 110, height: 110, borderColor: '#c922ab', borderRadius: 60, borderWidth: 2 },
  radarCenter: { position: 'absolute', alignSelf: 'center', top: '45%', width: 16, height: 16, backgroundColor: '#c922ab', borderColor: '#fff', borderRadius: 10, borderWidth: 3 },
  mapLabel: { position: 'absolute', left: 16, top: 16, backgroundColor: '#120d18dd', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  mapLabelText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginHorizontal: 20, marginTop: 18 },
  helperText: { color: '#aaa0b2', fontSize: 12, marginHorizontal: 20, marginTop: 5, marginBottom: 16 },
  exploreHeader: { paddingHorizontal: 20, paddingTop: 20 },
  searchInput: { backgroundColor: '#241a2d', borderColor: '#49344d', borderRadius: 14, borderWidth: 1, color: '#fff', fontSize: 15, marginHorizontal: 20, marginTop: 24, paddingHorizontal: 16, paddingVertical: 14 },
  eventList: { paddingHorizontal: 20 },
  eventCard: { alignItems: 'center', backgroundColor: '#241a2d', borderRadius: 16, flexDirection: 'row', marginBottom: 12, padding: 16 },
  eventIcon: { alignItems: 'center', backgroundColor: '#c922ab', borderRadius: 12, height: 48, justifyContent: 'center', width: 48 },
  eventIconText: { color: '#fff', fontSize: 25 },
  eventDetails: { flex: 1, marginLeft: 14 },
  eventTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  eventMeta: { color: '#c922ab', fontSize: 13, fontWeight: '700', marginTop: 5 },
  eventLocation: { color: '#aaa0b2', fontSize: 13, marginTop: 4 },
  emptyText: { color: '#aaa0b2', marginTop: 20, textAlign: 'center' },
  bottomNavigation: { backgroundColor: '#1b1322', borderTopColor: '#33253b', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 18, paddingTop: 12 },
  navItem: { alignItems: 'center', minWidth: 100 },
  navIcon: { color: '#95889d', fontSize: 22 },
  navText: { color: '#95889d', fontSize: 12, marginTop: 2 },
  activeNavText: { color: '#c922ab' },
  radarScreen: { flex: 1, backgroundColor: '#120d18', paddingTop: 58 },
  radarHeader: { display: 'none' },
  radarFilterRow: { display: 'none' },
  radarInnerFrame: { flex: 1, overflow: 'hidden' },
  radarEyebrow: { color: '#c922ab', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  radarTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  radarGraphic: { alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' },
  radarStage: { height: 310, position: 'relative', width: 310 },
  radarCircle: { borderColor: '#c922ab', borderRadius: 200, borderWidth: 2, position: 'absolute' },
  radarCircleOuter: { height: 300, left: 5, top: 5, width: 300 },
  radarCircleMiddle: { height: 220, left: 45, top: 45, width: 220 },
  radarCircleInner: { height: 130, left: 90, top: 90, width: 130 },
  radarHorizontal: { backgroundColor: '#c922ab', height: 2, left: 5, position: 'absolute', top: 154, width: 300 },
  radarVertical: { backgroundColor: '#c922ab', height: 300, left: 154, position: 'absolute', top: 5, width: 2 },
  scanBeam: { backgroundColor: '#c922ab66', height: 135, left: 154, position: 'absolute', top: 20, transformOrigin: 'bottom', width: 3 },
  radarDot: { backgroundColor: '#ff59d1', borderColor: '#fff', borderRadius: 9, borderWidth: 2, height: 17, position: 'absolute', width: 17 },
  dotOne: { right: 42, top: 42 },
  dotTwo: { left: 50, top: 115 },
  dotThree: { bottom: 70, right: 72 },
  radarCenterDot: { backgroundColor: '#fff', borderColor: '#c922ab', borderRadius: 11, borderWidth: 4, height: 22, left: 144, position: 'absolute', top: 144, width: 22 },
  radarHint: { color: '#aaa0b2', fontSize: 14, marginTop: 26 },
  backButton: { paddingHorizontal: 20, paddingTop: 24 },
  backButtonText: { color: '#c922ab', fontSize: 16, fontWeight: '700' },
  detailHeader: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 54 },
  detailIcon: { alignItems: 'center', backgroundColor: '#c922ab', borderRadius: 36, height: 72, justifyContent: 'center', width: 72 },
  detailIconText: { color: '#fff', fontSize: 38 },
  detailTitle: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  detailNote: { color: '#aaa0b2', fontSize: 13, marginTop: 8 },
  detailCard: { backgroundColor: '#241a2d', borderRadius: 18, margin: 20, padding: 22 },
  detailLabel: { color: '#c922ab', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 8 },
  detailValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, marginTop: 5 },
  detailDescription: { color: '#cfc5d4', fontSize: 15, lineHeight: 22, marginTop: 12 },
  previewCard: { alignItems: 'center', backgroundColor: '#241a2df2', borderColor: '#c922ab', borderRadius: 16, borderWidth: 1, bottom: 16, flexDirection: 'row', left: 16, padding: 15, position: 'absolute', right: 16 },
  previewContent: { flex: 1 },
  previewCategory: { color: '#c922ab', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  previewTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 4 },
  previewMeta: { color: '#cfc5d4', fontSize: 13, marginTop: 4 },
  previewHint: { color: '#aaa0b2', fontSize: 12, marginTop: 8 },
  closePreview: { alignSelf: 'flex-start', paddingLeft: 12, paddingTop: 0 },
  closePreviewText: { color: '#aaa0b2', fontSize: 24, lineHeight: 24 },
});
