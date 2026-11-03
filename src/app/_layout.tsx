import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { GlassProvider } from '../components/GlassProvider';
import { SavedEventsProvider } from '../hooks/useSavedEvents';
import { EventsProvider } from '../hooks/useEvents';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GlassProvider>
      <SavedEventsProvider>
      <EventsProvider>
      <Head><title>Spots</title></Head>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="event/[id]" />
      </Stack>
      </EventsProvider>
      </SavedEventsProvider>
      </GlassProvider>
    </SafeAreaProvider>
  );
}
