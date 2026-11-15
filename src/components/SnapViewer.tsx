import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, squircle, type } from '../constants/theme';
import { reportShot, shotReportReasons, type ShotReportReason } from '../services/content';
import { snapAge, type SnapMedia } from '../utils/stories';
import { Button } from './ui/Button';
import { ListGroup, ListRow } from './ui/List';

export const SNAP_MS = 5000;

type Props = {
  items: SnapMedia[];
  startIndex?: number;
  /** Shown top left like on Snapchat: picture, name and a small label. */
  author: { name: string; avatar?: ReactNode; label: string };
  now: number;
  onClose: () => void;
  /** Called once per picture when it becomes visible. */
  onSeen?: (id: string) => void;
  /** Shots from visitors can be reported („Melden“ top right). */
  reportable?: boolean;
  /** Shots: one progress bar for the current picture only, so nobody can count how many there are. */
  hideCount?: boolean;
  /** Tapping picture and name top left, e.g. to open the organizer's profile. */
  onAuthorPress?: () => void;
};

/**
 * Full-screen viewer for 24-hour pictures on the event page (organizer event story and visitors' Shots).
 * Tap right/left for next/previous, hold to pause, swipe down to close. After the last picture it closes.
 * Same technique as the Explore stories: one gesture handler, all pictures pre-mounted, a fresh progress bar per picture.
 */
