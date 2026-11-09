import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { Platform } from 'react-native';
import { colors } from '../constants/theme';

export function RadarLogo({ size }: { size: number }) {
  const accessibility = Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return <Svg width={size} height={size} viewBox="0 0 240 240" {...accessibility}>
    <Defs>
      <RadialGradient id="startupHalo">
        <Stop offset="0" stopColor={colors.accent} stopOpacity="0.2" />
        <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id="startupBeam" x1="0" y1="1" x2="1" y2="0">
        <Stop offset="0" stopColor={colors.accent} stopOpacity="0.05" />
        <Stop offset="1" stopColor={colors.pink} stopOpacity="0.5" />
      </LinearGradient>
    </Defs>
    <Circle cx="120" cy="120" r="120" fill="url(#startupHalo)" />
    <Circle cx="120" cy="120" r="91" fill="#190f20" stroke="#c922ab30" strokeWidth="1" />
    {[30, 60, 90].map((radius) => <Circle key={radius} cx="120" cy="120" r={radius} fill="none" stroke="#d5acc8" strokeOpacity="0.22" strokeWidth="1" />)}
    <Path d="M30 120h180M120 30v180" stroke="#d5acc8" strokeOpacity="0.1" strokeWidth="1" />
    <Path d="M120 120 120 30A90 90 0 0 1 198 75Z" fill="url(#startupBeam)" />
    <Path d="m120 120 78-45" stroke={colors.pink} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="159" cy="98" r="9" fill={colors.accent} fillOpacity="0.16" />
    <Circle cx="159" cy="98" r="3.5" fill="#ffe4f8" />
    <Circle cx="72" cy="145" r="3" fill={colors.accent} />
    <Circle cx="143" cy="177" r="2.5" fill="#bd8bb1" />
    <Circle cx="120" cy="120" r="10" fill={colors.accent} fillOpacity="0.18" />
    <Circle cx="120" cy="120" r="4" fill={colors.pink} />
  </Svg>;
}
