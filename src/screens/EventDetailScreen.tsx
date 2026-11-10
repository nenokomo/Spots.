import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventDataState } from '../components/EventDataState';
import { EventPhotoViewer } from '../components/EventPhotoViewer';
import { Icon, type IconName } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Screen } from '../components/Screen';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/Section';
import { StatusBadge } from '../components/ui/StatusBadge';
import { colors, radius, space, type } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { useEventContent } from '../hooks/useEventContent';
import { useNow } from '../hooks/useNow';
import { useOrganizerSummary } from '../hooks/useOrganizer';
import { organizerHref } from '../navigation/eventRoutes';
import { formatPrice } from '../services/content';
import { eventPhase } from '../utils/eventStatus';

const dayFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
const endFormat = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function Fact({ icon, title, text, onPress, label }: { icon: IconName; title: string; text?: string; onPress?: () => void; label?: string }) {
  const content = <>
    <View style={styles.factIcon}><Icon name={icon} size={19} color={colors.pink} /></View>
    <View style={styles.factCopy}><Text style={styles.factTitle}>{title}</Text>{text && <Text style={styles.factText}>{text}</Text>}</View>
    {onPress && <Icon name="chevron" size={16} color={colors.faint} />}
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} onPress={onPress} style={({ pressed }) => [styles.fact, pressed && styles.pressed]}>{content}</Pressable>
    : <View style={styles.fact}>{content}</View>;
}

