import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { GlassProvider } from '../components/GlassProvider';
import { SavedEventsProvider } from '../hooks/useSavedEvents';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GlassProvider>
      <SavedEventsProvider>
      <Head><title>Spots</title></Head>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" />
      </Stack>
      </SavedEventsProvider>
      </GlassProvider>
    </SafeAreaProvider>
  );
}
