import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { Icon } from './Icon';
import { SaveEventButton } from './SaveEventButton';

type Props = { event: SpotEvent; today: string; seen: boolean; onOpen: () => void };

/** Tall story preview of one event. Opens the story viewer, not the detail page. */
export function StoryTile({ event, today, seen, onOpen }: Props) {
  const tags = event.genres?.length ? event.genres : event.categories;
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${eventDayLabel(event.startsAt, today)} ${eventTimeLabel(event.startsAt)} Uhr, ${event.location}, Story öffnen`}
        onPress={onOpen}
        style={({ pressed }) => [styles.tile, seen ? styles.seen : styles.unseen, pressed && styles.pressed]}
      >
        <Image source={event.image} resizeMode="cover" style={styles.cover} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`} />
        <LinearGradient pointerEvents="none" colors={['#100b1500', '#100b1500', '#100b15e0', '#100b15fc']} locations={[0, 0.3, 0.64, 1]} style={styles.cover} />
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.when}>{eventDayLabel(event.startsAt, today).toLocaleUpperCase('de')} · {eventTimeLabel(event.startsAt)}</Text>
          {tags.length > 0 && <Text numberOfLines={1} style={styles.genre}>{tags.join('  ·  ').toLocaleUpperCase('de')}</Text>}
          <Text numberOfLines={3} style={styles.title}>{event.title}</Text>
          <View style={styles.meta}><Icon name="pin" size={12} color="#d9c6dc" /><Text numberOfLines={1} style={styles.metaText}>{event.location}</Text></View>
        </View>
      </Pressable>
      <View style={styles.save}><SaveEventButton id={event.id} title={event.title} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  tile: { aspectRatio: 0.68, overflow: 'hidden', borderRadius: 18, borderWidth: 1.5, backgroundColor: colors.surface, justifyContent: 'flex-end' },
  unseen: { borderColor: '#c922abcc' },
  seen: { borderColor: '#ffffff1f' },
  pressed: { opacity: 0.82 },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  when: { color: colors.pink, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  content: { padding: 11, gap: 5 },
  genre: { color: '#f29bdb', fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  title: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '800', letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#d9c6dc', fontSize: 11, flexShrink: 1 },
  save: { position: 'absolute', top: 7, right: 7 },
});
