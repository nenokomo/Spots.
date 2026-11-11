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
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useNow } from '../hooks/useNow';
import { useOrganizerPage } from '../hooks/useOrganizer';
import { useToday } from '../hooks/useToday';
import { eventDetailHref } from '../navigation/eventRoutes';
import type { PublicOrganizer, PublicOrganizerPost } from '../types/accounts';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';

type Tab = 'upcoming' | 'past' | 'posts';
const postDate = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'long' });

function initials(name: string) {
  return name.split(/\s+/).filter((part) => /^\p{L}/u.test(part)).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('de')).join('') || 'S';
}

function Avatar({ organizer, size }: { organizer: PublicOrganizer; size: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.3 }]}>
      {organizer.avatarUrl
        ? <Image source={{ uri: organizer.avatarUrl }} style={StyleSheet.absoluteFill} accessibilityLabel={`Logo von ${organizer.displayName}`} />
        : <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials(organizer.displayName)}</Text>}
    </View>
  );
}

function Post({ post, organizer }: { post: PublicOrganizerPost; organizer: PublicOrganizer }) {
  return (
    <View style={styles.post}>
      <GlassBackdrop radius={radius.lg} variant="card" />
      <View style={styles.postHeader}><Avatar organizer={organizer} size={32} /><Text style={styles.postAuthor}>{organizer.displayName}</Text><Text style={styles.postDate}>{postDate.format(new Date(post.createdAt))}</Text></View>
      <Text style={styles.postBody}>{post.body}</Text>
    </View>
  );
}

