import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Screen } from '../components/Screen';
import { Button } from '../components/ui/Button';
import { EmptyState, SectionHeader } from '../components/ui/Section';
import { StatusBadge } from '../components/ui/StatusBadge';
import { colors, radius, space, type } from '../constants/theme';
import { useNow } from '../hooks/useNow';
import { useOrganizerPage } from '../hooks/useOrganizer';
import { useToday } from '../hooks/useToday';
import { eventDetailHref } from '../navigation/eventRoutes';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { eventDayLabel, eventTimeLabel } from '../utils/events';

const PAST_PREVIEW = 4;
const postDate = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'long', year: 'numeric' });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('de')).join('') || 'S';
}

function Hero({ organizer, upcomingCount, onBack }: { organizer: PublicOrganizer; upcomingCount: number; onBack: () => void }) {
  const avatar = organizer.avatarUrl ? { uri: organizer.avatarUrl } : null;
  return (
    <View>
      <View style={styles.cover}>
        {avatar ? <Image source={avatar} blurRadius={30} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <LinearGradient colors={['#3d1a32', '#1c1124']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
        <LinearGradient pointerEvents="none" colors={['#100b1599', '#100b1533', colors.background]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={onBack} style={styles.back}><Icon name="back" color={colors.text} /></Pressable>
      </View>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          {avatar ? <Image source={avatar} style={StyleSheet.absoluteFill} accessibilityLabel={`Logo von ${organizer.displayName}`} /> : <Text style={styles.initials}>{initials(organizer.displayName)}</Text>}
        </View>
        <Text accessibilityRole="header" style={styles.name}>{organizer.displayName}</Text>
        <Text style={styles.meta}>{['Veranstalter', organizer.city, upcomingCount > 0 ? `${upcomingCount} ${upcomingCount === 1 ? 'kommendes Event' : 'kommende Events'}` : null].filter(Boolean).join(' · ')}</Text>
      </View>
    </View>
  );
}

function Highlight({ event, now, today }: { event: SpotEvent; now: number; today: string }) {
  const phase = eventPhase(event, now);
  const ended = phase === 'ended';
  const open = () => router.push(eventDetailHref(event.id));
  return (
    <View style={styles.highlight} accessibilityLabel={`Ausgewähltes Event: ${event.title}`}>
      <View style={styles.highlightImage}>
        <Image source={event.image} blurRadius={event.imageIsPlaceholder ? 0 : 22} resizeMode="cover" style={StyleSheet.absoluteFill} />
        {!event.imageIsPlaceholder && <Image source={event.image} resizeMode="contain" style={StyleSheet.absoluteFill} />}
        <LinearGradient pointerEvents="none" colors={['#100b1500', '#100b15e6']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.highlightBadge}><StatusBadge phase={phase} overlay /></View>
        <View style={styles.highlightSave}><SaveEventButton id={event.id} title={event.title} /></View>
      </View>
      <View style={styles.highlightBody}>
        <Text style={styles.highlightWhen}>{eventDayLabel(event.startsAt, today).toLocaleUpperCase('de')} · {eventTimeLabel(event.startsAt)} UHR</Text>
        <Text style={styles.highlightTitle}>{event.title}</Text>
        <View style={styles.row}><Icon name="pin" size={14} color={colors.muted} /><Text numberOfLines={1} style={styles.rowText}>{event.venue ? `${event.venue} · ${event.location}` : event.location}</Text></View>
        <View style={styles.actions}>
          <Button label="Event ansehen" onPress={open} trailingIcon="chevron" style={styles.flex} />
          {!ended && event.ticketUrl && <Button label="Tickets" icon="ticket" variant="secondary" onPress={open} accessibilityLabel="Tickets ansehen" />}
        </View>
      </View>
    </View>
  );
}

function Stories({ events, onOpen }: { events: SpotEvent[]; onOpen: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
      {events.map((event) => (
        <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`Story: ${event.title}`} onPress={() => onOpen(event.id)} style={styles.story}>
          <View style={styles.storyRing}><Image source={event.image} style={styles.storyImage} /></View>
          <Text numberOfLines={1} style={styles.storyLabel}>{eventDayLabel(event.startsAt)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Post({ post, organizer }: { post: PublicOrganizerPost; organizer: PublicOrganizer }) {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>{organizer.avatarUrl ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} /> : <Text style={styles.postInitials}>{initials(organizer.displayName)}</Text>}</View>
        <View style={styles.flex}><Text style={styles.postAuthor}>{organizer.displayName}</Text><Text style={styles.postDate}>{postDate.format(new Date(post.createdAt))}</Text></View>
      </View>
      <Text style={styles.postBody}>{post.body}</Text>
    </View>
  );
}

export default function OrganizerProfileScreen() {
  const { id, event: highlightId } = useLocalSearchParams<{ id: string; event?: string }>();
  const { state, reload } = useOrganizerPage(id);
  const now = useNow();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const [story, setStory] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  const data = state.status === 'ready' ? state.data : null;
  const groups = useMemo(() => {
    const events = data?.events ?? [];
    const upcoming = events.filter((event) => eventPhase(event, now) !== 'ended').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const past = events.filter((event) => eventPhase(event, now) === 'ended').sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    const highlight = upcoming.find((event) => event.id === highlightId) ?? past.find((event) => event.id === highlightId) ?? null;
    return { upcoming, past, highlight, others: upcoming.filter((event) => event.id !== highlight?.id), stories: upcoming.filter((event) => !event.imageIsPlaceholder) };
  }, [data, now, highlightId]);

  if (state.status !== 'ready' || !data?.organizer) {
    const unavailable = state.status === 'unavailable';
    const missing = state.status === 'ready';
    return (
      <Screen>
        <View style={styles.stateHeader}><Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={back} style={styles.backInline}><Icon name="back" color={colors.text} /></Pressable></View>
        {state.status === 'loading' || state.status === 'error'
          ? <EventDataState loading={state.status === 'loading'} error={state.status === 'error' ? state.message : null} onRetry={reload} />
          : <EmptyState icon="profile" title={unavailable ? 'Veranstalterprofile kommen bald' : 'Veranstalter nicht gefunden'}
              text={unavailable ? 'Clubs und Veranstalter können ihre Seiten hier bald selbst gestalten.' : missing ? 'Dieses Profil ist nicht (mehr) öffentlich.' : undefined}
              action={highlightId ? 'Zum Event' : 'Zurück'} onAction={() => highlightId ? router.replace(eventDetailHref(highlightId)) : back()} />}
      </Screen>
    );
  }

  const organizer = data.organizer;
  const pastVisible = showAllPast ? groups.past : groups.past.slice(0, PAST_PREVIEW);
  const website = organizer.websiteUrl;

  return (
    <Screen>
      <SafeAreaView edges={['bottom']} style={styles.flex}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
          <Hero organizer={organizer} upcomingCount={groups.upcoming.length} onBack={back} />
          <View style={styles.body}>
            {organizer.biography && (
              <Pressable accessibilityRole="button" accessibilityLabel={bioOpen ? 'Beschreibung einklappen' : 'Ganze Beschreibung anzeigen'} onPress={() => setBioOpen((value) => !value)}>
                <Text numberOfLines={bioOpen ? undefined : 3} style={styles.bio}>{organizer.biography}</Text>
              </Pressable>
            )}
            {website && <Button label={website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')} icon="share" variant="secondary" size="sm" onPress={() => void Linking.openURL(website).catch(() => {})} accessibilityLabel="Website des Veranstalters öffnen" style={styles.website} />}

            {groups.highlight && <><SectionHeader title="Dein ausgewähltes Event" /><Highlight event={groups.highlight} now={now} today={today} /></>}

            {groups.stories.length > 0 && <><SectionHeader title="Stories" note="Flyer der kommenden Events · antippen zum Ansehen" /><Stories events={groups.stories} onOpen={setStory} /></>}

            <SectionHeader title={groups.highlight ? 'Weitere Events' : 'Kommende Events'} note={groups.others.length > 0 ? `${groups.others.length} ${groups.others.length === 1 ? 'Termin' : 'Termine'}` : undefined} />
            {groups.others.length > 0
              ? <View style={styles.list}>{groups.others.map((event) => <EventRow key={event.id} event={event} href={eventDetailHref(event.id)} now={now} today={today} trailing={<SaveEventButton id={event.id} title={event.title} />} />)}</View>
              : <Text style={styles.emptyLine}>Gerade keine weiteren Termine angekündigt.</Text>}

            <SectionHeader title="Beiträge" />
            {data.posts.length > 0
              ? <View style={styles.list}>{data.posts.map((post) => <Post key={post.id} post={post} organizer={organizer} />)}</View>
              : <Text style={styles.emptyLine}>Noch keine Beiträge veröffentlicht.</Text>}

            {groups.past.length > 0 && <>
              <SectionHeader title="Vergangene Events" note={`${groups.past.length} ${groups.past.length === 1 ? 'Termin' : 'Termine'}`} action={groups.past.length > PAST_PREVIEW ? (showAllPast ? 'Weniger' : 'Alle anzeigen') : undefined} onAction={() => setShowAllPast((value) => !value)} />
              <View style={styles.list}>{pastVisible.map((event) => <EventRow key={event.id} event={event} href={eventDetailHref(event.id)} now={now} today={today} compact />)}</View>
            </>}
            <Text style={styles.footer}>Spots · Veranstalterprofil</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={story !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setStory(null)}>
        {story !== null && <EventStoryViewer events={groups.stories} initialId={story} today={today} onClose={() => setStory(null)} onOpenEvent={(event) => { setStory(null); router.push(eventDetailHref(event.id)); }} />}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { height: 176, marginHorizontal: space.md, marginTop: space.sm, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface },
  back: { position: 'absolute', top: space.md, left: space.md, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#100b1599' },
  stateHeader: { paddingHorizontal: space.md, paddingTop: space.sm },
  backInline: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', marginTop: -48, paddingHorizontal: space.xl, gap: space.xs },
  avatar: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised, borderWidth: 3, borderColor: colors.background, marginBottom: space.xs },
  initials: { ...type.title, color: colors.pink },
  name: { ...type.title, color: colors.text, textAlign: 'center' },
  meta: { ...type.caption, color: colors.muted, textAlign: 'center' },
  body: { paddingHorizontal: space.lg },
  bio: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: space.lg },
  website: { alignSelf: 'center', marginTop: space.md },
  highlight: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.accentLine },
  highlightImage: { height: 230, backgroundColor: colors.surface },
  highlightBadge: { position: 'absolute', left: space.md, top: space.md },
  highlightSave: { position: 'absolute', right: space.sm, top: space.sm },
  highlightBody: { padding: space.lg, gap: space.xs },
  highlightWhen: { ...type.overline, color: colors.pink, letterSpacing: 1 },
  highlightTitle: { ...type.title, fontSize: 21, lineHeight: 26, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rowText: { ...type.caption, color: colors.muted, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  stories: { gap: space.md, paddingRight: space.lg },
  story: { width: 72, alignItems: 'center', gap: space.xs },
  storyRing: { width: 70, height: 70, borderRadius: 35, padding: 3, borderWidth: 2, borderColor: colors.accent },
  storyImage: { width: '100%', height: '100%', borderRadius: 32, backgroundColor: colors.surface },
  storyLabel: { ...type.caption, fontSize: 11, color: colors.muted },
  list: { gap: space.sm },
  emptyLine: { ...type.caption, color: colors.faint },
  post: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: '#ffffff0f', gap: space.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  postAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  postInitials: { ...type.label, color: colors.pink },
  postAuthor: { ...type.label, color: colors.text },
  postDate: { ...type.caption, fontSize: 11, color: colors.faint },
  postBody: { ...type.body, color: colors.text },
  footer: { ...type.caption, fontSize: 10, color: colors.faint, textAlign: 'center', marginTop: space.xxl },
});
