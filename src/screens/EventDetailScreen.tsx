import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDataState } from '../components/EventDataState';
import { EventPhotoViewer } from '../components/EventPhotoViewer';
import { OrganizerAvatar } from '../components/GalleryPost';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { Shots } from '../components/Shots';
import { PlacePreview } from '../components/PlacePreview';
import { SaveEventButton } from '../components/SaveEventButton';
import { SnapViewer } from '../components/SnapViewer';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { SectionTitle } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { useEventAddress } from '../hooks/useEventAddress';
import { useEventContent } from '../hooks/useEventContent';
import { useNow } from '../hooks/useNow';
import { useOrganizerSummary } from '../hooks/useOrganizer';
import { organizerHref } from '../navigation/eventRoutes';
import { formatPrice } from '../services/content';
import { shouldTrack, trackEvent } from '../services/eventStats';
import { sourceLabel, ticketSeller } from '../utils/eventSource';
import { eventPhase } from '../utils/eventStatus';
import { eventSnaps } from '../utils/stories';

const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });

/**
 * Organizer picture with a Snapchat-style ring. With an event story: thick brand-gradient ring and pink glow
 * (grey once watched), tapping opens the story. Without a story: plain picture, tapping opens the profile.
 */
function StoryRing({ picture, label, story, watched, onPress, size = 76 }: { picture: ReactNode; label: string; story: boolean; watched: boolean; onPress?: () => void; size?: number }) {
  const outer = { width: size + 14, height: size + 14, borderRadius: (size + 14) / 2 };
  const avatar = <View style={[styles.ringGap, { borderRadius: (size + 8) / 2 }]}>{picture}</View>;
  const ring = story && !watched
    ? <LinearGradient colors={[colors.pink, colors.accent, '#7a2bd6', colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, styles.ringGlow, outer]}>{avatar}</LinearGradient>
    : <View style={[styles.ring, outer, story ? styles.ringSeen : styles.ringPlain]}>{avatar}</View>;
  return (
    <Pressable disabled={!onPress} accessibilityRole={onPress ? 'button' : 'image'} accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => pressed && styles.pressed}>
      {ring}
    </Pressable>
  );
}

