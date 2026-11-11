import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { RadarLogo } from './RadarLogo';

export function StartupScreen({ onLayout }: { onLayout: () => void }) {
  const { width, height } = useWindowDimensions();
  const logoSize = Math.max(120, Math.min(260, width * 0.66, height * 0.34));
  return <SafeAreaView onLayout={onLayout} style={styles.screen} accessibilityLabel="Spots wird gestartet" accessibilityRole="progressbar">
    <View style={styles.brand}>
      <RadarLogo size={logoSize} />
      <Text style={styles.wordmark}>Spots<Text style={styles.dot}>.</Text></Text>
      <Text style={styles.tagline}>Dein Radar für die Nacht.</Text>
    </View>
    <View style={styles.loading}><ActivityIndicator color={colors.accent} size="small" /><Text style={styles.loadingText}>Gleich geht’s los</Text></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#100b15', alignItems: 'center', paddingHorizontal: 24 },
  brand: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: -1.5, paddingHorizontal: 6, marginTop: 8 },
  dot: { color: colors.accent },
  tagline: { color: '#8e8e93', fontSize: 13, letterSpacing: 0.5, marginTop: 10, textAlign: 'center' },
  loading: { alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 32 },
  loadingText: { color: '#8e8e93', fontSize: 10, letterSpacing: 1 },
});
