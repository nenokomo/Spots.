import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { EventMapMarker } from './EventMapMarker';
import { RadarOverlay, radarCoverSize } from './RadarOverlay';
import type { RadarMapProps } from './RadarMap.types';

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#202023' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b90' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202023' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#363639' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111113' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#242426' }] },
];

export default function RadarMap({ center, radius, userCoordinate, events, onSelect, onCenterChange, onVisibleRadiusChange, scan, topInset = 0, bottomInset = 0, locked = false }: RadarMapProps) {
  const map = useRef<MapView>(null);
  const viewport = useRef(center);
  const focus = useRef(center);
  const [mapReady, setMapReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const pendingRadius = useRef<number | null>(radius);
  const initialized = useRef(false);
  const [layout, setLayout] = useState({ width: 360, height: 360 });
  const size = radarCoverSize(layout.width, layout.height);
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
      >
        {userCoordinate && <Marker coordinate={userCoordinate} anchor={{ x: 0.5, y: 0.5 }} title="Dein Standort" zIndex={1000}><View style={styles.locationHalo}><View style={styles.locationDot} /></View></Marker>}
        {events.map((event) => <EventMapMarker key={event.id} event={event} reduceMotion={scan.reduceMotion || scan.settledIds.includes(event.id)} onSelect={onSelect} onSettled={scan.onPinSettled} />)}
      </MapView>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
      {scan.scanning && <RadarOverlay size={size} rotation={scan.rotation} opacity={scan.opacity} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#202023' },
  tint: { backgroundColor: '#00000020' },
  locationHalo: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#388bff30', alignItems: 'center', justifyContent: 'center' },
  locationDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#348cff', borderWidth: 3, borderColor: '#ffffff' },
});
