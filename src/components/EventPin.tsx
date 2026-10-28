import { useEffect, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import type { DemoEvent } from '../data/events';

type Props = { event: DemoEvent; reduceMotion: boolean; onReady?: () => void };

export function EventPin({ event, reduceMotion, onReady }: Props) {
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [settled, setSettled] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) { progress.setValue(1); return; }
    const animation = Animated.spring(progress, { toValue: 1, damping: 13, stiffness: 190, mass: 0.65, useNativeDriver: Platform.OS === 'ios', isInteraction: false });
    animation.start(({ finished }) => { if (finished) setSettled(true); });
    return () => animation.stop();
  }, [progress, reduceMotion]);

  useEffect(() => { if (imageLoaded && (reduceMotion || settled)) onReady?.(); }, [imageLoaded, settled, reduceMotion, onReady]);

  return (
    <Animated.View pointerEvents="none" style={[styles.frame, { opacity: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }] }]}>
      <View style={styles.tail} />
      <View style={styles.avatar}><Image source={event.image} onLoadEnd={() => setImageLoaded(true)} style={styles.image} /><View style={styles.dot} /></View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 54, height: 66, alignItems: 'center', justifyContent: 'center', paddingBottom: 9 },
  avatar: { height: 40, width: 40, borderRadius: 22, borderWidth: 2, borderColor: colors.pink, padding: 2.5, backgroundColor: '#1b111f', boxShadow: '0 0 12px 2px #ff4ab84d' },
  image: { width: '100%', height: '100%', borderRadius: 22, backgroundColor: colors.surface },
  dot: { position: 'absolute', right: -1, bottom: 0, height: 8, width: 8, borderRadius: 5, backgroundColor: colors.pink, borderWidth: 1.5, borderColor: '#1b111f' },
  tail: { position: 'absolute', bottom: 12, height: 10, width: 10, backgroundColor: colors.pink, transform: [{ rotate: '45deg' }], borderRadius: 2 },
});