export function SnapViewer({ items, startIndex = 0, author, now, onClose, onSeen, reportable = false, hideCount = false, onAuthorPress }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const native = Platform.OS !== 'web';
  const [position, setPosition] = useState({ index: Math.min(startIndex, Math.max(0, items.length - 1)), run: 0 });
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // The shot being reported; the viewer pauses while the report panel is open.
  const [reporting, setReporting] = useState<SnapMedia | null>(null);
  const [pull] = useState(() => new Animated.Value(0));
  const [appear] = useState(() => new Animated.Value(0));
  const closing = useRef(false);
  const elapsed = useRef({ key: '', share: 0 });

  const current = items[position.index];
  const slideKey = `${position.index}:${position.run}`;
  const bar = useMemo(() => ({ key: slideKey, progress: new Animated.Value(0) }), [slideKey]);

  function close() {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(pull, { toValue: height, duration: reduceMotion ? 0 : 170, easing: Easing.out(Easing.quad), useNativeDriver: native, isInteraction: false }).start(() => onClose());
  }
  function next() {
    if (position.index >= items.length - 1) { close(); return; }
    setPosition((value) => ({ index: value.index + 1, run: value.run + 1 }));
  }
  function previous() { setPosition((value) => ({ index: Math.max(0, value.index - 1), run: value.run + 1 })); }
  function settle() { Animated.spring(pull, { toValue: 0, damping: 22, stiffness: 320, mass: 0.8, useNativeDriver: native }).start(); }

  const actions = useRef({ next, previous, close, settle });
  useEffect(() => { actions.current = { next, previous, close, settle }; });

  useEffect(() => { if (current) onSeen?.(current.id); }, [current, onSeen]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(appear, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: native, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [appear, native]);

  // Auto-advance on the native thread; `active` drops callbacks of a picture the user already left.
  useEffect(() => {
    if (!current) return;
    if (reduceMotion) { bar.progress.setValue(1); return; }
    if (paused || reporting) return;
    let active = true;
    const base = elapsed.current.key === bar.key ? elapsed.current.share : 0;
    const startedAt = Date.now();
    bar.progress.setValue(base);
    const animation = Animated.timing(bar.progress, { toValue: 1, duration: Math.max(1, SNAP_MS * (1 - base)), easing: Easing.linear, useNativeDriver: native, isInteraction: false });
    animation.start(({ finished }) => { if (finished && active) actions.current.next(); });
    return () => {
      active = false;
      animation.stop();
      elapsed.current = { key: bar.key, share: Math.min(1, base + (Date.now() - startedAt) / SNAP_MS) };
    };
  }, [current, bar, paused, reporting, reduceMotion, native]);

  // PanResponder callbacks run only on touch events, never during render (see EventStoryViewer).
  /* eslint-disable react-hooks/refs, react-hooks/immutability */
  const gesture = useMemo(() => {
    let dragging = false;
    let held = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    const endHold = () => { if (holdTimer) clearTimeout(holdTimer); holdTimer = undefined; };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !closing.current,
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => !closing.current && dy > 10 && Math.abs(dy) > Math.abs(dx) * 1.3,
      onPanResponderGrant: () => {
        dragging = false;
        held = false;
        endHold();
        holdTimer = setTimeout(() => { held = true; setPaused(true); }, 260);
      },
      onPanResponderMove: (_, { dx, dy }) => {
        if (!dragging && dy > 10 && Math.abs(dy) > Math.abs(dx)) { dragging = true; endHold(); setPaused(true); }
        if (dragging) pull.setValue(Math.max(0, dy));
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, { dx, dy, vy, x0 }) => {
        endHold();
        if (dragging) {
          setPaused(false);
          if (dy > 80 || (dy > 20 && vy > 0.5)) actions.current.close();
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
  }, [pull, width]);
  /* eslint-enable react-hooks/refs, react-hooks/immutability */

  if (!current) return <View style={styles.viewer} />;

  return (
    <View style={styles.viewer} accessibilityViewIsModal onAccessibilityEscape={onClose}
      accessibilityActions={[{ name: 'activate', label: 'Weiter' }, { name: 'escape', label: 'Schließen' }]}
      onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === 'activate') next(); else onClose(); }}>
      <Animated.View pointerEvents="none" style={[styles.cover, styles.backdrop, { opacity: Animated.multiply(appear, pull.interpolate({ inputRange: [0, 240], outputRange: [1, 0], extrapolate: 'clamp' })) }]} />
      <Animated.View {...gesture.panHandlers} style={[styles.card, {
        opacity: Animated.multiply(appear, pull.interpolate({ inputRange: [0, height * 0.6, height], outputRange: [1, 1, 0], extrapolate: 'clamp' })),
        transform: [
          { translateY: pull },
          { scale: Animated.multiply(appear.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }), pull.interpolate({ inputRange: [0, height], outputRange: [1, 0.7], extrapolate: 'clamp' })) },
        ],
      }]}>
        {items.map((item, index) => (
          <Image key={item.id} source={item.source} resizeMode="cover" fadeDuration={0} style={[styles.cover, index !== position.index && styles.hidden]} accessibilityLabel={index === position.index ? (hideCount ? 'Shot' : `Bild ${index + 1} von ${items.length}`) : undefined} />
        ))}
        <LinearGradient pointerEvents="none" colors={['#000000b3', '#00000000']} style={[styles.topShade, { height: insets.top + 110 }]} />

        <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 10 }]}>
          {hideCount
            ? <View pointerEvents="none" style={styles.segments}><View style={styles.segment}><Animated.View key={bar.key} style={[styles.segmentFill, { transform: [{ scaleX: bar.progress }] }]} /></View></View>
            : <View pointerEvents="none" style={styles.segments}>
            {items.map((item, segment) => (
              <View key={item.id} style={styles.segment}>
                <Animated.View key={segment === position.index ? bar.key : segment < position.index ? 'done' : 'open'} style={[styles.segmentFill, { transform: [{ scaleX: segment < position.index ? 1 : segment > position.index ? 0 : bar.progress }] }]} />
              </View>
            ))}
          </View>}
          <Pressable disabled={!onAuthorPress} accessibilityRole={onAuthorPress ? 'link' : undefined} accessibilityLabel={onAuthorPress ? `Profil von ${author.name} ansehen` : undefined}
            onPress={onAuthorPress} hitSlop={6} style={({ pressed }) => [styles.author, pressed && styles.authorPressed]} pointerEvents={onAuthorPress ? 'auto' : 'none'}>
            {author.avatar}
            <View style={styles.authorCopy}>
              <Text numberOfLines={1} style={styles.authorName}>{author.name}</Text>
              <Text numberOfLines={1} style={styles.authorMeta}>{author.label} · {snapAge(current.createdAt, now)}</Text>
            </View>
          </Pressable>
          {current.test && <Text pointerEvents="none" style={styles.test}>TEST · Symbolbild, nur in der Entwicklung</Text>}
        </View>
        {reportable && <Pressable accessibilityRole="button" accessibilityLabel="Diesen Shot melden" onPress={() => setReporting(current)} hitSlop={8} style={[styles.report, { top: insets.top + 24 }]}>
          <Text style={styles.reportText}>Melden</Text>
        </Pressable>}
      </Animated.View>
      {reporting && <ShotReportPanel shotId={reporting.id} bottomInset={insets.bottom} onDone={() => setReporting(null)} />}
    </View>
  );
}

