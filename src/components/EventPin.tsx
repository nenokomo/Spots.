import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import type { SpotEvent } from '../types/events';
import { eventPhase } from '../utils/eventStatus';
import { Icon } from './Icon';

type Props = { event: SpotEvent; reduceMotion: boolean; onReady?: () => void };

/**
 * Map pin. Running events are a filled brand balloon, events starting later
 * tonight are outlined, so "live" is never claimed for something that has not started.
 */
export function EventPin({ event, reduceMotion, onReady }: Props) {
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [settled, setSettled] = useState(reduceMotion);
  const phase = eventPhase(event);
  const live = phase === 'live' || phase === 'started';

  useEffect(() => {
    if (reduceMotion) { progress.setValue(1); return; }
    const animation = Animated.spring(progress, { toValue: 1, damping: 13, stiffness: 190, mass: 0.65, useNativeDriver: Platform.OS === 'ios', isInteraction: false });
    animation.start(({ finished }) => { if (finished) setSettled(true); });
    return () => animation.stop();
  }, [progress, reduceMotion]);

  useEffect(() => { if (reduceMotion || settled) onReady?.(); }, [settled, reduceMotion, onReady]);

  return (
    <Animated.View pointerEvents="none" style={[styles.frame, { opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }] }]}>
      <View style={[styles.tail, !live && styles.tailSoon]} />
      <View style={[styles.balloon, live ? styles.live : styles.soon]}>
        <Icon name={live ? 'wave' : 'clock'} size={17} color={live ? colors.text : colors.pink} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 54, height: 66, alignItems: 'center', justifyContent: 'center', paddingBottom: 9 },
  balloon: { height: 38, width: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  live: { backgroundColor: colors.accent, borderColor: colors.text, boxShadow: '0 0 14px 3px #c922ab99' },
  soon: { backgroundColor: colors.surface, borderColor: colors.accent },
  tail: { position: 'absolute', bottom: 13, height: 10, width: 10, backgroundColor: colors.text, transform: [{ rotate: '45deg' }], borderRadius: 2 },
  tailSoon: { backgroundColor: colors.accent },
});
