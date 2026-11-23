import { Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../../components/GlassBackdrop';
import { Icon, type IconName } from '../../components/Icon';
import { floatingTabBar } from '../../constants/navigation';
import SetupScreen from './Setup';
import { useStudio } from './StudioContext';
import { studio } from './theme';
import { Message, StudioButton } from './ui';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View pointerEvents="none" style={styles.icon}><Icon name={name} size={22} color={focused ? studio.text : studio.faint} /></View>;
}

/**
 * Reiterleiste von Spots Studio (Design Noyan, 23.11.): vier Reiter, jeder mit genau einer Aufgabe.
 * Events (anlegen und bearbeiten) · Story (posten) · Einnahmen (Tickets und Zahlen) · Profil (Veranstalterseite, Team, Konto).
 * Jede Aktion gibt es nur an einer Stelle. Ohne Club zeigt das Studio statt der Reiter die Einrichtung.
 */
export default function StudioTabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { organizer, error, reload } = useStudio();
  const barWidth = Math.min(380, width - 32);
  const sideInset = (width - barWidth) / 2;

  if (organizer === undefined) {
    return <View style={styles.loading}>{error
      ? <><Message error={error} /><StudioButton small variant="secondary" label="Erneut versuchen" onPress={reload} /></>
      : <ActivityIndicator color={studio.accent} />}</View>;
  }
  if (organizer === null) return <SetupScreen reload={reload} />;

  return <Tabs screenOptions={{
    headerShown: false,
    sceneStyle: { backgroundColor: studio.bg },
    tabBarActiveTintColor: studio.text,
    tabBarInactiveTintColor: studio.faint,
    tabBarStyle: { position: 'absolute', left: 0, right: 0, marginHorizontal: sideInset, bottom: Math.max(insets.bottom, floatingTabBar.bottomGap), backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, height: floatingTabBar.height, borderRadius: 33, paddingTop: 6, paddingBottom: 6 },
    tabBarIconStyle: { width: 52, height: 28 },
    tabBarLabelPosition: 'below-icon',
    tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2 },
    tabBarBackground: () => <View pointerEvents="none" style={styles.capsule}><GlassBackdrop radius={33} variant="panel" /></View>,
  }}>
    <Tabs.Screen name="index" options={{ title: 'Events', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
    <Tabs.Screen name="story" options={{ title: 'Story', tabBarIcon: ({ focused }) => <TabIcon name="camera" focused={focused} /> }} />
    <Tabs.Screen name="revenue" options={{ title: 'Einnahmen', tabBarIcon: ({ focused }) => <TabIcon name="ticket" focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: studio.bg, padding: 24 },
  capsule: { ...StyleSheet.absoluteFill, borderRadius: 33 },
  icon: { width: 52, height: 28, alignItems: 'center', justifyContent: 'center' },
});
