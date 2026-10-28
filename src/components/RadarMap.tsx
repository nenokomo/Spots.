import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { EventMapMarker } from './EventMapMarker';
import { RadarOverlay } from './RadarOverlay';
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

export default function RadarMap({ center, radius, events, onSelect, onCenterChange, scan }: RadarMapProps) {
  const map = useRef<MapView>(null);
  const viewport = useRef(center);
  const focus = useRef(center);
  const [layout, setLayout] = useState({ width: 360, height: 360 });
  const size = Math.min(layout.width * 0.96, layout.height * 0.96);
  const latitudeDelta = radius * 2 / 111.32 * layout.height / (size * 0.9375);
  const longitudeDelta = radius * 2 / (111.32 * Math.cos(center.latitude * Math.PI / 180)) * layout.width / (size * 0.9375);
  useEffect(() => {
    if (focus.current !== center) { viewport.current = center; focus.current = center; }
    map.current?.animateToRegion({ ...viewport.current, latitudeDelta, longitudeDelta }, 450);
  }, [center, latitudeDelta, longitudeDelta]);

  return (
    <View style={styles.frame} onLayout={(event) => setLayout(event.nativeEvent.layout)}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...center, latitudeDelta, longitudeDelta }}
        onRegionChangeComplete={(region) => {
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
        scrollEnabled
        zoomEnabled
        toolbarEnabled={false}
      >
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
});
