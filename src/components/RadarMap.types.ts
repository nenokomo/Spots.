import type { LocatedEvent } from '../types/events';
import type { Animated } from 'react-native';

export type RadarMapProps = {
  center: { latitude: number; longitude: number };
  radius: number;
  userCoordinate: { latitude: number; longitude: number } | null;
  events: LocatedEvent[];
  onSelect: (event: LocatedEvent) => void;
  /** Clubs und Locations als dezente Punkte. Ein Ort ist keine laufende Party. */
  venues?: MapVenue[];
  onSelectVenue?: (id: string) => void;
  /** Durchmesser der Ortspunkte in Pixeln; wächst beim Hineinzoomen. */
  venueDotSize?: number;
  onCenterChange: (center: { latitude: number; longitude: number }) => void;
  onVisibleRadiusChange: (radiusKm: number) => void;
  /** Height of the floating header; keeps the scan overlay clear of it. */
  topInset?: number;
  /** Part of the map that runs under the bottom panel (its rounded corners); map credits stay above it. */
  bottomInset?: number;
  /** While true the map cannot be moved or zoomed (radar scan). */
  locked?: boolean;
  scan: { scanning: boolean; rotation: Animated.Value; opacity: Animated.Value; reduceMotion: boolean; settledIds: string[]; onPinSettled: (id: string) => void };
};

export type MapVenue = { id: string; name: string; coordinate: { latitude: number; longitude: number } };
