import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { studio } from './theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View style={[styles.icon, focused && styles.iconActive]}><Icon name={name} size={20} color={focused ? studio.limeInk : studio.faint} /></View>;
}

/** Reiterleiste von Spots Studio. Zugang und gemeinsame Daten regelt StudioLayout darüber. */
export default function StudioTabsLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: studio.bg },
    tabBarActiveTintColor: studio.text,
    tabBarInactiveTintColor: studio.faint,
    tabBarStyle: { backgroundColor: studio.panel, borderTopColor: studio.line, borderTopWidth: 1, height: 64 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
    tabBarIconStyle: { width: 52, height: 30 },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Übersicht', tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} /> }} />
    <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
    <Tabs.Screen name="stats" options={{ title: 'Statistik', tabBarIcon: ({ focused }) => <TabIcon name="wave" focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Club', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  icon: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: studio.lime },
});
