import type { DemoEvent } from '../data/events';
import type { Animated } from 'react-native';

export type RadarMapProps = {
  center: { latitude: number; longitude: number };
  radius: number;
  events: DemoEvent[];
  onSelect: (event: DemoEvent) => void;
  onCenterChange: (center: { latitude: number; longitude: number }) => void;
  scan: { scanning: boolean; rotation: Animated.Value; opacity: Animated.Value; reduceMotion: boolean; settledIds: string[]; onPinSettled: (id: string) => void };
};
