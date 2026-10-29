import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'radar' | 'search' | 'profile' | 'pin' | 'chevron' | 'down' | 'sliders' | 'clock' | 'locate' | 'close' | 'back' | 'calendar' | 'share' | 'ticket' | 'camera' | 'bookmark' | 'map' | 'grid' | 'headphones' | 'wave' | 'cocktail';

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
      {name === 'calendar' && <Path d="M7 3v4M17 3v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M8 14h2" />}
      {name === 'share' && <Path d="M12 15V3m-4 4 4-4 4 4M6 10H4v11h16V10h-2" />}
      {name === 'ticket' && <Path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Zm12 1v2m0 3v2m0 3v2" />}
      {name === 'camera' && <><Path d="M3 7h4l2-3h6l2 3h4v13H3Z" /><Circle cx="12" cy="13" r="4" /></>}
      {name === 'bookmark' && <Path d="M6 3h12v18l-6-4-6 4Z" />}
      {name === 'map' && <Path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />}
      {name === 'grid' && <><Circle cx="6" cy="6" r="2.5" /><Circle cx="18" cy="6" r="2.5" /><Circle cx="6" cy="18" r="2.5" /><Circle cx="18" cy="18" r="2.5" /></>}
      {name === 'headphones' && <Path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm16 0h-3v8h3a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Z" />}
      {name === 'wave' && <Path d="M2 12h4l3-8 4 16 3-12 2 4h4" />}
      {name === 'cocktail' && <Path d="m3 3 9 10 9-10H3Zm9 10v8m-5 0h10M6 6h12" />}
    </Svg>
  );
}
