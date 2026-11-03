import type { DemoEvent } from '../data/events';
import type { Animated } from 'react-native';

export type RadarMapProps = {
  center: { latitude: number; longitude: number };
  radius: number;
  userCoordinate: { latitude: number; longitude: number } | null;
  events: DemoEvent[];
  onSelect: (event: DemoEvent) => void;
  onCenterChange: (center: { latitude: number; longitude: number }) => void;
  onVisibleRadiusChange: (radiusKm: number) => void;
  scan: { scanning: boolean; rotation: Animated.Value; opacity: Animated.Value; reduceMotion: boolean; settledIds: string[]; onPinSettled: (id: string) => void };
};
