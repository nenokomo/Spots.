import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export type GlassBackdropProps = { radius?: number; variant?: 'panel' | 'control' | 'card'; native?: boolean };

// Tinted material where native glass is unavailable (Android, web, older iOS).
// No blur, filters, animation or native glass imports here.
export function GlassFallback({ radius = 16, variant = 'control' }: GlassBackdropProps) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, styles.frame, { borderRadius: radius, backgroundColor: variant === 'panel' ? '#1c1b1fef' : variant === 'card' ? '#1c1b1fd9' : '#232227eb' }]}>
      <LinearGradient colors={['#ffffff10', '#ffffff04', '#00000033']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({ frame: { overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff1c', borderTopColor: '#ffffff2e' } });
