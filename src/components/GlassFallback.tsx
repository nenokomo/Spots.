import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export type GlassBackdropProps = { radius?: number; variant?: 'panel' | 'control' | 'card'; native?: boolean };

// No blur, filters, animation or native glass imports on Android/web.
export function GlassFallback({ radius = 16, variant = 'control' }: GlassBackdropProps) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, styles.frame, { borderRadius: radius, backgroundColor: variant === 'panel' ? '#24162cef' : variant === 'card' ? '#24172bd9' : '#261b30eb' }]}>
      <LinearGradient colors={['#ffffff18', '#c922ab0c', '#100b1533']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({ frame: { overflow: 'hidden', borderWidth: 1, borderColor: '#f6d6ff24', borderTopColor: '#ffe8ff42' } });
