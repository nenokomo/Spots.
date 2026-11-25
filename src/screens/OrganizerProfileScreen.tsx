import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventHero } from '../components/EventCards';
import { EventCalendar } from '../components/EventCalendar';
import { EventDataState } from '../components/EventDataState';
import { EventStoryViewer } from '../components/EventStoryViewer';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { OrganizerAvatar, postImages } from '../components/GalleryPost';
import { Icon } from '../components/Icon';
import { OrganizerEventRow, openTicket, ticketLink } from '../components/OrganizerEventRow';
import { OrganizerPostList } from '../components/OrganizerPosts';
import { SaveEventButton } from '../components/SaveEventButton';
import { Backdrop } from '../components/Screen';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState, SectionTitle } from '../components/ui/Section';
import { colors, gutter, radius, space, squircle, type } from '../constants/theme';
import { useNow } from '../hooks/useNow';
import { useOrganizerPage } from '../hooks/useOrganizer';
import { useToday } from '../hooks/useToday';
import { eventDetailHref } from '../navigation/eventRoutes';
import { eventPhase } from '../utils/eventStatus';
import { dayKey } from '../utils/events';

const AVATAR = 92;
const PAST_PREVIEW = 3;
/** Dates shown in „Programm“ before the calendar takes over. */
const PROGRAM_PREVIEW = 4;
const calendarDay = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

/** Splits the biography into a motto (first sentence, if short) and the rest. */
function splitBio(text: string) {
  const match = text.trim().match(/^(.{6,110}?[.!?])(\s+[\s\S]+)?$/);
  return match ? { motto: match[1], rest: match[2]?.trim() ?? '' } : { motto: text.trim(), rest: '' };
}

