import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventPhotoViewer } from '../components/EventPhotoViewer';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SaveEventButton } from '../components/SaveEventButton';
import { colors } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { EventDataState } from '../components/EventDataState';
import { isLiveEvent } from '../types/events';
import { useNow } from '../hooks/useNow';

type Detail = 'Standort' | 'Tickets' | 'BeReel hochladen' | 'Event-Einstellungen';

export default function EventDetailScreen() {
  const { width } = useWindowDimensions();
  const now = useNow();
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const contentWidth = layoutWidth ?? width;
  const postWidth = Math.max(1, (contentWidth - 56) / 3);
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote = useEvent(id);
  const event = remote.event;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [ticketError, setTicketError] = useState(false);
  const [shareError, setShareError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  async function share() {
    if (!event) return;
    setShareError(false);
    try { await Share.share({ title: `${event.title} · Spots`, message: `${event.title} bei Spots\n${event.date}\n${event.location}\n${event.sourceUrl ?? ""}` }); }
    catch { setShareError(true); }
  }

  if (!event || remote.error) return <Screen><View style={styles.body}><EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />{!remote.loading && !remote.error && <Text style={styles.title}>Event nicht verfügbar</Text>}<Link href="/" style={styles.linkText}>Zurück zum Radar</Link></View></Screen>;
  const ticketUrl = event.ticketUrl?.startsWith('https://') ? event.ticketUrl : undefined;
  async function openTickets() {
    setTicketError(false);
    if (!ticketUrl) { setDetail('Tickets'); return; }
    try { await Linking.openURL(ticketUrl); } catch { setTicketError(true); }
  }
  const date = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(date);
  const upcoming = date.getTime() >= now;
  const posts = event.imageIsPlaceholder ? [] : [event.image];
  const details: Record<Detail, string> = {
    Standort: `${event.location}${event.venue ? ` · ${event.venue}` : ""}. Weitere Angaben auf der Originalseite.`,
    Tickets: ticketUrl ? 'Tickets werden über den externen Anbieter verkauft.' : 'Für dieses Event sind noch keine Tickets oder Buchungslinks hinterlegt.',
    'BeReel hochladen': 'Fotos und kurze Videos gehören zu diesem konkreten Event und sind für 24 Stunden vorgesehen. Upload, Medienspeicherung und automatische Ausblendung sind noch nicht verfügbar.',
    'Event-Einstellungen': 'Bearbeiten und Veröffentlichen erfordern ein verifiziertes Veranstalterkonto. Ein verifiziertes Veranstalterkonto ist noch nicht eingerichtet.',
  };

  return <Screen><SafeAreaView edges={['bottom']} style={styles.fill} onLayout={({ nativeEvent }) => setLayoutWidth(nativeEvent.layout.width)}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.hero, { height: Math.max(220, contentWidth / 1.65) }]}>
        <Image source={event.image} style={styles.cover} resizeMode="cover" accessibilityLabel={event.imageIsPlaceholder ? "Symbolfoto, kein Foto dieses Events" : `Eventbild: ${event.title}`} />
        <LinearGradient pointerEvents="none" colors={['#100b1500', '#100b1566']} style={styles.cover} />
        <View style={styles.toolbar}><Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.round}><Icon name="back" color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Event-Einstellungen" onPress={() => setDetail('Event-Einstellungen')} style={styles.round}><Icon name="sliders" color={colors.text} /></Pressable></View>
      </View>
      <View style={styles.body}>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{isLiveEvent(event, now) ? 'Läuft jetzt' : upcoming ? 'Demnächst' : 'Start bereits erfolgt'}</Text>
          <View style={styles.tools}><SaveEventButton id={event.id} title={event.title} /><Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.iconButton}><Icon name="share" color={colors.text} /></Pressable></View>
        </View>
        <Text style={styles.title}>{event.title}</Text>
        {shareError && <Text accessibilityRole="alert" style={styles.note}>Teilen ist gerade nicht verfügbar.</Text>}

        <View style={styles.tags}>{event.categories.map(category => <View key={category} style={styles.tag}><Text style={styles.tagText}>{category}</Text></View>)}</View>
        <View style={styles.facts}>
          <View style={styles.factRow}><View style={styles.factIcon}><Icon name="calendar" size={22} color={colors.pink} /></View><View style={styles.copy}><Text style={styles.factTitle}>{day}</Text><Text style={styles.muted}>{time} Uhr · {event.endsAt ? `Ende ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(event.endsAt))}` : "Ende noch nicht angegeben"}</Text></View></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Standort anzeigen" onPress={() => setDetail('Standort')} style={styles.factRow}><View style={styles.factIcon}><Icon name="pin" size={22} color={colors.pink} /></View><View style={styles.copy}><Text style={styles.factTitle}>{event.location.split(' · ')[0]}</Text><Text style={styles.muted}>{event.venue ?? "Weitere Standortangaben auf der Originalseite"}</Text></View></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ticketinformationen anzeigen" onPress={() => void openTickets()} style={styles.factRow}><View style={styles.factIcon}><Icon name="ticket" size={22} color={colors.pink} /></View><View style={styles.copy}><Text style={styles.factTitle}>Tickets</Text><Text style={styles.muted}>{ticketUrl ? 'Beim Ticketanbieter erhältlich' : 'Noch keine Tickets hinterlegt'}</Text></View></Pressable>
        </View>

        <View style={styles.about}><Text style={styles.heading}>Über das Event</Text><Text style={styles.description}>{event.description ?? 'Für dieses Event ist noch keine Beschreibung hinterlegt.'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={ticketUrl ? 'Tickets beim Anbieter kaufen' : 'Ticketverfügbarkeit prüfen'} onPress={() => void openTickets()} style={styles.ticketButton}><LinearGradient pointerEvents="none" colors={[colors.accent, '#9b268f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} /><Icon name="ticket" color={colors.text} size={21} /><Text style={styles.ticketLabel}>{ticketUrl ? 'Ticket sichern' : 'Ticketinformationen'}</Text></Pressable>
          {ticketError && <Text accessibilityRole="alert" style={styles.note}>Der Ticketlink konnte nicht geöffnet werden. Bitte erneut versuchen.</Text>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Weitere Informationen" accessibilityState={{ expanded: showMore }} onPress={() => setShowMore(value => !value)} style={styles.moreButton}><Text style={styles.heading}>Weitere Informationen</Text><Icon name={showMore ? 'close' : 'down'} size={21} /></Pressable>
        {showMore && <View style={styles.moreContent}><Text style={styles.muted}>{event.categories.join(' · ')}</Text><Text style={styles.note}>Zeitzone: Europe/Berlin. Angaben von der Veranstaltungsquelle.</Text></View>}

        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.heading}>BeReels</Text><Text style={styles.note}>24 Stunden</Text></View>
          <Text style={styles.description}>Noch keine BeReels von diesem Event vorhanden.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="BeReel hochladen – Informationen zur Verfügbarkeit" onPress={() => setDetail('BeReel hochladen')} style={styles.upload}><Icon name="camera" color={colors.pink} /><Text style={styles.uploadLabel}>BeReel hochladen</Text></Pressable>
          <Text style={styles.note}>Upload noch nicht verfügbar.</Text>
        </View>
        <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.heading}>Eventmedien</Text><Text style={styles.note}>Bild der Veranstaltungsquelle</Text></View>
          {posts.length === 0 && <Text style={styles.description}>Noch keine Eventmedien vorhanden.</Text>}
          <View style={styles.grid}>{posts.map((source, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Eventbild ${index + 1} öffnen`} onPress={() => setSelectedPost(index)} style={[styles.tile, { width: postWidth, height: postWidth / 0.95 }]}><Image source={source} style={styles.cover} resizeMode="cover" /></Pressable>)}</View>
        </View>
        {event.sourceUrl && <Link href={event.sourceUrl} style={styles.linkText}>Original auf {event.sourceName ?? "der Veranstaltungsquelle"} öffnen ↗</Link>}
        <Link href="https://www.goabase.net/" style={styles.linkText}>Veranstaltungen von Goabase ↗</Link>
        <Text style={styles.footer}>Spots · {event.sourceName ?? "Veranstaltungsquelle"}</Text>
      </View>
    </ScrollView>
  </SafeAreaView>
  <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={() => setDetail(null)}><View style={styles.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dialog schließen" onPress={() => setDetail(null)} /><View style={styles.dialog} accessibilityViewIsModal><View style={styles.sectionHeading}><Text style={styles.heading}>{detail}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dialog schließen" onPress={() => setDetail(null)} style={styles.iconButton}><Icon name="close" /></Pressable></View><ScrollView><Text style={styles.description}>{detail && details[detail]}</Text></ScrollView></View></View></Modal>
  <Modal visible={selectedPost !== null} animationType="fade" onRequestClose={() => setSelectedPost(null)}>{selectedPost !== null && <EventPhotoViewer images={posts} initialIndex={selectedPost} onClose={() => setSelectedPost(null)} />}</Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, scroll: { paddingBottom: 26 }, hero: { overflow: 'hidden', backgroundColor: colors.surface, marginHorizontal: 12, marginTop: 10, borderRadius: 24 }, cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 }, round: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#100b1599', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 8 }, statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, status: { color: colors.pink, fontSize: 11, fontWeight: '700', backgroundColor: '#c922ab18', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 3 }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7 }, organizerLink: { minHeight: 44, justifyContent: 'center' }, organizerName: { color: colors.muted, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 }, facts: { paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: '#ffffff06' }, factRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 74 },
  factIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#c922ab16', alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20, marginTop: 2 },
  tag: { backgroundColor: '#ffffff08', borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  copy: { flex: 1, minWidth: 0 }, factTitle: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 }, about: { paddingTop: 26 }, heading: { color: colors.text, fontSize: 18, fontWeight: '700', flexShrink: 1 }, description: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 12 },
  ticketButton: { minHeight: 56, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.accent, marginTop: 18, padding: 12 }, ticketLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  moreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, gap: 12 }, moreContent: { paddingBottom: 12 }, note: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24, marginTop: 16 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  upload: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 66, borderWidth: 1, borderColor: '#c922ab66', borderRadius: 18, backgroundColor: '#c922ab12', marginTop: 16, marginBottom: 10 }, uploadLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, tile: { overflow: 'hidden', backgroundColor: colors.surface, borderRadius: 12 }, footer: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 20 }, linkText: { color: colors.pink, paddingVertical: 16 },
  modalBackdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 20 }, dialog: { maxHeight: '80%', backgroundColor: colors.surface, borderRadius: 18, padding: 20 },
});
