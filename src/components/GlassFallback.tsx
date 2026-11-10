import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';

export type GlassBackdropProps = { radius?: number; variant?: 'panel' | 'control' | 'card'; native?: boolean };

// Neutral translucent material where native glass is unavailable (Android, web, older iOS).
// No blur, filters or native glass imports here.
export function GlassFallback({ radius = 16, variant = 'control' }: GlassBackdropProps) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.frame, { borderRadius: radius, backgroundColor: variant === 'panel' ? '#1c1c1ef2' : colors.material }]} />
  );
}

const styles = StyleSheet.create({ frame: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ffffff2e' } });
