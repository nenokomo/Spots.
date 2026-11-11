import { Tabs } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../../components/GlassBackdrop';
import { Icon, type IconName } from '../../components/Icon';
import { floatingTabBar } from '../../constants/navigation';
import { colors } from '../../constants/theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  // Selected tab: white icon, no highlight.
  return <View pointerEvents="none" style={styles.icon}><Icon name={name} size={22} color={focused ? colors.text : colors.faint} filled={focused && name === 'heart'} /></View>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barWidth = Math.min(360, width - 32);
  const sideInset = (width - barWidth) / 2;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.faint,
      sceneStyle: { backgroundColor: colors.background },
      tabBarStyle: { position: 'absolute', left: 0, right: 0, marginHorizontal: sideInset, bottom: Math.max(insets.bottom, floatingTabBar.bottomGap), backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, height: floatingTabBar.height, borderRadius: 33, paddingTop: 6, paddingBottom: 6 },
      tabBarIconStyle: { width: 58, height: 28 },
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2 },
      tabBarBackground: () => <View pointerEvents="none" testID="navigation-glass-capsule" style={styles.capsule}><GlassBackdrop radius={33} variant="panel" /></View>,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Radar', tabBarIcon: ({ focused }) => <TabIcon name="radar" focused={focused} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Entdecken', tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} /> }} />
      <Tabs.Screen name="saved" options={{ title: 'Gemerkt', tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  capsule: { ...StyleSheet.absoluteFill, borderRadius: 33 },
  icon: { width: 58, height: 28, alignItems: 'center', justifyContent: 'center' },
});
