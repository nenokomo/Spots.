import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAccountSession } from '../accounts/useAccountSession';
import { StudioProvider } from './StudioContext';
import { studio } from './theme';
import { useAccountType } from './useAccountType';

/**
 * /studio: nur für Veranstalter-Konten. Private Konten und Abgemeldete landen in der Besucher-App.
 * Aufbau wie die Besucher-App: ein Stapel mit den Reitern ((tabs)), dem Event-Editor und der Entdecken-Story als eigenen Seiten darüber.
 */
export default function StudioLayout() {
  const account = useAccountSession();
  const userId = account.session?.user.id ?? null;
  const type = useAccountType(userId);

  if (account.loading || (userId && type === null)) {
    return <View style={styles.loading}><ActivityIndicator color={studio.accent} /></View>;
  }
  if (!userId || type !== 'organizer') return <Redirect href="/" />;

  return <StudioProvider userId={userId}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: studio.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="story" />
    </Stack>
  </StudioProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
});
