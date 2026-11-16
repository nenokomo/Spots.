import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventHero } from '../components/EventCards';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { GalleryPost, OrganizerAvatar } from '../components/GalleryPost';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { IconButton } from '../components/ui/Button';
import { EmptyState, SectionTitle } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useNow } from '../hooks/useNow';
import { useOrganizerPage } from '../hooks/useOrganizer';
import { useToday } from '../hooks/useToday';
import { eventDetailHref } from '../navigation/eventRoutes';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';

type Tab = 'events' | 'feed';

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function EventList({ events, now, today, title }: { events: SpotEvent[]; now: number; today: string; title: string }) {
  if (events.length === 0) return null;
  return <View style={styles.block}>
    <SectionTitle title={title} style={styles.blockTitle} />
    <View style={styles.list}>{events.map((event) => (
      <View key={event.id} style={styles.card}><GlassBackdrop radius={radius.lg} variant="card" /><EventRow event={event} href={eventDetailHref(event.id)} now={now} today={today} large trailing={eventPhase(event, now) === 'ended' ? undefined : <SaveEventButton id={event.id} title={event.title} size={38} />} /></View>
    ))}</View>
  </View>;
}

/**
 * Organizer page, same look as the event page: a cover from the next flyer that fades into the page,
 * a big centred profile picture (brand ring = the upcoming events as stories, tap to watch), name and city,
 * one stats bar, the bio, the next event as highlight, then a pill switch between Events and Beiträge.
 */
