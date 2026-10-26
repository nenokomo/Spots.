import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { RadarOverlay } from './RadarOverlay';
import type { RadarMapProps } from './RadarMap.types';
import { EventPin } from './EventPin';

function project(latitude: number, longitude: number, zoom: number) {
  const sin = Math.sin(Math.max(-85, Math.min(85, latitude)) * Math.PI / 180);
  const world = 256 * 2 ** zoom;
  return { x: (longitude + 180) / 360 * world, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world };
}

// react-native-maps is native-only. Render real map tiles for browser previews.
export default function RadarMap({ center, radius, events, onSelect, scan }: RadarMapProps) {
  const [layout, setLayout] = useState({ width: 390, height: 390 });
  const [tileError, setTileError] = useState(false);
  const size = Math.min(layout.width * 0.96, layout.height * 0.96);
  const metersPerPixel = radius * 2000 / (size * 0.9375);
  const zoom = Math.max(1, Math.min(18, Math.floor(Math.log2(156543.034 * Math.cos(center.latitude * Math.PI / 180) / metersPerPixel))));
  const scale = 156543.034 * Math.cos(center.latitude * Math.PI / 180) / (2 ** zoom * metersPerPixel);
  const tileSize = 256 * scale;
  const origin = project(center.latitude, center.longitude, zoom);
  const minX = Math.floor((origin.x - layout.width / 2 / scale) / 256);
  const maxX = Math.floor((origin.x + layout.width / 2 / scale) / 256);
  const minY = Math.floor((origin.y - layout.height / 2 / scale) / 256);
  const maxY = Math.floor((origin.y + layout.height / 2 / scale) / 256);
  const tiles = [];
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
    if (y < 0 || y >= 2 ** zoom) continue;
    const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
    tiles.push(<Image key={`${zoom}-${x}-${y}`} source={{ uri: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png` }} onError={() => setTileError(true)} style={{ position: 'absolute', width: tileSize + 0.5, height: tileSize + 0.5, left: layout.width / 2 + (x * 256 - origin.x) * scale, top: layout.height / 2 + (y * 256 - origin.y) * scale }} />);
  }
  return (
    <View style={styles.frame} onLayout={(event) => setLayout(event.nativeEvent.layout)}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tiles]}>{tiles}</View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
      {scan.scanning && <RadarOverlay size={size} rotation={scan.rotation} opacity={scan.opacity} />}
      {events.map((event) => {
        const point = project(event.coordinate.latitude, event.coordinate.longitude, zoom);
        const left = layout.width / 2 + (point.x - origin.x) * scale;
        const top = layout.height / 2 + (point.y - origin.y) * scale;
        if (left < 0 || left > layout.width || top < 0 || top > layout.height) return null;
        return <Pressable key={event.id} onPress={() => onSelect(event)} accessibilityRole="button" accessibilityLabel={`${event.title}, Demo-Event, Vorschau öffnen`} style={[styles.markerTouch, { left: left - 32, top: top - 65 }]}><EventPin event={event} reduceMotion={scan.reduceMotion} /></Pressable>;
      })}
      {tileError && <Text style={styles.error}>Karte nicht verfügbar · Internetverbindung prüfen</Text>}
      <Pressable accessibilityRole="link" accessibilityLabel="Kartendaten: OpenStreetMap" onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')} style={styles.attribution}><Text style={styles.attributionText}>© OpenStreetMap</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#202023' },
  tiles: { filter: 'grayscale(1) invert(1) brightness(0.55) contrast(1.15)' },
  tint: { backgroundColor: '#00000010' },
  markerTouch: { position: 'absolute', width: 64, height: 76, justifyContent: 'center', alignItems: 'center' },
  attribution: { position: 'absolute', bottom: 18, right: 8, padding: 3, backgroundColor: '#191c27cc', borderRadius: 4 },
  attributionText: { color: '#bbc1cb', fontSize: 8 },
  error: { position: 'absolute', bottom: 40, color: '#e5cfe8', fontSize: 11, backgroundColor: '#25172b', padding: 8 },
});
