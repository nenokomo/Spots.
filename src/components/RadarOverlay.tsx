import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';

/**
 * Overlay size so the radar circle (r 150 of 160 in the viewBox) spans exactly the map's short side,
 * with 2 px left so the outer ring stays fully visible.
 */
export function radarCoverSize(width: number, height: number) {
  return Math.round((Math.min(width, height) - 4) * 160 / 150);
}

const C = 160;
const R = 150;
const TRAIL_DEGREES = 90;
const TRAIL_STEPS = 18;
// Hairline distance rings inside the circle.
const RINGS = [R / 3, (R * 2) / 3];

function wedge(fromDeg: number, toDeg: number) {
  const point = (deg: number) => {
    const rad = (deg - 90) * Math.PI / 180;
    return `${(C + R * Math.cos(rad)).toFixed(2)} ${(C + R * Math.sin(rad)).toFixed(2)}`;
  };
  return `M${C} ${C}L${point(fromDeg)}A${R} ${R} 0 0 1 ${point(toDeg)}Z`;
}

const trail = Array.from({ length: TRAIL_STEPS }, (_, index) => {
  const step = TRAIL_DEGREES / TRAIL_STEPS;
  const from = -TRAIL_DEGREES + index * step;
  const strength = ((index + 1) / TRAIL_STEPS) ** 2.2;
  return { d: wedge(from, from + step + 0.4), opacity: strength };
});

/**
 * Scan look: a thin pink circle on the map around your position with two hairline rings inside, and a
 * strong pink sweep turning within it. No dark disc: the map stays fully visible.
 */
export function RadarOverlay({ size, rotation, opacity, center }: { size: number; rotation: Animated.Value; opacity: Animated.Value; center?: { x: number; y: number } }) {
  // center: screen point of your location dot, so the radar's middle sits exactly on it.
  const place = center ? { left: center.x - size / 2, top: center.y - size / 2 } : null;
  return (
    <Animated.View testID="radar-scan" pointerEvents="none" style={[styles.radar, { width: size, height: size, opacity }, place]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 320 320" style={StyleSheet.absoluteFill}>
        {RINGS.map((r) => <Circle key={r} cx={C} cy={C} r={r} stroke={colors.pink} strokeOpacity={0.55} strokeWidth={0.8} fill="none" />)}
        <Circle cx={C} cy={C} r={R} stroke={colors.pink} strokeOpacity={0.75} strokeWidth={0.9} fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
        <Svg width={size} height={size} viewBox="0 0 320 320">
          <Defs>
            {/* userSpaceOnUse: the fade is centred on you, not on each wedge. */}
            <RadialGradient id="sweepFade" gradientUnits="userSpaceOnUse" cx={C} cy={C} r={R} fx={C} fy={C}>
              <Stop offset="0" stopColor={colors.pink} stopOpacity="0.7" />
              <Stop offset="0.6" stopColor={colors.pink} stopOpacity="0.42" />
              <Stop offset="1" stopColor={colors.pink} stopOpacity="0.18" />
            </RadialGradient>
            <LinearGradient id="edgeFade" gradientUnits="userSpaceOnUse" x1={C} y1={C} x2={C} y2={C - R}>
              <Stop offset="0" stopColor="#ffe3f5" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#ffe3f5" stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          {trail.map((slice) => <Path key={slice.d} d={slice.d} fill="url(#sweepFade)" fillOpacity={slice.opacity} />)}
          <Line x1={C} y1={C} x2={C} y2={C - R} stroke="url(#edgeFade)" strokeWidth={0.9} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <View style={styles.glow} />
      <View style={styles.core} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  radar: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', height: 34, width: 34, borderRadius: 17, backgroundColor: '#ff42af26', boxShadow: '0 0 22px 6px #f53aad38' },
  core: { position: 'absolute', height: 11, width: 11, borderRadius: 6, backgroundColor: colors.pink, borderWidth: 2, borderColor: '#fff2fb' },
});