/**
 * Organizer page in the language of the event page, built around one question: what does this
 * organizer have coming up? From top to bottom:
 * – Cover from the next flyer fading into the page; the profile picture (story ring = the upcoming
 *   events as stories) and the name sit left-aligned on its lower edge.
 * – „Über uns“: the biography as a highlighted card, its first sentence as the motto, plus the website.
 * – „Jetzt live“ / „Als Nächstes“: always the next upcoming event, as a large card.
 * – „Programm“: the next dates as date-tile rows, the calendar for everything further ahead.
 * – „Beiträge“: the posts directly on the page like the Instagram feed (pictures edge to edge).
 * – „Vergangene Events“: the last three, more on request.
 * No tabs and no counters – everything is one scroll.
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
  const [bioOpen, setBioOpen] = useState(false);
  const [allPast, setAllPast] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  // Compact bar fades in once the name has scrolled under the top.
  const [scrollY] = useState(() => new Animated.Value(0));
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  const data = state.status === 'ready' ? state.data : null;
  const groups = useMemo(() => {
    const events = data?.events ?? [];
    const upcoming = events.filter((event) => eventPhase(event, now) !== 'ended').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const past = events.filter((event) => eventPhase(event, now) === 'ended').sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
    // Always the next upcoming (or running) event.
    const highlight = upcoming[0] ?? null;
    const phase = highlight ? eventPhase(highlight, now) : null;
    return {
      upcoming, past, highlight,
      highlightTitle: phase === 'live' || phase === 'started' ? 'Jetzt live' : 'Als Nächstes',
      others: upcoming.filter((event) => event.id !== highlight?.id),
      stories: upcoming.filter((event) => !event.imageIsPlaceholder),
      // What the organizer plays: the most frequent genres/categories of all its events.
      sounds: [...events.flatMap((event) => [...new Set([...(event.genres ?? []), ...event.categories])])
        .reduce((counts, tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1), new Map<string, number>())]
        .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag),
    };
  }, [data, now]);
  const calendarDays = useMemo(() => groups.upcoming.map((event) => dayKey(new Date(event.startsAt))), [groups.upcoming]);
  const posts = useMemo(() => (data?.posts ?? []).map((post) => ({ post, images: postImages(post) })), [data]);

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
  const website = organizer.websiteUrl?.startsWith('https://') ? organizer.websiteUrl : null;
  const cardWidth = width - gutter * 2;
  // Cover: the organizer's own cover picture (SQL 37, set in Spots Studio), otherwise the next real flyer, any real flyer,
  // the logo, and as last resort the event's symbol picture – the top never stays empty.
  const realFlyer = [...groups.upcoming, ...groups.past].find((event) => !event.imageIsPlaceholder);
  const ownCover = organizer.coverUrl ? { uri: organizer.coverUrl } : null;
  const cover = ownCover ?? realFlyer?.image ?? (organizer.avatarUrl ? { uri: organizer.avatarUrl } : null) ?? groups.highlight?.image ?? groups.past[0]?.image ?? null;
  const highlightTicket = groups.highlight ? ticketLink(groups.highlight) : null;
  const hasStories = groups.stories.length > 0;
  const shownPast = allPast ? groups.past : groups.past.slice(0, PAST_PREVIEW);
  const noEvents = !groups.highlight && groups.past.length === 0;
  const closeStory = () => { setStory(null); setStoriesWatched(true); };
  // Motto: the organizer's own (SQL 37), otherwise the first sentence of the biography.
  const bio = organizer.motto ? { motto: organizer.motto, rest: organizer.biography?.trim() ?? '' } : organizer.biography ? splitBio(organizer.biography) : null;
  const programme = groups.others.slice(0, PROGRAM_PREVIEW);
  const dayEvents = calendarDate ? groups.upcoming.filter((event) => dayKey(new Date(event.startsAt)) === calendarDate) : [];
  const openCalendar = () => { setCalendarDate(calendarDays[0] ?? null); setCalendarOpen(true); };
  const barOpacity = scrollY.interpolate({ inputRange: [150, 210], outputRange: [0, 1], extrapolate: 'clamp' });
  const avatar = <View style={styles.avatarGap}><OrganizerAvatar organizer={organizer} size={AVATAR} /></View>;

  async function share() {
    try { await Share.share({ title: `${organizer.displayName} · Spots`, message: `${organizer.displayName} auf Spots${website ? `\n${website}` : ''}` }); } catch { /* dismissed */ }
  }

  return (
    <View style={styles.screen}>
      <Backdrop />
      <Animated.ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + (highlightTicket ? 110 : space.xxxl) }} showsVerticalScrollIndicator={false}
        scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}>
        {/* Cover: the next flyer, blurred, fading into the page. */}
        <View style={[styles.cover, { height: insets.top + 230 }]}>
          {cover && <Image source={cover} resizeMode="cover" blurRadius={ownCover ? 0 : realFlyer ? 24 : 12} style={StyleSheet.absoluteFill} />}
          <LinearGradient pointerEvents="none" colors={cover ? ['#0a090cb3', '#0a090c33', '#0a090ccc', colors.background] : ['#3a1530', '#1d1020', colors.background]} locations={cover ? [0, 0.3, 0.75, 1] : [0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        </View>

        {/* Identity on the cover's lower edge, left-aligned like the event title. */}
        <View style={[styles.head, { marginTop: -(AVATAR / 2 + 34) }]}>
          <Pressable disabled={!hasStories} accessibilityRole={hasStories ? 'button' : 'image'} accessibilityLabel={hasStories ? `Storys von ${organizer.displayName} ansehen` : `Profilbild von ${organizer.displayName}`}
            onPress={() => setStory(groups.stories[0].id)} hitSlop={6} style={({ pressed }) => [styles.ringWrap, pressed && styles.pressed]}>
            {hasStories && !storiesWatched
              ? <LinearGradient colors={[colors.pink, colors.accent, '#7a2bd6', colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, styles.ringGlow]}>{avatar}</LinearGradient>
              : <View style={[styles.ring, hasStories ? styles.ringSeen : styles.ringPlain]}>{avatar}</View>}
          </Pressable>
          <Text accessibilityRole="header" style={styles.name}>{organizer.displayName}</Text>
          <View style={styles.kindRow}>
            <Text style={styles.kind}>Veranstalter</Text>
            {organizer.city && <><View style={styles.kindDot} /><Icon name="pin" size={13} color={colors.pink} /><Text style={styles.kind}>{organizer.city}</Text></>}
          </View>
          {groups.sounds.length > 0 && <View style={styles.sounds}>{groups.sounds.map((tag) => <Text key={tag} style={styles.sound}>{tag}</Text>)}</View>}
        </View>

        <View style={styles.body}>
          {/* About: the organizer's own words, first sentence as motto. */}
          {(bio || website) && <View style={styles.about}>
            <LinearGradient pointerEvents="none" colors={['#c922ab2e', '#5d2a921f', '#ffffff05']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.aboutLabel}>Über uns</Text>
            {bio && <>
              <View style={styles.mottoRow}>
                <Text style={styles.quote}>“</Text>
                <Text style={styles.motto}>{bio.motto}</Text>
              </View>
              {bio.rest.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel={bioOpen ? 'Beschreibung einklappen' : 'Ganze Beschreibung anzeigen'} onPress={() => setBioOpen((value) => !value)}>
                <Text numberOfLines={bioOpen ? undefined : 4} style={styles.bio}>{bio.rest}</Text>
                {!bioOpen && bio.rest.length > 180 && <Text style={styles.more}>Mehr lesen</Text>}
              </Pressable>}
            </>}
            {website && <Pressable accessibilityRole="link" accessibilityLabel="Website des Veranstalters öffnen" onPress={() => void Linking.openURL(website).catch(() => {})} style={({ pressed }) => [styles.website, pressed && styles.pressed]}>
              <Icon name="share" size={14} color={colors.pink} />
              <Text numberOfLines={1} style={styles.websiteText}>{website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}</Text>
            </Pressable>}
          </View>}

          {/* Always the next upcoming event. */}
          {groups.highlight && <View style={styles.block}>
            <SectionTitle title={groups.highlightTitle} style={styles.blockTitle} />
            <EventHero event={groups.highlight} href={eventDetailHref(groups.highlight.id)} today={today} now={now} width={cardWidth} />
          </View>}

          {groups.upcoming.length > 0 && <View style={styles.block}>
            <View style={styles.programHead}>
              <View style={styles.programCopy}>
                <SectionTitle title="Programm" style={styles.blockTitle} />
                <Text style={styles.programNote}>Die nächsten Termine</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Kalender mit allen kommenden Terminen öffnen" onPress={openCalendar} style={({ pressed }) => [styles.calendarButton, pressed && styles.pressed]}>
                <Icon name="calendar" size={16} color={colors.text} />
                <Text style={styles.calendarText}>Kalender</Text>
              </Pressable>
            </View>
            {programme.length > 0
              ? <View style={styles.list}>{programme.map((event) => <OrganizerEventRow key={event.id} event={event} now={now} />)}</View>
              : <Text style={styles.programEmpty}>Weitere Termine folgen. Im Kalender siehst du alles, was schon feststeht.</Text>}
            {groups.others.length > PROGRAM_PREVIEW && <Pressable accessibilityRole="button" onPress={openCalendar} style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}>
              <Icon name="calendar" size={14} color={colors.muted} />
              <Text style={styles.showAllText}>Weitere Termine im Kalender</Text>
            </Pressable>}
          </View>}

          {noEvents && <View style={styles.empty}>
            <View style={styles.emptyIcon}><Icon name="calendar" size={22} color={colors.pink} /></View>
            <Text style={styles.emptyText}>Gerade keine Termine angekündigt. Schau bald wieder vorbei.</Text>
          </View>}
        </View>

        {/* Posts directly on the page, like the Instagram feed. */}
        {posts.length > 0 && <View style={styles.block}>
          <SectionTitle title="Beiträge" style={[styles.blockTitle, styles.inset]} />
          <OrganizerPostList items={posts} organizer={organizer} />
        </View>}

        {groups.past.length > 0 && <View style={[styles.body, styles.block]}>
          <SectionTitle title="Vergangene Events" style={styles.blockTitle} />
          <View style={styles.list}>{shownPast.map((event) => <OrganizerEventRow key={event.id} event={event} now={now} />)}</View>
          {groups.past.length > PAST_PREVIEW && <Pressable accessibilityRole="button" onPress={() => setAllPast((value) => !value)} style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}>
            <Text style={styles.showAllText}>{allPast ? 'Weniger anzeigen' : 'Alle vergangenen Events'}</Text>
            <Icon name="down" size={14} color={colors.muted} />
          </Pressable>}
        </View>}
      </Animated.ScrollView>

      {/* Fixed top: back and share always reachable; behind them a glass bar with picture and name fades in. */}
      <View pointerEvents="box-none" style={styles.topBar}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: barOpacity }]}>
          <GlassBackdrop radius={0} variant="panel" />
          <View style={styles.topLine} />
        </Animated.View>
        <View pointerEvents="box-none" style={[styles.toolbar, { paddingTop: insets.top + space.sm, paddingBottom: space.sm }]}>
          <IconButton icon="back" accessibilityLabel="Zurück" onPress={back} />
          <Animated.View pointerEvents="none" style={[styles.topTitle, { opacity: barOpacity }]}>
            <OrganizerAvatar organizer={organizer} size={28} />
            <Text numberOfLines={1} style={styles.topName}>{organizer.displayName}</Text>
          </Animated.View>
          <IconButton icon="share" accessibilityLabel="Veranstalter teilen" onPress={() => void share()} />
        </View>
      </View>

      {/* Fixed bottom bar like on the event page: tickets for the next event and save – only when it has tickets. */}
      {groups.highlight && highlightTicket && <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassBackdrop radius={0} variant="panel" />
        <View style={styles.barRow}>
          <Button label={highlightTicket.label === 'Tickets' ? 'Tickets fürs nächste Event' : highlightTicket.label} icon="ticket" accessibilityLabel={`${highlightTicket.a11y}: ${groups.highlight.title}`}
            onPress={() => openTicket(groups.highlight!, highlightTicket.url)} style={styles.flex} />
          <SaveEventButton id={groups.highlight.id} title={groups.highlight.title} size={52} />
        </View>
      </View>}

      <Modal visible={story !== null} animationType="none" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={closeStory}>
        {story !== null && <EventStoryViewer events={groups.stories} initialId={story} today={today} onClose={closeStory} onOpenEvent={(event) => { setStory(null); router.push(eventDetailHref(event.id)); }} />}
      </Modal>
      <Modal visible={calendarOpen} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.calendarModal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kalender schließen" onPress={() => setCalendarOpen(false)} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.calendarSheet}>
            <GlassBackdrop radius={26} variant="panel" />
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.calendarContent}>
              <View style={styles.calendarHeading}>
                <Text accessibilityRole="header" style={styles.calendarTitle}>Programm von {organizer.displayName}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Kalender schließen" onPress={() => setCalendarOpen(false)} style={styles.calendarClose}><Icon name="close" /></Pressable>
              </View>
              <EventCalendar key={calendarOpen ? 'open' : 'closed'} today={today} selectedDate={calendarDate} eventDays={calendarDays} onSelect={setCalendarDate} />
              {calendarDate && <View style={styles.list}>
                <Text style={styles.calendarDay}>{calendarDay.format(new Date(`${calendarDate}T12:00:00Z`))}</Text>
                {dayEvents.length > 0
                  ? dayEvents.map((event) => <OrganizerEventRow key={event.id} event={event} now={now} onOpen={() => setCalendarOpen(false)} />)
                  : <Text style={styles.programEmpty}>An diesem Tag ist kein Event angekündigt.</Text>}
              </View>}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stateBack: { backgroundColor: colors.surface, marginLeft: space.lg, marginBottom: space.lg },
  cover: { overflow: 'hidden', backgroundColor: colors.surface },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  topTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  topName: { ...type.headline, color: colors.text, flexShrink: 1 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  head: { paddingHorizontal: gutter, gap: space.sm },
  ringWrap: { alignSelf: 'flex-start', marginBottom: space.xs },
  ring: { width: AVATAR + 14, height: AVATAR + 14, borderRadius: (AVATAR + 14) / 2, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px #00000080' },
  ringGlow: { boxShadow: '0 0 22px 4px #ff4ab88c' },
  ringSeen: { borderWidth: 3, borderColor: '#ffffff4d', backgroundColor: '#0a090c66' },
  ringPlain: { borderWidth: 2, borderColor: '#ffffff26', backgroundColor: '#0a090c66' },
  avatarGap: { padding: 4, borderRadius: (AVATAR + 8) / 2, backgroundColor: colors.background },
  pressed: { opacity: 0.85 },
  name: { fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -0.6, color: colors.text },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kind: { ...type.headline, fontSize: 15, color: colors.pink },
  sounds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.xs },
  sound: { color: colors.text, fontSize: 12, fontWeight: '600', backgroundColor: '#ffffff14', borderRadius: 13, overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 5 },
  kindDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.faint, marginHorizontal: 3 },
  about: { marginTop: space.xl, padding: space.lg, gap: space.md, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#ffffff08', borderWidth: 1, borderColor: colors.accentLine, ...squircle },
  aboutLabel: { ...type.overline, fontSize: 11, color: colors.pink },
  mottoRow: { flexDirection: 'row', gap: space.sm },
  quote: { fontSize: 44, lineHeight: 44, fontWeight: '800', color: colors.pink, marginTop: -4, textShadowColor: '#ff4ab8aa', textShadowRadius: 12 },
  motto: { flex: 1, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
  bio: { ...type.body, color: colors.muted },
  more: { ...type.label, fontSize: 14, color: colors.pink, marginTop: space.xxs },
  website: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: space.md, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine },
  websiteText: { ...type.label, fontSize: 14, color: colors.text, flexShrink: 1 },
  body: { paddingHorizontal: gutter },
  block: { marginTop: space.xxl, gap: space.md },
  blockTitle: { ...type.title3, color: colors.text },
  list: { gap: space.sm },
  inset: { paddingHorizontal: gutter },
  empty: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xxl, padding: space.lg, borderRadius: radius.lg, backgroundColor: '#ffffff0a', borderWidth: 1, borderColor: '#ffffff12', ...squircle },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  emptyText: { ...type.callout, color: colors.muted, flex: 1 },
  programHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  programCopy: { flex: 1, gap: 2 },
  programNote: { ...type.footnote, color: colors.faint },
  programEmpty: { ...type.callout, color: colors.faint },
  calendarButton: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, height: 36, borderRadius: 18, backgroundColor: colors.accentDeep },
  calendarText: { ...type.label, fontSize: 14, color: colors.text },
  calendarModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000b3' },
  calendarSheet: { maxHeight: '90%', borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  calendarContent: { padding: space.lg, gap: space.md },
  calendarHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  calendarTitle: { ...type.headline, color: colors.text, flexShrink: 1 },
  calendarClose: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { ...type.overline, color: colors.pink, marginTop: space.xs },
  showAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#ffffff1f' },
  showAllText: { ...type.label, fontSize: 14, color: colors.muted },
});
