import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { GlassProvider } from '../components/GlassProvider';
import { EventsProvider } from '../hooks/useEvents';
import { SavedEventsProvider, useSavedEvents } from '../hooks/useSavedEvents';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StartupScreen } from '../components/StartupScreen';

void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

function StartupContent() {
  const { busy, ready } = useSavedEvents();
  const [introFinished, setIntroFinished] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIntroFinished(true), 850);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!introFinished || (!ready && busy)) return;
    const timer = setTimeout(() => setStarted(true), 0);
    return () => clearTimeout(timer);
  }, [introFinished, ready, busy]);
  if (!started) return <StartupScreen onLayout={() => { void SplashScreen.hideAsync().catch(() => {}); }} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="event/[id]" />
    <Stack.Screen name="today" />
    <Stack.Screen name="organizer/[id]" />
    <Stack.Screen name="venue/[id]" />
    <Stack.Screen name="admin" />
    <Stack.Screen name="account" options={{ presentation: 'modal' }} />
  </Stack>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GlassProvider>
      <SavedEventsProvider>
      <EventsProvider>
      <Head><title>Spots</title></Head>
      <StatusBar style="light" />
      <StartupContent />
      </EventsProvider>
      </SavedEventsProvider>
      </GlassProvider>
    </SafeAreaProvider>
  );
}
