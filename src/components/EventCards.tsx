import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { SaveEventButton } from './SaveEventButton';
import { PressableScale } from './ui/PressableScale';
import { StatusBadge } from './ui/StatusBadge';

const when = (event: SpotEvent, today: string) => `${eventDayLabel(event.startsAt, today)} · ${eventTimeLabel(event.startsAt)}`;
const place = (event: SpotEvent) => event.venue ? `${event.venue} · ${event.location}` : event.location;
const imageLabel = (event: SpotEvent) => event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`;

/**
 * Artwork on its own colour field: the image blurred as backdrop, the complete
 * flyer on top. Flyers of any format stay uncropped and low resolution reads as intent.
 */
export function EventArtwork({ event, inset = 0 }: { event: SpotEvent; inset?: number }) {
  if (event.imageIsPlaceholder) return <Image source={event.image} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={imageLabel(event)} />;
  return <>
    <Image source={event.image} resizeMode="cover" blurRadius={32} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} />
    <Image source={event.image} resizeMode="contain" style={{ position: 'absolute', top: inset, left: inset, right: inset, bottom: inset }} accessibilityLabel={imageLabel(event)} />
  </>;
}

type CardProps = { event: SpotEvent; href: Href; today: string; now: number };

/** Compact landscape highlight: text on the left, the complete flyer on the right. */
export function EventHero({ event, href, today, now, width }: CardProps & { width: number }) {
  const phase = eventPhase(event, now);
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${when(event, today)} Uhr, ${event.location}, öffnen`} onPress={() => router.push(href)} style={[styles.hero, { width }]}>
      {event.imageIsPlaceholder
        ? <Image source={event.image} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={imageLabel(event)} />
        : <>
            <Image source={event.image} resizeMode="cover" blurRadius={36} style={StyleSheet.absoluteFill} />
            <View style={styles.heroFlyer}><Image source={event.image} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={imageLabel(event)} /></View>
          </>}
      <LinearGradient pointerEvents="none" colors={['#000000e6', '#000000a6', '#00000000']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <View style={styles.heroBody}>
        {phase !== 'upcoming' ? <StatusBadge phase={phase} overlay /> : <View />}
        <View style={styles.heroCopy}>
          <Text numberOfLines={1} style={styles.heroWhen}>{when(event, today)} Uhr</Text>
          <Text numberOfLines={3} style={styles.heroTitle}>{event.title}</Text>
          <Text numberOfLines={1} style={styles.heroPlace}>{place(event)}</Text>
        </View>
      </View>
      <View style={styles.heroSave}><SaveEventButton id={event.id} title={event.title} overlay size={36} /></View>
    </PressableScale>
  );
}

/** Row of round previews that open the full-screen story of an event. */
export function StoryRail({ events, today, seen, onOpen }: { events: SpotEvent[]; today: string; seen: string[]; onOpen: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {events.map((event) => {
        const viewed = seen.includes(event.id);
        return (
          <PressableScale key={event.id} accessibilityRole="button" accessibilityLabel={`${event.title}, Vorschau öffnen`} onPress={() => onOpen(event.id)} scaleTo={0.93} style={styles.story}>
            <View style={[styles.ring, viewed && styles.ringSeen]}><Image source={event.image} style={styles.storyImage} /></View>
            <Text numberOfLines={1} style={[styles.storyLabel, viewed && styles.storySeen]}>{eventDayLabel(event.startsAt, today)}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: '#00000059' },
  hero: { height: 190, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  heroFlyer: { position: 'absolute', top: 14, bottom: 14, right: 14, width: '44%' },
  heroBody: { flex: 1, width: '58%', padding: space.lg, justifyContent: 'space-between' },
  heroCopy: { gap: 2 },
  heroWhen: { ...type.overline, fontSize: 11, color: colors.pink },
  heroTitle: { ...type.title3, color: colors.text },
  heroPlace: { ...type.footnote, color: colors.muted },
  heroSave: { position: 'absolute', top: space.sm, right: space.sm },
  rail: { gap: space.md, paddingHorizontal: gutter },
  story: { width: 66, alignItems: 'center', gap: space.xxs },
  ring: { width: 66, height: 66, borderRadius: 33, padding: 3, borderWidth: 2.5, borderColor: colors.accent },
  ringSeen: { borderColor: colors.surfaceHigh },
  storyImage: { width: '100%', height: '100%', borderRadius: 28, backgroundColor: colors.surface },
  storyLabel: { ...type.footnote, fontSize: 11, color: colors.text },
  storySeen: { color: colors.faint },
});
