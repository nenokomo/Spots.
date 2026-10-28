import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EventCard } from '../components/EventCard';
import { Icon } from '../components/Icon';
import { colors, type Category } from '../constants/theme';
import { demoEvents, matchesCategory } from '../data/events';
import { usePartyWindow } from '../hooks/useToday';
import { happensToday } from '../utils/events';

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export default function TodayScreen() {
  const params = useLocalSearchParams<{ category?: string; radius?: string; latitude?: string; longitude?: string }>();
  const today = usePartyWindow();
  const category = (params.category ?? 'Alle') as Category;
  const radius = Math.max(10, Math.min(50, Number(params.radius) || 30));
  const center = { latitude: Number(params.latitude ?? 52.52), longitude: Number(params.longitude ?? 13.405) };
  const events = demoEvents.filter((event) => happensToday(event, today) && matchesCategory(event, category) && distanceKm(center, event.coordinate) <= radius);

  return (
    <LinearGradient colors={colors.gradient} style={styles.screen}>
      <Stack.Screen options={{ title: 'Deine Nacht', headerShown: true, headerTintColor: colors.text, headerStyle: { backgroundColor: colors.background }, headerBackTitle: 'Radar' }} />
      <View style={styles.heading}><Text style={styles.title}>Die Nacht ruft.</Text><Text style={styles.subtitle}>Dein Abend. Dein Beat. Deine Spots.</Text><Text style={styles.subtitle}>Heute im Umkreis von {radius} km</Text></View>
      <FlatList data={events} keyExtractor={(event) => event.id} renderItem={({ item }) => <EventCard event={item} />} ItemSeparatorComponent={() => <View style={styles.separator} />} contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><Icon name="radar" size={30} color={colors.pink} /><Text style={styles.emptyTitle}>Heute ist noch nichts in der Nähe.</Text><Text style={styles.emptyText}>Passe deinen Filter oder den Umkreis im Radar an.</Text></View>} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, heading: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14 }, title: { color: colors.text, fontSize: 25, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 5 }, list: { padding: 12, paddingBottom: 30 }, separator: { height: 9 }, empty: { alignItems: 'center', gap: 10, padding: 32 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }, emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' } });
