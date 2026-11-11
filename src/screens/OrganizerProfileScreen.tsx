import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventHero, StoryRail } from '../components/EventCards';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState, SectionHeader } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useNow } from '../hooks/useNow';
import { useOrganizerPage } from '../hooks/useOrganizer';
import { useToday } from '../hooks/useToday';
import { eventDetailHref } from '../navigation/eventRoutes';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';

const PAST_PREVIEW = 4;
const postDate = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long', year: 'numeric' });

function initials(name: string) {
  return name.split(/\s+/).filter((part) => /^\p{L}/u.test(part)).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('de')).join('') || 'S';
}

function Avatar({ organizer, size }: { organizer: PublicOrganizer; size: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {organizer.avatarUrl
        ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={`Logo von ${organizer.displayName}`} />
        : <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(organizer.displayName)}</Text>}
    </View>
  );
}

function Post({ post, organizer }: { post: PublicOrganizerPost; organizer: PublicOrganizer }) {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Avatar organizer={organizer} size={36} />
        <View style={styles.flex}><Text style={styles.postAuthor}>{organizer.displayName}</Text><Text style={styles.postDate}>{postDate.format(new Date(post.createdAt))}</Text></View>
      </View>
      <Text style={styles.postBody}>{post.body}</Text>
    </View>
  );
}

function EventList({ events, now, today, save }: { events: SpotEvent[]; now: number; today: string; save: boolean }) {
  return <View>{events.map((event, index) => (
    <View key={event.id}>
      {index > 0 && <View style={styles.separator} />}
      <EventRow event={event} href={eventDetailHref(event.id)} now={now} today={today} trailing={save ? <SaveEventButton id={event.id} title={event.title} size={36} /> : undefined} />
    </View>
  ))}</View>;
}

