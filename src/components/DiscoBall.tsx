import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const PALETTE = ['#ffffff', '#f5d0ec', '#c9b8d9', '#ff4ab8', '#e8e3f0', '#8e7aa6', '#c922ab', '#b9a7c9', '#fbe8f6', '#6d5a86'];
const TILE = 9;
const GAP = 1.2;

/**
 * Decorative mirror ball: a grid of pink/silver facets that keeps turning (the facets slide behind a round
 * mask, like a ball rotating on its axis), sphere shading on top, twinkling sparkles and a soft bounce with
 * a shadow. Everything runs on the native thread; with „Bewegung reduzieren“ it stands still.
 */
export function DiscoBall({ size = 84, dim = false }: { size?: number; dim?: boolean }) {
  const [turn] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  const [twinkle] = useState(() => new Animated.Value(0));
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setCalm(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setCalm);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (calm) { turn.setValue(0); hop.setValue(0); twinkle.setValue(0.6); return; }
    const native = Platform.OS !== 'web';
    const options = { useNativeDriver: native, isInteraction: false } as const;
    const turning = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 2400, easing: Easing.linear, ...options }));
    const hopping = Animated.loop(Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), ...options }),
      Animated.timing(hop, { toValue: 0, duration: 380, easing: Easing.bounce, ...options }),
      Animated.delay(900),
    ]));
    const twinkling = Animated.loop(Animated.sequence([
      Animated.timing(twinkle, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), ...options }),
      Animated.timing(twinkle, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), ...options }),
    ]));
    turning.start();
    hopping.start();
    twinkling.start();
    return () => { turning.stop(); hopping.stop(); twinkling.stop(); };
  }, [calm, turn, hop, twinkle]);

  // One horizontal period of facets; two periods are drawn and slid left by one period, then it repeats.
  const columns = Math.ceil(size / TILE) + 1;
  const period = columns * TILE;
  const rows = Math.ceil(size / TILE) + 1;
  const facets = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns * 2; column++) {
      const colour = PALETTE[((column % columns) * 7 + row * 13 + (row % 3) * 5) % PALETTE.length];
      facets.push(<Rect key={`${row}-${column}`} x={column * TILE} y={row * TILE} width={TILE - GAP} height={TILE - GAP} rx={1.2} fill={colour} />);
    }
  }
  const lift = size * 0.1;

  return (
    <View style={[styles.wrap, { width: size + 20, height: size + lift + 14 }]} pointerEvents="none">
      {/* Shadow on the "floor": smaller and lighter while the ball is up. */}
      <Animated.View style={[styles.shadow, { width: size * 0.62, bottom: 0, opacity: hop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.2] }), transform: [{ scaleX: hop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }] }]} />
      <Animated.View style={{ position: 'absolute', top: lift, transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -lift] }) }, { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) }] }}>
        <View style={[styles.glow, { borderRadius: size / 2 }]}>
        <View style={[styles.ball, { width: size, height: size, borderRadius: size / 2, opacity: dim ? 0.55 : 1 }]}>
          <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: turn.interpolate({ inputRange: [0, 1], outputRange: [0, -period] }) }] }}>
            <Svg width={period * 2} height={rows * TILE}>{facets}</Svg>
          </Animated.View>
          {/* Sphere shading: bright spot top left, darker towards the edge. */}
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="ballShade" cx="38%" cy="32%" r="70%">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                <Stop offset="0.35" stopColor="#ffffff" stopOpacity="0.05" />
                <Stop offset="0.75" stopColor="#2a0f2a" stopOpacity="0.35" />
                <Stop offset="1" stopColor="#0a090c" stopOpacity="0.85" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={size} height={size} fill="url(#ballShade)" />
          </Svg>
        </View>
        </View>
        {/* Sparkles around the ball. */}
        <Animated.View style={[styles.sparkle, { top: -4, right: -6, opacity: twinkle }]}><Sparkle size={16} /></Animated.View>
        <Animated.View style={[styles.sparkle, { bottom: 6, left: -8, opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }) }]}><Sparkle size={11} /></Animated.View>
        <Animated.View style={[styles.sparkle, { top: size * 0.42, right: -10, opacity: twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] }) }]}><Sparkle size={9} /></Animated.View>
      </Animated.View>
    </View>
  );
}

function Sparkle({ size }: { size: number }) {
  const h = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={`M${h} 0 Q${h} ${h} ${size} ${h} Q${h} ${h} ${h} ${size} Q${h} ${h} 0 ${h} Q${h} ${h} ${h} 0Z`} fill="#ffffff" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  shadow: { position: 'absolute', height: 8, borderRadius: 999, backgroundColor: '#000000' },
  glow: { boxShadow: '0 0 18px 2px #ff4ab866' },
  ball: { overflow: 'hidden', backgroundColor: '#c9b8d9' },
  sparkle: { position: 'absolute' },
});
