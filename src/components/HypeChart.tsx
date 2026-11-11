import { router, type Href } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import type { RankedEvent } from '../services/popularity';
import type { SpotEvent } from '../types/events';
import { eventDayLabel } from '../utils/events';
import { PressableScale } from './ui/PressableScale';

type Props = { ranked: RankedEvent[]; today: string; hrefFor: (event: SpotEvent) => Href };

/** Popular events as a plain horizontal row: square image, title and day (order = popularity, no visible rank). Sales figures stay internal. */
export function HypeChart({ ranked, today, hrefFor }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ranked.map((item) => (
        <PressableScale key={item.event.id} accessibilityRole="link" accessibilityLabel={`${item.event.title}, ${eventDayLabel(item.event.startsAt, today)}, öffnen`} onPress={() => router.push(hrefFor(item.event))} style={styles.item}>
          <View style={styles.image}>
            <Image source={item.event.image} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel={item.event.imageIsPlaceholder ? 'Symbolfoto einer Veranstaltung' : `Eventbild: ${item.event.title}`} />
          </View>
          <Text numberOfLines={1} style={styles.title}>{item.event.title}</Text>
          <Text numberOfLines={1} style={styles.meta}>{eventDayLabel(item.event.startsAt, today)} · {item.event.location}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.md, paddingHorizontal: gutter },
  item: { width: 136, gap: 2 },
  image: { width: 136, height: 136, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: space.xs, ...squircle },
  title: { ...type.label, fontSize: 14, color: colors.text },
  meta: { ...type.footnote, fontSize: 12, color: colors.faint },
});
