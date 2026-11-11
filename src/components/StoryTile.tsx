import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { Icon } from './Icon';
import { SaveEventButton } from './SaveEventButton';
import { PressableScale } from './ui/PressableScale';
import { StatusBadge } from './ui/StatusBadge';

type Props = { event: SpotEvent; today: string; now: number; seen: boolean; onOpen: () => void; distanceKm?: number };

const distanceLabel = (km: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;

/** Tall story preview of one event. Opens the story viewer; the brand ring marks unseen stories. */
export function StoryTile({ event, today, now, seen, onOpen, distanceKm }: Props) {
  const phase = eventPhase(event, now);
  const live = phase === 'live' || phase === 'started';
  return (
    <View style={styles.wrapper}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${eventDayLabel(event.startsAt, today)} ${eventTimeLabel(event.startsAt)} Uhr, ${event.location}, Story öffnen`}
        onPress={onOpen}
        style={[styles.tile, seen ? styles.seen : styles.unseen]}
      >
        <Image source={event.image} resizeMode="cover" style={styles.cover} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`} />
        <LinearGradient pointerEvents="none" colors={['#100b1500', '#100b1500', '#100b15e0', '#100b15fc']} locations={[0, 0.34, 0.68, 1]} style={styles.cover} />
        {live && <View style={styles.badge}><StatusBadge phase={phase} /></View>}
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.when}>{eventDayLabel(event.startsAt, today)} · {eventTimeLabel(event.startsAt)}</Text>
          <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
          <View style={styles.meta}><Icon name="pin" size={12} color={colors.muted} /><Text numberOfLines={1} style={styles.metaText}>{typeof distanceKm === 'number' ? `${event.location} · ${distanceLabel(distanceKm)}` : event.location}</Text></View>
        </View>
      </PressableScale>
      <View style={styles.save}><SaveEventButton id={event.id} title={event.title} overlay size={36} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  tile: { aspectRatio: 0.72, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1.5, backgroundColor: colors.surface, justifyContent: 'flex-end', ...squircle },
  unseen: { borderColor: '#c922abcc' },
  seen: { borderColor: '#ffffff1f' },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  badge: { position: 'absolute', left: space.sm, top: space.sm },
  content: { padding: space.md, gap: 3 },
  when: { ...type.overline, fontSize: 11, color: colors.pink },
  title: { ...type.label, fontWeight: '700', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...type.footnote, fontSize: 12, color: colors.muted, flexShrink: 1 },
  save: { position: 'absolute', top: space.xs, right: space.xs },
});
