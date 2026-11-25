import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Image, Modal, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { useEventAddress, type EventAddressLine } from '../hooks/useEventAddress';
import { useEventContent } from '../hooks/useEventContent';
import { useNow } from '../hooks/useNow';
import { useOrganizerSummary } from '../hooks/useOrganizer';
import { organizerHref } from '../navigation/eventRoutes';
import { formatPrice, type LiveSnap, type TicketType } from '../services/content';
import { shouldTrack, trackEvent } from '../services/eventStats';
import { sourceLabel, ticketSeller } from '../utils/eventSource';
import { eventPhase } from '../utils/eventStatus';
import type { PublicOrganizer } from '../types/accounts';
import type { SpotEvent } from '../types/events';
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

/** Teile der Eventseite, die ein Veranstalter im Studio ändern kann. */
export type EventPart = 'flyer' | 'title' | 'when' | 'description' | 'tickets' | 'place';
/**
 * Spots Studio: dieselbe Seite, wie Gäste sie sehen. Jeder Teil, den der Veranstalter ändern kann, lässt sich antippen
 * (ein kleiner Stift zeigt es an). Fehlt ein Teil noch, steht dort ein Platzhalter – so legt man ein Event auch an.
 * Was nur Gäste betrifft (Shots posten, Merken, Tickets kaufen), ersetzt das Studio durch eigene Inhalte.
 */
export type EventDetailEdit = {
  onEdit: (part: EventPart) => void;
  /** Statt des runden Bilds: das Profilbild mit „+“ (Story ansehen / posten). */
  story: ReactNode;
  /** Teile ohne Inhalt: der Text, der dort als Platzhalter steht (z. B. „Titel hinzufügen“). */
  empty?: Partial<Record<'title' | 'when', string>>;
  /** Zeile unter dem Titel, z. B. „Entwurf“ oder „Abgesagt“. */
  notice?: ReactNode;
  /** Unter der Seite. */
  below?: ReactNode;
  /** Inhalt der Leiste unten statt „Tickets kaufen“ und Merken. */
  bar: ReactNode;
  /** Rechts oben statt „Teilen“, z. B. das Menü „Mehr“. */
  toolbar?: ReactNode;
  /** „Schließen“ statt Zurück-Pfeil (neues Event, das von unten eingeblendet wird). */
  close?: boolean;
  /** Oben in der Mitte, z. B. „Neues Event“, damit klar ist, was man gerade tut. */
  title?: string;
  /** Nach unten ziehen lädt neu. */
  refresh?: { refreshing: boolean; onRefresh: () => void };
};
type ViewProps = {
  event: SpotEvent; organizer: PublicOrganizer | null; tickets: TicketType[]; liveSnaps: LiveSnap[]; address: EventAddressLine | null;
  /** Für die Statistik der Ticket-Klicks (SQL 26); null = nicht zählen. */
  trackedId: string | null;
  onBack: () => void;
  edit?: EventDetailEdit;
};

// Im Web darf ein Knopf keinen Knopf enthalten (ungültiges HTML). Bereiche, die Knöpfe der Gast-Ansicht umschließen,
// bekommen dort deshalb keine Knopf-Rolle; antippen lassen sie sich trotzdem.
const wrapperRole = () => Platform.OS === 'web' ? undefined : 'button' as const;

/** Kleiner Stift: zeigt, dass sich dieser Teil antippen und ändern lässt. Der ganze Bereich reagiert, nicht nur der Stift. */
function EditPen() {
  return <View pointerEvents="none" style={styles.pen}><Icon name="edit" size={15} color={colors.text} /></View>;
}

/**
 * Poster-first event page: the flyer fades into the page; the organizer's picture (event story ring),
 * title and time sit on its lower edge.
 * Every piece of information appears once: when (title block), where (map preview, opens the route),
 * tickets (bottom bar). The organizer's event story and the visitors' Shots live only on this page.
 */
