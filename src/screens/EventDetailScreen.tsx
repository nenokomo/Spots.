import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventArtwork } from '../components/EventCards';
import { EventDataState } from '../components/EventDataState';
import { EventPhotoViewer } from '../components/EventPhotoViewer';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon, type IconName } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { StatusBadge } from '../components/ui/StatusBadge';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { useEventContent } from '../hooks/useEventContent';
import { useNow } from '../hooks/useNow';
import { useOrganizerSummary } from '../hooks/useOrganizer';
import { organizerHref } from '../navigation/eventRoutes';
import { formatPrice } from '../services/content';
import { eventPhase } from '../utils/eventStatus';

const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

/** One fact in the strip under the title: icon, value, small label. */
function Fact({ icon, value, label, onPress, accessibilityLabel }: { icon: IconName; value: string; label: string; onPress?: () => void; accessibilityLabel?: string }) {
  const body = <>
    <Icon name={icon} size={18} color={colors.pink} />
    <Text numberOfLines={1} style={styles.factValue}>{value}</Text>
    <Text numberOfLines={1} style={styles.factLabel}>{label}</Text>
  </>;
  return onPress
    ? <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? value} onPress={onPress} style={styles.fact}>{body}</PressableScale>
    : <View style={styles.fact}>{body}</View>;
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{note && <Text style={styles.sectionNote}>{note}</Text>}</View>{children}</View>;
}

