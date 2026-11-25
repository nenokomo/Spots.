import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'radar' | 'search' | 'profile' | 'pin' | 'chevron' | 'down' | 'sliders' | 'clock' | 'locate' | 'close' | 'back' | 'calendar' | 'share' | 'ticket' | 'camera' | 'bookmark' | 'heart' | 'map' | 'grid' | 'headphones' | 'wave' | 'cocktail'
  | 'plus' | 'check' | 'edit' | 'copy' | 'eye' | 'image' | 'trash' | 'users' | 'chart' | 'home' | 'info' | 'link';

export function Icon({ name, size = 22, color = '#d4bcd8', filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  // Wrapped in a View so it stacks above absolutely positioned backdrops on web as it does natively.
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
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
      {name === 'heart' && <Path fill={filled ? color : 'none'} d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />}
      {name === 'map' && <Path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />}
      {name === 'grid' && <><Circle cx="6" cy="6" r="2.5" /><Circle cx="18" cy="6" r="2.5" /><Circle cx="6" cy="18" r="2.5" /><Circle cx="18" cy="18" r="2.5" /></>}
      {name === 'headphones' && <Path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm16 0h-3v8h3a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Z" />}
      {name === 'wave' && <Path d="M2 12h4l3-8 4 16 3-12 2 4h4" />}
      {name === 'cocktail' && <Path d="m3 3 9 10 9-10H3Zm9 10v8m-5 0h10M6 6h12" />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" />}
      {name === 'check' && <Path d="m5 12.5 4.5 4.5L19 7.5" />}
      {name === 'edit' && <Path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />}
      {name === 'copy' && <Path d="M9 9h11v11H9ZM15 9V4H4v11h5" />}
      {name === 'eye' && <><Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><Circle cx="12" cy="12" r="3" /></>}
      {name === 'image' && <><Path d="M4 5h16v14H4Zm0 11 4.5-4.5 4 4 3-3L20 16" /><Circle cx="9" cy="9.5" r="1.5" /></>}
      {name === 'trash' && <Path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />}
      {name === 'users' && <><Circle cx="9" cy="8" r="3.2" /><Path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.3a6 6 0 0 1 3 4.7v1" /></>}
      {name === 'chart' && <Path d="M5 20v-8M12 20V4M19 20v-5" />}
      {name === 'home' && <Path d="m4 11 8-7 8 7v9h-5v-6H9v6H4Z" />}
      {name === 'info' && <><Circle cx="12" cy="12" r="9" /><Path d="M12 11v5M12 7.8v.2" /></>}
      {name === 'link' && <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />}
    </Svg>
    </View>
  );
}
