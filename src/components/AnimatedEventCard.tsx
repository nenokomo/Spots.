import { useEffect, useState } from 'react';
import { Animated, Platform } from 'react-native';
import type { DemoEvent } from '../data/events';
import { EventCard } from './EventCard';

export function AnimatedEventCard({ event, reduceMotion }: { event: DemoEvent; reduceMotion: boolean }) {
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) { progress.setValue(1); return; }
    const animation = Animated.timing(progress, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== 'web', isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}><EventCard event={event} compact glass={false} /></Animated.View>;
}
