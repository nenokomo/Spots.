import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAccountSession } from '../accounts/useAccountSession';
import { StudioProvider } from './StudioContext';
import { studio } from './theme';
import { useAccountType } from './useAccountType';

/**
 * /studio: nur für Veranstalter-Konten. Private Konten und Abgemeldete landen in der Besucher-App.
 * Aufbau (docs/STUDIO-UMBAU-PLAN.md): die Tabs ((tabs): Events · Zahlen · Profil, daneben das ＋) und darüber
 * die Eventseite (bearbeiten durch Antippen), „Neues Event“ (dieselbe Seite, leer) und die Einstellungen.
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
      {/* Neues Event: von unten eingeblendet (das ＋ sitzt unten) und ohne Wischen zurück – „Schließen“ fragt nach, bevor Eingaben verloren gehen. */}
      <Stack.Screen name="new" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="settings" />
    </Stack>
  </StudioProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
});
