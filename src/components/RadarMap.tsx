import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { EventMapMarker } from './EventMapMarker';
import { RadarOverlay, radarCoverSize } from './RadarOverlay';
import { darkMapStyle as mapStyle } from '../constants/mapStyle';
import type { LocatedEvent } from '../types/events';
import type { RadarMapProps } from './RadarMap.types';

export default function RadarMap({ center, radius, userCoordinate, events, onSelect, onCenterChange, onVisibleRadiusChange, scan, topInset = 0, bottomInset = 0, locked = false }: RadarMapProps) {
  const map = useRef<MapView>(null);
  const viewport = useRef(center);
  const focus = useRef(center);
  const [mapReady, setMapReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const pendingRadius = useRef<number | null>(radius);
  const initialized = useRef(false);
  const [layout, setLayout] = useState({ width: 360, height: 360 });
  // Screen position of the tapped pin (dp on both platforms), so the preview can be placed next to it.
  const select = useCallback((event: LocatedEvent) => {
    const pending = map.current?.pointForCoordinate(event.coordinate);
    if (!pending) { onSelect(event, null); return; }
    pending.then((point) => onSelect(event, point), () => onSelect(event, null));
  }, [onSelect]);
  const size = radarCoverSize(layout.width, layout.height);
  // Screen point of the location dot; the scan is centred on it. Fallback: middle of the visible map (above the panel).
  // Measured only once the map has settled on the fitted region; earlier values would make the radar jump.
  const [userPoint, setUserPoint] = useState<{ x: number; y: number } | null>(null);
  const settled = useRef(false);
  const updateUserPoint = useCallback(() => {
    if (!userCoordinate) { setUserPoint(null); return; }
    map.current?.pointForCoordinate(userCoordinate).then(setUserPoint, () => setUserPoint(null));
  }, [userCoordinate]);
  useEffect(() => { if (settled.current) updateUserPoint(); }, [updateUserPoint, layout]);
  // Safety net if the map never reports a settled region.
  useEffect(() => {
    if (!mapReady || !layoutReady) return;
    const timer = setTimeout(() => { settled.current = true; updateUserPoint(); }, 1200);
    return () => clearTimeout(timer);
  }, [mapReady, layoutReady, updateUserPoint]);
  const scanCenter = userCoordinate ? userPoint : { x: layout.width / 2, y: (layout.height - bottomInset) / 2 };
  const latitudeDelta = radius * 2 / 111.32;
  const longitudeDelta = latitudeDelta * layout.width / layout.height / Math.max(0.01, Math.cos(center.latitude * Math.PI / 180));
  useEffect(() => {
    if (!mapReady || !layoutReady) return;
    if (focus.current !== center) { viewport.current = center; focus.current = center; }
    const animated = initialized.current && !scan.reduceMotion;
    pendingRadius.current = animated ? null : radius;
    if (!animated) onVisibleRadiusChange(radius);
    initialized.current = true;
    // Fit the north/south bounds using the actual native viewport rather than
    // asking MapKit to fit a guessed longitude/latitude aspect ratio.
    const target = viewport.current;
    map.current?.fitToCoordinates([
      { latitude: Math.min(85, target.latitude + latitudeDelta / 2), longitude: target.longitude },
      { latitude: Math.max(-85, target.latitude - latitudeDelta / 2), longitude: target.longitude },
    ], { edgePadding: { top: 0, right: 0, bottom: 0, left: 0 }, animated });
  }, [center, radius, latitudeDelta, longitudeDelta, mapReady, layoutReady, onVisibleRadiusChange, scan.reduceMotion]);

  return (
    <View style={styles.frame} onLayout={(event) => {
      const next = event.nativeEvent.layout;
      if (next.width > 0 && next.height > 0) { setLayout(next); setLayoutReady(true); }
    }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
        initialRegion={{ ...center, latitudeDelta, longitudeDelta }}
        onMapReady={() => setMapReady(true)}
        onTouchStart={() => { pendingRadius.current = null; }}
        onRegionChange={(region) => {
          if (pendingRadius.current === null) onVisibleRadiusChange(Math.abs(region.latitudeDelta) * 111.32 / 2);
        }}
        onRegionChangeComplete={(region) => {
          const actualRadius = Math.abs(region.latitudeDelta) * 111.32 / 2;
          if (pendingRadius.current !== null) {
            // Ignore startup callbacks from the old, automatically fitted region.
            if (Math.abs(actualRadius - pendingRadius.current) > pendingRadius.current * 0.05) return;
            pendingRadius.current = null;
          }
          onVisibleRadiusChange(actualRadius);
          settled.current = true;
          if (scan.scanning) updateUserPoint();
          viewport.current = { latitude: region.latitude, longitude: region.longitude };
          onCenterChange(viewport.current);
        }}
        userInterfaceStyle="dark"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={mapStyle}
        showsPointsOfInterests={false}
        showsCompass={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={!locked}
        zoomEnabled={!locked}
        toolbarEnabled={false}
        // Android would otherwise pan to the tapped pin, which moves it away from its preview card.
        moveOnMarkerPress={false}
      >
        {userCoordinate && <Marker coordinate={userCoordinate} anchor={{ x: 0.5, y: 0.5 }} title="Dein Standort" zIndex={1000}><View style={styles.locationHalo}><View style={styles.locationDot} /></View></Marker>}
        {events.map((event) => <EventMapMarker key={event.id} event={event} reduceMotion={scan.reduceMotion || scan.settledIds.includes(event.id)} onSelect={select} onSettled={scan.onPinSettled} />)}
      </MapView>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
      {scan.scanning && scanCenter && <RadarOverlay size={size} rotation={scan.rotation} opacity={scan.opacity} center={scanCenter} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#202023' },
  tint: { backgroundColor: '#00000020' },
  locationHalo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#388bff30', alignItems: 'center', justifyContent: 'center' },
  locationDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#348cff', borderWidth: 3, borderColor: '#ffffff' },
});
