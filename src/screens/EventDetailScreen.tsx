import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDataState } from '../components/EventDataState';
import { EventPhotoViewer } from '../components/EventPhotoViewer';
import { OrganizerAvatar } from '../components/GalleryPost';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon, type IconName } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { useEventContent } from '../hooks/useEventContent';
import { useNow } from '../hooks/useNow';
import { useOrganizerSummary } from '../hooks/useOrganizer';
import { organizerHref } from '../navigation/eventRoutes';
import { formatPrice } from '../services/content';
import { eventPhase, phaseLabel } from '../utils/eventStatus';

const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

/** One row of the info list: icon, headline, detail, optional chevron. */
function Row({ icon, title, detail, onPress, accessibilityLabel }: { icon: IconName; title: string; detail?: string; onPress?: () => void; accessibilityLabel?: string }) {
  const body = <>
    <View style={styles.rowIcon}><Icon name={icon} size={18} color={colors.pink} /></View>
    <View style={styles.rowCopy}><Text numberOfLines={2} style={styles.rowTitle}>{title}</Text>{detail && <Text numberOfLines={1} style={styles.rowDetail}>{detail}</Text>}</View>
    {onPress && <Icon name="chevron" size={14} color={colors.faint} />}
  </>;
  return onPress
    ? <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} onPress={onPress} scaleTo={0.98} style={styles.row}>{body}</PressableScale>
    : <View style={styles.row}>{body}</View>;
}

/**
 * Poster-first event page: the flyer fills most of the screen, a glass card
 * with the essentials floats over its lower edge, details follow underneath.
 */
