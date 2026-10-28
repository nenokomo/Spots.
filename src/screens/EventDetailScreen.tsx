import { LinearGradient } from 'expo-linear-gradient';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import { demoEvents } from '../data/events';

const tabs = ['Infos', 'Line-up', 'Location', 'Snaps'] as const;
type Tab = typeof tabs[number];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = demoEvents.find((item) => item.id === id);
  const [tab, setTab] = useState<Tab>('Infos');
  const [shareError, setShareError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  async function share() {
    if (!event) return;
    setShareError(false);
    try { await Share.share({ title: `${event.title} · Spots`, message: `${event.title} bei Spots\n${event.date}\n${event.location}\nDemo-Event – keine echte Veranstaltung.` }); }
    catch { setShareError(true); }
  }

  if (!event) return <Screen><View style={styles.body}><Text style={styles.title}>Event nicht gefunden</Text><Link href="/" style={styles.textLink}>Zurück zum Radar</Link></View></Screen>;

  const date = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(date);

  return (
    <Screen>
      <SafeAreaView edges={['bottom']} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={event.image} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Symbolfoto, kein Foto dieses Demo-Events" />
            <LinearGradient colors={['#100b1510', '#100b1500', '#100b15cc', colors.background]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="back" color={colors.text} size={20} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="share" color={colors.text} size={20} /></Pressable>
            </View>
            <View style={styles.heroContent}>
              <View style={styles.badge}><Text style={styles.badgeText}>DEMO-EVENT</Text></View>
              <Text style={styles.title}>{event.title}</Text>
              <View style={styles.tags}>{event.categories.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.facts}>
              <View style={styles.fact}><Icon name="calendar" color={colors.pink} size={20} /><View style={styles.factText}><Text style={styles.factTitle}>{day}</Text><Text style={styles.factValue}>Ab {time} Uhr</Text></View></View>
              <View style={styles.fact}><Icon name="pin" color={colors.pink} size={20} /><View style={styles.factText}><Text style={styles.factTitle}>{event.location.split(' · ')[0]}</Text><Text style={styles.factValue}>Beispielort</Text></View></View>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Informationen zu Live-Snaps anzeigen" onPress={() => setTab('Snaps')} style={styles.snapsPreview}>
              <View style={styles.snapRing}><Icon name="camera" size={23} color={colors.pink} /></View>
              <View style={styles.snapCopy}><Text style={styles.smallTitle}>Aktuelle Snaps</Text><Text style={styles.smallText}>Noch keine Eindrücke verfügbar</Text></View>
              <Icon name="chevron" size={15} color={colors.pink} />
            </Pressable>

            <View style={styles.ticket}>
              <GlassBackdrop radius={16} variant="panel" />
              <Icon name="ticket" size={26} color={colors.pink} />
              <View style={styles.ticketCopy}><Text style={styles.smallTitle}>Tickets</Text><Text style={styles.smallText}>Noch keine Ticketinfos</Text></View>
              <View style={styles.ticketUnavailable}><Text style={styles.unavailableText}>Bald verfügbar</Text></View>
            </View>

            <View style={styles.actions}>
              <View accessibilityLabel="Speichern ist noch nicht verfügbar" style={[styles.action, styles.disabled]}><GlassBackdrop radius={13} native={false} /><Icon name="bookmark" size={17} /><Text style={styles.actionText}>Speichern · bald</Text></View>
              <Pressable accessibilityRole="button" onPress={() => setTab('Location')} style={styles.action}><GlassBackdrop radius={13} /><Icon name="pin" size={17} /><Text style={styles.actionText}>Location</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.action}><GlassBackdrop radius={13} /><Icon name="share" size={17} /><Text style={styles.actionText}>Teilen</Text></Pressable>
            </View>
            {shareError && <Text accessibilityRole="alert" style={styles.smallText}>Teilen ist gerade nicht verfügbar. Bitte versuche es erneut.</Text>}

            <View accessibilityRole="tablist" style={styles.tabs}>
              <GlassBackdrop native={false} radius={0} />
              {tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: item === tab }} onPress={() => setTab(item)} style={[styles.tab, item === tab && styles.tabActive]}><Text style={[styles.tabText, item === tab && styles.tabTextActive]}>{item}</Text></Pressable>)}
            </View>

            <View style={styles.tabContent}>
              {tab === 'Infos' && <><Text style={styles.sectionTitle}>Beschreibung</Text><Text style={styles.description}>Entdecke mit Spots, wie dein nächster Abend aussehen könnte. {event.title} ist ein fiktives Beispiel für ein {event.categories.join(' / ')}-Event.</Text><Text style={styles.description}>Termin, Beispielort und Symbolfoto dienen der Vorschau. Diese Seite gehört zu keiner echten Veranstaltung.</Text></>}
              {tab === 'Line-up' && <><Text style={styles.sectionTitle}>Line-up</Text><Text style={styles.description}>Für dieses Demo-Event ist kein Line-up hinterlegt. Bestätigte Artists und Spielzeiten werden hier angezeigt, sobald Veranstalterinformationen vorliegen.</Text></>}
              {tab === 'Location' && <><Text style={styles.sectionTitle}>{event.location}</Text><Text style={styles.description}>Die Markierung zeigt nur ein Beispielgebiet, keinen bestätigten Veranstaltungsort. Deshalb ist für dieses Demo-Event keine Route verfügbar.</Text></>}
              {tab === 'Snaps' && <><Text style={styles.sectionTitle}>Mittendrin – mit Live-Snaps</Text><Text style={styles.description}>Noch keine Snaps vorhanden. Hier sollen später Fotos und kurze Videos von der Veranstaltung erscheinen und nach 24 Stunden verschwinden.</Text><Text style={styles.description}>Upload, Ablauf und Moderation sind noch nicht verfügbar.</Text></>}
            </View>
            <Text style={styles.demoNote}>Spots · Demo-Event · Symbolfoto</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 26 },
  hero: { minHeight: 310, justifyContent: 'space-between', backgroundColor: colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroContent: { paddingHorizontal: 20, paddingTop: 100, paddingBottom: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  badgeText: { color: colors.text, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { color: colors.muted, backgroundColor: '#bc88cf24', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 5, fontSize: 10, overflow: 'hidden' },
  body: { paddingHorizontal: 20 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, paddingTop: 3, paddingBottom: 15 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 115 },
  factText: { flexShrink: 1, gap: 3 },
  factTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  factValue: { color: colors.muted, fontSize: 10 },
  snapsPreview: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8, marginBottom: 13 },
  snapRing: { width: 47, height: 47, borderRadius: 24, borderWidth: 1.5, borderColor: colors.pink, backgroundColor: '#c922ab12', alignItems: 'center', justifyContent: 'center' },
  snapCopy: { flex: 1, gap: 4 },
  smallTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  smallText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  ticket: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  ticketCopy: { flex: 1, minWidth: 100, gap: 4 },
  ticketUnavailable: { backgroundColor: '#c922ab20', paddingHorizontal: 10, paddingVertical: 11, borderRadius: 12 },
  unavailableText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10, marginBottom: 9 },
  action: { flex: 1, minWidth: 80, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 5, padding: 7, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: colors.border, borderRadius: 13 },
  disabled: { opacity: 0.5 },
  actionText: { color: colors.muted, fontSize: 10 },
  tabs: { flexDirection: 'row', marginHorizontal: -20, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.pink },
  tabText: { color: colors.muted, fontSize: 12 },
  tabTextActive: { color: colors.pink, fontWeight: '600' },
  tabContent: { paddingTop: 17, minHeight: 140 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 9 },
  demoNote: { color: '#a38baa', fontSize: 9, marginTop: 20 },
  textLink: { color: colors.pink, paddingVertical: 20 },
});