export default function OrganizerProfileScreen() {
  const { id, event: highlightId } = useLocalSearchParams<{ id: string; event?: string }>();
  const { state, reload } = useOrganizerPage(id);
  const now = useNow();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [story, setStory] = useState<string | null>(null);
  const [storiesWatched, setStoriesWatched] = useState(false);
  const [tab, setTab] = useState<Tab>('events');
  const [bioOpen, setBioOpen] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  const data = state.status === 'ready' ? state.data : null;
  const groups = useMemo(() => {
    const events = data?.events ?? [];
    const upcoming = events.filter((event) => eventPhase(event, now) !== 'ended').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const past = events.filter((event) => eventPhase(event, now) === 'ended').sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    // The event you came from, otherwise simply the next one.
    const highlight = upcoming.find((event) => event.id === highlightId) ?? upcoming[0] ?? null;
    return { upcoming, past, highlight, fromEvent: !!highlightId && highlight?.id === highlightId, others: upcoming.filter((event) => event.id !== highlight?.id), stories: upcoming.filter((event) => !event.imageIsPlaceholder) };
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
  const postWidth = width - gutter * 2;
  const cover = groups.highlight && !groups.highlight.imageIsPlaceholder ? groups.highlight.image : organizer.avatarUrl ? { uri: organizer.avatarUrl } : null;
  const hasStories = groups.stories.length > 0;
  const avatar = <View style={styles.avatarGap}><OrganizerAvatar organizer={organizer} size={AVATAR} /></View>;

  return (
    <View style={styles.screen}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxxl }} showsVerticalScrollIndicator={false}>
        {/* Cover: the next flyer, blurred, fading into the page. */}
        <View style={[styles.cover, { height: insets.top + 170 }]}>
          {cover && <Image source={cover} resizeMode="cover" blurRadius={30} style={StyleSheet.absoluteFill} />}
          <LinearGradient pointerEvents="none" colors={cover ? ['#0a090c66', '#2a122299', colors.background] : ['#2a1222', '#18111a', colors.background]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.toolbar, { paddingTop: insets.top + space.sm }]}>
            <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
          </View>
        </View>

        {/* Identity: big centred picture (story ring when there are upcoming events), name, city. */}
        <View style={styles.identity}>
          <Pressable disabled={!hasStories} accessibilityRole={hasStories ? 'button' : 'image'} accessibilityLabel={hasStories ? `Storys von ${organizer.displayName} ansehen` : `Profilbild von ${organizer.displayName}`}
            onPress={() => setStory(groups.stories[0].id)} style={({ pressed }) => pressed && styles.pressed}>
            {hasStories && !storiesWatched
              ? <LinearGradient colors={[colors.pink, colors.accent, '#7a2bd6', colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, styles.ringGlow]}>{avatar}</LinearGradient>
              : <View style={[styles.ring, styles.ringPlain]}>{avatar}</View>}
          </Pressable>
          <Text accessibilityRole="header" style={styles.name}>{organizer.displayName}</Text>
          {organizer.city && <View style={styles.cityRow}><Icon name="pin" size={13} color={colors.pink} /><Text style={styles.city}>Veranstalter · {organizer.city}</Text></View>}
        </View>

        {/* One stats bar. */}
        <View style={styles.statsBar}>
          <Stat value={groups.upcoming.length} label="Kommend" />
          <View style={styles.statDivider} />
          <Stat value={groups.past.length} label="Vergangen" />
          <View style={styles.statDivider} />
          <Stat value={data.posts.length} label="Beiträge" />
        </View>

        {(organizer.biography || website) && <View style={styles.about}>
          {organizer.biography && <Pressable accessibilityRole="button" accessibilityLabel={bioOpen ? 'Beschreibung einklappen' : 'Ganze Beschreibung anzeigen'} onPress={() => setBioOpen((value) => !value)}>
            <Text numberOfLines={bioOpen ? undefined : 3} style={styles.bio}>{organizer.biography}</Text>
            {!bioOpen && organizer.biography.length > 120 && <Text style={styles.more}>mehr</Text>}
          </Pressable>}
          {website && <Pressable accessibilityRole="link" accessibilityLabel="Website des Veranstalters öffnen" onPress={() => void Linking.openURL(website).catch(() => {})} style={styles.website}>
            <Icon name="share" size={14} color={colors.text} /><Text numberOfLines={1} style={styles.websiteText}>{website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text>
          </Pressable>}
        </View>}

        {/* The event you came from, otherwise the next one. */}
        {groups.highlight && <View style={styles.highlight}>
          <SectionTitle title={groups.fromEvent ? 'Dein Event' : 'Als Nächstes'} style={styles.blockTitle} />
          <EventHero event={groups.highlight} href={eventDetailHref(groups.highlight.id)} today={today} now={now} width={postWidth} />
        </View>}

        {/* Pill switch: Events first, posts one tap away. */}
        <View style={styles.segments}>
          {([['events', 'calendar', 'Events'], ['feed', 'grid', 'Beiträge']] as const).map(([key, icon, label]) => {
            const active = tab === key;
            return (
              <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={() => setTab(key)} style={styles.segment}>
                {active && <LinearGradient pointerEvents="none" colors={colors.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.segmentFill]} />}
                <Icon name={icon} size={17} color={active ? colors.text : colors.faint} />
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'events' && <View style={styles.feed}>
          <EventList title="Kommende Events" events={groups.others} now={now} today={today} />
          <EventList title="Vergangene Events" events={groups.past} now={now} today={today} />
          {groups.others.length === 0 && groups.past.length === 0 && <Text style={styles.emptyLine}>{groups.highlight ? 'Weitere Termine folgen.' : 'Gerade keine Termine angekündigt.'}</Text>}
        </View>}
        {tab === 'feed' && <View style={styles.feed}>
          {data.posts.length > 0
            ? data.posts.map((post) => <GalleryPost key={post.id} post={post} organizer={organizer} width={postWidth} />)
            : <Text style={styles.emptyLine}>Noch keine Beiträge veröffentlicht.</Text>}
        </View>}
      </ScrollView>

      <Modal visible={story !== null} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={() => { setStory(null); setStoriesWatched(true); }}>
        {story !== null && <EventStoryViewer events={groups.stories} initialId={story} today={today} onClose={() => { setStory(null); setStoriesWatched(true); }} onOpenEvent={(event) => { setStory(null); router.push(eventDetailHref(event.id)); }} />}
      </Modal>
    </View>
  );
}

const AVATAR = 104;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stateBack: { backgroundColor: colors.surface, marginLeft: space.lg, marginBottom: space.lg },
  cover: { overflow: 'hidden', backgroundColor: colors.surface },
  toolbar: { flexDirection: 'row', paddingHorizontal: space.lg },
  identity: { alignItems: 'center', marginTop: -(AVATAR / 2 + 20), paddingHorizontal: gutter, gap: space.xs },
  ring: { width: AVATAR + 14, height: AVATAR + 14, borderRadius: (AVATAR + 14) / 2, alignItems: 'center', justifyContent: 'center' },
  ringGlow: { boxShadow: '0 0 26px 4px #ff4ab880' },
  ringPlain: { borderWidth: 2, borderColor: '#ffffff26', backgroundColor: colors.background },
  avatarGap: { padding: 4, borderRadius: (AVATAR + 8) / 2, backgroundColor: colors.background },
  pressed: { opacity: 0.85 },
  name: { fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.5, color: colors.text, textAlign: 'center', marginTop: space.sm },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  city: { ...type.footnote, color: colors.muted },
  statsBar: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginHorizontal: gutter, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statValue: { fontSize: 22, lineHeight: 27, fontWeight: '800', color: colors.text },
  statLabel: { ...type.footnote, fontSize: 12, color: colors.faint },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.separator },
  about: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.md, alignItems: 'center' },
  bio: { ...type.callout, color: colors.muted, textAlign: 'center' },
  more: { ...type.footnote, color: colors.pink, textAlign: 'center', marginTop: 2 },
  website: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%', paddingHorizontal: space.lg, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ffffff26', backgroundColor: '#ffffff0a' },
  websiteText: { ...type.label, fontSize: 14, color: colors.text, flexShrink: 1 },
  highlight: { paddingHorizontal: gutter, marginTop: space.xxl, gap: space.md },
  segments: { flexDirection: 'row', gap: 4, marginTop: space.xxl, marginHorizontal: gutter, padding: 4, borderRadius: 999, backgroundColor: '#ffffff0d', borderWidth: 1, borderColor: '#ffffff12' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, height: 40, borderRadius: 999, overflow: 'hidden' },
  segmentFill: { borderRadius: 999 },
  segmentLabel: { ...type.label, fontSize: 14, color: colors.faint },
  segmentLabelActive: { color: colors.text },
  feed: { paddingHorizontal: gutter, paddingTop: space.xl, gap: space.xl },
  block: { gap: space.md },
  blockTitle: { ...type.title3, color: colors.text },
  list: { gap: space.md },
  card: { borderRadius: radius.lg, overflow: 'hidden', ...squircle },
  emptyLine: { ...type.callout, color: colors.faint, textAlign: 'center', paddingVertical: space.xl },
});
