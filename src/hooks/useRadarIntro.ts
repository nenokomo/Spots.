import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Vibration } from 'react-native';
import type { DemoEvent } from '../data/events';

export const RADAR_TURN_MS = 1800;
export const RADAR_TURNS = 3;
export const PIN_STAGGER_MS = 320;

export function useRadarIntro(scanKey: string, events: DemoEvent[]) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [complete, setComplete] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [revealed, setRevealed] = useState({ key: '', count: 0 });
  const eventKey = events.map((event) => event.id).join(',');
  const revealKey = `${scanKey}:${eventKey}`;

  useFocusEffect(useCallback(() => {
    let disposed = false;
    let preferenceKnown = false;
    let reduced = false;
    let generation = 0;
    let animation: Animated.CompositeAnimation | undefined;
    let vibrationTimers: ReturnType<typeof setTimeout>[] = [];

    function stop() {
      generation++;
      animation?.stop();
      vibrationTimers.forEach(clearTimeout);
      vibrationTimers = [];
      if (Platform.OS !== 'web') Vibration.cancel();
    }

    function start() {
      stop();
      setComplete(false);
      setRevealed({ key: `${scanKey}:scanning`, count: 0 });
      rotation.setValue(0);
      opacity.setValue(1);
      if (disposed || !preferenceKnown || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
      setReduceMotion(reduced);
      if (reduced) {
        opacity.setValue(0);
        setComplete(true);
        return;
      }
      const currentGeneration = generation;
      if (Platform.OS !== 'web') {
        Vibration.vibrate(45);
        for (let turn = 1; turn < RADAR_TURNS; turn++) {
          vibrationTimers.push(setTimeout(() => Vibration.vibrate(45), turn * RADAR_TURN_MS));
        }
      }
      animation = Animated.sequence([
        // One continuous 0 → 1080° rotation, followed by the radar fading out.
        Animated.timing(rotation, { toValue: RADAR_TURNS, duration: RADAR_TURN_MS * RADAR_TURNS, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: Platform.OS !== 'web', isInteraction: false }),
      ]);
      animation.start(({ finished }) => {
        if (!disposed && finished && generation === currentGeneration) {
          if (Platform.OS !== 'web') Vibration.cancel();
          setComplete(true);
        }
      });
    }

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (disposed) return;
      reduced = enabled;
      preferenceKnown = true;
      start();
    }).catch(() => { if (!disposed) { preferenceKnown = true; start(); } });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => { reduced = enabled; preferenceKnown = true; start(); });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else { stop(); setComplete(false); setRevealed({ key: '', count: 0 }); }
    });
    return () => {
      disposed = true;
      stop();
      setComplete(false);
      setRevealed({ key: '', count: 0 });
      motion.remove();
      appState.remove();
    };
  }, [scanKey, rotation, opacity]));

  useEffect(() => {
    if (!complete || reduceMotion) return;
    const timers = events.map((_, index) => setTimeout(() => setRevealed({ key: revealKey, count: index + 1 }), 80 + index * PIN_STAGGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [complete, reduceMotion, revealKey, events]);

  const visibleEvents = complete ? reduceMotion ? events : revealed.key === revealKey ? events.slice(0, revealed.count) : [] : [];
  return { scanning: !complete, rotation, opacity, reduceMotion, visibleEvents };
}
