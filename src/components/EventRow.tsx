import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { Icon } from './Icon';
import { PressableScale } from './ui/PressableScale';

type Props = { event: SpotEvent; href: Href; now: number; today: string; trailing?: ReactNode; showDay?: boolean; distanceKm?: number };

export const EVENT_ROW_HEIGHT = 92;
const distance = (km: number) => `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;

/** List row without a box: artwork, three short lines, hairlines come from the list. */
export function EventRow({ event, href, now, today, trailing, showDay = true, distanceKm }: Props) {
  const phase = eventPhase(event, now);
  const live = phase === 'live' || phase === 'started';
  const ended = phase === 'ended';
  const time = `${eventTimeLabel(event.startsAt)} Uhr`;
  const lead = live ? (event.endsAt ? `Live · bis ${eventTimeLabel(event.endsAt)}` : 'Live') : showDay ? `${eventDayLabel(event.startsAt, today)} · ${time}` : time;
  const where = event.venue ?? event.location;
  return (
    <View style={[styles.row, ended && styles.ended]}>
      <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${live ? 'läuft jetzt' : `${eventDayLabel(event.startsAt, today)} ${time}`}, ${event.location}, öffnen`} onPress={() => router.push(href)} scaleTo={0.98} style={styles.link}>
        <Image source={event.image} resizeMode="cover" style={styles.image} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${event.title}`} />
        <View style={styles.copy}>
          <View style={styles.lead}>{live && <View style={styles.dot} />}<Text numberOfLines={1} style={[styles.when, ended && styles.whenEnded]}>{ended ? `Vorbei · ${eventDayLabel(event.startsAt, today)}` : lead}</Text></View>
          <Text numberOfLines={1} style={styles.title}>{event.title}</Text>
          <Text numberOfLines={1} style={styles.place}>{typeof distanceKm === 'number' ? `${where} · ${distance(distanceKm)}` : event.venue ? `${event.venue} · ${event.location}` : event.location}</Text>
        </View>
      </PressableScale>
      {trailing ?? <Icon name="chevron" size={14} color={colors.faint} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: EVENT_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: space.md },
  ended: { opacity: 0.6 },
  link: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md },
  image: { width: 68, height: 68, borderRadius: radius.md, backgroundColor: colors.surface, ...squircle },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink },
  when: { ...type.overline, fontSize: 11, color: colors.pink },
  whenEnded: { color: colors.faint },
  title: { ...type.headline, fontSize: 16, lineHeight: 21, color: colors.text },
  place: { ...type.footnote, color: colors.faint },
});