export default function EventDetailScreen() {
  const { width, height } = useWindowDimensions();
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
  const posterHeight = Math.min(height * 0.64, width * 1.35);
  const primary = !ended ? ticketUrl ?? sourceUrl : undefined;
  const place = event.venue ? `${event.venue}, ${event.location}` : event.location;

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
    try { await Share.share({ title: `${event!.title} · Spots`, message: `${event!.title}\n${dayFormat.format(start)}, ${timeFormat.format(start)} Uhr\n${place}${sourceUrl ? `\n${sourceUrl}` : ''}` }); } catch { /* dismissed */ }
  }

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
      {/* Poster: blurred fill behind, the complete flyer in front, darkening towards the card. */}
      <View style={[styles.poster, { height: posterHeight }]}>
        <Image source={event.image} resizeMode="cover" blurRadius={event.imageIsPlaceholder ? 0 : 40} style={StyleSheet.absoluteFill} />
        {!event.imageIsPlaceholder && <Pressable accessibilityRole="button" accessibilityLabel="Eventbild groß anzeigen" onPress={() => setViewer(0)} style={[StyleSheet.absoluteFill, { top: insets.top + 56, bottom: 96 }]}><Image source={event.image} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={`Eventbild: ${event.title}`} /></Pressable>}
        <LinearGradient pointerEvents="none" colors={['#0a090cb3', '#0a090c00', '#0a090c00', colors.background]} locations={[0, 0.22, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.toolbar, { paddingTop: insets.top + space.sm }]}>
          <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
          <View style={styles.toolbarActions}><IconButton icon="share" accessibilityLabel="Event teilen" onPress={() => void share()} /><SaveEventButton id={event.id} title={event.title} overlay size={44} /></View>
        </View>
      </View>

      {/* Floating essentials card. */}
      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <GlassBackdrop radius={radius.xl} variant="panel" />
          <View style={styles.cardTop}>
            <Text numberOfLines={1} style={[styles.kicker, live && styles.kickerLive]}>{live ? '●  LIVE' : phase === 'upcoming' ? tags.slice(0, 2).join(' · ').toLocaleUpperCase('de') || 'EVENT' : phaseLabel[phase].toLocaleUpperCase('de')}</Text>
            {event.imageIsPlaceholder && <Text style={styles.placeholderNote}>Symbolbild</Text>}
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.essentials}>
            <View style={styles.essential}><Text style={styles.essentialValue}>{dayFormat.format(start).split(',')[0]}</Text><Text style={styles.essentialLabel}>{new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'short' }).format(start)}</Text></View>
            <View style={styles.essentialDivider} />
            <View style={styles.essential}><Text style={styles.essentialValue}>{timeFormat.format(start)}</Text><Text style={styles.essentialLabel}>{end ? `bis ${timeFormat.format(end)}` : 'Beginn'}</Text></View>
            <View style={styles.essentialDivider} />
            <View style={[styles.essential, styles.essentialWide]}><Text numberOfLines={1} style={styles.essentialValue}>{event.venue ?? event.location}</Text><Text numberOfLines={1} style={styles.essentialLabel}>{event.venue ? event.location : 'Ort'}</Text></View>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {organizer && <Link href={organizerHref(organizer.id)} asChild><PressableScale accessibilityRole="link" accessibilityLabel={`Veranstalter ${organizer.displayName} öffnen`} scaleTo={0.98} style={styles.organizer}>
          <OrganizerAvatar organizer={organizer} size={40} />
          <View style={styles.rowCopy}><Text style={styles.organizerLabel}>Veranstalter</Text><Text numberOfLines={1} style={styles.organizerName}>{organizer.displayName}</Text></View>
          <Icon name="chevron" size={14} color={colors.faint} />
        </PressableScale></Link>}

        <View style={styles.rows}>
          {point && !ended && <Row icon="map" title="Route anzeigen" detail={place} onPress={route} accessibilityLabel="Route zum Veranstaltungsort anzeigen" />}
          {!point && <Row icon="pin" title={place} />}
          <Row icon="ticket" title={ended ? 'Event beendet' : ticketUrl ? 'Tickets beim Anbieter' : sourceUrl ? `Infos & Tickets bei ${sourceLabel}` : 'Noch keine Ticketinformationen'} detail={ended ? undefined : primary ? 'Öffnet den Anbieter' : undefined} onPress={primary ? () => void open(primary) : undefined} />
          {tags.length > 2 && <Row icon="headphones" title={tags.join(' · ')} />}
        </View>
        {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}

        {content.tickets.length > 0 && !ended && <View style={styles.block}>
          <Text style={styles.blockTitle}>Ticketarten</Text>
          {content.tickets.map((ticket) => (
            <PressableScale key={ticket.id} accessibilityRole="button" disabled={!ticket.externalUrl || ticket.soldOut} onPress={() => ticket.externalUrl && void open(ticket.externalUrl)} style={styles.ticket}>
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>{ticket.name}</Text>{ticket.description && <Text numberOfLines={1} style={styles.rowDetail}>{ticket.description}</Text>}</View>
              <Text style={[styles.price, ticket.soldOut && styles.soldOut]}>{ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, ticket.currency)}</Text>
            </PressableScale>
          ))}
        </View>}

        {event.description && <View style={styles.block}><Text style={styles.blockTitle}>Über das Event</Text><Text style={styles.description}>{event.description}</Text></View>}

        <View style={styles.block}>
          <View style={styles.blockHead}><Text style={styles.blockTitle}>Live Snaps</Text><Text style={styles.blockNote}>24 h</Text></View>
          {snaps.length > 0
            ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.snaps}>
                {snaps.map((snap, index) => <Pressable key={snap.id} accessibilityRole="button" accessibilityLabel={`Live Snap ${index + 1} öffnen`} onPress={() => setViewer(gallery.length - snaps.length + index)} style={styles.snap}><Image source={{ uri: snap.url }} style={StyleSheet.absoluteFill} resizeMode="cover" /></Pressable>)}
              </ScrollView>
            : <Text style={styles.description}>{live ? 'Noch keine Eindrücke von heute Nacht.' : 'Eindrücke von Besuchern erscheinen, sobald das Event läuft.'}</Text>}
        </View>

        <View style={styles.footer}>
          {sourceUrl && <Link href={sourceUrl} style={styles.link}>Original auf {sourceLabel} öffnen ↗</Link>}
          {event.sourceName?.toLowerCase() === 'goabase' && <Link href="https://www.goabase.net/" style={styles.link}>Veranstaltungen von Goabase ↗</Link>}
          <Text style={styles.footnote}>Zeiten in Europe/Berlin · Angaben der Veranstaltungsquelle{event.sourceName ? ` (${sourceLabel})` : ''}</Text>
        </View>
      </View>
    </ScrollView>

    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <GlassBackdrop radius={0} variant="panel" />
      <View style={styles.barRow}>
        {primary
          ? <Button label={ticketUrl ? 'Tickets kaufen' : 'Infos & Tickets'} accessibilityLabel={ticketUrl ? 'Tickets beim Anbieter kaufen' : `Infos und Tickets auf der Originalseite bei ${sourceLabel}`} icon="ticket" onPress={() => void open(primary)} style={styles.flex} />
          : <View style={styles.flex}><Text numberOfLines={1} style={styles.barTitle}>{ended ? 'Event beendet' : `${timeFormat.format(start)} Uhr · ${place}`}</Text></View>}
        {point && !ended && <IconButton icon="map" accessibilityLabel="Route zum Veranstaltungsort anzeigen" onPress={route} size={52} plain style={styles.barButton} />}
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
  poster: { overflow: 'hidden', backgroundColor: colors.surface },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  toolbarActions: { flexDirection: 'row', gap: space.sm },
  cardWrap: { paddingHorizontal: gutter, marginTop: -84 },
  card: { padding: space.xl, borderRadius: radius.xl, overflow: 'hidden', gap: space.sm, ...squircle },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { ...type.overline, fontSize: 11, color: colors.pink, flexShrink: 1 },
  kickerLive: { color: colors.pink },
  placeholderNote: { ...type.footnote, fontSize: 10, color: colors.faint },
  title: { ...type.title, color: colors.text },
  essentials: { flexDirection: 'row', alignItems: 'stretch', marginTop: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  essential: { alignItems: 'flex-start', gap: 1, paddingRight: space.md },
  essentialWide: { flex: 1, minWidth: 0, paddingRight: 0 },
  essentialValue: { ...type.label, color: colors.text },
  essentialLabel: { ...type.footnote, fontSize: 11, color: colors.faint },
  essentialDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginRight: space.md },
  body: { paddingHorizontal: gutter, paddingTop: space.xl },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: '#ffffff0a', marginBottom: space.md, ...squircle },
  organizerLabel: { ...type.footnote, fontSize: 11, color: colors.faint },
  organizerName: { ...type.label, color: colors.text },
  rows: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#ffffff0a', ...squircle },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.label, fontSize: 15, color: colors.text },
  rowDetail: { ...type.footnote, color: colors.muted, marginTop: 1 },
  error: { ...type.footnote, color: colors.danger, marginTop: space.sm },
  block: { marginTop: space.xxl, gap: space.md },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  blockTitle: { ...type.title3, color: colors.text },
  blockNote: { ...type.footnote, color: colors.faint },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: '#ffffff0a', ...squircle },
  price: { ...type.headline, color: colors.text },
  soldOut: { color: colors.faint },
  description: { ...type.body, color: colors.muted },
  snaps: { gap: space.sm },
  snap: { width: 104, height: 156, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  footer: { marginTop: space.xxl, gap: space.xs },
  link: { ...type.callout, color: colors.pink, paddingVertical: space.sm },
  footnote: { ...type.footnote, color: colors.faint },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barTitle: { ...type.headline, color: colors.text },
  barButton: { backgroundColor: colors.surfaceHigh },
});
