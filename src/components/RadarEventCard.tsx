import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';

type Props = { event: DemoEvent; distance: number; height: number };

export function RadarEventCard({ event, distance, height }: Props) {
  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable
        accessibilityLabel={`${event.title}, Demo-Event, ${distance.toFixed(1).replace('.', ',')} Kilometer entfernt, Details öffnen`}
        style={StyleSheet.flatten([styles.card, { height }])}
      >
        <Image source={event.image} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Symbolfoto einer Veranstaltung" />
        <LinearGradient colors={['#100b1500', '#100b1555', '#100b15f5', colors.background]} locations={[0, 0.35, 0.73, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.badge}><Text style={styles.badgeText}>DEMO</Text></View>
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>{event.title}</Text>
          <Text numberOfLines={1} style={styles.meta}>{event.categories[0]} · {distance.toFixed(1).replace('.', ',')} km</Text>
          <Text numberOfLines={1} style={styles.date}>{event.date}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { width: 136, borderRadius: 15, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#c922ab35', justifyContent: 'space-between' },
  badge: { alignSelf: 'flex-start', margin: 8, backgroundColor: colors.accent, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { color: colors.text, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  content: { paddingHorizontal: 9, paddingBottom: 10, gap: 3 },
  title: { color: colors.text, fontSize: 12, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 10 },
  date: { color: '#bba4c2', fontSize: 9 },
});
