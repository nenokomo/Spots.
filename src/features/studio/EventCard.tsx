import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { OrganizerEvent } from '../organizer/organizerApi';
import { eventState, timeFormat } from './format';
import { studio, studioType } from './theme';
import { Pill } from './ui';

const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit' });
const month = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'short' });

/** Ein Event als Zeile: Datumsblock, Titel, Ort, Status, Flyer. Tippen öffnet den Editor. */
export function EventCard({ event }: { event: OrganizerEvent }) {
  const start = new Date(event.startsAt);
  const state = eventState(event);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${event.title} bearbeiten`}
    onPress={() => router.push({ pathname: '/studio/event/[id]', params: { id: event.id } })}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.date}>
      <Text style={styles.day}>{day.format(start)}</Text>
      <Text style={styles.month}>{month.format(start).replace('.', '').toUpperCase()}</Text>
    </View>
    <View style={styles.copy}>
      <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
      <Text numberOfLines={1} style={styles.meta}>{timeFormat.format(start)} Uhr{event.venueName ? ` · ${event.venueName}` : ''}</Text>
      <Pill label={state.label} tone={state.tone} />
    </View>
    {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.flyer} accessibilityLabel={`Flyer: ${event.title}`} />}
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, alignItems: 'center' },
  pressed: { backgroundColor: studio.panelHigh },
  date: { width: 56, height: 64, borderRadius: studio.radiusSmall, backgroundColor: studio.bg, borderWidth: 1, borderColor: studio.line, alignItems: 'center', justifyContent: 'center' },
  day: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: studio.text, fontVariant: ['tabular-nums'] },
  month: { ...studioType.label, fontSize: 10, color: studio.lime },
  copy: { flex: 1, gap: 6 },
  title: { ...studioType.heading, fontSize: 16, lineHeight: 21, color: studio.text },
  meta: { ...studioType.small, color: studio.muted },
  flyer: { width: 52, height: 66, borderRadius: 8, backgroundColor: studio.bg },
});
