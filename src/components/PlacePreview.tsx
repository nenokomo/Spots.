import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { darkMapStyle } from '../constants/mapStyle';
import { colors, radius, space, squircle, type } from '../constants/theme';
import { Icon } from './Icon';
import type { PlacePreviewProps } from './PlacePreview.types';
import { PressableScale } from './ui/PressableScale';

/** Small, non-interactive map of the venue (tapping it opens the route), with the address written out below. */
export function PlacePreview({ coordinate, title, street, detail, onRoute }: PlacePreviewProps) {
  const content = <>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...coordinate, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        liteMode={Platform.OS === 'android'}
        userInterfaceStyle="dark"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        customMapStyle={darkMapStyle}
        scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
        showsPointsOfInterests={false} toolbarEnabled={false}
      >
        <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><View style={styles.pin}><View style={styles.pinCore} /></View></Marker>
      </MapView>
    </View>
    {onRoute && <View pointerEvents="none" style={styles.route}><Icon name="map" size={15} color={colors.text} /><Text style={styles.routeText}>Route</Text></View>}
  </>;
  return <View style={styles.wrap}>
    {onRoute
      ? <PressableScale accessibilityRole="button" accessibilityLabel={`Route zu ${title} anzeigen`} onPress={onRoute} scaleTo={0.98} style={styles.card}>{content}</PressableScale>
      : <View style={styles.card}>{content}</View>}
    {/* Written-out address; selectable so it can be copied into another app. */}
    <View style={styles.address}>
      <Icon name="pin" size={18} color={colors.pink} />
      <View style={styles.copy}>
        <Text selectable style={styles.title}>{title}</Text>
        {street && <Text selectable style={styles.line}>{street}</Text>}
        {detail && <Text selectable style={styles.line}>{detail}</Text>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  card: { height: 176, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, ...squircle },
  pin: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#ff4ab840', alignItems: 'center', justifyContent: 'center' },
  pinCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.pink, borderWidth: 2, borderColor: '#ffffff' },
  address: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.xxs },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...type.headline, color: colors.text },
  line: { ...type.callout, color: colors.muted },
  route: { position: 'absolute', right: space.md, bottom: space.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 34, borderRadius: 17, backgroundColor: colors.accent, boxShadow: '0 4px 14px #0000008c' },
  routeText: { ...type.label, fontSize: 14, color: colors.text },
});
