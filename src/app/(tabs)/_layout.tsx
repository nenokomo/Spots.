import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassTabIcon } from '../../components/GlassTabIcon';
import { colors } from '../../constants/theme';
import { GlassBackdrop } from '../../components/GlassBackdrop';
import { floatingTabBar } from '../../constants/navigation';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.pink,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { position: 'absolute', left: 24, right: 24, bottom: Math.max(insets.bottom, floatingTabBar.bottomGap), backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, height: floatingTabBar.height, borderRadius: 30, paddingTop: 6, paddingBottom: 4 },
      tabBarIconStyle: { width: 30, height: 28 },
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontSize: 10, marginTop: 0 },
      tabBarBackground: () => <View pointerEvents="none" testID="navigation-glass-capsule" style={styles.capsule}><GlassBackdrop radius={30} /></View>,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Radar', tabBarIcon: ({ focused }) => <GlassTabIcon name="radar" focused={focused} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Entdecken', tabBarIcon: ({ focused }) => <GlassTabIcon name="search" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <GlassTabIcon name="profile" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  capsule: { ...StyleSheet.absoluteFill, borderRadius: 30 },
});
