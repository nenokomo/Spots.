import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
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
 * Full-screen preview of event media. Tap right/left for the next/previous
 * slide, swipe sideways for the next/previous event, hold to pause, swipe down
 * to close. It never replaces the event detail page.
 */
export function EventStoryViewer({ events, initialId, today, onClose, onOpenEvent, onSeen, actionLabel }: Props) {
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState({ id: initialId, slide: 0, run: 0 });
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const elapsed = useRef(0);

  const index = events.findIndex((item) => item.id === position.id);
  const event = index >= 0 ? events[index] : undefined;
  const media = useMemo(() => event ? eventStoryMedia(event) : [], [event]);
  const slide = Math.min(position.slide, Math.max(0, media.length - 1));
  const current = media[slide];

  function showEvent(target: number) {
    if (target < 0) { setPosition((previous) => ({ ...previous, slide: 0, run: previous.run + 1 })); return; }
    if (target >= events.length) { onClose(); return; }
    setPosition((previous) => ({ id: events[target].id, slide: 0, run: previous.run + 1 }));
  }
  function next() {
    if (slide < media.length - 1) setPosition((previous) => ({ ...previous, slide: slide + 1, run: previous.run + 1 }));
    else showEvent(index + 1);
  }
  function previous() {
    if (slide > 0) setPosition((value) => ({ ...value, slide: slide - 1, run: value.run + 1 }));
    else showEvent(index - 1);
  }

  // Gesture and timer callbacks always use the handlers of the latest render.
  const actions = useRef({ next });
  useEffect(() => { actions.current = { next }; });

  // The event disappeared from the filtered list, for example because it started.
  useEffect(() => { if (!event) onClose(); }, [event, onClose]);

  useEffect(() => { if (event) onSeen?.(event.id); }, [event, onSeen]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const listener = progress.addListener(({ value }) => { elapsed.current = value; });
    return () => { active = false; subscription.remove(); progress.removeListener(listener); };
  }, [progress]);

  // Restart the progress bar for every new slide.
  useEffect(() => {
    progress.setValue(0);
    fade.setValue(0);
    const animation = Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [position.id, position.slide, position.run, progress, fade]);

  // Auto-advance. With reduced motion the user moves on manually.
  useEffect(() => {
    if (!event) return;
    if (reduceMotion) { progress.setValue(1); return; }
    if (paused) return;
    const animation = Animated.timing(progress, { toValue: 1, duration: Math.max(1, STORY_SLIDE_MS * (1 - elapsed.current)), easing: Easing.linear, useNativeDriver: false, isInteraction: false });
    animation.start(({ finished }) => { if (finished) actions.current.next(); });
    return () => animation.stop();
  }, [event, position.id, position.slide, position.run, paused, reduceMotion, progress]);

  // Load the next event's image before it is shown.
  const upcomingUri = index >= 0 && events[index + 1] ? remoteImageUri(events[index + 1].image) : null;
  useEffect(() => { if (upcomingUri) void Image.prefetch(upcomingUri).catch(() => {}); }, [upcomingUri]);

  const gesture = useMemo(() => {
    const settle = () => Animated.spring(drag, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    return PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.5) || (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.5),
    onPanResponderGrant: () => setPaused(true),
    onPanResponderMove: (_, { dx, dy }) => { if (dy > 0 && Math.abs(dy) > Math.abs(dx)) drag.setValue(dy); },
    onPanResponderRelease: (_, { dx, dy, vy }) => {
      setPaused(false);
      const vertical = Math.abs(dy) > Math.abs(dx);
      if (vertical && (dy > 110 || (dy > 40 && vy > 0.8))) { onClose(); return; }
      settle();
      if (vertical || Math.abs(dx) <= 48) return;
      const target = index + (dx < 0 ? 1 : -1);
      if (target >= events.length) onClose();
      else setPosition((value) => ({ id: target >= 0 ? events[target].id : value.id, slide: 0, run: value.run + 1 }));
    },
    onPanResponderTerminate: () => { setPaused(false); settle(); },
    });
  }, [drag, events, index, onClose]);

  if (!event || !current) return <View style={styles.viewer} />;
  const tags = event.genres?.length ? event.genres : event.categories;
  const place = [event.venue, event.location].filter(Boolean).join(' · ');

  return (
    <View style={styles.viewer} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <Animated.View {...gesture.panHandlers} style={[styles.fill, { opacity: drag.interpolate({ inputRange: [0, 320], outputRange: [1, 0.35], extrapolate: 'clamp' }), transform: [{ translateY: drag }] }]}>
        <Animated.View style={[styles.fill, { opacity: fade }]}>
          <Image source={current.source} resizeMode="cover" blurRadius={current.placeholder ? 0 : 28} style={styles.cover} />
          <View style={[styles.cover, current.placeholder ? styles.placeholderTint : styles.tint]} />
          {!current.placeholder && (
            <View style={[styles.media, { top: insets.top + 74, bottom: insets.bottom + 236 }]}>
              <Image source={current.source} resizeMode="contain" style={styles.mediaImage} accessibilityLabel={`Eventbild: ${event.title}`} />
            </View>
          )}
        </Animated.View>
        <LinearGradient pointerEvents="none" colors={['#000000d9', '#00000000']} style={[styles.topShade, { height: insets.top + 120 }]} />
        <LinearGradient pointerEvents="none" colors={['#00000000', '#000000e6', colors.background]} locations={[0, 0.45, 1]} style={[styles.bottomShade, { height: insets.bottom + 330 }]} />

        <View style={styles.zones}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zurück" onPress={previous} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} delayLongPress={180} style={styles.zoneBack} />
          <Pressable accessibilityRole="button" accessibilityLabel="Weiter" onPress={next} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} delayLongPress={180} style={styles.zoneNext} />
        </View>

        <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 10 }]}>
          <View style={styles.segments}>
            {media.map((_, segment) => (
              <View key={segment} style={styles.segment}>
                <Animated.View style={[styles.segmentFill, { width: segment < slide ? '100%' : segment > slide ? '0%' : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              </View>
            ))}
          </View>
          <View pointerEvents="box-none" style={styles.header}>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={styles.brand}>SPOTS<Text style={styles.brandDot}>.</Text>  VORSCHAU</Text>
              <Text style={styles.counter}>{index + 1} von {events.length}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Story schließen" onPress={onClose} style={styles.close}><Icon name="close" color={colors.text} /></Pressable>
          </View>
        </View>

        <Animated.View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) + 12, opacity: fade }]}>
          {current.placeholder && <Text style={styles.symbol}>Symbolbild · für dieses Event liegt noch kein Bild vor</Text>}
          <Text style={styles.when}>{eventDayLabel(event.startsAt, today).toLocaleUpperCase('de')} · {eventTimeLabel(event.startsAt)} UHR</Text>
          <Text numberOfLines={3} accessibilityRole="header" style={styles.title}>{event.title}</Text>
          <View style={styles.meta}><Icon name="pin" size={15} color="#ebebf5cc" /><Text numberOfLines={1} style={styles.metaText}>{place}</Text></View>
          {tags.length > 0 && <View style={styles.tags}>{tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}, ${actionLabel?.(event) ?? 'Event ansehen'}`} onPress={() => onOpenEvent(event)} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <LinearGradient pointerEvents="none" colors={[colors.accent, '#a01b88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
              <Text style={styles.ctaText}>{actionLabel?.(event) ?? 'Event ansehen'}</Text>
              <Icon name="chevron" size={17} color={colors.text} />
            </Pressable>
            <SaveEventButton id={event.id} title={event.title} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  tint: { backgroundColor: '#00000094' },
  placeholderTint: { backgroundColor: '#00000066' },
  media: { position: 'absolute', left: 18, right: 18, alignItems: 'center', justifyContent: 'center' },
  mediaImage: { width: '100%', height: '100%', maxWidth: 460 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  zones: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  zoneBack: { flex: 3 },
  zoneNext: { flex: 7 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff40', overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 2, backgroundColor: colors.text },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingLeft: 4, marginTop: 6 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  brand: { color: colors.text, fontSize: 11, fontWeight: '800', letterSpacing: 2.2 },
  brandDot: { color: colors.pink },
  counter: { color: '#ebebf5cc', fontSize: 11 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000080' },
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
