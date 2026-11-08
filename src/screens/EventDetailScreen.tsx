import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventPhotoViewer } from '../components/EventPhotoViewer';
import { Icon } from '../components/Icon';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Screen } from '../components/Screen';
import { SaveEventButton } from '../components/SaveEventButton';
import { colors } from '../constants/theme';
import { demoEvents } from '../data/events';

type Detail = 'Standort' | 'Datum' | 'Tickets' | 'BeReel hochladen' | 'Event-Einstellungen';

export default function EventDetailScreen() {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const contentWidth = layoutWidth ?? windowWidth;
  const cardWidth = Math.max(1, (contentWidth - 49) / 2);
  const cardHeight = Math.max(72, Math.ceil(52 * fontScale + 20));
  const postWidth = Math.max(1, (contentWidth - 40) / 3);
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = demoEvents.find((item) => item.id === id);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [shareError, setShareError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  async function share() {
    if (!event) return;
    setShareError(false);
    try {
      await Share.share({ title: `${event.title} · Spots`, message: `${event.title} bei Spots\n${event.date}\n${event.location}\nDemo-Event – keine echte Veranstaltung.` });
    } catch { setShareError(true); }
  }

  if (!event) return <Screen><View style={styles.body}><Text style={styles.eventTitle}>Event nicht gefunden</Text><Link href="/" style={styles.textLink}>Zurück zum Radar</Link></View></Screen>;

  // Preview assets only: never present these as actual organizer uploads.
  const posts = [event.image, require('../../assets/events/club.jpg'), require('../../assets/events/nightlife.jpg'), require('../../assets/events/club.jpg'), require('../../assets/events/nightlife.jpg'), event.image];
  const date = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(date);
  const details: Record<Detail, string> = {
    Standort: `${event.location}. Die Markierung zeigt ein Beispielgebiet, keinen bestätigten Veranstaltungsort. Private Adressen werden nicht veröffentlicht.`,
    Datum: `${event.date} · Zeitzone Europe/Berlin. Dies ist ein Demo-Event, keine bestätigte Veranstaltung.`,
    Tickets: 'Für dieses Demo-Event sind noch keine Tickets oder Buchungslinks hinterlegt.',
    'BeReel hochladen': 'Teile die Atmosphäre mit Fotos und kurzen Videos – vorgesehen für 24 Stunden. In dieser Demo ist noch kein Upload möglich. Anmeldung, Medienspeicherung, automatische Ausblendung und Meldefunktionen sind noch nicht angebunden.',
    'Event-Einstellungen': 'Dies ist ein Demo-Event. Bearbeiten und Veröffentlichen stehen erst mit einem verifizierten Veranstalterkonto zur Verfügung. Deine Merkliste wird lokal auf diesem Gerät gespeichert.',
  };

  return (
    <Screen>
      <SafeAreaView edges={['bottom']} style={styles.fill} onLayout={({ nativeEvent }) => setLayoutWidth(nativeEvent.layout.width)}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { height: Math.max(200, contentWidth / 1.8) }]}>
            <Image source={event.image} style={styles.coverImage} resizeMode="cover" accessibilityLabel="Symbolfoto, kein Foto dieses Demo-Events" />
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="back" color={colors.text} size={21} /></Pressable>
              <View style={styles.toolbarRight}>
                <Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="share" color={colors.text} size={21} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Event-Einstellungen" onPress={() => setDetail('Event-Einstellungen')} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="sliders" color={colors.text} size={21} /></Pressable>
              </View>
            </View>
            <View style={styles.heroIdentity}>
              <View style={styles.profileAvatar}><Image source={event.image} style={styles.profileAvatarImage} accessibilityLabel="Symbolbild des Demo-Events" /></View>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.bioBlock}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <Text style={styles.bio}>{event.biography ?? 'Wir kuratieren Nächte, Sounds und Orte für deine nächste spontane Runde. Veranstalter können hier später ihre eigene Bio und ihren Stil hinterlegen.'}</Text>
            </View>
            <View style={styles.actionGrid}>
              <View style={[styles.actionRow, { minHeight: cardHeight }]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Standort anzeigen" onPress={() => setDetail('Standort')} style={[styles.actionCard, { width: cardWidth }]}><Icon name="pin" size={19} /><View style={styles.actionCopy}><Text style={styles.actionText}>Standort</Text><Text style={styles.actionValue}>{event.location.split(' · ')[0]}</Text></View></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Datum anzeigen" onPress={() => setDetail('Datum')} style={[styles.actionCard, { width: cardWidth }]}><Icon name="calendar" size={19} /><View style={styles.actionCopy}><Text style={styles.actionText}>Datum</Text><Text style={styles.actionValue}>{day} · {time}</Text></View></Pressable>
              </View>
              <View style={[styles.actionRow, { minHeight: cardHeight }]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Ticketinformationen anzeigen" onPress={() => setDetail('Tickets')} style={[styles.actionCard, { width: cardWidth }]}><Icon name="ticket" size={19} /><View style={styles.actionCopy}><Text style={styles.actionText}>Tickets</Text><Text style={styles.actionValue}>Keine Tickets hinterlegt</Text></View></Pressable>
                <SaveEventButton id={event.id} title={event.title} label tile />
              </View>
            </View>
            {shareError && <Text accessibilityRole="alert" style={styles.bio}>Teilen ist gerade nicht verfügbar. Bitte versuche es erneut.</Text>}
            <Pressable accessibilityRole="button" accessibilityLabel="BeReel hochladen – Informationen zur Verfügbarkeit" onPress={() => setDetail('BeReel hochladen')} style={styles.uploadCard}>
              <Icon name="camera" size={25} color={colors.text} />
              <Text style={styles.uploadTitle}>BeReel hochladen</Text>
            </Pressable>
            <View style={styles.postsSection}>
              <View style={styles.postsHeading}><Icon name="grid" size={18} /><Text style={styles.sectionTitle}>Beiträge</Text></View>
              <View style={styles.postsGrid}>
                {posts.map((image, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Symbolfoto ${index + 1} in Großansicht öffnen`} onPress={() => setSelectedPost(index)} style={[styles.post, { width: postWidth, height: postWidth / 0.94 }]}><Image source={image} style={styles.coverImage} resizeMode="cover" accessibilityLabel="Symbolfoto – kein echter Veranstalterbeitrag" /></Pressable>)}
              </View>
            </View>
            <Text style={styles.demoNote}>Spots · Demo-Event · Beiträge zeigen Symbolfotos</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dialog schließen" onPress={() => setDetail(null)} />
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.dialogHeading}><Text style={styles.sectionTitle}>{detail}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dialog schließen" onPress={() => setDetail(null)} style={styles.closeButton}><Icon name="close" /></Pressable></View>
            <ScrollView><Text style={styles.description}>{detail && details[detail]}</Text></ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={selectedPost !== null} animationType="fade" onRequestClose={() => setSelectedPost(null)}>
        {selectedPost !== null && <EventPhotoViewer images={posts} initialIndex={selectedPost} onClose={() => setSelectedPost(null)} />}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 26 },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: colors.background },
  coverImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  toolbar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 10 },
  toolbarRight: { gap: 6 },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#100b1555' },
  heroIdentity: { position: 'absolute', left: 20, bottom: 3 },
  profileAvatar: { width: 64, height: 64, borderRadius: 34, padding: 2, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.accent },
  profileAvatarImage: { width: '100%', height: '100%', borderRadius: 30, backgroundColor: colors.surface },
  eventTitle: { color: colors.text, fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.6, marginBottom: 14 },
  body: { paddingHorizontal: 20, paddingTop: 3 },
  bioBlock: { marginBottom: 12 },
  bio: { color: colors.muted, fontSize: 13, lineHeight: 16, marginTop: 7 },
  actionGrid: { gap: 6, marginBottom: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 9 },
  actionCard: { minWidth: 0, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 9, backgroundColor: '#ffffff09', borderWidth: 1, borderColor: colors.border },
  actionCopy: { flex: 1, minWidth: 0 },
  actionText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  actionValue: { color: colors.muted, fontSize: 11, lineHeight: 14, marginTop: 2 },
  uploadCard: { minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 7, borderRadius: 9, borderWidth: 1, borderColor: colors.accent, backgroundColor: '#c922ab15' },
  uploadTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  postsSection: { marginTop: 13, marginBottom: 14 },
  postsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7, marginHorizontal: -7 },
  post: { overflow: 'hidden', borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  demoNote: { color: colors.muted, fontSize: 10, textAlign: 'center' },
  textLink: { color: colors.pink, paddingVertical: 20 },
  modalBackdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 20 },
  dialog: { maxHeight: '80%', backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.border },
  dialogHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23, marginTop: 8, paddingBottom: 8 },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