function EventList({ events, now, today }: { events: SpotEvent[]; now: number; today: string }) {
  return <View style={styles.list}>{events.map((event) => (
    <View key={event.id} style={styles.card}><GlassBackdrop radius={radius.lg} variant="card" /><EventRow event={event} href={eventDetailHref(event.id)} now={now} today={today} large trailing={eventPhase(event, now) === 'ended' ? undefined : <SaveEventButton id={event.id} title={event.title} size={38} />} /></View>
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
  const [tab, setTab] = useState<Tab>('upcoming');
  const [bioOpen, setBioOpen] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  const data = state.status === 'ready' ? state.data : null;
  const groups = useMemo(() => {
    const events = data?.events ?? [];
    const upcoming = events.filter((event) => eventPhase(event, now) !== 'ended').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const past = events.filter((event) => eventPhase(event, now) === 'ended').sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    const highlight = upcoming.find((event) => event.id === highlightId) ?? null;
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
  const bannerHeight = Math.min(220, Math.max(150, width * 0.42));
  const counts: Record<Tab, number> = { upcoming: groups.others.length, past: groups.past.length, posts: data.posts.length };
  const tabs: { id: Tab; label: string }[] = [{ id: 'upcoming', label: groups.highlight ? 'Weitere' : 'Kommend' }, { id: 'past', label: 'Vergangen' }, { id: 'posts', label: 'Beiträge' }];

  return (
    <View style={styles.screen}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxxl }} showsVerticalScrollIndicator={false}>
        {/* Banner with the logo overlapping its lower edge, name and city beside it. */}
        <View style={[styles.banner, { height: bannerHeight }]}>
          {organizer.avatarUrl
            ? <Image source={{ uri: organizer.avatarUrl }} blurRadius={40} resizeMode="cover" style={StyleSheet.absoluteFill} />
            : <LinearGradient colors={['#c922ab', '#6d1560', '#2a1230']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
          <LinearGradient pointerEvents="none" colors={['#100b1566', '#100b1500', '#100b1599']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.bannerTop}><IconButton icon="back" accessibilityLabel="Zurück" onPress={back} /></View>
        </View>
        <View style={styles.identity}>
          <Avatar organizer={organizer} size={88} />
          <View style={styles.identityCopy}>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>{organizer.displayName}</Text>
            <Text numberOfLines={1} style={styles.meta}>{[organizer.city, `${groups.upcoming.length} ${groups.upcoming.length === 1 ? 'kommendes Event' : 'kommende Events'}`].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        {(organizer.biography || website) && <View style={styles.about}>
          {organizer.biography && <Pressable accessibilityRole="button" accessibilityLabel={bioOpen ? 'Beschreibung einklappen' : 'Ganze Beschreibung anzeigen'} onPress={() => setBioOpen((value) => !value)}><Text numberOfLines={bioOpen ? undefined : 2} style={styles.bio}>{organizer.biography}</Text></Pressable>}
          {website && <Pressable accessibilityRole="link" accessibilityLabel="Website des Veranstalters öffnen" onPress={() => void Linking.openURL(website).catch(() => {})} style={styles.website}><Icon name="share" size={14} color={colors.pink} /><Text style={styles.websiteText}>{website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text></Pressable>}
        </View>}

        {groups.stories.length > 0 && <View style={styles.rail}><StoryRail events={groups.stories} today={today} seen={seen} onOpen={setStory} /></View>}

        {groups.highlight && <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>DEIN EVENT</Text>
          <EventHero event={groups.highlight} href={eventDetailHref(groups.highlight.id)} today={today} now={now} width={width - gutter * 2} />
          <Button label="Event ansehen" trailingIcon="chevron" onPress={() => router.push(eventDetailHref(groups.highlight!.id))} />
        </View>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((item) => <Chip key={item.id} label={counts[item.id] > 0 ? `${item.label} · ${counts[item.id]}` : item.label} selected={tab === item.id} onPress={() => setTab(item.id)} />)}
        </ScrollView>
        <View style={styles.inset}>
          {tab === 'upcoming' && (groups.others.length > 0 ? <EventList events={groups.others} now={now} today={today} /> : <Text style={styles.emptyLine}>Gerade keine weiteren Termine angekündigt.</Text>)}
          {tab === 'past' && (groups.past.length > 0 ? <EventList events={groups.past} now={now} today={today} /> : <Text style={styles.emptyLine}>Noch keine vergangenen Events.</Text>)}
          {tab === 'posts' && (data.posts.length > 0 ? <View style={styles.list}>{data.posts.map((post) => <Post key={post.id} post={post} organizer={organizer} />)}</View> : <Text style={styles.emptyLine}>Noch keine Beiträge veröffentlicht.</Text>)}
        </View>
      </ScrollView>

      <Modal visible={story !== null} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setStory(null)}>
        {story !== null && <EventStoryViewer events={groups.stories} initialId={story} today={today} onClose={() => setStory(null)} onSeen={(seenId) => setSeen((previous) => previous.includes(seenId) ? previous : [...previous, seenId])} onOpenEvent={(event) => { setStory(null); router.push(eventDetailHref(event.id)); }} />}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stateBack: { backgroundColor: colors.surface, marginLeft: space.lg, marginBottom: space.lg },
  banner: { marginHorizontal: gutter, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  bannerTop: { padding: space.md },
  identity: { flexDirection: 'row', alignItems: 'flex-end', gap: space.lg, paddingHorizontal: gutter + space.xs, marginTop: -36 },
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh, borderWidth: 3, borderColor: '#1d1123', ...squircle },
  initials: { fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  identityCopy: { flex: 1, minWidth: 0, paddingBottom: space.xs, gap: 2 },
  name: { ...type.title2, color: colors.text },
  meta: { ...type.footnote, color: colors.muted },
  about: { paddingHorizontal: gutter, marginTop: space.lg, gap: space.sm },
  bio: { ...type.callout, color: colors.muted },
  website: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 32, alignSelf: 'flex-start' },
  websiteText: { ...type.label, fontSize: 14, color: colors.pink },
  rail: { paddingTop: space.xl },
  highlight: { paddingHorizontal: gutter, marginTop: space.xxl, gap: space.md },
  highlightLabel: { ...type.overline, fontSize: 11, color: colors.pink },
  tabs: { gap: space.sm, paddingHorizontal: gutter, paddingTop: space.xxl, paddingBottom: space.lg },
  inset: { paddingHorizontal: gutter },
  list: { gap: space.md },
  card: { borderRadius: radius.lg, overflow: 'hidden', ...squircle },
  emptyLine: { ...type.callout, color: colors.faint },
  post: { padding: space.lg, borderRadius: radius.lg, overflow: 'hidden', gap: space.md, ...squircle },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  postAuthor: { ...type.label, fontSize: 14, color: colors.text, flex: 1 },
  postDate: { ...type.footnote, color: colors.faint },
  postBody: { ...type.body, color: colors.text },
});
