import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { GlassBackdrop } from './GlassBackdrop';
import { Icon } from './Icon';
import { SaveEventButton } from './SaveEventButton';
import { PressableScale } from './ui/PressableScale';
import { StatusBadge } from './ui/StatusBadge';

const when = (event: SpotEvent, today: string) => `${eventDayLabel(event.startsAt, today)} · ${eventTimeLabel(event.startsAt)}`;
const place = (event: SpotEvent) => event.venue ? `${event.venue} · ${event.location}` : event.location;
const distance = (km: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
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

/** Large editorial card for the top of Explore. */
export function EventHero({ event, href, today, now, width }: CardProps & { width: number }) {
  const phase = eventPhase(event, now);
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${when(event, today)} Uhr, ${event.location}, öffnen`} onPress={() => router.push(href)} style={[styles.hero, { width }]}>
      <View style={styles.heroArt}><EventArtwork event={event} inset={18} /></View>
      <LinearGradient pointerEvents="none" colors={['#00000000', '#000000b3', '#000000f2']} locations={[0.42, 0.7, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.heroTop}>
        {phase !== 'upcoming' ? <StatusBadge phase={phase} overlay /> : <View />}
        <SaveEventButton id={event.id} title={event.title} overlay />
      </View>
      <View style={styles.heroBody}>
        <Text numberOfLines={1} style={styles.heroWhen}>{when(event, today)} Uhr</Text>
        <Text numberOfLines={2} style={styles.heroTitle}>{event.title}</Text>
        <Text numberOfLines={1} style={styles.heroPlace}>{place(event)}</Text>
      </View>
    </PressableScale>
  );
}

/** Portrait poster with the text underneath, for horizontal shelves. */
export function EventPoster({ event, href, today }: Omit<CardProps, 'now'>) {
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${when(event, today)} Uhr, ${event.location}, öffnen`} onPress={() => router.push(href)} style={styles.poster}>
      <Image source={event.image} resizeMode="cover" style={styles.posterImage} accessibilityLabel={imageLabel(event)} />
      <Text numberOfLines={1} style={styles.posterWhen}>{when(event, today)}</Text>
      <Text numberOfLines={2} style={styles.posterTitle}>{event.title}</Text>
      <Text numberOfLines={1} style={styles.posterPlace}>{event.location}</Text>
    </PressableScale>
  );
}

/** Card of the radar carousel, floating over the map. */
export function RadarCard({ event, href, today, now, width, distanceKm }: CardProps & { width: number; distanceKm?: number }) {
  const phase = eventPhase(event, now);
  const live = phase === 'live' || phase === 'started';
  const until = live && event.endsAt ? ` · bis ${eventTimeLabel(event.endsAt)}` : '';
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${live ? 'läuft jetzt' : `${when(event, today)} Uhr`}, ${event.location}, öffnen`} onPress={() => router.push(href)} style={[styles.radar, { width }]}>
      <GlassBackdrop radius={radius.xl} variant="panel" />
      <Image source={event.image} resizeMode="cover" style={styles.radarImage} accessibilityLabel={imageLabel(event)} />
      <View style={styles.radarCopy}>
        <View style={styles.radarStatus}>
          {live && <View style={styles.liveDot} />}
          <Text numberOfLines={1} style={[styles.radarWhen, live && styles.radarLive]}>{live ? `Live${until}` : `${when(event, today)} Uhr`}</Text>
        </View>
        <Text numberOfLines={2} style={styles.radarTitle}>{event.title}</Text>
        <View style={styles.radarMeta}>
          <Icon name="pin" size={12} color={colors.faint} />
          <Text numberOfLines={1} style={styles.radarPlace}>{[event.venue ?? event.location, typeof distanceKm === 'number' ? distance(distanceKm) : null].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <SaveEventButton id={event.id} title={event.title} size={36} />
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
  hero: { aspectRatio: 0.8, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'space-between', ...squircle },
  heroArt: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '24%' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md },
  heroBody: { padding: space.xl, gap: 3 },
  heroWhen: { ...type.overline, color: colors.pink },
  heroTitle: { ...type.title, color: colors.text },
  heroPlace: { ...type.callout, color: colors.muted },
  poster: { width: 156, gap: 3 },
  posterImage: { width: 156, height: 208, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: space.xs, ...squircle },
  posterWhen: { ...type.overline, fontSize: 11, color: colors.pink },
  posterTitle: { ...type.label, color: colors.text },
  posterPlace: { ...type.footnote, color: colors.faint },
  radar: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.xl, overflow: 'hidden', ...squircle },
  radarImage: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, ...squircle },
  radarCopy: { flex: 1, minWidth: 0, gap: 3 },
  radarStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink },
  radarWhen: { ...type.overline, fontSize: 11, color: colors.muted, flexShrink: 1 },
  radarLive: { color: colors.pink },
  radarTitle: { ...type.headline, color: colors.text },
  radarMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  radarPlace: { ...type.footnote, color: colors.faint, flexShrink: 1 },
  rail: { gap: space.lg, paddingHorizontal: gutter },
  story: { width: 72, alignItems: 'center', gap: space.xs },
  ring: { width: 72, height: 72, borderRadius: 36, padding: 3, borderWidth: 2.5, borderColor: colors.accent },
  ringSeen: { borderColor: colors.surfaceHigh },
  storyImage: { width: '100%', height: '100%', borderRadius: 31, backgroundColor: colors.surface },
  storyLabel: { ...type.footnote, fontSize: 12, color: colors.text },
  storySeen: { color: colors.faint },
});