/** Reasons and send button for a shot, shown over the paused viewer (no second modal). */
function ShotReportPanel({ shotId, bottomInset, onDone }: { shotId: string; bottomInset: number; onDone: () => void }) {
  const [reason, setReason] = useState<ShotReportReason | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  async function send() {
    if (!reason) return;
    setState('sending');
    setError(null);
    try { await reportShot(shotId, reason, ''); setState('sent'); }
    catch (failure) { setState('idle'); setError(failure instanceof Error ? failure.message : 'Die Meldung konnte nicht gesendet werden.'); }
  }
  return (
    <View style={styles.panelLayer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Melden abbrechen" onPress={onDone} style={StyleSheet.absoluteFill} />
      <View style={[styles.panel, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}>
        {state === 'sent'
          ? <>
              <Text accessibilityRole="alert" style={styles.panelTitle}>Danke für deine Meldung</Text>
              <Text style={styles.panelText}>Wir prüfen den SHOT. Nach mehreren Meldungen wird er sofort ausgeblendet.</Text>
              <Button label="Schließen" variant="secondary" onPress={onDone} />
            </>
          : <>
              <Text style={styles.panelTitle}>SHOT melden</Text>
              <Text style={styles.panelText}>Warum soll dieser SHOT weg?</Text>
              <ListGroup>
                {shotReportReasons.map((item) => (
                  <ListRow key={item.id} title={item.label} value={reason === item.id ? '✓' : undefined}
                    accessibilityLabel={`${item.label}${reason === item.id ? ', ausgewählt' : ''}`} onPress={() => setReason(item.id)} />
                ))}
              </ListGroup>
              {error && <Text accessibilityRole="alert" style={styles.panelError}>{error}</Text>}
              <View style={styles.panelActions}>
                <Button label="Abbrechen" variant="secondary" onPress={onDone} style={styles.flex} />
                <Button label="Melden" onPress={() => void send()} disabled={!reason} loading={state === 'sending'} style={styles.flex}
                  accessibilityLabel={reason ? 'Meldung senden' : 'Zuerst einen Grund auswählen'} />
              </View>
            </>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1 },
  flex: { flex: 1 },
  report: { position: 'absolute', right: 12, height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: '#00000066' },
  reportText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  panelLayer: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  panel: { gap: space.md, padding: space.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surfaceRaised, ...squircle },
  panelTitle: { ...type.title3, color: colors.text },
  panelText: { ...type.callout, color: colors.muted },
  panelError: { ...type.footnote, color: colors.danger },
  panelActions: { flexDirection: 'row', gap: space.sm },
  backdrop: { backgroundColor: colors.background },
  card: { flex: 1, overflow: 'hidden', borderRadius: 22, backgroundColor: colors.background, ...squircle },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hidden: { opacity: 0 },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10 },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff40', overflow: 'hidden' },
  segmentFill: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: colors.text, transformOrigin: 'left' },
  author: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 2, paddingRight: 8, alignSelf: 'flex-start', maxWidth: '75%' },
  authorCopy: { flexShrink: 1, minWidth: 0 },
  authorPressed: { opacity: 0.7 },
  authorName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  authorMeta: { color: '#ebebf5cc', fontSize: 12 },
  test: { color: '#ebebf5cc', fontSize: 11, paddingLeft: 2 },
});
