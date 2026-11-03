import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { GlassProvider } from '../components/GlassProvider';
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
  </Stack>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GlassProvider>
      <SavedEventsProvider>
      <Head><title>Spots</title></Head>
      <StatusBar style="light" />
      <StartupContent />
      </SavedEventsProvider>
      </GlassProvider>
    </SafeAreaProvider>
  );
}
