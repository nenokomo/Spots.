import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet } from 'react-native';
import { GlassFallback, type GlassBackdropProps } from './GlassFallback';
import { useGlassAllowed } from './GlassProvider';

function hasNativeGlass() {
  try { return isGlassEffectAPIAvailable() && isLiquidGlassAvailable(); }
  catch { return false; } // Older development builds may not contain the native module yet.
}

export function GlassBackdrop({ radius = 16, variant = 'control', native = true }: GlassBackdropProps) {
  const allowed = useGlassAllowed();
  if (!native || !allowed || !hasNativeGlass()) return <GlassFallback radius={radius} variant={variant} />;
  return <GlassView pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" colorScheme="dark" glassEffectStyle="regular" tintColor={variant === 'panel' ? '#28133288' : '#401b3a55'} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
}
