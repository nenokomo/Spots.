import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAccountSession } from '../accounts/useAccountSession';
import { StudioProvider } from './StudioContext';
import { studio } from './theme';
import { useAccountType } from './useAccountType';

/**
 * /studio: nur für Veranstalter-Konten. Private Konten und Abgemeldete landen in der Besucher-App.
 * Aufbau (docs/STUDIO-UMBAU-PLAN.md): die Reiter ((tabs): Übersicht · Events · ＋ · Zahlen · Profil) und darüber
 * die Eventseite, „Event anlegen/bearbeiten“, „Profil bearbeiten“ und die Einstellungen.
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
      {/* Kein Wischen zurück: Eingaben sollen nicht versehentlich verloren gehen (der Pfeil fragt nach). */}
      <Stack.Screen name="edit/[id]" options={{ gestureEnabled: false }} />
      <Stack.Screen name="page" />
      <Stack.Screen name="settings" />
    </Stack>
  </StudioProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.bg },
});
