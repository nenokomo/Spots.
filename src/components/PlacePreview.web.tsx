import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import { Icon } from './Icon';
import type { PlacePreviewProps } from './PlacePreview.types';
import { PressableScale } from './ui/PressableScale';

/** Web preview: react-native-maps is native-only, so the place is shown as a card without a map. */
export function PlacePreview({ title, street, detail, onRoute }: PlacePreviewProps) {
  const content = <>
    <View style={styles.icon}><Icon name="pin" size={20} color={colors.pink} /></View>
    <View style={styles.copy}>
      <Text selectable style={styles.title}>{title}</Text>
      {street && <Text selectable style={styles.detail}>{street}</Text>}
      {detail && <Text selectable style={styles.detail}>{detail}</Text>}
    </View>
    {onRoute && <View style={styles.route}><Icon name="map" size={15} color={colors.text} /><Text style={styles.routeText}>Route</Text></View>}
  </>;
  return onRoute
    ? <PressableScale accessibilityRole="button" accessibilityLabel={`Route zu ${title} anzeigen`} onPress={onRoute} scaleTo={0.98} style={styles.card}>{content}</PressableScale>
    : <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, ...squircle },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  copy: { flex: 1, minWidth: 0 },
  title: { ...type.label, color: colors.text },
  detail: { ...type.footnote, color: colors.faint },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 34, borderRadius: 17, backgroundColor: colors.accent },
  routeText: { ...type.label, fontSize: 14, color: colors.text },
});
