import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';
import { Icon } from './Icon';
import { GlassBackdrop } from './GlassBackdrop';

export function EventCard({ event, compact = false, showChevron = true, glass = true }: { event: DemoEvent; compact?: boolean; showChevron?: boolean; glass?: boolean }) {
  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityLabel={`${event.title}, Demo-Event, Details öffnen`} style={StyleSheet.flatten([styles.card, compact && styles.compactCard])}>
        {glass && <GlassBackdrop native={false} variant="card" radius={compact ? 12 : 15} />}
        <Image source={event.image} style={[styles.image, compact && styles.compactImage]} accessibilityLabel="Symbolfoto einer Veranstaltung" />
        <View style={[styles.content, compact && styles.compactContent]}>
          <Text numberOfLines={1} style={styles.title}>{event.title}</Text>
          <View style={styles.tags}>{event.categories.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
          <View style={styles.meta}><Icon name="clock" size={12} /><Text style={styles.metaText}>{event.date}</Text></View>
          <View style={styles.meta}><Icon name="pin" size={12} /><Text numberOfLines={1} style={styles.metaText}>{event.location}</Text></View>
        </View>
        {showChevron && <Icon name="chevron" size={17} />}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 7, paddingRight: 12, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: colors.border, borderRadius: 15, minHeight: 102 },
  compactCard: { minHeight: 94, padding: 4, paddingRight: 9, gap: 10, borderRadius: 12 },
  compactImage: { width: 82, height: 84, borderRadius: 8 },
  compactContent: { gap: 3 },
  image: { width: 86, height: 86, borderRadius: 10, backgroundColor: '#241329' },
  content: { flex: 1, gap: 5, paddingVertical: 2 },
  title: { fontSize: 15, color: colors.text, fontWeight: '700', letterSpacing: -0.2 },
  tags: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  tag: { fontSize: 10, color: '#ead4ef', backgroundColor: '#bc88cf24', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: colors.muted, flexShrink: 1 },
});
