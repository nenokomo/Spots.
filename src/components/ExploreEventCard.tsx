import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';
import { Icon } from './Icon';
import { GlassBackdrop } from './GlassBackdrop';

export function ExploreEventCard({ event, featured = false }: { event: DemoEvent; featured?: boolean }) {
  return (
    <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
      <Pressable accessibilityLabel={`${event.title}, Demo-Event, Details öffnen`} style={StyleSheet.flatten([styles.card, featured && styles.featured])}>
        <Image source={event.image} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel="Symbolfoto einer Veranstaltung" />
        <LinearGradient colors={['#100b1500', '#100b1522', '#100b15e8', colors.background]} locations={[0, 0.25, 0.65, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.badge}><Text style={styles.badgeText}>DEMO</Text></View>
        <View style={styles.content}>
          <Text numberOfLines={2} style={[styles.title, featured && styles.featuredTitle]}>{event.title}</Text>
          <View style={styles.tags}>{event.categories.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
          <View style={[styles.details, featured && styles.featuredDetails]}>
            <GlassBackdrop native={false} radius={10} variant="card" />
            <View style={styles.meta}><Icon name="pin" size={11} color={colors.pink} /><Text numberOfLines={1} style={styles.metaText}>{event.location}</Text></View>
            <View style={styles.meta}><Icon name="clock" size={11} /><Text numberOfLines={1} style={styles.metaText}>{event.date}</Text></View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 180, flex: 1, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#c922ab30', backgroundColor: colors.surface, justifyContent: 'space-between' },
  featured: { minHeight: 200 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.accent, margin: 9, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, color: colors.text, fontWeight: '800', letterSpacing: 0.4 },
  content: { padding: 10, paddingTop: 38, gap: 5 },
  title: { color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  featuredTitle: { fontSize: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { color: '#ead4ef', fontSize: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#bc88cf24', borderRadius: 10, overflow: 'hidden' },
  details: { gap: 4, marginTop: 2, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 10 },
  featuredDetails: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { color: colors.muted, fontSize: 10, flexShrink: 1 },
});
