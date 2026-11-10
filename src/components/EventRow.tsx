import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { Icon } from './Icon';
import { StatusBadge } from './ui/StatusBadge';

type Props = { event: SpotEvent; href: Href; now: number; today: string; trailing?: ReactNode; compact?: boolean };

/** Horizontal event card used in lists (organizer page, saved events). */
export function EventRow({ event, href, now, today, trailing, compact = false }: Props) {
  const phase = eventPhase(event, now);
  const ended = phase === 'ended';
  const tags = event.genres?.length ? event.genres : event.categories;
  const showBadge = phase !== 'upcoming';
  return (
    <View style={[styles.card, ended && styles.ended]}>
      <Link href={href} asChild>
        <Pressable accessibilityLabel={`${event.title}, ${eventDayLabel(event.startsAt, today)} ${eventTimeLabel(event.startsAt)} Uhr, ${event.location}, öffnen`} style={styles.link}>
          <Image source={event.image} style={[styles.image, compact && styles.compactImage]} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={[styles.when, ended && styles.mutedWhen]}>{eventDayLabel(event.startsAt, today).toLocaleUpperCase('de')} · {eventTimeLabel(event.startsAt)}</Text>
            <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
            <View style={styles.meta}><Icon name="pin" size={12} color={colors.faint} /><Text numberOfLines={1} style={styles.metaText}>{event.venue ? `${event.venue} · ${event.location}` : event.location}</Text></View>
            {(showBadge || (!compact && tags.length > 0)) && <View style={styles.footer}>
              {showBadge && <StatusBadge phase={phase} />}
              {!compact && tags.length > 0 && <Text numberOfLines={1} style={styles.tags}>{tags.slice(0, 2).join(' · ')}</Text>}
            </View>}
          </View>
        </Pressable>
      </Link>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : <Icon name="chevron" size={16} color={colors.faint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, paddingRight: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: '#ffffff0f' },
  ended: { opacity: 0.72 },
  link: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md },
  image: { width: 76, height: 96, borderRadius: radius.md, backgroundColor: colors.surface },
  compactImage: { width: 60, height: 72, borderRadius: radius.sm },
  copy: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 2 },
  when: { ...type.overline, fontSize: 10, color: colors.pink, letterSpacing: 0.8 },
  mutedWhen: { color: colors.faint },
  title: { ...type.label, fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...type.caption, color: colors.muted, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  tags: { ...type.caption, fontSize: 11, color: colors.faint, flexShrink: 1 },
  trailing: { alignSelf: 'center' },
});
