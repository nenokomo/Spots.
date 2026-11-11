import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventHero, StoryRail } from '../components/EventCards';
import { EventDataState } from '../components/EventDataState';
import { EventRow } from '../components/EventRow';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { GalleryPost, OrganizerAvatar } from '../components/GalleryPost';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon } from '../components/Icon';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useNow } from '../hooks/useNow';
import { useOrganizerPage } from '../hooks/useOrganizer';
import { useToday } from '../hooks/useToday';
import { eventDetailHref } from '../navigation/eventRoutes';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';

type Tab = 'feed' | 'events';

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function EventList({ events, now, today, title }: { events: SpotEvent[]; now: number; today: string; title: string }) {
  if (events.length === 0) return null;
  return <View style={styles.block}>
    <Text style={styles.blockTitle}>{title}</Text>
    <View style={styles.list}>{events.map((event) => (
      <View key={event.id} style={styles.card}><GlassBackdrop radius={radius.lg} variant="card" /><EventRow event={event} href={eventDetailHref(event.id)} now={now} today={today} large trailing={eventPhase(event, now) === 'ended' ? undefined : <SaveEventButton id={event.id} title={event.title} size={38} />} /></View>
    ))}</View>
  </View>;
}

/** Organizer profile as a feed: identity, stats, stories, then posts or events. */
export default function OrganizerProfileScreen() {
  const { id, event: highlightId } = useLocalSearchParams<{ id: string; event?: string }>();
  const { state, reload } = useOrganizerPage(id);
  const now = useNow();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [story, setStory] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('feed');
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
  const postWidth = width - gutter * 2;

  return (
    <View style={styles.screen}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + space.xxxl }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={styles.topBar}>
          <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
          <Text numberOfLines={1} style={styles.topTitle}>{organizer.slug}</Text>
          <View style={styles.topSpacer} />
        </View>

        {/* Identity row like a profile header: avatar left, three stats right. */}
        <View style={styles.identity}>
          <OrganizerAvatar organizer={organizer} size={84} />
          <View style={styles.stats}>
            <Stat value={data.posts.length} label="Beiträge" />
            <Stat value={groups.upcoming.length} label="Kommend" />
            <Stat value={groups.past.length} label="Vergangen" />
          </View>
        </View>
        <View style={styles.about}>
          <Text accessibilityRole="header" style={styles.name}>{organizer.displayName}</Text>
          {organizer.city && <Text style={styles.city}>Veranstalter · {organizer.city}</Text>}
          {organizer.biography && <Pressable accessibilityRole="button" accessibilityLabel={bioOpen ? 'Beschreibung einklappen' : 'Ganze Beschreibung anzeigen'} onPress={() => setBioOpen((value) => !value)}><Text numberOfLines={bioOpen ? undefined : 2} style={styles.bio}>{organizer.biography}</Text></Pressable>}
          {website && <Pressable accessibilityRole="link" accessibilityLabel="Website des Veranstalters öffnen" onPress={() => void Linking.openURL(website).catch(() => {})} style={styles.website}><Icon name="share" size={13} color={colors.pink} /><Text style={styles.websiteText}>{website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text></Pressable>}
        </View>

        {groups.highlight && <View style={styles.highlight}>
          <Text style={styles.highlightLabel}>DEIN EVENT</Text>
          <EventHero event={groups.highlight} href={eventDetailHref(groups.highlight.id)} today={today} now={now} width={postWidth} />
          <Button label="Event ansehen" trailingIcon="chevron" onPress={() => router.push(eventDetailHref(groups.highlight!.id))} />
        </View>}

        {groups.stories.length > 0 && <View style={styles.rail}><StoryRail events={groups.stories} today={today} seen={seen} onOpen={setStory} /></View>}

        {/* Segmented switch: the feed is the default, events one tap away. */}
        <View style={styles.segments}>
          {([['feed', 'grid', 'Beiträge'], ['events', 'calendar', 'Events']] as const).map(([key, icon, label]) => (
            <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} accessibilityLabel={label} onPress={() => setTab(key)} style={[styles.segment, tab === key && styles.segmentActive]}>
              <Icon name={icon} size={18} color={tab === key ? colors.text : colors.faint} />
              <Text style={[styles.segmentLabel, tab === key && styles.segmentLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'feed' && <View style={styles.feed}>
          {data.posts.length > 0
            ? data.posts.map((post) => <GalleryPost key={post.id} post={post} organizer={organizer} width={postWidth} />)
            : <Text style={styles.emptyLine}>Noch keine Beiträge veröffentlicht.</Text>}
        </View>}
        {tab === 'events' && <View style={styles.feed}>
          <EventList title={groups.highlight ? 'Weitere Events' : 'Kommende Events'} events={groups.others} now={now} today={today} />
          <EventList title="Vergangene Events" events={groups.past} now={now} today={today} />
          {groups.others.length === 0 && groups.past.length === 0 && <Text style={styles.emptyLine}>Gerade keine Termine angekündigt.</Text>}
        </View>}
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
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: '#120d1cf2' },
  topTitle: { ...type.headline, color: colors.text, flex: 1, textAlign: 'center' },
  topSpacer: { width: 44 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: gutter, paddingTop: space.md },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 1 },
  statValue: { ...type.title3, color: colors.text },
  statLabel: { ...type.footnote, fontSize: 12, color: colors.muted },
  about: { paddingHorizontal: gutter, paddingTop: space.md, gap: 3 },
  name: { ...type.headline, color: colors.text },
  city: { ...type.footnote, color: colors.faint },
  bio: { ...type.callout, color: colors.text, marginTop: 3 },
  website: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 28, alignSelf: 'flex-start' },
  websiteText: { ...type.label, fontSize: 14, color: colors.pink },
  highlight: { paddingHorizontal: gutter, marginTop: space.xl, gap: space.md },
  highlightLabel: { ...type.overline, fontSize: 11, color: colors.pink },
  rail: { paddingTop: space.xl },
  segments: { flexDirection: 'row', marginTop: space.xl, marginHorizontal: gutter, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingVertical: space.md, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -StyleSheet.hairlineWidth },
  segmentActive: { borderBottomColor: colors.text },
  segmentLabel: { ...type.label, fontSize: 14, color: colors.faint },
  segmentLabelActive: { color: colors.text },
  feed: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.lg },
  block: { gap: space.md },
  blockTitle: { ...type.headline, color: colors.text },
  list: { gap: space.md },
  card: { borderRadius: radius.lg, overflow: 'hidden', ...squircle },
  emptyLine: { ...type.callout, color: colors.faint, textAlign: 'center', paddingVertical: space.xl },
});
