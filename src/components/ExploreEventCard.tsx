import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';
import { Icon } from './Icon';

export function ExploreEventCard({ event }: { event: DemoEvent }) {
  return <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
    <Pressable accessibilityLabel={`${event.title}, Demo-Event, Details öffnen`} style={styles.card}>
      <Image source={event.image} style={styles.image} accessibilityLabel="Symbolfoto einer Veranstaltung" />
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.genre}>{event.categories.join('  ·  ').toLocaleUpperCase('de')}</Text>
        <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
        <View style={styles.meta}><Icon name="calendar" size={14} color="#ad9bb2" /><Text numberOfLines={1} style={styles.metaText}>{event.date}</Text></View>
        <View style={styles.meta}><Icon name="pin" size={14} color="#ad9bb2" /><Text numberOfLines={1} style={styles.metaText}>{event.location}</Text></View>
      </View>
    </Pressable>
  </Link>;
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: '#1c1621' },
  image: { width: '100%', height: 112, backgroundColor: colors.surface },
  content: { flex: 1, gap: 6, minWidth: 0, padding: 11 },
  genre: { color: '#d58bc2', fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '700', letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#c3b4c6', fontSize: 11, flexShrink: 1 },
});
