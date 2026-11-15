import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { colors, squircle } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventDayLabel, eventTimeLabel } from '../utils/events';
import { eventStoryMedia, remoteImageUri } from '../utils/stories';
import { Icon } from './Icon';
import { SaveEventButton } from './SaveEventButton';

export const STORY_SLIDE_MS = 6000;

type Props = {
  events: SpotEvent[];
  initialId: string;
  today: string;
  onClose: () => void;
  onOpenEvent: (event: SpotEvent) => void;
  onSeen?: (id: string) => void;
  /** Label of the main button, e.g. when the event leads to its organizer. */
  actionLabel?: (event: SpotEvent) => string;
};

/**
 * Full-screen story of an event (its organizer).
 * - Tap right/left: next/previous picture of this story. After the last picture the story starts again.
 * - Swipe up: next organizer's story. It is already rendered below and moves with your finger, like a feed.
 * - Swipe down: close; the story shrinks away and the page underneath shows through while dragging.
 * - Hold: pause.
 * One gesture handler decides between tap, hold and swipe, so they never compete.
 * It never replaces the event detail page.
 */
export function EventStoryViewer({ events, initialId, today, onClose, onOpenEvent, onSeen, actionLabel }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const [position, setPosition] = useState({ id: initialId, slide: 0, run: 0 });
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Feed position: -index × height. Never reset, so switching stories causes no jump.
  const [feed] = useState(() => new Animated.Value(-Math.max(0, events.findIndex((item) => item.id === initialId)) * height));
  // Downward pull of the current story (closing).
  const [pull] = useState(() => new Animated.Value(0));
  const [appear] = useState(() => new Animated.Value(0));
  const busy = useRef(false);
  // How much of a slide was shown before a pause, tied to that slide only.
  const elapsed = useRef({ key: '', share: 0 });

  const index = events.findIndex((item) => item.id === position.id);
  const event = index >= 0 ? events[index] : undefined;
  const upcoming = index >= 0 ? events[index + 1] : undefined;
  const media = useMemo(() => event ? eventStoryMedia(event) : [], [event]);
  const slide = Math.min(position.slide, Math.max(0, media.length - 1));
  // A fresh progress value per slide: never reset while a native animation is still running on it.
  const slideKey = `${position.id}:${slide}:${position.run}`;
  const bar = useMemo(() => ({ key: slideKey, progress: new Animated.Value(0) }), [slideKey]);
  // Animated styles only change with the story, so the waiting next story does not re-render on every tap.
  const currentStyle = useMemo(() => ({
    opacity: pull.interpolate({ inputRange: [0, height * 0.6, height], outputRange: [1, 1, 0], extrapolate: 'clamp' }),
    transform: [{ translateY: Animated.add(feed, index * height) }, { translateY: pull }, { scale: pull.interpolate({ inputRange: [0, height], outputRange: [1, 0.7], extrapolate: 'clamp' }) }],
  }), [feed, pull, index, height]);
  const upcomingStyle = useMemo(() => ({ transform: [{ translateY: Animated.add(feed, (index + 1) * height) }] }), [feed, index, height]);

  function showSlide(target: number) { setPosition((value) => ({ ...value, slide: target, run: value.run + 1 })); }
  // Past the last picture the same story starts again; other organizers are only reached by swiping up.
  function next() { showSlide(slide < media.length - 1 ? slide + 1 : 0); }
  function previous() { showSlide(Math.max(0, slide - 1)); }
  function settle() {
    Animated.parallel([
      Animated.spring(feed, { toValue: -index * height, damping: 24, stiffness: 300, mass: 0.8, useNativeDriver: native }),
      Animated.spring(pull, { toValue: 0, damping: 22, stiffness: 320, mass: 0.8, useNativeDriver: native }),
    ]).start();
  }
  function nextStory(velocity = 0) {
    if (busy.current) return;
    if (!upcoming) { settle(); return; }
    busy.current = true;
    const target = upcoming;
    // Both stories move together; the next one is already decoded, so nothing has to load at the end.
    Animated.spring(feed, { toValue: -(index + 1) * height, velocity, damping: 30, stiffness: 240, mass: 0.9, overshootClamping: true, useNativeDriver: native, isInteraction: false }).start(({ finished }) => {
      busy.current = false;
      if (finished) setPosition((value) => ({ id: target.id, slide: 0, run: value.run + 1 }));
    });
  }
  function dismiss() {
    if (busy.current) return;
    busy.current = true;
    Animated.timing(pull, { toValue: height, duration: reduceMotion ? 0 : 170, easing: Easing.out(Easing.quad), useNativeDriver: native, isInteraction: false }).start(() => onClose());
  }
  function track(dy: number) {
    if (dy < 0) {
      pull.setValue(0);
      // At the last organizer the story only gives a little (rubber band).
      feed.setValue(-index * height + (upcoming ? dy : dy * 0.25));
    } else {
      feed.setValue(-index * height);
      pull.setValue(dy);
    }
  }

  // Gesture and timer callbacks always use the handlers of the latest render.
  const actions = useRef({ next, previous, nextStory, dismiss, settle, track });
  useEffect(() => { actions.current = { next, previous, nextStory, dismiss, settle, track }; });

  // Keep the feed aligned if the list changes underneath (for example a filter update) or the screen rotates.
  useLayoutEffect(() => { if (index >= 0 && !busy.current) feed.setValue(-index * height); }, [feed, index, height]);

  // The event disappeared from the filtered list, for example because it started.
  useEffect(() => { if (!event) onClose(); }, [event, onClose]);

  useEffect(() => { if (event) onSeen?.(event.id); }, [event, onSeen]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  // Opening: the modal itself has no animation, the story fades and grows in here.
  useEffect(() => {
    const animation = Animated.timing(appear, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: native, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [appear, native]);

  // Auto-advance on the native thread. With reduced motion the user moves on manually.
  useEffect(() => {
    if (!event) return;
    if (reduceMotion) { bar.progress.setValue(1); return; }
    if (paused) return;
    let active = true;
    const base = elapsed.current.key === bar.key ? elapsed.current.share : 0;
    const startedAt = Date.now();
    bar.progress.setValue(base);
    const animation = Animated.timing(bar.progress, { toValue: 1, duration: Math.max(1, STORY_SLIDE_MS * (1 - base)), easing: Easing.linear, useNativeDriver: native, isInteraction: false });
    // `active` drops callbacks of a slide the user already left, so a slide never advances twice.
    animation.start(({ finished }) => { if (finished && active) actions.current.next(); });
    return () => {
      active = false;
      animation.stop();
      elapsed.current = { key: bar.key, share: Math.min(1, base + (Date.now() - startedAt) / STORY_SLIDE_MS) };
    };
  }, [event, bar, paused, reduceMotion, native]);

  // The story after the next one: start loading its image early.
  const laterUri = index >= 0 && events[index + 2] ? remoteImageUri(events[index + 2].image) : null;
  useEffect(() => { if (laterUri) void Image.prefetch(laterUri).catch(() => {}); }, [laterUri]);

  // PanResponder callbacks run only on touch events, never during render; the refs and the per-gesture
  // variables below are therefore safe. The React compiler rules cannot see that, hence this narrow exception.
  /* eslint-disable react-hooks/refs, react-hooks/immutability */
  const gesture = useMemo(() => {
    let dragging = false;
    let held = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const endHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = undefined; };
    return PanResponder.create({
      // Bubbling: the buttons at the bottom keep their own taps; everywhere else this handler decides.
      onStartShouldSetPanResponder: () => !busy.current,
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => !busy.current && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.3,
      onPanResponderGrant: () => {
        dragging = false;
        held = false;
        endHold();
        holdTimer = setTimeout(() => { held = true; setPaused(true); }, 260);
      },
      onPanResponderMove: (_, { dx, dy }) => {
        if (!dragging && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { dragging = true; endHold(); setPaused(true); }
        if (dragging) actions.current.track(dy);
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, { dx, dy, vy, x0 }) => {
        endHold();
        if (dragging) {
          setPaused(false);
          if (dy < -70 || (dy < -20 && vy < -0.4)) actions.current.nextStory(vy);
          else if (dy > 80 || (dy > 20 && vy > 0.5)) actions.current.dismiss();
          else actions.current.settle();
          return;
        }
        if (held) { setPaused(false); return; }
        if (Math.abs(dx) > 24) return;
        if (x0 < width * 0.3) actions.current.previous();
        else actions.current.next();
      },
      onPanResponderTerminate: () => { endHold(); setPaused(false); if (dragging) actions.current.settle(); },
    });
  }, [width]);
  /* eslint-enable react-hooks/refs, react-hooks/immutability */

  if (!event) return <View style={styles.viewer} />;

  return (
    <View style={styles.viewer} accessibilityViewIsModal onAccessibilityEscape={onClose}
      accessibilityActions={[{ name: 'activate', label: 'Nächstes Bild' }, { name: 'increment', label: 'Nächster Veranstalter' }, { name: 'escape', label: 'Story schließen' }]}
      onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === 'activate') next(); else if (nativeEvent.actionName === 'increment') nextStory(); else onClose(); }}>
      {/* Clears quickly while pulling down, so the page underneath shows through (the modal is transparent). */}
      <Animated.View pointerEvents="none" style={[styles.cover, styles.backdrop, { opacity: Animated.multiply(appear, pull.interpolate({ inputRange: [0, 240], outputRange: [1, 0], extrapolate: 'clamp' })) }]} />
      <Animated.View {...gesture.panHandlers} style={[styles.fill, { opacity: appear, transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
        {/* Keyed by event: when the next story becomes the current one, it keeps its already decoded images. */}
        <StoryCard key={event.id} event={event} today={today} insets={insets} slide={slide} bar={bar} actionLabel={actionLabel} onOpenEvent={onOpenEvent}
          style={currentStyle} />
        {upcoming && <StoryCard key={upcoming.id} event={upcoming} today={today} insets={insets} slide={0} bar={null} actionLabel={actionLabel} onOpenEvent={onOpenEvent}
          style={upcomingStyle} />}
      </Animated.View>
    </View>
  );
}

type CardProps = {
  event: SpotEvent;
  today: string;
  insets: EdgeInsets;
  slide: number;
  /** Progress of the visible slide; null for the waiting next story (bars empty, buttons inactive). */
  bar: { key: string; progress: Animated.Value } | null;
  actionLabel?: (event: SpotEvent) => string;
  onOpenEvent: (event: SpotEvent) => void;
  style: Animated.WithAnimatedValue<object>;
};

/** One organizer's story page. All its pictures stay mounted and decoded; only the visible one changes. */
const StoryCard = memo(function StoryCard({ event, today, insets, slide, bar, actionLabel, onOpenEvent, style }: CardProps) {
  const media = useMemo(() => eventStoryMedia(event), [event]);
  const current = media[Math.min(slide, media.length - 1)];
  const tags = event.genres?.length ? event.genres : event.categories;
  const place = [event.venue, event.location].filter(Boolean).join(' · ');
  const label = actionLabel?.(event) ?? 'Event ansehen';
  return (
    <Animated.View pointerEvents={bar ? 'box-none' : 'none'} style={[styles.card, style]}>
      {media.map((item, itemIndex) => (
        <View key={itemIndex} pointerEvents="none" style={[styles.cover, itemIndex !== slide && styles.hidden]}>
          <Image source={item.source} resizeMode="cover" blurRadius={item.placeholder ? 0 : 28} fadeDuration={0} style={styles.cover} />
          <View style={[styles.cover, item.placeholder ? styles.placeholderTint : styles.tint]} />
          {!item.placeholder && (
            <View style={[styles.media, { top: insets.top + 74, bottom: insets.bottom + 236 }]}>
              <Image source={item.source} resizeMode="contain" fadeDuration={0} style={styles.mediaImage} accessibilityLabel={`Eventbild: ${event.title}`} />
            </View>
          )}
        </View>
      ))}
      <LinearGradient pointerEvents="none" colors={['#000000d9', '#00000000']} style={[styles.topShade, { height: insets.top + 120 }]} />
      <LinearGradient pointerEvents="none" colors={['#00000000', '#000000e6', colors.background]} locations={[0, 0.45, 1]} style={[styles.bottomShade, { height: insets.bottom + 330 }]} />

      <View pointerEvents="none" style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.segments}>
          {media.map((_, segment) => (
            <View key={segment} style={styles.segment}>
              {/* Remounted per slide, so a native animation never leaves a stale bar behind. */}
              <Animated.View key={bar && segment === slide ? bar.key : segment < slide ? 'done' : 'open'} style={[styles.segmentFill, { transform: [{ scaleX: segment < slide ? 1 : segment > slide || !bar ? 0 : bar.progress }] }]} />
            </View>
          ))}
        </View>
      </View>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
        {current?.placeholder && <Text style={styles.symbol}>{current.test ? 'TEST · Symbolbild, nur in der Entwicklung' : 'Symbolbild · für dieses Event liegt noch kein Bild vor'}</Text>}
        <Text style={styles.when}>{eventDayLabel(event.startsAt, today).toLocaleUpperCase('de')} · {eventTimeLabel(event.startsAt)} UHR</Text>
        <Text numberOfLines={3} accessibilityRole="header" style={styles.title}>{event.title}</Text>
        <View style={styles.meta}><Icon name="pin" size={15} color="#ebebf5cc" /><Text numberOfLines={1} style={styles.metaText}>{place}</Text></View>
        {tags.length > 0 && <View style={styles.tags}>{tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${label}`} onPress={() => onOpenEvent(event)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
            <LinearGradient pointerEvents="none" colors={[colors.accent, '#a01b88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
            <Text style={styles.ctaText}>{label}</Text>
            <Icon name="chevron" size={17} color={colors.text} />
          </Pressable>
          <SaveEventButton id={event.id} title={event.title} />
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  viewer: { flex: 1 },
  backdrop: { backgroundColor: colors.background },
  card: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', borderRadius: 22, backgroundColor: colors.background, ...squircle },
  fill: { flex: 1 },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hidden: { opacity: 0 },
  tint: { backgroundColor: '#00000094' },
  placeholderTint: { backgroundColor: '#00000066' },
  media: { position: 'absolute', left: 18, right: 18, alignItems: 'center', justifyContent: 'center' },
  mediaImage: { width: '100%', height: '100%', maxWidth: 460 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff40', overflow: 'hidden' },
  segmentFill: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: colors.text, transformOrigin: 'left' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, gap: 8 },
  symbol: { color: '#ebebf5cc', fontSize: 11 },
  when: { color: colors.pink, fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { color: '#ebebf5cc', fontSize: 13, flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { color: colors.text, fontSize: 11, fontWeight: '600', backgroundColor: '#ffffff1c', borderRadius: 12, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  cta: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.accent },
  ctaText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
