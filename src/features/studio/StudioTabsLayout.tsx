import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../../components/GlassBackdrop';
import { Icon, type IconName } from '../../components/Icon';
import { floatingTabBar } from '../../constants/navigation';
import { feedback } from './feel';
import { newEvent } from './routes';
import SetupScreen from './Setup';
import { useStudio } from './StudioContext';
import { studio } from './theme';
import { ErrorNote, PageSkeleton } from './ui';
import { Welcome } from './Welcome';

const PLUS = 60;
const GAP = 10;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View pointerEvents="none" style={styles.icon}><Icon name={name} size={22} color={focused ? studio.text : studio.faint} /></View>;
}

/**
 * Tab-Leiste von Spots Studio (docs/STUDIO-UMBAU-PLAN.md): drei Tabs – Events · Zahlen · Profil – und rechts daneben,
 * als eigener runder Knopf, das ＋ für ein neues Event. Die Leiste ist zum Wechseln da, das Plus zum Anlegen:
 * getrennt, damit man die Hauptaktion nicht für einen Tab hält.
 * Ohne Veranstalter-Profil zeigt das Studio statt der Tabs die Einrichtung.
 */
export default function StudioTabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { organizer, error, reload } = useStudio();
  const rowWidth = Math.min(400, width - 24);
  const sideInset = (width - rowWidth) / 2;
  const bottom = Math.max(insets.bottom, floatingTabBar.bottomGap);

  if (organizer === undefined) {
    return error ? <View style={styles.loading}><ErrorNote message={error} onRetry={reload} /></View> : <PageSkeleton />;
  }
  if (organizer === null) return <SetupScreen reload={reload} />;

  return <View style={styles.fill}>
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: studio.bg },
      tabBarActiveTintColor: studio.text,
      tabBarInactiveTintColor: studio.faint,
      tabBarStyle: { position: 'absolute', left: 0, right: 0, marginLeft: sideInset, marginRight: sideInset + PLUS + GAP, bottom, backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, height: floatingTabBar.height, borderRadius: 33, paddingTop: 6, paddingBottom: 6 },
      tabBarIconStyle: { width: 52, height: 28 },
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600', marginTop: 2 },
      // Die Leiste hat eine feste Höhe: die Beschriftung wächst nicht mit, damit sie nicht abgeschnitten wird.
      tabBarAllowFontScaling: false,
      tabBarBackground: () => <View pointerEvents="none" style={styles.capsule}><GlassBackdrop radius={33} variant="panel" /></View>,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Events', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Zahlen', tabBarIcon: ({ focused }) => <TabIcon name="chart" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
    </Tabs>
    <Pressable accessibilityRole="button" accessibilityLabel="Neues Event anlegen" onPress={() => { feedback.tap(); newEvent(); }}
      style={({ pressed }) => [styles.plus, { right: sideInset, bottom: bottom + (floatingTabBar.height - PLUS) / 2 }, pressed && styles.plusPressed]}>
      <LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plusFill}><Icon name="plus" size={26} color={studio.onAccent} /></LinearGradient>
    </Pressable>
    <Welcome />
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: studio.bg },
  loading: { flex: 1, justifyContent: 'center', backgroundColor: studio.bg, padding: 24 },
  capsule: { ...StyleSheet.absoluteFill, borderRadius: 33 },
  icon: { width: 52, height: 28, alignItems: 'center', justifyContent: 'center' },
  plus: { position: 'absolute', width: PLUS, height: PLUS, borderRadius: PLUS / 2, boxShadow: '0 4px 18px #c922ab80' },
  plusPressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
  plusFill: { flex: 1, borderRadius: PLUS / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff33' },
});
