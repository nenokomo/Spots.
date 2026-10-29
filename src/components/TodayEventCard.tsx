import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';
import { Icon } from './Icon';

export function TodayEventCard({ event }: { event: DemoEvent }) {
  const house = event.categories.includes('House');
  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityLabel={`${event.title}, Demo-Event, Details öffnen`} style={styles.card}>
        <LinearGradient pointerEvents="none" colors={house ? ['#262632', '#192632', '#17111d'] : ['#3b1b36', '#2e192b', '#17111d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Image source={event.image} style={styles.image} accessibilityLabel="Symbolfoto einer Veranstaltung" />
        <View style={styles.content}>
          <View style={styles.tags}>{event.categories.map((tag, index) => <Text key={tag} style={[styles.tag, index === 0 && (house ? styles.houseTag : styles.accentTag)]}>{tag}</Text>)}</View>
          <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
          <View style={styles.meta}><Icon name="calendar" size={13} /><Text style={styles.metaText}>{event.date}</Text></View>
          <View style={styles.meta}><Icon name="pin" size={14} /><Text numberOfLines={1} style={styles.metaText}>{event.location}</Text></View>
        </View>
        <View style={styles.trailing}>
          <Icon name="chevron" size={19} />
          <View accessibilityLabel="Speichern ist noch nicht verfügbar" style={styles.bookmark}><Icon name="heart" size={19} color="#d4bcd8" /></View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 7, gap: 12, borderRadius: 17, borderWidth: 1, borderColor: '#e6b3df26', overflow: 'hidden', minHeight: 108 },
  image: { width: 82, height: 92, borderRadius: 11, backgroundColor: colors.surface },
  content: { flex: 1, gap: 5, paddingVertical: 2 },
  tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { color: '#e4d2e8', backgroundColor: '#ffffff13', fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  accentTag: { backgroundColor: '#c922ab30', color: '#ff91dd', borderWidth: 1, borderColor: '#c922ab66' },
  houseTag: { backgroundColor: '#529cc52b', color: '#d3eeff', borderWidth: 1, borderColor: '#76c8ed55' },
  title: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '700', letterSpacing: -0.2 },
  meta: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  metaText: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  trailing: { alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', width: 24, paddingTop: 29, paddingBottom: 2 },
  bookmark: { alignItems: 'center', opacity: 0.7 },
});
