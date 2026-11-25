import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../../components/GlassBackdrop';
import { Icon, type IconName } from '../../components/Icon';
import { floatingTabBar } from '../../constants/navigation';
import { newEvent } from './routes';
import SetupScreen from './Setup';
import { useStudio } from './StudioContext';
import { studio } from './theme';
import { Message, StudioButton } from './ui';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View pointerEvents="none" style={styles.icon}><Icon name={name} size={22} color={focused ? studio.text : studio.faint} /></View>;
}

/** Das „＋“ in der Mitte: die Hauptfunktion des Studios, ein neues Event. Kein eigener Reiter, nur der Knopf. */
function PlusButton() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Neues Event anlegen" onPress={() => newEvent()} style={({ pressed }) => [styles.plusSlot, pressed && styles.plusPressed]}>
    <LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plus}><Icon name="plus" size={24} color={studio.onAccent} /></LinearGradient>
  </Pressable>;
}

/**
 * Reiterleiste von Spots Studio (Entscheidung 25.11., docs/STUDIO-UMBAU-PLAN.md): Übersicht · Events · ＋ · Zahlen · Profil.
 * Ohne Veranstalter-Profil zeigt das Studio statt der Reiter die Einrichtung.
 */
export default function StudioTabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { organizer, error, reload } = useStudio();
  const barWidth = Math.min(400, width - 24);
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
    <Tabs.Screen name="index" options={{ title: 'Übersicht', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
    <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
    <Tabs.Screen name="create" options={{ title: 'Neues Event', tabBarButton: () => <PlusButton /> }} />
    <Tabs.Screen name="stats" options={{ title: 'Zahlen', tabBarIcon: ({ focused }) => <TabIcon name="chart" focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: studio.bg, padding: 24 },
  capsule: { ...StyleSheet.absoluteFill, borderRadius: 33 },
  icon: { width: 52, height: 28, alignItems: 'center', justifyContent: 'center' },
  plusSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plusPressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
  plus: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff33', boxShadow: '0 4px 16px #c922ab80' },
});
