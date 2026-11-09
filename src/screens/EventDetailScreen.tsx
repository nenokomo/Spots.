import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Screen } from '../components/Screen';
import { SaveEventButton } from '../components/SaveEventButton';
import { EventDataState } from '../components/EventDataState';
import { colors } from '../constants/theme';
import { useEvent } from '../hooks/useEvents';
import { safeExternalUrl } from '../services/eventAdapter';

const tabs = ['Infos', 'Line-up', 'Location', 'Snaps'] as const;
type Tab = typeof tabs[number];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const remote = useEvent(id);
  const { event } = remote;
  const [tab, setTab] = useState<Tab>('Infos');
  const [shareError, setShareError] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  async function share() {
    if (!event) return;
    setShareError(false);
    try { await Share.share({ title: `${event.title} · Spots`, message: `${event.title} bei Spots\n${event.date} (Europe/Berlin)\n${event.location}${event.sourceUrl ? `\n${event.sourceUrl}` : ''}` }); }
    catch { setShareError(true); }
  }

  async function openExternal(url: string | null | undefined) {
    setLinkError(false);
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) { setLinkError(true); return; }
    try { await Linking.openURL(safeUrl); } catch { setLinkError(true); }
  }

  if (!event || remote.error) return <Screen><View style={styles.body}><EventDataState loading={remote.loading} error={remote.error} onRetry={remote.reload} />{!remote.loading && !remote.error && <Text style={styles.title}>Event nicht verfügbar</Text>}<Link href="/" style={styles.textLink}>Zurück zum Radar</Link></View></Screen>;

  const date = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(date);

  return (
    <Screen>
      <SafeAreaView edges={['bottom']} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={event.image} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={event.imageIsPlaceholder ? 'Symbolfoto, kein Foto dieses Events' : `Eventbild: ${event.title}`} />
            <LinearGradient colors={['#100b1510', '#100b1500', '#100b15cc', colors.background]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="back" color={colors.text} size={20} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.roundButton}><GlassBackdrop radius={22} /><Icon name="share" color={colors.text} size={20} /></Pressable>
            </View>
            <View style={styles.heroContent}>
              <View style={styles.badge}><Text style={styles.badgeText}>{event.sourceName ?? 'EVENT'}</Text></View>
              <Text style={styles.title}>{event.title}</Text>
              <View style={styles.tags}>{event.categories.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.facts}>
              <View style={styles.fact}><Icon name="calendar" color={colors.pink} size={20} /><View style={styles.factText}><Text style={styles.factTitle}>{day}</Text><Text style={styles.factValue}>Ab {time} Uhr</Text></View></View>
              <View style={styles.fact}><Icon name="pin" color={colors.pink} size={20} /><View style={styles.factText}><Text style={styles.factTitle}>{event.location}</Text><Text style={styles.factValue}>{event.venue ?? 'Details beim Veranstalter'}</Text></View></View>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Informationen zu Live-Snaps anzeigen" onPress={() => setTab('Snaps')} style={styles.snapsPreview}>
              <View style={styles.snapRing}><Icon name="camera" size={23} color={colors.pink} /></View>
              <View style={styles.snapCopy}><Text style={styles.smallTitle}>Aktuelle Snaps</Text><Text style={styles.smallText}>Noch keine Eindrücke verfügbar</Text></View>
              <Icon name="chevron" size={15} color={colors.pink} />
            </Pressable>

            <View style={styles.ticket}>
              <GlassBackdrop radius={16} variant="panel" />
              <Icon name="ticket" size={26} color={colors.pink} />
              <View style={styles.ticketCopy}><Text style={styles.smallTitle}>Tickets</Text><Text style={styles.smallText}>{event.ticketUrl ? 'Externer Ticketanbieter' : 'Keine Ticketinfos hinterlegt'}</Text></View>
              {event.ticketUrl ? <Pressable accessibilityRole="link" accessibilityLabel="Externe Ticketseite öffnen" onPress={() => void openExternal(event.ticketUrl)} style={styles.ticketLink}><Text style={styles.unavailableText}>Tickets öffnen</Text></Pressable> : <View style={styles.ticketUnavailable}><Text style={styles.unavailableText}>Keine Angaben</Text></View>}
            </View>

            <View style={styles.actions}>
              <SaveEventButton id={event.id} title={event.title} label />
              <Pressable accessibilityRole="button" onPress={() => setTab('Location')} style={styles.action}><GlassBackdrop radius={13} /><Icon name="pin" size={17} /><Text style={styles.actionText}>Location</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Event teilen" onPress={() => void share()} style={styles.action}><GlassBackdrop radius={13} /><Icon name="share" size={17} /><Text style={styles.actionText}>Teilen</Text></Pressable>
            </View>
            {shareError && <Text accessibilityRole="alert" style={styles.smallText}>Teilen ist gerade nicht verfügbar. Bitte versuche es erneut.</Text>}
            {linkError && <Text accessibilityRole="alert" style={styles.smallText}>Der externe Link konnte nicht geöffnet werden.</Text>}

            <View accessibilityRole="tablist" style={styles.tabs}>
              <GlassBackdrop native={false} radius={0} />
              {tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: item === tab }} onPress={() => setTab(item)} style={[styles.tab, item === tab && styles.tabActive]}><Text style={[styles.tabText, item === tab && styles.tabTextActive]}>{item}</Text></Pressable>)}
            </View>

            <View style={styles.tabContent}>
              {tab === 'Infos' && <><Text style={styles.sectionTitle}>Beschreibung</Text><Text style={styles.description}>{event.description ?? 'Für dieses Event ist keine Beschreibung hinterlegt.'}</Text>{!!event.genres?.length && <Text style={styles.description}>{event.genres.join(' · ')}</Text>}<Text style={styles.description}>Zeiten in Europe/Berlin. {event.endsAt ? `Ende: ${new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.endsAt))}` : 'Keine bestätigte Endzeit; deshalb keine Live-Anzeige im Radar.'}</Text>{event.sourceUrl && <Pressable accessibilityRole="link" onPress={() => void openExternal(event.sourceUrl)} style={styles.sourceLink}><Text style={styles.textLink}>Event bei {event.sourceName ?? 'der Quelle'} ansehen</Text></Pressable>}</>}
              {tab === 'Line-up' && <><Text style={styles.sectionTitle}>Line-up</Text><Text style={styles.description}>Ein separates Line-up ist noch nicht hinterlegt. Weitere Angaben stehen gegebenenfalls in der Beschreibung oder auf der verlinkten Eventseite.</Text></>}
              {tab === 'Location' && <><Text style={styles.sectionTitle}>{event.location}</Text><Text style={styles.description}>{event.venue ?? 'Kein Veranstaltungsort hinterlegt. Weitere Informationen findest du auf der Eventseite.'}</Text></>}
              {tab === 'Snaps' && <><Text style={styles.sectionTitle}>Mittendrin – mit Live-Snaps</Text><Text style={styles.description}>Noch keine Snaps vorhanden. Hier sollen später Fotos und kurze Videos von der Veranstaltung erscheinen und nach 24 Stunden verschwinden.</Text><Text style={styles.description}>Upload, Ablauf und Moderation sind noch nicht verfügbar.</Text></>}
            </View>
            <Text style={styles.demoNote}>Spots{event.sourceName ? ` · Quelle: ${event.sourceName}` : ''}{event.imageIsPlaceholder ? ' · Symbolfoto' : ''}</Text>
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
  ticketLink: { backgroundColor: '#c922ab20', paddingHorizontal: 10, minHeight: 44, justifyContent: 'center', borderRadius: 12 },
  sourceLink: { minHeight: 44, justifyContent: 'center' },
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