export default function EventDetailScreen() {
  const { width } = useWindowDimensions();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote = useEvent(id);
  const event = remote.event;
  const organizer = useOrganizerSummary(event?.organizerId);
  const content = useEventContent(event?.id);
  const [viewer, setViewer] = useState<number | null>(null);
  const [linkError, setLinkError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  if (!event || remote.error) return <Screen><View style={styles.state}><EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />{!remote.loading && !remote.error && <Text style={styles.title}>Event nicht verfügbar</Text>}<Link href="/" style={styles.link}>Zurück zum Radar</Link></View></Screen>;

  const phase = eventPhase(event, now);
  const ended = phase === 'ended';
  const start = new Date(event.startsAt);
  const ticketUrl = event.ticketUrl?.startsWith('https://') ? event.ticketUrl : undefined;
  const sourceUrl = event.sourceUrl?.startsWith('https://') ? event.sourceUrl : undefined;
  const sourceLabel = event.sourceName ? event.sourceName.charAt(0).toLocaleUpperCase('de') + event.sourceName.slice(1) : 'der Originalseite';
  const point = event.coordinate;
  const tags = [...new Set([...event.categories, ...(event.genres ?? [])])];
  const snaps = content.snaps.filter((snap) => snap.mediaType === 'image');
  const gallery = [...(event.imageIsPlaceholder ? [] : [event.image]), ...snaps.map((snap) => ({ uri: snap.url }))];
  const heroHeight = Math.min(440, Math.max(250, width * 0.95));
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
    try { await Share.share({ title: `${event!.title} · Spots`, message: `${event!.title}\n${dayFormat.format(start)}, ${timeFormat.format(start)} Uhr\n${place}${sourceUrl ? `\n${sourceUrl}` : ''}` }); } catch { /* user dismissed */ }
  }

  const primary = !ended && (ticketUrl ?? sourceUrl);
  return <Screen><SafeAreaView edges={['bottom']} style={styles.flex}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.hero, { height: heroHeight }]}>
        {/* Flyers vary wildly in format: blurred backdrop plus the complete image instead of a hard crop. */}
        <Image source={event.image} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={event.imageIsPlaceholder ? 0 : 26} accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto, kein Foto dieses Events' : `Eventbild: ${event.title}`} />
        {!event.imageIsPlaceholder && <><View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.heroTint]} /><Pressable accessibilityRole="button" accessibilityLabel="Eventbild groß anzeigen" onPress={() => setViewer(0)} style={StyleSheet.absoluteFill}><Image source={event.image} style={StyleSheet.absoluteFill} resizeMode="contain" /></Pressable></>}
        <LinearGradient pointerEvents="none" colors={['#100b1580', '#100b1500', '#100b1500', '#100b15a6']} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.round}><Icon name="back" color={colors.text} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.round}><Icon name="share" size={20} color={colors.text} /></Pressable>
        </View>
        {event.imageIsPlaceholder && <Text style={styles.placeholderNote}>Symbolbild</Text>}
      </View>

      <View style={styles.body}>
        <View style={styles.statusRow}><StatusBadge phase={phase} /><SaveEventButton id={event.id} title={event.title} label /></View>
        <Text style={styles.title}>{event.title}</Text>
        {organizer
          ? <Link href={organizerHref(organizer.id)} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Veranstalter ${organizer.displayName} öffnen`} style={styles.organizer}>
              <View style={styles.organizerAvatar}>{organizer.avatarUrl ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} /> : <Icon name="profile" size={15} color={colors.pink} />}</View>
              <Text numberOfLines={1} style={styles.organizerText}>von <Text style={styles.organizerName}>{organizer.displayName}</Text></Text>
              <Icon name="chevron" size={14} color={colors.faint} />
            </Pressable></Link>
          : event.sourceName && <Text style={styles.source}>Quelle: {sourceLabel}</Text>}
        {tags.length > 0 && <View style={styles.tags}>{tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>}

        {ended
          ? <View style={styles.endedNote}><Icon name="clock" size={16} color={colors.faint} /><Text style={styles.endedText}>Dieses Event ist vorbei. Tickets und Route werden nicht mehr angeboten.</Text></View>
          : <View style={styles.actions}>
              {primary && <Button label={ticketUrl ? 'Tickets kaufen' : 'Infos & Tickets'} accessibilityLabel={ticketUrl ? 'Tickets beim Anbieter kaufen' : `Infos und Tickets auf der Originalseite bei ${sourceLabel}`} icon="ticket" onPress={() => void open(primary)} style={styles.flex} />}
              {point && <Button label="Route" icon="map" variant="secondary" onPress={route} accessibilityLabel="Route zum Veranstaltungsort anzeigen" style={!primary ? styles.flex : undefined} />}
            </View>}
        {linkError && <Text accessibilityRole="alert" style={styles.error}>Der Link konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}

        <View style={styles.facts}>
          <Fact icon="calendar" title={dayFormat.format(start)} text={`${timeFormat.format(start)} Uhr${event.endsAt ? ` bis ${endFormat.format(new Date(event.endsAt))} Uhr` : ' · Ende nicht angegeben'}`} />
          <View style={styles.divider} />
          <Fact icon="pin" title={event.venue ?? event.location} text={[event.venue ? event.location : null, point && !ended ? 'Route anzeigen' : null].filter(Boolean).join(' · ') || undefined} onPress={point && !ended ? route : undefined} label="Route zum Veranstaltungsort anzeigen" />
          <View style={styles.divider} />
          <Fact icon="ticket" title="Tickets" text={ended ? 'Event beendet' : ticketUrl ? 'Beim Ticketanbieter erhältlich' : sourceUrl ? `Infos auf der Originalseite bei ${sourceLabel}` : 'Noch keine Ticketinformationen'} onPress={primary ? () => void open(primary) : undefined} />
        </View>

        {content.tickets.length > 0 && !ended && <>
          <SectionHeader title="Ticketarten" note="Verkauf über den angegebenen Anbieter" />
          <View style={styles.tickets}>{content.tickets.map((ticket) => (
            <Pressable key={ticket.id} accessibilityRole="button" disabled={!ticket.externalUrl || ticket.soldOut} onPress={() => ticket.externalUrl && void open(ticket.externalUrl)} style={styles.ticket}>
              <View style={styles.factCopy}><Text style={styles.factTitle}>{ticket.name}</Text>{ticket.description && <Text style={styles.factText}>{ticket.description}</Text>}</View>
              <Text style={[styles.price, ticket.soldOut && styles.soldOut]}>{ticket.soldOut ? 'Ausverkauft' : formatPrice(ticket.priceCents, ticket.currency)}</Text>
            </Pressable>
          ))}</View>
        </>}

        {event.description && <><SectionHeader title="Über das Event" /><Text style={styles.description}>{event.description}</Text></>}

        <SectionHeader title="Live Snaps" note="Eindrücke von Besuchern · 24 Stunden sichtbar" />
        {snaps.length > 0
          ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.snaps}>
              {snaps.map((snap, index) => <Pressable key={snap.id} accessibilityRole="button" accessibilityLabel={`Live Snap ${index + 1} öffnen`} onPress={() => setViewer(gallery.length - snaps.length + index)} style={styles.snap}><Image source={{ uri: snap.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />{snap.byOrganizer && <Text style={styles.snapBadge}>Veranstalter</Text>}</Pressable>)}
            </ScrollView>
          : <View style={styles.snapEmpty}><Icon name="camera" size={20} color={colors.pink} /><Text style={styles.snapEmptyText}>{phase === 'live' || phase === 'started' ? 'Noch keine Live Snaps von heute Nacht.' : 'Live Snaps erscheinen, sobald das Event läuft.'} Hochladen ist mit einem Spots-Konto geplant.</Text></View>}

        <View style={styles.footerLinks}>
          {sourceUrl && <Link href={sourceUrl} style={styles.link}>Original auf {sourceLabel} öffnen ↗</Link>}
          {event.sourceName?.toLowerCase() === 'goabase' && <Link href="https://www.goabase.net/" style={styles.link}>Veranstaltungen von Goabase ↗</Link>}
        </View>
        <Text style={styles.footer}>Zeiten in Europe/Berlin · Angaben der Veranstaltungsquelle</Text>
      </View>
    </ScrollView>
  </SafeAreaView>
  <Modal visible={viewer !== null} animationType="fade" onRequestClose={() => setViewer(null)}>{viewer !== null && <EventPhotoViewer images={gallery} initialIndex={viewer} onClose={() => setViewer(null)} />}</Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.xxl },
  state: { flex: 1, padding: space.xl, gap: space.md },
  hero: { overflow: 'hidden', backgroundColor: colors.surface, marginHorizontal: space.md, marginTop: space.sm, borderRadius: radius.xl },
  heroTint: { backgroundColor: '#100b1580' },
  toolbar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: space.md },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#100b15a6', alignItems: 'center', justifyContent: 'center' },
  placeholderNote: { position: 'absolute', right: space.md, bottom: space.md, ...type.caption, fontSize: 10, color: colors.text, backgroundColor: '#100b15b3', borderRadius: radius.sm, overflow: 'hidden', paddingHorizontal: space.sm, paddingVertical: 3 },
  body: { paddingHorizontal: space.xl, paddingTop: space.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  title: { ...type.display, fontSize: 28, lineHeight: 34, color: colors.text, marginTop: space.md },
  organizer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, marginTop: space.xs, alignSelf: 'flex-start' },
  organizerAvatar: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  organizerText: { ...type.label, color: colors.muted, flexShrink: 1 },
  organizerName: { color: colors.text, fontWeight: '700' },
  source: { ...type.caption, color: colors.faint, marginTop: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.md },
  tag: { ...type.caption, fontSize: 11, fontWeight: '600', color: colors.muted, backgroundColor: '#ffffff0d', borderRadius: radius.pill, overflow: 'hidden', paddingHorizontal: space.md, paddingVertical: 5 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  endedNote: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, padding: space.md, borderRadius: radius.md, backgroundColor: '#ffffff0a' },
  endedText: { ...type.caption, color: colors.muted, flex: 1 },
  error: { ...type.caption, color: colors.danger, marginTop: space.sm },
  facts: { marginTop: space.xl, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: '#ffffff0f' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 68, paddingVertical: space.md },
  pressed: { opacity: 0.7 },
  factIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  factCopy: { flex: 1, minWidth: 0 },
  factTitle: { ...type.label, fontSize: 14, color: colors.text },
  factText: { ...type.caption, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#ffffff0f', marginLeft: 50 },
  tickets: { gap: space.sm },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: '#ffffff0f' },
  price: { ...type.label, color: colors.text, fontWeight: '800' },
  soldOut: { color: colors.faint },
  description: { ...type.body, color: colors.muted },
  snaps: { gap: space.sm },
  snap: { width: 104, height: 156, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  snapBadge: { position: 'absolute', left: 6, bottom: 6, ...type.caption, fontSize: 9, fontWeight: '700', color: colors.text, backgroundColor: '#c922abcc', borderRadius: 6, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2 },
  snapEmpty: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accentLine },
  snapEmptyText: { ...type.caption, color: colors.muted, flex: 1 },
  footerLinks: { marginTop: space.xl },
  link: { ...type.label, color: colors.pink, paddingVertical: space.md },
  footer: { ...type.caption, fontSize: 10, color: colors.faint, textAlign: 'center', marginTop: space.lg },
});
