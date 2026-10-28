import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Marker } from 'react-native-maps';
import type { DemoEvent } from '../data/events';
import { EventPin } from './EventPin';

export function EventMapMarker({ event, reduceMotion, onSelect, onSettled }: { event: DemoEvent; reduceMotion: boolean; onSelect: (event: DemoEvent) => void; onSettled: (id: string) => void }) {
  const marker = useRef<ComponentRef<typeof Marker>>(null);
  const [tracking, setTracking] = useState(true);
  const finishTracking = useCallback(() => {
    marker.current?.redraw();
    setTracking(false);
    onSettled(event.id);
  }, [event.id, onSettled]);
  return (
    <Marker ref={marker} coordinate={event.coordinate} onPress={() => onSelect(event)} tracksViewChanges={tracking} anchor={{ x: 0.5, y: 0.86 }} centerOffset={{ x: 0, y: -27 }} accessibilityLabel={`${event.title}, Demo-Event, Vorschau öffnen`}>
      <EventPin event={event} reduceMotion={reduceMotion} onReady={finishTracking} />
    </Marker>
  );
}
