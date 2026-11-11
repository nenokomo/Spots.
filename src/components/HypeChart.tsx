import { router, type Href } from 'expo-router';
import { Fragment } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import type { RankedEvent } from '../services/popularity';
import type { SpotEvent } from '../types/events';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { GlassBackdrop } from './GlassBackdrop';
import { PressableScale } from './ui/PressableScale';

type Props = { ranked: RankedEvent[]; today: string; hrefFor: (event: SpotEvent) => Href };

/**
 * Chart list for the most popular events of a city: rank, artwork, title and
 * date, tickets sold, plus a thin bar relative to the number one.
 */
export function HypeChart({ ranked, today, hrefFor }: Props) {
  const top = Math.max(1, ...ranked.map((item) => item.ticketsSold));
  return (
    <View style={styles.card}>
      <GlassBackdrop radius={radius.xl} variant="card" />
      {ranked.map((item, index) => (
        <Fragment key={item.event.id}>
          {index > 0 && <View style={styles.separator} />}
          <PressableScale accessibilityRole="link" accessibilityLabel={`Platz ${item.rank}: ${item.event.title}, ${eventDayLabel(item.event.startsAt, today)} ${eventTimeLabel(item.event.startsAt)} Uhr, ${item.ticketsSold} Tickets, öffnen`} onPress={() => router.push(hrefFor(item.event))} scaleTo={0.98} style={styles.row}>
            <Text style={[styles.rank, item.rank <= 3 && styles.rankTop]}>{item.rank}</Text>
            <Image source={item.event.image} resizeMode="cover" style={styles.image} accessibilityLabel={item.event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${item.event.title}`} />
            <View style={styles.copy}>
              <Text numberOfLines={1} style={styles.title}>{item.event.title}</Text>
              <Text numberOfLines={1} style={styles.when}>{eventDayLabel(item.event.startsAt, today)} · {eventTimeLabel(item.event.startsAt)} Uhr</Text>
              <View style={styles.track}><View style={[styles.bar, { width: `${Math.round((item.ticketsSold / top) * 100)}%` }, item.rank === 1 && styles.barTop]} /></View>
            </View>
            <View style={styles.count}><Text style={styles.countValue}>{item.ticketsSold}</Text><Text style={styles.countLabel}>Tickets</Text></View>
          </PressableScale>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: gutter, borderRadius: radius.xl, overflow: 'hidden', paddingVertical: space.xs, ...squircle },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: space.lg + 28 + space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rank: { width: 28, textAlign: 'center', ...type.title3, color: colors.faint },
  rankTop: { color: colors.pink },
  image: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surface, ...squircle },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { ...type.label, color: colors.text },
  when: { ...type.footnote, fontSize: 12, color: colors.muted },
  track: { height: 3, borderRadius: 2, backgroundColor: '#ffffff14', marginTop: 3, overflow: 'hidden' },
  bar: { height: 3, borderRadius: 2, backgroundColor: colors.accentLine },
  barTop: { backgroundColor: colors.pink },
  count: { alignItems: 'flex-end', minWidth: 52 },
  countValue: { ...type.headline, color: colors.text },
  countLabel: { ...type.footnote, fontSize: 10, color: colors.faint },
});
