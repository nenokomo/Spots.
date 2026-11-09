import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Vibration } from 'react-native';
import type { SpotEvent } from '../types/events';

export const RADAR_TURN_MS = 1800;
export const RADAR_TURNS = 3;
export const PIN_STAGGER_MS = 320;

// App session only. Navigation/backgrounding must not replay the intro.
const session = { complete: false, revealed: new Set<string>(), settled: new Set<string>() };

export function useRadarIntro<T extends SpotEvent>(events: T[]) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(session.complete ? 0 : 1));
  const [complete, setComplete] = useState(() => session.complete);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [revealedIds, setRevealedIds] = useState(() => [...session.revealed]);
  const [settledIds, setSettledIds] = useState(() => [...session.settled]);
  const onPinSettled = useCallback((id: string) => {
    session.settled.add(id);
    setSettledIds((previous) => previous.includes(id) ? previous : [...previous, id]);
  }, []);

  useEffect(() => {
    let disposed = false;
    let animation: Animated.CompositeAnimation | undefined;

    function stop() {
      animation?.stop();
      if (Platform.OS !== 'web') Vibration.cancel();
    }

    function finish() {
      session.complete = true;
      opacity.setValue(0);
      if (!disposed) setComplete(true);
    }

    function initialize(reduced: boolean) {
      if (disposed) return;
      setReduceMotion(reduced);
      if (session.complete || reduced || AppState.currentState === 'background' || AppState.currentState === 'inactive') { finish(); return; }
      function runTurn(turn: number) {
        if (disposed || session.complete) return;
        animation = Animated.timing(rotation, { toValue: turn, duration: RADAR_TURN_MS, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
        animation.start(({ finished }) => {
          if (disposed || !finished || session.complete) return;
          if (Platform.OS !== 'web') Vibration.vibrate(45);
          if (turn < RADAR_TURNS) { runTurn(turn + 1); return; }
          animation = Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
          animation.start(({ finished: faded }) => { if (!disposed && faded) finish(); });
        });
      }
      rotation.setValue(0);
      runTurn(1);
    }

    void AccessibilityInfo.isReduceMotionEnabled().then(initialize).catch(() => initialize(false));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
      if (enabled) { stop(); finish(); }
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { stop(); finish(); }
    });
    return () => {
      disposed = true;
      stop();
      session.complete = true;
      motion.remove();
      appState.remove();
    };
  }, [rotation, opacity]);

  useEffect(() => {
    if (!complete || reduceMotion) return;
    const pending = events.filter((event) => !session.revealed.has(event.id));
    const timers = pending.map((event, index) => setTimeout(() => {
      session.revealed.add(event.id);
      setRevealedIds((previous) => previous.includes(event.id) ? previous : [...previous, event.id]);
    }, 80 + index * PIN_STAGGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [complete, reduceMotion, events]);

  const visibleEvents = complete ? reduceMotion ? events : events.filter((event) => revealedIds.includes(event.id)) : [];
  return { scanning: !complete, rotation, opacity, reduceMotion, visibleEvents, settledIds, onPinSettled };
}