export function EventDetailView({ event, organizer, tickets, liveSnaps, address, trackedId, onBack, edit }: ViewProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [viewer, setViewer] = useState(false);
  const [story, setStory] = useState(false);
  const [storyWatched, setStoryWatched] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const closeStory = useCallback(() => { setStory(false); setStoryWatched(true); }, []);

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
  const snaps = eventSnaps(event, liveSnaps, now);
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
    try { await Share.share({ title: `${event.title} · Spots`, message: `${event.title}\n${dayFormat.format(start)}, ${timeFormat.format(start)} Uhr\n${place}${sourceUrl ? `\n${sourceUrl}` : ''}` }); } catch { /* dismissed */ }
  }
  // One clear main action: tickets, otherwise the source page, otherwise the route.
  const main = ended ? null
    : ticketUrl ? { label: 'Tickets kaufen', icon: 'ticket' as const, a11y: seller ? `Tickets bei ${seller} kaufen` : 'Tickets beim Anbieter kaufen', run: () => void open(ticketUrl, true) }
    : sourceUrl ? { label: 'Infos & Tickets', icon: 'ticket' as const, a11y: `Infos und Tickets auf der Originalseite bei ${source}`, run: () => void open(sourceUrl, true) }
    : point ? { label: 'Route anzeigen', icon: 'map' as const, a11y: 'Route zum Veranstaltungsort anzeigen', run: route }
    : null;

  /** Ein Abschnitt der Seite. Für Gäste Titel und Inhalt; im Studio reagiert der ganze Abschnitt und öffnet diesen Teil. */
  const section = (part: EventPart, title: string, editLabel: string, content: ReactNode) => edit
    ? <Pressable accessibilityRole={wrapperRole()} accessibilityLabel={editLabel} onPress={() => edit.onEdit(part)} style={({ pressed }) => [styles.block, pressed && styles.pressed]}>
        <View style={styles.editRow}><SectionTitle title={title} style={[styles.blockTitle, styles.flex]} /><EditPen /></View>
        <View pointerEvents="none">{content}</View>
      </Pressable>
    : <View style={styles.block}>
        <SectionTitle title={title} style={styles.blockTitle} />
        {content}
      </View>;

  return <View style={styles.screen}>
    <Backdrop />
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}
      refreshControl={edit?.refresh ? <RefreshControl refreshing={edit.refresh.refreshing} onRefresh={edit.refresh.onRefresh} tintColor={colors.pink} colors={[colors.pink]} /> : undefined}>
      {/* Poster: blurred fill behind, the complete flyer in front, fading into the page. */}
      <View style={[styles.poster, { height: posterHeight }]}>
        <Image source={event.image} resizeMode="cover" blurRadius={event.imageIsPlaceholder ? 0 : 40} style={StyleSheet.absoluteFill} />
        {!event.imageIsPlaceholder && <Pressable accessibilityRole="button" accessibilityLabel="Eventbild groß anzeigen" onPress={() => setViewer(true)} style={[StyleSheet.absoluteFill, { top: insets.top + 56, bottom: 154 }]}><Image source={event.image} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={`Eventbild: ${event.title}`} /></Pressable>}
        <LinearGradient pointerEvents="none" colors={['#0a090cb3', '#0a090c00', '#0a090c00', '#0a090ccc', colors.background]} locations={[0, 0.2, 0.55, 0.85, 1]} style={StyleSheet.absoluteFill} />
        {edit && event.imageIsPlaceholder && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.posterDim]} />}
        <View style={[styles.toolbar, { paddingTop: insets.top + space.sm }]}>
          <IconButton icon={edit?.close ? 'close' : 'back'} accessibilityLabel={edit?.close ? 'Schließen' : 'Zurück'} onPress={onBack} />
          {edit?.title && <View style={styles.toolbarTitle}><Text accessibilityRole="header" numberOfLines={1} style={styles.toolbarTitleText}>{edit.title}</Text></View>}
          {edit?.toolbar ?? <IconButton icon="share" accessibilityLabel="Event teilen" onPress={() => void share()} />}
        </View>
        {edit && (event.imageIsPlaceholder
          ? <Pressable accessibilityRole="button" accessibilityLabel="Flyer hinzufügen" onPress={() => edit.onEdit('flyer')} style={({ pressed }) => [styles.flyerAdd, { top: insets.top + space.sm + 64 }, pressed && styles.pressed]}>
              <Icon name="image" size={26} color={colors.text} />
              <Text style={styles.flyerAddText}>Flyer hinzufügen</Text>
            </Pressable>
          : <Pressable accessibilityRole="button" accessibilityLabel="Flyer ändern" onPress={() => edit.onEdit('flyer')} hitSlop={6}
              style={({ pressed }) => [styles.flyerEdit, { top: insets.top + space.sm + 56 }, pressed && styles.pressed]}>
              <Icon name="edit" size={14} color={colors.text} />
              <Text style={styles.flyerEditText}>Flyer</Text>
            </Pressable>)}
      </View>

      {/* Title block on the flyer's lower edge: organizer picture, title, one line for the time, genres. */}
      <View style={[styles.head, { marginTop: -150 }]}>
        {/* Organizer picture on the flyer: the ring opens the 24-hour event story (or the profile without one). */}
        {/* Always a round picture, so every event page looks the same: the organizer (story ring / profile),
            or for events without an organizer profile the event picture itself (opens the flyer). */}
        <View style={styles.organizer}>
          {edit ? edit.story : organizer
            ? <StoryRing picture={<OrganizerAvatar organizer={organizer} size={76} />} story={snaps.organizer.length > 0} watched={storyWatched}
                label={snaps.organizer.length > 0 ? `Event-Story von ${organizer.displayName} ansehen` : `Profil von ${organizer.displayName} ansehen`}
                onPress={snaps.organizer.length > 0 ? () => setStory(true) : () => router.push(organizerHref(organizer.id))} />
            : <StoryRing picture={<Image source={event.image} resizeMode="cover" style={styles.eventAvatar} />} story={false} watched={false}
                label={`Eventbild: ${event.title}`} onPress={event.imageIsPlaceholder ? undefined : () => setViewer(true)} />}
        </View>
        <View style={styles.badges}>
          {ended && <View style={styles.endedBadge}><Text style={styles.endedText}>Beendet</Text></View>}
          {event.imageIsPlaceholder && !edit && <Text style={styles.placeholderNote}>Symbolbild</Text>}
        </View>
        {edit
          ? <Pressable accessibilityRole="button" accessibilityLabel={edit.empty?.title ?? `Titel und Genre ändern: ${event.title}`} onPress={() => edit.onEdit('title')} style={({ pressed }) => [styles.editRow, pressed && styles.pressed]}>
              <Text accessibilityRole="header" style={[styles.title, styles.flex, !!edit.empty?.title && styles.placeholder]}>{edit.empty?.title ?? event.title}</Text><EditPen />
            </Pressable>
          : <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>}
        {edit
          ? <Pressable accessibilityRole="button" accessibilityLabel={edit.empty?.when ?? `Datum und Uhrzeit ändern: ${when}`} onPress={() => edit.onEdit('when')} style={({ pressed }) => [styles.editRow, pressed && styles.pressed]}>
              <Text style={[styles.when, styles.flex, !!edit.empty?.when && styles.placeholder]}>{edit.empty?.when ?? when}</Text><EditPen />
            </Pressable>
          : <Text style={styles.when}>{when}</Text>}
        {tags.length > 0 && <View style={styles.tags}>{tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>}
        {edit?.notice}
      </View>

      <View style={styles.body}>
        {/* Always a clear way to the organizer's page, whether or not there is a story (the round picture
            above opens the story when there is one). Events without an organizer profile have no such page. */}
        {organizer && !edit && <Link href={organizerHref(organizer.id)} asChild>
          <PressableScale accessibilityRole="link" accessibilityLabel={`Veranstalter ${organizer.displayName}: Profil ansehen`} scaleTo={0.98} style={styles.organizerCard}>
            <OrganizerAvatar organizer={organizer} size={44} />
            <View style={styles.organizerCopy}>
              <Text style={styles.organizerLabel}>Veranstalter</Text>
              <Text numberOfLines={1} style={styles.organizerName}>{organizer.displayName}</Text>
            </View>
            <View style={styles.profileButton}><Text style={styles.profileText}>Profil</Text><Icon name="chevron" size={13} color={colors.text} /></View>
          </PressableScale>
        </Link>}
        {/* Studio: dieselbe Karte, aber ohne den Knopf „Profil“ – das Profil bearbeitet man im Tab „Profil“. */}
        {organizer && edit && <View style={styles.organizerCard}>
          <OrganizerAvatar organizer={organizer} size={44} />
          <View style={styles.organizerCopy}>
            <Text style={styles.organizerLabel}>Veranstalter</Text>
            <Text numberOfLines={1} style={styles.organizerName}>{organizer.displayName}</Text>
          </View>
        </View>}

        {/* About tonight's event, first thing under the title. */}
        {section('description', 'Über das Event', 'Beschreibung ändern',
          <Text style={[styles.description, !event.description && styles.descriptionEmpty]}>{event.description ?? 'Für dieses Event liegt noch keine Beschreibung vor.'}</Text>)}

        {/* Tickets: ticket types with prices when known, and always a clear way to buy at the provider. */}
        {(!ended || edit) && section('tickets', 'Tickets', 'Tickets ändern',
          <View style={styles.ticketCard}>
            {tickets.length > 0
              ? tickets.map((ticket) => (
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
          </View>)}

        {section('place', 'Ort', 'Ort ändern', point
          ? <PlacePreview coordinate={point} title={event.venue ?? event.location} street={address?.street} detail={address ? address.postcodeCity : placeDetail} onRoute={ended ? undefined : route} />
          : <View style={styles.placeCard}><Icon name="pin" size={18} color={colors.pink} /><Text style={styles.placeText}>{place}</Text></View>)}

        {!edit && <Shots snaps={snaps.visitors} live={live} ended={ended} now={now} eventId={event.id} eventTitle={event.title} />}

        {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}
        {!edit && attribution && <Link href={attribution} style={styles.source}>Infos von {source} ↗</Link>}
        {edit?.below}
      </View>
    </ScrollView>

    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <GlassBackdrop radius={0} variant="panel" />
      <View style={styles.barRow}>
        {edit ? edit.bar : <>
          {main
            ? <Button label={main.label} accessibilityLabel={main.a11y} icon={main.icon} onPress={main.run} style={styles.flex} />
            : <Button label={ended ? 'Event beendet' : 'Noch keine Tickets'} variant="secondary" disabled onPress={() => {}} style={styles.flex} />}
          <SaveEventButton id={event.id} title={event.title} size={52} />
        </>}
      </View>
    </View>

    <Modal visible={viewer} animationType="fade" onRequestClose={() => setViewer(false)}>{viewer && <EventPhotoViewer images={[event.image]} initialIndex={0} onClose={() => setViewer(false)} />}</Modal>
    {organizer && !edit && <Modal visible={story} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={closeStory}>
      {story && <SnapViewer items={snaps.organizer} author={{ name: organizer.displayName, avatar: <OrganizerAvatar organizer={organizer} size={34} />, label: 'Event-Story' }} now={now} onClose={closeStory}
        onAuthorPress={() => { closeStory(); router.push(organizerHref(organizer.id)); }} />}
    </Modal>}
  </View>;
}

/** /event/[id]: lädt das veröffentlichte Event für Gäste und zeigt es in der Ansicht oben. */
export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote = useEvent(id);
  const event = remote.event;
  const organizer = useOrganizerSummary(event?.organizerId);
  const content = useEventContent(event?.id);
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

  return <EventDetailView event={event} organizer={organizer} tickets={content.tickets} liveSnaps={content.snaps} address={address} trackedId={trackedId} onBack={back} />;
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
  // Spots Studio: Bereiche zum Antippen. Die Stifte sind bewusst neutral – Rosa gehört der einen Hauptaktion unten.
  editRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  pen: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff1f', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffffff33' },
  placeholder: { color: colors.faint },
  posterDim: { backgroundColor: '#0a090ca6' },
  toolbarTitle: { alignSelf: 'center', justifyContent: 'center', height: 36, paddingHorizontal: space.lg, borderRadius: 18, backgroundColor: '#0a090cb3', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffffff40' },
  toolbarTitleText: { ...type.label, color: colors.text },
  flyerEdit: { position: 'absolute', right: space.lg, flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: space.md, borderRadius: 18, backgroundColor: '#0a090cb3', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffffff40' },
  flyerEditText: { ...type.label, fontSize: 13, color: colors.text },
  flyerAdd: { position: 'absolute', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: space.sm, width: 200, height: 120, borderRadius: radius.lg, backgroundColor: '#0a090cb3', borderWidth: 1.5, borderColor: '#ffffff59', borderStyle: 'dashed', ...squircle },
  flyerAddText: { ...type.label, color: colors.text },
});
