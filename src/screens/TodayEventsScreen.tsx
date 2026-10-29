import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon, type IconName } from '../components/Icon';
import { RadiusSlider } from '../components/RadiusSlider';
import { TodayEventCard } from '../components/TodayEventCard';
import { categories, colors, type Category } from '../constants/theme';
import { demoEvents, matchesCategory } from '../data/events';
import { usePartyWindow } from '../hooks/useToday';
import { distanceKm, happensToday } from '../utils/events';

const categoryIcons: Record<Category, IconName> = { Alle: 'grid', Techno: 'headphones', House: 'wave', Party: 'cocktail', Clubs: 'radar' };

function coordinate(value: string | undefined, fallback: number, limit: number) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : fallback;
}

export default function TodayEventsScreen() {
  const params = useLocalSearchParams<{ category?: string; radius?: string; latitude?: string; longitude?: string }>();
  const today = usePartyWindow();
  const insets = useSafeAreaInsets();
  const [radiusOpen, setRadiusOpen] = useState(false);
  const category: Category = categories.includes(params.category as Category) ? params.category as Category : 'Alle';
  const radius = Math.max(10, Math.min(50, Number(params.radius) || 30));
  const center = { latitude: coordinate(params.latitude, 52.52, 90), longitude: coordinate(params.longitude, 13.405, 180) };
  const events = demoEvents.filter((event) => happensToday(event, today) && matchesCategory(event, category) && distanceKm(center, event.coordinate) <= radius);
  const backToRadar = () => router.canGoBack() ? router.back() : router.replace('/');

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Deine Nacht', headerShown: false }} />
      <View pointerEvents="none" testID="today-background" style={styles.backdrop}>
        <Image source={require('../../assets/events/today-hero-party.png')} style={styles.backgroundImage} resizeMode="cover" />
        <LinearGradient colors={['#100b1599', '#100b1588', '#100b15bb']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.navigation}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück zum Radar" onPress={backToRadar} style={styles.back}><GlassBackdrop radius={25} /><Icon name="back" size={21} /><Text style={styles.backText}>Radar</Text></Pressable>
          <Text style={styles.pageTitle}>Deine Nacht</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück zur Karte" onPress={backToRadar} style={styles.mapButton}><GlassBackdrop radius={24} /><Icon name="map" size={22} /></Pressable>
        </View>
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => <View style={styles.cardInset}><TodayEventCard event={item} /></View>}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<View>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>Die Nacht <Text style={styles.titleAccent}>ruft.</Text></Text>
              <Text style={styles.subtitle}>Dein Abend. Dein Beat. Deine Spots.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Umkreis ändern, aktuell ${radius} Kilometer`} accessibilityState={{ expanded: radiusOpen }} onPress={() => setRadiusOpen(!radiusOpen)} style={styles.radiusButton}><Icon name="pin" size={18} color={colors.accent} /><Text style={styles.radiusText}>Heute im Umkreis von {radius} km</Text><Icon name="down" size={14} /></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {categories.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => router.setParams({ category: item })} style={[styles.filter, category === item && styles.activeFilter]}>
                {category !== item && <GlassBackdrop radius={22} />}
                <Icon name={categoryIcons[item]} size={16} color={colors.text} /><Text style={styles.filterText}>{item === 'Party' ? 'Partys' : item}</Text>
              </Pressable>)}
            </ScrollView>
            {radiusOpen && <View style={styles.radiusPanel}><RadiusSlider value={radius} onChange={(value) => router.setParams({ radius: String(value) })} /></View>}
            <Text style={styles.demoNote}>{events.length} {events.length === 1 ? 'Demo-Event' : 'Demo-Events'} · keine Live-Daten</Text>
          </View>}
          ListEmptyComponent={<View style={styles.empty}><Icon name="radar" size={30} color={colors.pink} /><Text style={styles.emptyTitle}>Deine Nacht ist noch offen.</Text><Text style={styles.emptyText}>Hier gibt es gerade keine passenden Partys für heute. Probiere ein anderes Genre oder einen größeren Umkreis.</Text></View>}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  backdrop: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  backgroundImage: { position: 'absolute', top: 0, bottom: 0, left: -70, right: 0 },
  safeArea: { flex: 1 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, gap: 10 },
  back: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 25 },
  backText: { color: colors.text, fontSize: 14 },
  pageTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center', paddingRight: 34 },
  mapButton: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: 17, paddingTop: 27, paddingBottom: 8 },
  title: { color: colors.text, fontSize: 32, lineHeight: 39, letterSpacing: -0.9, fontWeight: '800' },
  titleAccent: { color: colors.accent },
  subtitle: { color: '#e0d2e3', fontSize: 14, marginTop: 3 },
  radiusButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, alignSelf: 'flex-start' },
  radiusText: { color: colors.muted, fontSize: 12 },
  filters: { paddingHorizontal: 14, paddingTop: 2, paddingBottom: 8, gap: 7 },
  filter: { minHeight: 44, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22 },
  activeFilter: { backgroundColor: colors.accent, borderWidth: 1, borderColor: '#f566dc66' },
  filterText: { color: colors.text, fontSize: 12 },
  radiusPanel: { marginHorizontal: 14, borderRadius: 16, backgroundColor: '#25172dee', marginBottom: 8 },
  demoNote: { color: '#b59cba', fontSize: 10, paddingHorizontal: 17, paddingBottom: 10 },
  cardInset: { paddingHorizontal: 14 },
  separator: { height: 8 },
  empty: { alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
