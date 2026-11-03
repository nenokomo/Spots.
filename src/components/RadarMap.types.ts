import type { LocatedEvent } from '../types/events';
import type { Animated } from 'react-native';

export type RadarMapProps = {
  center: { latitude: number; longitude: number };
  radius: number;
  events: LocatedEvent[];
  onSelect: (event: LocatedEvent) => void;
  onCenterChange: (center: { latitude: number; longitude: number }) => void;
  scan: { scanning: boolean; rotation: Animated.Value; opacity: Animated.Value; reduceMotion: boolean; settledIds: string[]; onPinSettled: (id: string) => void };
};