export default function EventDetailScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote = useEvent(id);
  const event = remote.event;
  const organizer = useOrganizerSummary(event?.organizerId);
  const content = useEventContent(event?.id);
  const [viewer, setViewer] = useState<number | null>(null);
  const [linkError, setLinkError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  if (!event || remote.error) return <View style={styles.screen}><Backdrop /><View style={[styles.state, { paddingTop: insets.top + 12 }]}>
    <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} plain style={styles.stateBack} />
    <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
    {!remote.loading && !remote.error && <Text style={styles.title}>Event nicht verfügbar</Text>}
    <Link href="/" style={styles.link}>Zurück zum Radar</Link>
  </View></View>;

  const phase = eventPhase(event, now);
  const ended = phase === 'ended';
  const live = phase === 'live' || phase === 'started';
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const ticketUrl = event.ticketUrl?.startsWith('https://') ? event.ticketUrl : undefined;
  const sourceUrl = event.sourceUrl?.startsWith('https://') ? event.sourceUrl : undefined;
  const sourceLabel = event.sourceName ? event.sourceName.charAt(0).toLocaleUpperCase('de') + event.sourceName.slice(1) : 'der Originalseite';
  const point = event.coordinate;
  const tags = [...new Set([...(event.genres ?? []), ...event.categories])];
  const snaps = content.snaps.filter((snap) => snap.mediaType === 'image');
  const gallery = [...(event.imageIsPlaceholder ? [] : [event.image]), ...snaps.map((snap) => ({ uri: snap.url }))];
  const heroHeight = Math.min(420, Math.max(260, (width - gutter * 2) * 0.92));
  const primary = !ended ? ticketUrl ?? sourceUrl : undefined;

  async function open(url: string) {
    setLinkError(false);
    try { await Linking.openURL(url); } catch { setLinkError(true); }
  }
  function route() {
    if (!point) return;
    const destination = `${point.latitude},${point.longitude}`;
    void open(Platform.OS === 'ios' ? `https://maps.apple.com/?daddr=${destination}` : `https://www.google.com/maps/dir/?api=1&destination=${destination}`);
  }
  async function share() {
    try { await Share.share({ title: `${event!.title} · Spots`, message: `${event!.title}\n${dayFormat.format(start)}, ${timeFormat.format(start)} Uhr\n${event!.venue ? `${event!.venue}, ` : ''}${event!.location}${sourceUrl ? `\n${sourceUrl}` : ''}` }); } catch { /* dismissed */ }
  }

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
      {/* Artwork card: full flyer on its own colour field, status and heart on top. */}
      <View style={[styles.hero, { height: heroHeight }]}>
        <EventArtwork event={event} inset={14} />
        {!event.imageIsPlaceholder && <Pressable accessibilityRole="button" accessibilityLabel="Eventbild groß anzeigen" onPress={() => setViewer(0)} style={StyleSheet.absoluteFill} />}
        <LinearGradient pointerEvents="none" colors={['#100b1599', '#100b1500', '#100b1500', '#100b1599']} locations={[0, 0.25, 0.75, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTop}>
          <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
          <View style={styles.heroActions}><IconButton icon="share" accessibilityLabel="Event teilen" onPress={() => void share()} /><SaveEventButton id={event.id} title={event.title} overlay size={44} /></View>
        </View>
        <View style={styles.heroBottom}>{phase !== 'upcoming' ? <StatusBadge phase={phase} overlay /> : <View />}{event.imageIsPlaceholder && <Text style={styles.placeholderNote}>Symbolbild</Text>}</View>
      </View>

      <View style={styles.body}>
        {tags.length > 0 && <Text numberOfLines={1} style={styles.kicker}>{tags.slice(0, 3).join('  ·  ').toLocaleUpperCase('de')}</Text>}
        <Text style={styles.title}>{event.title}</Text>
        {organizer
          ? <Link href={organizerHref(organizer.id)} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Veranstalter ${organizer.displayName} öffnen`} style={styles.organizer}>
              <View style={styles.organizerAvatar}>{organizer.avatarUrl ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} /> : <Icon name="profile" size={13} color={colors.text} />}</View>
              <Text numberOfLines={1} style={styles.organizerName}>{organizer.displayName}</Text>
              <Icon name="chevron" size={12} color={colors.faint} />
            </Pressable></Link>
          : <Text style={styles.subtitle}>{event.venue ? `${event.venue}, ${event.location}` : event.location}</Text>}

        {/* Fact strip: the three questions, each a tap away where it makes sense. */}
        <View style={styles.facts}>
          <GlassBackdrop radius={radius.lg} variant="card" />
          <Fact icon="calendar" value={shortDay.format(start)} label={dayFormat.format(start).split(',')[0]} />
          <View style={styles.factDivider} />
          <Fact icon="clock" value={`${timeFormat.format(start)}${end ? `–${timeFormat.format(end)}` : ''}`} label={live ? 'läuft' : end ? 'Uhr' : 'Beginn'} />
          <View style={styles.factDivider} />
          <Fact icon="pin" value={event.venue ?? event.location} label={event.venue ? event.location : point && !ended ? 'Route' : 'Ort'} onPress={point && !ended ? route : undefined} accessibilityLabel="Route zum Veranstaltungsort anzeigen" />
        </View>
        {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}

        {content.tickets.length > 0 && !ended && <Section title="Tickets" note="Verkauf über den Anbieter">
          <View style={styles.tickets}>{content.tickets.map((ticket) => (
            <PressableScale key={ticket.id} accessibilityRole="button" disabled={!ticket.externalUrl || ticket.soldOut} onPress={() => ticket.externalUrl && void open(ticket.externalUrl)} style={styles.ticket}>
              <View style={styles.ticketCopy}><Text style={styles.ticketName}>{ticket.name}</Text>{ticket.description && <Text numberOfLines={1} style={styles.ticketNote}>{ticket.description}</Text>}</View>
              <Text style={[styles.ticketPrice, ticket.soldOut && styles.soldOut]}>{ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, ticket.currency)}</Text>
            </PressableScale>
          ))}</View>
        </Section>}

        {event.description && <Section title="Über das Event"><Text style={styles.description}>{event.description}</Text></Section>}

        <Section title="Live Snaps" note="24 Stunden sichtbar">
          {snaps.length > 0
            ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.snaps}>
                {snaps.map((snap, index) => <Pressable key={snap.id} accessibilityRole="button" accessibilityLabel={`Live Snap ${index + 1} öffnen`} onPress={() => setViewer(gallery.length - snaps.length + index)} style={styles.snap}><Image source={{ uri: snap.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />{snap.byOrganizer && <Text style={styles.snapBadge}>Veranstalter</Text>}</Pressable>)}
              </ScrollView>
            : <View style={styles.snapEmpty}><Icon name="camera" size={18} color={colors.faint} /><Text style={styles.snapEmptyText}>{live ? 'Noch keine Eindrücke von heute Nacht.' : 'Eindrücke von Besuchern erscheinen, sobald das Event läuft.'}</Text></View>}
        </Section>

        <View style={styles.footer}>
          {ended && <Text style={styles.footnote}>Dieses Event ist vorbei.</Text>}
          {sourceUrl && <Link href={sourceUrl} style={styles.link}>Original auf {sourceLabel} öffnen ↗</Link>}
          {event.sourceName?.toLowerCase() === 'goabase' && <Link href="https://www.goabase.net/" style={styles.link}>Veranstaltungen von Goabase ↗</Link>}
          <Text style={styles.footnote}>Zeiten in Europe/Berlin · Angaben der Veranstaltungsquelle{event.sourceName ? ` (${sourceLabel})` : ''}</Text>
        </View>
      </View>
    </ScrollView>

    {/* Sticky action bar: one primary action, route as a quiet second. */}
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <GlassBackdrop radius={0} variant="panel" />
      <View style={styles.barRow}>
        {primary
          ? <Button label={ticketUrl ? 'Tickets kaufen' : 'Infos & Tickets'} accessibilityLabel={ticketUrl ? 'Tickets beim Anbieter kaufen' : `Infos und Tickets auf der Originalseite bei ${sourceLabel}`} icon="ticket" onPress={() => void open(primary)} style={styles.flex} />
          : <View style={styles.barCopy}><Text numberOfLines={1} style={styles.barTitle}>{ended ? 'Event beendet' : `${shortDay.format(start)} · ${timeFormat.format(start)} Uhr`}</Text><Text numberOfLines={1} style={styles.barText}>{event.venue ? `${event.venue}, ${event.location}` : event.location}</Text></View>}
        {point && !ended && <Button label="Route" icon="map" variant="secondary" onPress={route} accessibilityLabel="Route zum Veranstaltungsort anzeigen" />}
      </View>
    </View>

    <Modal visible={viewer !== null} animationType="fade" onRequestClose={() => setViewer(null)}>{viewer !== null && <EventPhotoViewer images={gallery} initialIndex={viewer} onClose={() => setViewer(null)} />}</Modal>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  state: { flex: 1, paddingHorizontal: gutter, gap: space.md },
  stateBack: { backgroundColor: colors.surface, marginBottom: space.lg },
  hero: { marginHorizontal: gutter, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, justifyContent: 'space-between', ...squircle },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', padding: space.md },
  heroActions: { flexDirection: 'row', gap: space.sm },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: space.md },
  placeholderNote: { ...type.footnote, fontSize: 11, color: colors.text, backgroundColor: '#100b15b3', borderRadius: radius.sm, overflow: 'hidden', paddingHorizontal: space.sm, paddingVertical: 3 },
  body: { paddingHorizontal: gutter, paddingTop: space.xl },
  kicker: { ...type.overline, fontSize: 11, color: colors.pink, marginBottom: space.xs },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.callout, color: colors.muted, marginTop: space.xs },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32, marginTop: space.xs, alignSelf: 'flex-start' },
  organizerAvatar: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  organizerName: { ...type.label, fontSize: 14, color: colors.text, flexShrink: 1 },
  facts: { flexDirection: 'row', alignItems: 'stretch', marginTop: space.xl, borderRadius: radius.lg, overflow: 'hidden', ...squircle },
  fact: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.lg, paddingHorizontal: space.xs },
  factValue: { ...type.label, fontSize: 14, color: colors.text, textAlign: 'center' },
  factLabel: { ...type.footnote, fontSize: 11, color: colors.faint, textAlign: 'center' },
  factDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginVertical: space.md },
  error: { ...type.footnote, color: colors.danger, marginTop: space.sm },
  section: { marginTop: space.xxl },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md, marginBottom: space.md },
  sectionTitle: { ...type.title3, color: colors.text },
  sectionNote: { ...type.footnote, color: colors.faint },
  tickets: { gap: space.sm },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  ticketCopy: { flex: 1, minWidth: 0 },
  ticketName: { ...type.label, color: colors.text },
  ticketNote: { ...type.footnote, color: colors.muted, marginTop: 2 },
  ticketPrice: { ...type.headline, color: colors.text },
  soldOut: { color: colors.faint },
  description: { ...type.body, color: colors.muted },
  snaps: { gap: space.sm },
  snap: { width: 104, height: 156, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  snapBadge: { position: 'absolute', left: 6, bottom: 6, ...type.footnote, fontSize: 10, fontWeight: '700', color: colors.text, backgroundColor: colors.accent, borderRadius: 6, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2 },
  snapEmpty: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: '#ffffff08' },
  snapEmptyText: { ...type.footnote, color: colors.muted, flex: 1 },
  footer: { marginTop: space.xxl, gap: space.xs },
  link: { ...type.callout, color: colors.pink, paddingVertical: space.sm },
  footnote: { ...type.footnote, color: colors.faint },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barCopy: { flex: 1, minWidth: 0 },
  barTitle: { ...type.headline, color: colors.text },
  barText: { ...type.footnote, color: colors.faint },
});