/**
 * Poster-first event page: the flyer fades into the page; the organizer's picture (event story ring),
 * title and time sit on its lower edge.
 * Every piece of information appears once: when (title block), where (map preview, opens the route),
 * tickets (bottom bar). The organizer's event story and the visitors' Shots live only on this page.
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
  const [viewer, setViewer] = useState(false);
  const [story, setStory] = useState(false);
  const [storyWatched, setStoryWatched] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const closeStory = useCallback(() => { setStory(false); setStoryWatched(true); }, []);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  // Statistik für Veranstalter (SQL 26): ein Aufruf pro Gerät und Tag, nur bei Veranstalter-Events.
  const trackedId = shouldTrack(event) ? event!.id : null;
  useEffect(() => { if (trackedId) void trackEvent(trackedId, 'view'); }, [trackedId]);
  // Adresse von Club-Events (SQL 29); sonst bleibt die bisherige Ortszeile.
  const address = useEventAddress(event?.id, event?.organizerId, event?.location ?? null);

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
  const source = sourceLabel(event.sourceName);
  const seller = ticketSeller(event.sourceName);
  const point = event.coordinate;
  const tags = [...new Set([...(event.genres ?? []), ...event.categories])];
  const snaps = eventSnaps(event, content.snaps, now);
  const posterHeight = Math.min(height * 0.6, width * 1.3);
  // Mit Adresse (Club-Events, SQL 29) steht die volle Anschrift da, sonst Ort und Stadt.
  const place = address ? [event.venue, address.street, address.postcodeCity].filter(Boolean).join(', ')
    : event.venue ? `${event.venue}, ${event.location}` : event.location;
  const placeDetail = address ? `${address.street}, ${address.postcodeCity}` : event.venue ? event.location : undefined;
  const when = `${shortDay.format(start)} · ${timeFormat.format(start)}${end ? `–${timeFormat.format(end)}` : ''} Uhr`;
  const attribution = event.sourceName?.toLowerCase() === 'goabase' ? sourceUrl ?? 'https://www.goabase.net/' : sourceUrl;

  async function open(url: string, ticket = false) {
    if (ticket && trackedId) void trackEvent(trackedId, 'ticket_click');
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
  // One clear main action: tickets, otherwise the source page, otherwise the route.
  const main = ended ? null
    : ticketUrl ? { label: 'Tickets kaufen', icon: 'ticket' as const, a11y: seller ? `Tickets bei ${seller} kaufen` : 'Tickets beim Anbieter kaufen', run: () => void open(ticketUrl, true) }
    : sourceUrl ? { label: 'Infos & Tickets', icon: 'ticket' as const, a11y: `Infos und Tickets auf der Originalseite bei ${source}`, run: () => void open(sourceUrl, true) }
    : point ? { label: 'Route anzeigen', icon: 'map' as const, a11y: 'Route zum Veranstaltungsort anzeigen', run: route }
    : null;

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
      {/* Poster: blurred fill behind, the complete flyer in front, fading into the page. */}
      <View style={[styles.poster, { height: posterHeight }]}>
        <Image source={event.image} resizeMode="cover" blurRadius={event.imageIsPlaceholder ? 0 : 40} style={StyleSheet.absoluteFill} />
        {!event.imageIsPlaceholder && <Pressable accessibilityRole="button" accessibilityLabel="Eventbild groß anzeigen" onPress={() => setViewer(true)} style={[StyleSheet.absoluteFill, { top: insets.top + 56, bottom: 154 }]}><Image source={event.image} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={`Eventbild: ${event.title}`} /></Pressable>}
        <LinearGradient pointerEvents="none" colors={['#0a090cb3', '#0a090c00', '#0a090c00', '#0a090ccc', colors.background]} locations={[0, 0.2, 0.55, 0.85, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.toolbar, { paddingTop: insets.top + space.sm }]}>
          <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
          <IconButton icon="share" accessibilityLabel="Event teilen" onPress={() => void share()} />
        </View>
      </View>

      {/* Title block on the flyer's lower edge: organizer picture, title, one line for the time, genres. */}
      <View style={[styles.head, { marginTop: -150 }]}>
        {/* Organizer picture on the flyer: the ring opens the 24-hour event story (or the profile without one). */}
        {/* Always a round picture, so every event page looks the same: the organizer (story ring / profile),
            or for events without an organizer profile the event picture itself (opens the flyer). */}
        <View style={styles.organizer}>
          {organizer
            ? <StoryRing picture={<OrganizerAvatar organizer={organizer} size={76} />} story={snaps.organizer.length > 0} watched={storyWatched}
                label={snaps.organizer.length > 0 ? `Event-Story von ${organizer.displayName} ansehen` : `Profil von ${organizer.displayName} ansehen`}
                onPress={snaps.organizer.length > 0 ? () => setStory(true) : () => router.push(organizerHref(organizer.id))} />
            : <StoryRing picture={<Image source={event.image} resizeMode="cover" style={styles.eventAvatar} />} story={false} watched={false}
                label={`Eventbild: ${event.title}`} onPress={event.imageIsPlaceholder ? undefined : () => setViewer(true)} />}
        </View>
        <View style={styles.badges}>
          {ended && <View style={styles.endedBadge}><Text style={styles.endedText}>Beendet</Text></View>}
          {event.imageIsPlaceholder && <Text style={styles.placeholderNote}>Symbolbild</Text>}
        </View>
        <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
        <Text style={styles.when}>{when}</Text>
        {tags.length > 0 && <View style={styles.tags}>{tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>}
      </View>

      <View style={styles.body}>
        {/* Always a clear way to the organizer's page, whether or not there is a story (the round picture
            above opens the story when there is one). Events without an organizer profile have no such page. */}
        {organizer && <Link href={organizerHref(organizer.id)} asChild>
          <PressableScale accessibilityRole="link" accessibilityLabel={`Veranstalter ${organizer.displayName}: Profil ansehen`} scaleTo={0.98} style={styles.organizerCard}>
            <OrganizerAvatar organizer={organizer} size={44} />
            <View style={styles.organizerCopy}>
              <Text style={styles.organizerLabel}>Veranstalter</Text>
              <Text numberOfLines={1} style={styles.organizerName}>{organizer.displayName}</Text>
            </View>
            <View style={styles.profileButton}><Text style={styles.profileText}>Profil</Text><Icon name="chevron" size={13} color={colors.text} /></View>
          </PressableScale>
        </Link>}

        {/* About tonight's event, first thing under the title. */}
        <View style={styles.block}>
          <SectionTitle title="Über das Event" style={styles.blockTitle} />
          <Text style={[styles.description, !event.description && styles.descriptionEmpty]}>{event.description ?? 'Für dieses Event liegt noch keine Beschreibung vor.'}</Text>
        </View>

        {/* Tickets: ticket types with prices when known, and always a clear way to buy at the provider. */}
        {!ended && <View style={styles.block}>
          <SectionTitle title="Tickets" style={styles.blockTitle} />
          <View style={styles.ticketCard}>
            {content.tickets.length > 0
              ? content.tickets.map((ticket) => (
                  <PressableScale key={ticket.id} accessibilityRole="button" accessibilityLabel={`${ticket.name}, ${ticket.soldOut ? 'ausverkauft' : formatPrice(ticket.priceCents, ticket.currency)}${ticket.externalUrl && !ticket.soldOut ? ', kaufen' : ''}`}
                    disabled={!ticket.externalUrl || ticket.soldOut} onPress={() => ticket.externalUrl && void open(ticket.externalUrl, true)} scaleTo={0.98} style={styles.ticket}>
                    <View style={styles.flex}><Text style={styles.ticketName}>{ticket.name}</Text>{ticket.description && <Text numberOfLines={1} style={styles.ticketDetail}>{ticket.description}</Text>}</View>
                    <Text style={[styles.price, ticket.soldOut && styles.soldOut]}>{ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, ticket.currency)}</Text>
                    {ticket.externalUrl && !ticket.soldOut && <View style={styles.buyPill}><Text style={styles.buyPillText}>Kaufen</Text></View>}
                  </PressableScale>
                ))
              : <View style={styles.ticketInfo}>
                  <View style={styles.ticketIcon}><Icon name="ticket" size={20} color={colors.pink} /></View>
                  <Text style={styles.ticketInfoText}>{ticketUrl ? `Tickets gibt es online bei ${seller ?? 'dem Anbieter'}.` : sourceUrl ? `Infos und Tickets findest du bei ${source}.` : 'Für dieses Event gibt es noch keine Online-Tickets.'}</Text>
                </View>}
            {(ticketUrl ?? sourceUrl) && <Button label={ticketUrl ? 'Tickets kaufen' : 'Zu den Tickets'} icon="ticket"
              accessibilityLabel={ticketUrl ? (seller ? `Tickets bei ${seller} kaufen` : 'Tickets beim Anbieter kaufen') : `Tickets und Infos bei ${source}`}
              onPress={() => void open((ticketUrl ?? sourceUrl)!, true)} />}
          </View>
        </View>}

        <View style={styles.block}>
          <SectionTitle title="Ort" style={styles.blockTitle} />
          {point
            ? <PlacePreview coordinate={point} title={event.venue ?? event.location} street={address?.street} detail={address ? address.postcodeCity : placeDetail} onRoute={ended ? undefined : route} />
            : <View style={styles.placeCard}><Icon name="pin" size={18} color={colors.pink} /><Text style={styles.placeText}>{place}</Text></View>}
        </View>

        <Shots snaps={snaps.visitors} live={live} ended={ended} now={now} eventId={event.id} eventTitle={event.title} />

        {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}
        {attribution && <Link href={attribution} style={styles.source}>Infos von {source} ↗</Link>}
      </View>
    </ScrollView>

    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <GlassBackdrop radius={0} variant="panel" />
      <View style={styles.barRow}>
        {main
          ? <Button label={main.label} accessibilityLabel={main.a11y} icon={main.icon} onPress={main.run} style={styles.flex} />
          : <Button label={ended ? 'Event beendet' : 'Noch keine Tickets'} variant="secondary" disabled onPress={() => {}} style={styles.flex} />}
        <SaveEventButton id={event.id} title={event.title} size={52} />
      </View>
    </View>

    <Modal visible={viewer} animationType="fade" onRequestClose={() => setViewer(false)}>{viewer && <EventPhotoViewer images={[event.image]} initialIndex={0} onClose={() => setViewer(false)} />}</Modal>
    {organizer && <Modal visible={story} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={closeStory}>
      {story && <SnapViewer items={snaps.organizer} author={{ name: organizer.displayName, avatar: <OrganizerAvatar organizer={organizer} size={34} />, label: 'Event-Story' }} now={now} onClose={closeStory}
        onAuthorPress={() => { closeStory(); router.push(organizerHref(organizer.id)); }} />}
    </Modal>}
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  state: { flex: 1, paddingHorizontal: gutter, gap: space.md },
  stateBack: { backgroundColor: colors.surface, marginBottom: space.lg },
  poster: { overflow: 'hidden', backgroundColor: colors.surface },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  head: { paddingHorizontal: gutter, gap: space.sm },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 4 },
  endedBadge: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  endedText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  placeholderNote: { ...type.footnote, fontSize: 11, color: colors.faint },
  title: { fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -0.6, color: colors.text },
  when: { ...type.headline, color: colors.pink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { color: colors.text, fontSize: 12, fontWeight: '600', backgroundColor: '#ffffff14', borderRadius: 13, overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 5 },
  body: { paddingHorizontal: gutter, paddingTop: space.xl },
  organizerCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  organizerCopy: { flex: 1, minWidth: 0 },
  organizerLabel: { ...type.footnote, fontSize: 11, color: colors.faint },
  organizerName: { ...type.headline, color: colors.text },
  profileButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: space.md, paddingRight: space.sm, height: 34, borderRadius: 17, backgroundColor: colors.accentDeep },
  profileText: { ...type.label, fontSize: 14, color: colors.text },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  ring: { alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px #00000080' },
  ringGlow: { boxShadow: '0 0 22px 4px #ff4ab88c' },
  ringSeen: { borderWidth: 3, borderColor: '#ffffff4d', backgroundColor: '#0a090c66' },
  ringPlain: { borderWidth: 2, borderColor: '#ffffff26', backgroundColor: '#0a090c66' },
  ringGap: { padding: 4, backgroundColor: colors.background },
  eventAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surface },
  pressed: { opacity: 0.85 },
  block: { marginTop: space.xxl, gap: space.md },
  blockTitle: { ...type.title3, color: colors.text },
  ticketCard: { gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: colors.accentLine, ...squircle },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.xs },
  ticketInfo: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ticketIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  ticketInfoText: { ...type.callout, color: colors.muted, flex: 1 },
  buyPill: { paddingHorizontal: space.md, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: colors.accentDeep },
  buyPillText: { ...type.label, fontSize: 13, color: colors.text },
  ticketName: { ...type.label, color: colors.text },
  ticketDetail: { ...type.footnote, color: colors.muted, marginTop: 1 },
  price: { ...type.headline, color: colors.text },
  soldOut: { color: colors.faint },
  placeCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: '#ffffff0a', ...squircle },
  placeText: { ...type.callout, color: colors.text, flex: 1 },
  description: { ...type.body, color: colors.muted },
  descriptionEmpty: { color: colors.faint },
  error: { ...type.footnote, color: colors.danger, marginTop: space.lg },
  source: { ...type.footnote, color: colors.faint, marginTop: space.xxl, paddingVertical: space.sm },
  link: { ...type.callout, color: colors.pink, paddingVertical: space.sm },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
