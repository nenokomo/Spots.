import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Marker } from 'react-native-maps';
import type { LocatedEvent } from '../types/events';
import { EventPin } from './EventPin';

export function EventMapMarker({ event, reduceMotion, onSelect, onSettled }: { event: LocatedEvent; reduceMotion: boolean; onSelect: (event: LocatedEvent) => void; onSettled: (id: string) => void }) {
  const marker = useRef<ComponentRef<typeof Marker>>(null);
  const [tracking, setTracking] = useState(true);
  const finishTracking = useCallback(() => {
    marker.current?.redraw();
    setTracking(false);
    onSettled(event.id);
  }, [event.id, onSettled]);
  return (
    <Marker ref={marker} coordinate={event.coordinate} onPress={() => onSelect(event)} tracksViewChanges={tracking} anchor={{ x: 0.5, y: 0.86 }} centerOffset={{ x: 0, y: -27 }} accessibilityLabel={`${event.title}, Vorschau öffnen`}>
      <EventPin event={event} reduceMotion={reduceMotion} onReady={finishTracking} />
    </Marker>
  );
}
