import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

export function RadarOverlay({ size, rotation, opacity }: { size: number; rotation: Animated.Value; opacity: Animated.Value }) {
  return (
    <Animated.View testID="radar-scan" pointerEvents="none" style={[styles.radar, { width: size, height: size, opacity, transform: [{ scale: rotation.interpolate({ inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3], outputRange: [1, 1.025, 1, 1.025, 1, 1.025, 1] }) }] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 320 320">
        <Defs>
          <RadialGradient id="radarGlow"><Stop offset="0" stopColor="#ff43b3" stopOpacity="0.2" /><Stop offset="1" stopColor="#c922ab" stopOpacity="0" /></RadialGradient>
        </Defs>
        <Circle cx="160" cy="160" r="158" fill="url(#radarGlow)" />
        {[30, 68, 108, 150].map((radius) => <Circle key={radius} cx="160" cy="160" r={radius} stroke="#ed42ac" strokeOpacity={0.8} strokeWidth={0.9} fill="none" />)}
        <Path d="M10 160h300M160 10v300" stroke="#ef48ad" strokeOpacity="0.12" strokeWidth={0.8} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
        <Svg width={size} height={size} viewBox="0 0 320 320">
          <Defs><RadialGradient id="beam"><Stop offset="0" stopColor="#ff62ca" stopOpacity="0.75" /><Stop offset="1" stopColor="#ff38b0" stopOpacity="0.02" /></RadialGradient></Defs>
          <Path d="M160 160 230 27A150 150 0 0 1 279 69Z" fill="url(#beam)" />
          <Path d="m160 160 119-91" stroke="#ff6dcf" strokeWidth={0.7} strokeOpacity="0.35" />
        </Svg>
      </Animated.View>
      <View style={styles.glow}><View style={styles.core} /></View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  radar: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', height: 42, width: 42, borderRadius: 24, backgroundColor: '#ff42af22', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 26px 8px #f53aad45' },
  core: { height: 14, width: 14, borderRadius: 8, backgroundColor: '#fa4cb4', borderWidth: 2.5, borderColor: '#fff2fb', boxShadow: '0 0 13px 4px #ff49ba99' },
});
