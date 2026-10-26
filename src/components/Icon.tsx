import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'radar' | 'search' | 'profile' | 'pin' | 'chevron' | 'down' | 'sliders' | 'clock' | 'locate' | 'close' | 'back';

export function Icon({ name, size = 22, color = '#d4bcd8' }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {name === 'radar' && <><Circle cx="12" cy="12" r="9" /><Circle cx="12" cy="12" r="5.5" /><Circle cx="12" cy="12" r="2" /><Path d="M12 12 18.4 5.6" /></>}
      {name === 'search' && <><Circle cx="10.5" cy="10.5" r="7" /><Path d="m16 16 5 5" /></>}
      {name === 'profile' && <><Circle cx="12" cy="7" r="4" /><Path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>}
      {name === 'pin' && <><Path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><Circle cx="12" cy="10" r="2.3" /></>}
      {name === 'chevron' && <Path d="m9 5 7 7-7 7" />}
      {name === 'down' && <Path d="m6 9 6 6 6-6" />}
      {name === 'sliders' && <><Path d="M3 7h9m5 0h4M3 17h4m5 0h9" /><Circle cx="14.5" cy="7" r="2.5" /><Circle cx="9.5" cy="17" r="2.5" /></>}
      {name === 'clock' && <><Circle cx="12" cy="12" r="9" /><Path d="M12 6v6l4 2" /></>}
      {name === 'locate' && <Path d="m21 3-7 18-3-8-8-3Z" />}
      {name === 'close' && <Path d="m6 6 12 12M6 18 18 6" />}
      {name === 'back' && <Path d="m14 5-7 7 7 7M7 12h14" />}
    </Svg>
  );
}