export default function OrganizerProfileScreen() {
  const { id, event: highlightId } = useLocalSearchParams<{ id: string; event?: string }>();
  const { state, reload } = useOrganizerPage(id);
  const now = useNow();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [story, setStory] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
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
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <Backdrop />
        <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} plain style={styles.stateBack} />
        {state.status === 'loading' || state.status === 'error'
          ? <EventDataState loading={state.status === 'loading'} error={state.status === 'error' ? state.message : null} onRetry={reload} />
          : <EmptyState icon="profile" title={unavailable ? 'Veranstalterseiten kommen bald' : 'Veranstalter nicht gefunden'}
              text={unavailable ? 'Clubs und Veranstalter können ihre Seiten hier bald selbst gestalten.' : 'Dieses Profil ist nicht (mehr) öffentlich.'}
              action={highlightId ? 'Zum Event' : 'Zurück'} onAction={() => highlightId ? router.replace(eventDetailHref(highlightId)) : back()} />}
      </View>
    );
  }

  const organizer = data.organizer;
  const website = organizer.websiteUrl;
  const pastVisible = showAllPast ? groups.past : groups.past.slice(0, PAST_PREVIEW);
  const meta = [organizer.city, groups.upcoming.length > 0 ? `${groups.upcoming.length} ${groups.upcoming.length === 1 ? 'kommendes Event' : 'kommende Events'}` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.screen}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={[styles.cover, { height: 170, marginTop: insets.top + 8 }]}>
          {organizer.avatarUrl
            ? <Image source={{ uri: organizer.avatarUrl }} blurRadius={40} resizeMode="cover" style={StyleSheet.absoluteFill} />
            : <LinearGradient colors={['#c922ab', '#6d1560', '#2a1230']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />}
          <LinearGradient pointerEvents="none" colors={['#100b1566', '#100b1500', '#100b1580']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.identity}>
          <Avatar organizer={organizer} size={104} />
          <Text style={styles.kicker}>Veranstalter</Text>
          <Text accessibilityRole="header" style={styles.name}>{organizer.displayName}</Text>
          {meta.length > 0 && <Text style={styles.meta}>{meta}</Text>}
          {organizer.biography && (
            <Pressable accessibilityRole="button" accessibilityLabel={bioOpen ? 'Beschreibung einklappen' : 'Ganze Beschreibung anzeigen'} onPress={() => setBioOpen((value) => !value)}>
              <Text numberOfLines={bioOpen ? undefined : 3} style={styles.bio}>{organizer.biography}</Text>
            </Pressable>
          )}
          {website && <Button label={website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')} icon="share" variant="secondary" size="sm" onPress={() => void Linking.openURL(website).catch(() => {})} accessibilityLabel="Website des Veranstalters öffnen" style={styles.website} />}
        </View>

        {groups.stories.length > 0 && <View style={styles.rail}><StoryRail events={groups.stories} today={today} seen={seen} onOpen={setStory} /></View>}

        {groups.highlight && <>
          <SectionHeader title="Dein Event" note="Von dir ausgewählt" />
          <View style={styles.inset}><EventHero event={groups.highlight} href={eventDetailHref(groups.highlight.id)} today={today} now={now} width={Math.min(width - gutter * 2, 460)} /></View>
          <View style={[styles.inset, styles.actions]}>
            <Button label="Event ansehen" onPress={() => router.push(eventDetailHref(groups.highlight!.id))} style={styles.flex} />
            {groups.highlight.ticketUrl && eventPhase(groups.highlight, now) !== 'ended' && <Button label="Tickets" icon="ticket" variant="secondary" onPress={() => router.push(eventDetailHref(groups.highlight!.id))} accessibilityLabel="Tickets ansehen" />}
          </View>
        </>}

        <SectionHeader title={groups.highlight ? 'Weitere Events' : 'Kommende Events'} />
        <View style={styles.inset}>{groups.others.length > 0 ? <EventList events={groups.others} now={now} today={today} save /> : <Text style={styles.emptyLine}>Gerade keine weiteren Termine angekündigt.</Text>}</View>

        <SectionHeader title="Beiträge" />
        <View style={[styles.inset, styles.posts]}>{data.posts.length > 0 ? data.posts.map((post) => <Post key={post.id} post={post} organizer={organizer} />) : <Text style={styles.emptyLine}>Noch keine Beiträge veröffentlicht.</Text>}</View>

        {groups.past.length > 0 && <>
          <SectionHeader title="Vergangen" action={groups.past.length > PAST_PREVIEW ? (showAllPast ? 'Weniger' : 'Alle anzeigen') : undefined} onAction={() => setShowAllPast((value) => !value)} />
          <View style={styles.inset}><EventList events={pastVisible} now={now} today={today} save={false} /></View>
        </>}
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.toolbar, { paddingTop: insets.top + 18 }]}>
        <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
      </View>

      <Modal visible={story !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setStory(null)}>
        {story !== null && <EventStoryViewer events={groups.stories} initialId={story} today={today} onClose={() => setStory(null)} onSeen={(seenId) => setSeen((previous) => previous.includes(seenId) ? previous : [...previous, seenId])} onOpenEvent={(event) => { setStory(null); router.push(eventDetailHref(event.id)); }} />}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  stateBack: { backgroundColor: colors.surface, marginLeft: space.lg, marginBottom: space.lg },
  cover: { overflow: 'hidden', marginHorizontal: space.md, borderRadius: radius.xl, ...squircle },
  toolbar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: space.xl + 2 },
  identity: { alignItems: 'center', marginTop: -56, paddingHorizontal: gutter },
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh, borderWidth: 3, borderColor: '#1d1123' },
  initials: { fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  kicker: { ...type.overline, color: colors.pink, marginTop: space.lg },
  name: { ...type.largeTitle, color: colors.text, textAlign: 'center' },
  meta: { ...type.callout, color: colors.muted, textAlign: 'center', marginTop: 2 },
  bio: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: space.md },
  website: { marginTop: space.lg },
  rail: { paddingTop: space.xxl },
  inset: { paddingHorizontal: gutter },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 68 + space.md },
  emptyLine: { ...type.callout, color: colors.faint },
  posts: { gap: space.md },
  post: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.md, ...squircle },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  postAuthor: { ...type.label, color: colors.text },
  postDate: { ...type.footnote, color: colors.faint },
  postBody: { ...type.body, color: colors.text },
});
