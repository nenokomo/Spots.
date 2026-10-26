import { useState } from 'react';
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

export default function RadarMap({ center, radius, events, onSelect, scan }: RadarMapProps) {
  const [layout, setLayout] = useState({ width: 360, height: 360 });
  const size = Math.min(layout.width * 0.96, layout.height * 0.96);
  const latitudeDelta = radius * 2 / 111.32 * layout.height / (size * 0.9375);
  const longitudeDelta = radius * 2 / (111.32 * Math.cos(center.latitude * Math.PI / 180)) * layout.width / (size * 0.9375);

  return (
    <View style={styles.frame} onLayout={(event) => setLayout(event.nativeEvent.layout)}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={{ ...center, latitudeDelta, longitudeDelta }}
        userInterfaceStyle="dark"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={mapStyle}
        showsPointsOfInterests={false}
        showsCompass={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        toolbarEnabled={false}
      >
        {events.map((event) => <EventMapMarker key={event.id} event={event} reduceMotion={scan.reduceMotion} onSelect={onSelect} />)}
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
