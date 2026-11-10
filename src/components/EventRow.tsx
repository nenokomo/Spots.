import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { Icon } from './Icon';
import { PressableScale } from './ui/PressableScale';

type Props = { event: SpotEvent; href: Href; now: number; today: string; trailing?: ReactNode; showDay?: boolean };

/** List row without a box: artwork, two lines of text, hairlines come from the list. */
export function EventRow({ event, href, now, today, trailing, showDay = true }: Props) {
  const phase = eventPhase(event, now);
  const live = phase === 'live' || phase === 'started';
  const ended = phase === 'ended';
  const time = `${eventTimeLabel(event.startsAt)} Uhr`;
  const lead = live ? 'Live' : showDay ? `${eventDayLabel(event.startsAt, today)} · ${time}` : time;
  return (
    <View style={[styles.row, ended && styles.ended]}>
      <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${eventDayLabel(event.startsAt, today)} ${time}, ${event.location}, öffnen`} onPress={() => router.push(href)} scaleTo={0.98} style={styles.link}>
        <Image source={event.image} resizeMode="cover" style={styles.image} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`} />
        <View style={styles.copy}>
          <View style={styles.lead}>{live && <View style={styles.dot} />}<Text numberOfLines={1} style={[styles.when, ended && styles.whenEnded]}>{ended ? `Vorbei · ${eventDayLabel(event.startsAt, today)}` : lead}</Text></View>
          <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
          <Text numberOfLines={1} style={styles.place}>{event.venue ? `${event.venue} · ${event.location}` : event.location}</Text>
        </View>
      </PressableScale>
      {trailing ?? <Icon name="chevron" size={14} color={colors.faint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  ended: { opacity: 0.6 },
  link: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md },
  image: { width: 68, height: 68, borderRadius: radius.md, backgroundColor: colors.surface, ...squircle },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink },
  when: { ...type.overline, fontSize: 11, color: colors.pink },
  whenEnded: { color: colors.faint },
  title: { ...type.headline, fontSize: 16, lineHeight: 21, color: colors.text },
  place: { ...type.footnote, color: colors.faint },
});
