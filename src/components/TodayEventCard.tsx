import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';
import { Icon } from './Icon';
import { GlassBackdrop } from './GlassBackdrop';

export function TodayEventCard({ event }: { event: DemoEvent }) {
  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityLabel={`${event.title}, Demo-Event, Details öffnen`} style={styles.card}>
        <GlassBackdrop radius={17} variant="card" />
        <Image source={event.image} style={styles.image} accessibilityLabel="Symbolfoto einer Veranstaltung" />
        <View style={styles.content}>
          <View style={styles.tags}>{event.categories.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
          <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
          <View style={styles.meta}><Icon name="calendar" size={13} /><Text style={styles.metaText}>{event.date}</Text></View>
          <View style={styles.meta}><Icon name="pin" size={14} /><Text numberOfLines={1} style={styles.metaText}>{event.location}</Text></View>
        </View>
        <View style={styles.trailing}>
          <Icon name="chevron" size={19} />
          <View accessibilityLabel="Speichern ist noch nicht verfügbar" style={styles.bookmark}><Icon name="bookmark" size={18} color="#b09bb4" /><Text style={styles.soon}>bald</Text></View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 7, gap: 12, borderRadius: 17, backgroundColor: '#17111d55', overflow: 'hidden', minHeight: 108 },
  image: { width: 82, height: 92, borderRadius: 11, backgroundColor: colors.surface },
  content: { flex: 1, gap: 5, paddingVertical: 2 },
  tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { color: '#e4d2e8', backgroundColor: '#ffffff13', fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  title: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '700', letterSpacing: -0.2 },
  meta: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  metaText: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  trailing: { alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', width: 24, paddingTop: 29, paddingBottom: 2 },
  bookmark: { alignItems: 'center', opacity: 0.7 },
  soon: { color: colors.muted, fontSize: 8 },
});
