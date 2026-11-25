import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { squircle } from '../../constants/theme';
import type { OrganizerEvent } from '../organizer/organizerApi';
import { eventState, timeFormat } from './format';
import { openEvent } from './routes';
import { studio, studioType } from './theme';
import { Pill } from './ui';

const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit' });
const month = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'short' });
const weekday = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short' });

/** Ein Event als Zeile: Datumsblock, Titel, Ort, Status, Flyer. Tippen öffnet die Eventseite. */
export function EventCard({ event }: { event: OrganizerEvent }) {
  const start = new Date(event.startsAt);
  const state = eventState(event);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${event.title} öffnen`} onPress={() => openEvent(event.id)}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={[styles.date, event.status === 'cancelled' && styles.dateOff]}>
      <Text style={styles.weekday}>{weekday.format(start).replace('.', '').toUpperCase()}</Text>
      <Text style={styles.day}>{day.format(start)}</Text>
      <Text style={styles.month}>{month.format(start).replace('.', '').toUpperCase()}</Text>
    </View>
    <View style={styles.copy}>
      <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
      <Text numberOfLines={1} style={styles.meta}>{timeFormat.format(start)} Uhr{event.venueName ? ` · ${event.venueName}` : ''}</Text>
      <Pill label={state.label} tone={state.tone} />
    </View>
    {event.imageUrl
      ? <Image source={{ uri: event.imageUrl }} style={styles.flyer} accessibilityLabel={`Flyer: ${event.title}`} />
      : <View style={[styles.flyer, styles.noFlyer]}><Icon name="image" size={18} color={studio.faint} /></View>}
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: studio.radius, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line, alignItems: 'center', ...squircle },
  pressed: { backgroundColor: studio.panelHigh },
  date: { width: 58, height: 72, borderRadius: studio.radiusSmall, backgroundColor: studio.accentSoft, alignItems: 'center', justifyContent: 'center', ...squircle },
  dateOff: { backgroundColor: studio.panelHigh },
  weekday: { ...studioType.label, fontSize: 10, lineHeight: 13, color: studio.pink },
  day: { fontSize: 24, lineHeight: 27, fontWeight: '800', color: studio.text, fontVariant: ['tabular-nums'] },
  month: { ...studioType.label, fontSize: 10, lineHeight: 13, color: studio.muted },
  copy: { flex: 1, gap: 6 },
  title: { ...studioType.heading, fontSize: 16, lineHeight: 21, color: studio.text },
  meta: { ...studioType.small, color: studio.muted },
  flyer: { width: 54, height: 70, borderRadius: 10, backgroundColor: studio.panelHigh },
  noFlyer: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: studio.line, borderStyle: 'dashed', backgroundColor: 'transparent' },
});
