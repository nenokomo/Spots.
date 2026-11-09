import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrganizerPostFeed } from '../components/OrganizerPostFeed';
import { getOrganizerPosts } from '../data/organizerPosts';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { colors } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { organizers, organizerEvents, getUpcomingOrganizerEvents } from '../data/organizers';
import { useNow } from '../hooks/useNow';

function EventPreview({ event }: { event: SpotEvent }) {
  const date = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(event.startsAt));
  return <Link href={{ pathname: '/event/[id]', params: { id: event.id } }} asChild>
    <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${date}, Event öffnen`} style={styles.eventCard}>
      <Image source={event.image} style={styles.eventImage} accessibilityLabel="Eventbild" />
      <View style={styles.copy}>
        <Text style={styles.cardTitle}>{event.title}</Text>
        <View style={styles.meta}><Icon name="pin" size={14} /><Text style={styles.metaText}>{event.location.split(' · ')[0]}</Text></View>
        <View style={styles.meta}><Icon name="calendar" size={14} /><Text style={styles.metaText}>{date} Uhr</Text></View>
        <Text style={styles.openText}>Event entdecken →</Text>
      </View>
    </Pressable>
  </Link>;
}

export default function OrganizerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const organizer = organizers.find(item => item.id === id);
  const now = useNow();
  const { width } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const posts = getOrganizerPosts();
  const upcoming = organizer ? getUpcomingOrganizerEvents(organizer.id, now) : [];
  const [next, ...others] = upcoming;
  const all = organizer ? organizerEvents.filter(event => event.organizerId === organizer.id).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)) : [];
  const past = all.filter(event => Date.parse(event.startsAt) < now);
  const availableWidth = layoutWidth ?? width;
  const tileWidth = Math.max(1, (availableWidth - 32) / 3);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  if (!organizer) return <Screen><View style={styles.body}><Text style={styles.name}>Veranstalterprofil noch nicht verfügbar</Text><Link href="/" style={styles.openText}>Zum Radar</Link></View></Screen>;
  return <Screen><SafeAreaView edges={['bottom']} style={styles.fill} onLayout={({ nativeEvent }) => setLayoutWidth(nativeEvent.layout.width)}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.hero, { height: Math.max(200, availableWidth / 1.85) }]}>
        <Image source={organizer.image} style={styles.cover} resizeMode="cover" accessibilityLabel="Veranstalterbild" />
        <Image source={organizer.image} style={styles.avatar} accessibilityLabel="Profil-Symbolfoto" />
        <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.back}><Icon name="back" color={colors.text} /></Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.identity}><View style={styles.copy}><Text style={styles.name}>{organizer.name}</Text><Text style={styles.muted}>Eventveranstalter · {organizer.city}</Text><Text style={styles.muted}>{all.length} Termine</Text></View></View>
        <Text style={styles.bio}>{organizer.biography ?? 'Für dieses Veranstalterprofil ist noch keine individuelle Biografie hinterlegt.'}</Text>
        <Text style={styles.socialHint}>Noch keine bestätigten Social-Media-Profile hinterlegt</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.heading}>Nächstes Event</Text><Pressable accessibilityRole="button" onPress={() => setShowAll(value => !value)} accessibilityState={{ expanded: showAll }} style={styles.allButton}><Text style={styles.allText}>{showAll ? 'Weniger anzeigen' : 'Alle Events →'}</Text></Pressable></View>
          {next ? <EventPreview event={next} /> : <View style={styles.empty}><Text style={styles.cardTitle}>Noch kein nächstes Event angekündigt</Text><Text style={styles.muted}>Neue Termine erscheinen hier.</Text></View>}
          {showAll && <View style={styles.eventList}>
            <Text style={styles.listHeading}>Weitere anstehende Events</Text>
            {others.length ? others.map(event => <EventPreview key={event.id} event={event} />) : <Text style={styles.muted}>Keine weiteren Termine angekündigt.</Text>}
            {past.length > 0 && <><Text style={styles.listHeading}>Vergangene Events</Text>{past.map(event => <EventPreview key={event.id} event={event} />)}</>}
          </View>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.heading}>Beiträge</Text><Text style={styles.previewLabel}>Symbolfoto-Vorschau</Text></View>
          <View style={styles.grid}>{posts.map((post, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Beitrag ${index + 1} von ${organizer.name} öffnen`} onPress={() => setSelectedPost(index)} style={[styles.tile, { width: tileWidth, height: tileWidth / 0.95 }]}><Image source={post.image} style={styles.cover} resizeMode="cover" /></Pressable>)}</View>
        </View>
        <Text style={styles.note}>Spots · Veranstalterprofil</Text>
      </View>
    </ScrollView>
  </SafeAreaView>
  <Modal visible={selectedPost !== null} animationType="fade" onRequestClose={() => setSelectedPost(null)}>{selectedPost !== null && <OrganizerPostFeed organizer={organizer} posts={posts} initialIndex={selectedPost} onClose={() => setSelectedPost(null)} />}</Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, scroll: { paddingBottom: 26 }, hero: { overflow: 'hidden', backgroundColor: colors.surface },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  back: { margin: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: '#100b1599', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 12, paddingTop: 12 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1, minWidth: 0 },
  avatar: { position: 'absolute', left: 16, bottom: 12, width: 66, height: 66, borderRadius: 20, borderWidth: 2, borderColor: colors.accent },
  name: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '700' }, muted: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  bio: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 14, marginBottom: 13 },
  socialLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  socialLink: { color: colors.pink, fontSize: 13, fontWeight: '600', paddingVertical: 12, minHeight: 44 },
  socialHint: { color: colors.muted, fontSize: 10, marginTop: 2 },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 16 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  heading: { color: colors.text, fontSize: 15, fontWeight: '600' }, allButton: { minHeight: 44, justifyContent: 'center' }, allText: { color: colors.muted, fontSize: 12 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 13, backgroundColor: colors.surface, marginBottom: 5 },
  eventImage: { width: 64, height: 74, borderRadius: 10 }, cardTitle: { color: colors.text, fontWeight: '700', fontSize: 14, lineHeight: 20, marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 }, metaText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  openText: { color: colors.pink, fontSize: 12, fontWeight: '600', marginTop: 3 }, empty: { padding: 16, gap: 6, backgroundColor: colors.surface, borderRadius: 13 },
  eventList: { gap: 6, marginTop: 12 }, listHeading: { color: colors.text, fontSize: 13, fontWeight: '600', marginVertical: 9 },
  previewLabel: { color: colors.muted, fontSize: 10 }, grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 }, tile: { borderRadius: 5, overflow: 'hidden', backgroundColor: colors.surface },
  note: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 18 },
});
