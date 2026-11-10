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
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Button, IconButton } from '../components/ui/Button';
import { ListGroup, ListRow } from '../components/ui/List';
import { StatusBadge } from '../components/ui/StatusBadge';
import { colors, radius, space, squircle, type } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { useEventContent } from '../hooks/useEventContent';
import { useNow } from '../hooks/useNow';
import { useOrganizerSummary } from '../hooks/useOrganizer';
import { organizerHref } from '../navigation/eventRoutes';
import { formatPrice } from '../services/content';
import { eventPhase } from '../utils/eventStatus';

const GUTTER = 20;
const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text numberOfLines={1} style={styles.statValue}>{value}</Text></View>;
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

  if (!event || remote.error) return <View style={styles.screen}><View style={[styles.state, { paddingTop: insets.top + 12 }]}>
    <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} plain style={styles.stateBack} />
    <EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />
    {!remote.loading && !remote.error && <Text style={styles.title}>Event nicht verfügbar</Text>}
    <Link href="/" style={styles.link}>Zurück zum Radar</Link>
  </View></View>;

  const phase = eventPhase(event, now);
  const ended = phase === 'ended';
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const ticketUrl = event.ticketUrl?.startsWith('https://') ? event.ticketUrl : undefined;
  const sourceUrl = event.sourceUrl?.startsWith('https://') ? event.sourceUrl : undefined;
  const sourceLabel = event.sourceName ? event.sourceName.charAt(0).toLocaleUpperCase('de') + event.sourceName.slice(1) : 'der Originalseite';
  const point = event.coordinate;
  const tags = [...new Set([...(event.genres ?? []), ...event.categories])];
  const snaps = content.snaps.filter((snap) => snap.mediaType === 'image');
  const gallery = [...(event.imageIsPlaceholder ? [] : [event.image]), ...snaps.map((snap) => ({ uri: snap.url }))];
  const heroHeight = Math.min(520, Math.max(320, width * 1.08));
  const place = event.venue ? `${event.venue}, ${event.location}` : event.location;
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
    try { await Share.share({ title: `${event!.title} · Spots`, message: `${event!.title}\n${dayFormat.format(start)}, ${timeFormat.format(start)} Uhr\n${place}${sourceUrl ? `\n${sourceUrl}` : ''}` }); } catch { /* dismissed */ }
  }

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { height: heroHeight }]}>
        <View style={[styles.heroArt, { top: insets.top + 52 }]}><EventArtwork event={event} /></View>
        {!event.imageIsPlaceholder && <Pressable accessibilityRole="button" accessibilityLabel="Eventbild groß anzeigen" onPress={() => setViewer(0)} style={StyleSheet.absoluteFill} />}
        <LinearGradient pointerEvents="none" colors={['#000000b3', '#00000000', '#00000000', '#000000']} locations={[0, 0.2, 0.72, 1]} style={StyleSheet.absoluteFill} />
        {event.imageIsPlaceholder && <Text style={styles.placeholderNote}>Symbolbild</Text>}
      </View>

      <View style={styles.body}>
        {phase !== 'upcoming' && <StatusBadge phase={phase} />}
        <Text style={styles.title}>{event.title}</Text>
        {organizer
          ? <Link href={organizerHref(organizer.id)} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Veranstalter ${organizer.displayName} öffnen`} style={styles.organizer}>
              <View style={styles.organizerAvatar}>{organizer.avatarUrl ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} /> : <Icon name="profile" size={14} color={colors.text} />}</View>
              <Text numberOfLines={1} style={styles.organizerName}>{organizer.displayName}</Text>
              <Icon name="chevron" size={13} color={colors.faint} />
            </Pressable></Link>
          : <Text style={styles.subtitle}>{place}</Text>}

        <View style={styles.stats}>
          <Stat label="Datum" value={shortDay.format(start)} />
          <View style={styles.statDivider} />
          <Stat label="Beginn" value={`${timeFormat.format(start)} Uhr`} />
          <View style={styles.statDivider} />
          <Stat label="Ende" value={end ? `${timeFormat.format(end)} Uhr` : 'offen'} />
        </View>

        {tags.length > 0 && <View style={styles.tags}>{tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>}
        {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}

        <View style={styles.block}>
          <ListGroup>
            <ListRow icon="calendar" title={dayFormat.format(start)} subtitle={`${timeFormat.format(start)} Uhr${end ? ` bis ${shortDay.format(end)}, ${timeFormat.format(end)} Uhr` : ' · Ende nicht angegeben'}`} />
            <ListRow icon="pin" title={event.venue ?? event.location} subtitle={event.venue ? event.location : point && !ended ? 'Route anzeigen' : undefined} onPress={point && !ended ? route : undefined} accessibilityLabel="Route zum Veranstaltungsort anzeigen" />
            <ListRow icon="ticket" title="Tickets" subtitle={ended ? 'Event beendet' : ticketUrl ? 'Beim Ticketanbieter erhältlich' : sourceUrl ? `Infos auf der Originalseite bei ${sourceLabel}` : 'Noch keine Ticketinformationen'} onPress={primary ? () => void open(primary) : undefined} />
          </ListGroup>
        </View>

        {content.tickets.length > 0 && !ended && <View style={styles.block}>
          <Text style={styles.heading}>Ticketarten</Text>
          <ListGroup footer="Der Verkauf läuft über den angegebenen Anbieter.">
            {content.tickets.map((ticket) => <ListRow key={ticket.id} title={ticket.name} subtitle={ticket.description ?? undefined} value={ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, ticket.currency)} onPress={ticket.externalUrl && !ticket.soldOut ? () => void open(ticket.externalUrl!) : undefined} />)}
          </ListGroup>
        </View>}

        {event.description && <View style={styles.block}><Text style={styles.heading}>Über das Event</Text><Text style={styles.description}>{event.description}</Text></View>}

        <View style={styles.block}>
          <Text style={styles.heading}>Live Snaps</Text>
          {snaps.length > 0
            ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.snaps}>
                {snaps.map((snap, index) => <Pressable key={snap.id} accessibilityRole="button" accessibilityLabel={`Live Snap ${index + 1} öffnen`} onPress={() => setViewer(gallery.length - snaps.length + index)} style={styles.snap}><Image source={{ uri: snap.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />{snap.byOrganizer && <Text style={styles.snapBadge}>Veranstalter</Text>}</Pressable>)}
              </ScrollView>
            : <Text style={styles.description}>{phase === 'live' || phase === 'started' ? 'Noch keine Eindrücke von heute Nacht.' : 'Fotos und kurze Videos von Besuchern erscheinen, sobald das Event läuft.'} Sie bleiben 24 Stunden sichtbar.</Text>}
        </View>

        <View style={styles.links}>
          {ended && <Text style={styles.footnote}>Dieses Event ist vorbei.</Text>}
          {sourceUrl && <Link href={sourceUrl} style={styles.link}>Original auf {sourceLabel} öffnen ↗</Link>}
          {event.sourceName?.toLowerCase() === 'goabase' && <Link href="https://www.goabase.net/" style={styles.link}>Veranstaltungen von Goabase ↗</Link>}
          <Text style={styles.footnote}>Zeiten in Europe/Berlin · Angaben der Veranstaltungsquelle{event.sourceName ? ` (${sourceLabel})` : ''}</Text>
        </View>
      </View>
    </ScrollView>

    <View pointerEvents="box-none" style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
      <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
      <IconButton icon="share" accessibilityLabel="Event teilen" onPress={() => void share()} />
    </View>

    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <GlassBackdrop radius={0} variant="panel" />
      <View style={styles.barRow}>
        {primary
          ? <Button label={ticketUrl ? 'Tickets kaufen' : 'Infos & Tickets'} accessibilityLabel={ticketUrl ? 'Tickets beim Anbieter kaufen' : `Infos und Tickets auf der Originalseite bei ${sourceLabel}`} icon="ticket" onPress={() => void open(primary)} style={styles.flex} />
          : <View style={styles.barCopy}><Text numberOfLines={1} style={styles.barTitle}>{ended ? 'Event beendet' : `${shortDay.format(start)} · ${timeFormat.format(start)} Uhr`}</Text><Text numberOfLines={1} style={styles.barText}>{place}</Text></View>}
        {point && !ended && <IconButton icon="map" accessibilityLabel="Route zum Veranstaltungsort anzeigen" onPress={route} size={52} plain style={styles.barButton} />}
        <SaveEventButton id={event.id} title={event.title} size={52} />
      </View>
    </View>

    <Modal visible={viewer !== null} animationType="fade" onRequestClose={() => setViewer(null)}>{viewer !== null && <EventPhotoViewer images={gallery} initialIndex={viewer} onClose={() => setViewer(null)} />}</Modal>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  state: { flex: 1, paddingHorizontal: GUTTER, gap: space.md },
  stateBack: { backgroundColor: colors.surface, marginBottom: space.lg },
  hero: { overflow: 'hidden', backgroundColor: colors.surface },
  heroArt: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  placeholderNote: { position: 'absolute', right: GUTTER, bottom: space.xl, ...type.footnote, fontSize: 11, color: colors.text, backgroundColor: '#00000099', borderRadius: radius.sm, overflow: 'hidden', paddingHorizontal: space.sm, paddingVertical: 3 },
  toolbar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  body: { paddingHorizontal: GUTTER, paddingTop: space.sm, gap: space.sm },
  title: { ...type.largeTitle, color: colors.text },
  subtitle: { ...type.body, color: colors.muted },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36, alignSelf: 'flex-start' },
  organizerAvatar: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  organizerName: { ...type.label, color: colors.text, flexShrink: 1 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg, paddingVertical: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { ...type.overline, fontSize: 11, color: colors.faint },
  statValue: { ...type.headline, color: colors.text },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.separator },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.md },
  tag: { ...type.footnote, fontWeight: '600', color: colors.text, backgroundColor: colors.surfaceHigh, borderRadius: radius.pill, overflow: 'hidden', paddingHorizontal: space.md, paddingVertical: 6 },
  error: { ...type.footnote, color: colors.danger },
  block: { marginTop: space.xl, gap: space.md },
  heading: { ...type.title2, color: colors.text },
  description: { ...type.body, color: colors.muted },
  snaps: { gap: space.sm },
  snap: { width: 112, height: 168, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  snapBadge: { position: 'absolute', left: 6, bottom: 6, ...type.footnote, fontSize: 10, fontWeight: '700', color: colors.text, backgroundColor: colors.accent, borderRadius: 6, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2 },
  links: { marginTop: space.xl, gap: space.xs },
  link: { ...type.callout, color: colors.pink, paddingVertical: space.sm },
  footnote: { ...type.footnote, color: colors.faint },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  barCopy: { flex: 1, minWidth: 0 },
  barTitle: { ...type.headline, color: colors.text },
  barText: { ...type.footnote, color: colors.faint },
  barButton: { backgroundColor: colors.surfaceHigh },
});
