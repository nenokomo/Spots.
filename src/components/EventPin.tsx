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
  frame: { width: 64, height: 76, alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
  avatar: { height: 49, width: 49, borderRadius: 26, borderWidth: 2.5, borderColor: colors.pink, padding: 3, backgroundColor: '#1b111f', boxShadow: '0 0 14px 2px #ff4ab84d' },
  image: { width: '100%', height: '100%', borderRadius: 22, backgroundColor: colors.surface },
  dot: { position: 'absolute', right: -1, bottom: 1, height: 10, width: 10, borderRadius: 6, backgroundColor: colors.pink, borderWidth: 2, borderColor: '#1b111f' },
  tail: { position: 'absolute', bottom: 13, height: 12, width: 12, backgroundColor: colors.pink, transform: [{ rotate: '45deg' }], borderRadius: 2 },
});
