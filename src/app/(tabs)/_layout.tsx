import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.pink,
      tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: '#ffffff12', elevation: 0, height: 65 + Math.max(insets.bottom, 8), paddingTop: 7, paddingBottom: Math.max(insets.bottom, 8) },
      tabBarLabelStyle: { fontSize: 10, marginTop: 3 },
      tabBarBackground: () => <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Radar', tabBarIcon: ({ focused }) => <Icon name="radar" color={focused ? colors.pink : colors.muted} size={25} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Entdecken', tabBarIcon: ({ focused }) => <Icon name="search" color={focused ? colors.pink : colors.muted} size={23} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <Icon name="profile" color={focused ? colors.pink : colors.muted} size={23} /> }} />
    </Tabs>
  );
}
