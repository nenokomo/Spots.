import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import { eventDetailHref } from '../navigation/eventRoutes';
import { shouldTrack, trackEvent } from '../services/eventStats';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { sourceLabel, ticketSeller } from '../utils/eventSource';
import { eventTimeLabel } from '../utils/events';
import { Icon } from './Icon';
import { SaveEventButton } from './SaveEventButton';
import { PressableScale } from './ui/PressableScale';

const weekday = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short' });
const dayNumber = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric' });
const month = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'short' });
const clean = (text: string) => text.replace('.', '').toLocaleUpperCase('de');

/** Where to buy tickets for an upcoming event: the ticket link, otherwise the source page. Null when there is none. */
export function ticketLink(event: SpotEvent) {
  const ticketUrl = event.ticketUrl?.startsWith('https://') ? event.ticketUrl : null;
  const sourceUrl = event.sourceUrl?.startsWith('https://') ? event.sourceUrl : null;
  const seller = ticketSeller(event.sourceName);
  if (ticketUrl) return { url: ticketUrl, label: 'Tickets', a11y: seller ? `Tickets bei ${seller} kaufen` : 'Tickets beim Anbieter kaufen' };
  if (sourceUrl) return { url: sourceUrl, label: 'Infos & Tickets', a11y: `Infos und Tickets bei ${sourceLabel(event.sourceName)}` };
  return null;
}

/** Opens the ticket page and counts the click for the organizer's statistics (like the event page). */
export function openTicket(event: SpotEvent, url: string) {
  if (shouldTrack(event)) void trackEvent(event.id, 'ticket_click');
  void Linking.openURL(url).catch(() => {});
}

/**
 * One line of the organizer's programme: a date tile (glowing „JETZT“ while the event runs),
 * title, time and place, the small flyer and – for upcoming events – the save button.
 */
export function OrganizerEventRow({ event, now, onOpen }: { event: SpotEvent; now: number; /** Called before navigating, e.g. to close a sheet. */ onOpen?: () => void }) {
  const phase = eventPhase(event, now);
  const ended = phase === 'ended';
  const running = phase === 'live' || phase === 'started';
  const start = new Date(event.startsAt);
  const place = event.venue ?? event.location;
  const ticket = ended ? null : ticketLink(event);
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={`${event.title}, ${running ? 'läuft gerade' : `${weekday.format(start)} ${dayNumber.format(start)}. ${month.format(start)}`}, ${eventTimeLabel(event.startsAt)} Uhr, ${place}, öffnen`}
      onPress={() => { onOpen?.(); router.push(eventDetailHref(event.id)); }} scaleTo={0.98} style={[styles.row, ended && styles.rowEnded]}>
      {running
        ? <LinearGradient colors={colors.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.date, styles.dateLive]}>
            <Text style={styles.liveText}>JETZT</Text>
          </LinearGradient>
        : <View style={[styles.date, ended && styles.dateEnded]}>
            <Text style={[styles.weekday, ended && styles.faint]}>{clean(weekday.format(start))}</Text>
            <Text style={[styles.day, ended && styles.dayEnded]}>{dayNumber.format(start).replace('.', '')}</Text>
            <Text style={[styles.month, ended && styles.faint]}>{clean(month.format(start))}</Text>
          </View>}
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.title, ended && styles.titleEnded]}>{event.title}</Text>
        <Text numberOfLines={1} style={styles.meta}>{eventTimeLabel(event.startsAt)} Uhr · {place}</Text>
        {ticket && <Pressable accessibilityRole="link" accessibilityLabel={ticket.a11y} onPress={() => openTicket(event, ticket.url)} hitSlop={6} style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}>
          <Icon name="ticket" size={13} color={colors.text} />
          <Text style={styles.ticketText}>{ticket.label}</Text>
        </Pressable>}
      </View>
      {!event.imageIsPlaceholder && <Image source={event.image} resizeMode="cover" style={[styles.flyer, ended && styles.flyerEnded]} />}
      {!ended && <SaveEventButton id={event.id} title={event.title} size={36} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.md, borderRadius: radius.lg, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  rowEnded: { backgroundColor: 'transparent' },
  date: { width: 58, height: 68, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, ...squircle },
  dateLive: { boxShadow: '0 0 16px 2px #ff4ab866' },
  dateEnded: { backgroundColor: '#ffffff0d' },
  weekday: { ...type.overline, fontSize: 10, lineHeight: 13, color: colors.pink },
  day: { fontSize: 24, lineHeight: 27, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  dayEnded: { color: colors.muted },
  month: { ...type.overline, fontSize: 10, lineHeight: 13, color: colors.muted },
  faint: { color: colors.faint },
  liveText: { ...type.overline, fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.text },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { ...type.headline, color: colors.text },
  titleEnded: { color: colors.muted },
  meta: { ...type.footnote, color: colors.faint },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: colors.accentDeep },
  ticketText: { ...type.label, fontSize: 12, color: colors.text },
  pressed: { opacity: 0.8 },
  flyer: { width: 44, height: 56, borderRadius: radius.sm, backgroundColor: colors.surface },
  flyerEnded: { opacity: 0.5 },
});
