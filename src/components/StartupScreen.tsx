import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function StartupScreen({ onLayout }: { onLayout: () => void }) {
  return <View onLayout={onLayout} style={styles.screen} accessibilityLabel="Spots wird gestartet" accessibilityRole="progressbar">
    <Image source={require('../../assets/spots-radar-logo.png')} style={styles.radarLogo} resizeMode="cover" accessibilityLabel="Spots Radar-Logo" />
    <View style={styles.loading}><ActivityIndicator color={colors.pink} size="small" /><Text style={styles.loadingText}>Die Nacht wartet auf dich.</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  radarLogo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  loading: { position: 'absolute', bottom: '12%', alignItems: 'center', gap: 13 },
  loadingText: { color: '#bb9fb9', fontSize: 11, letterSpacing: 0.4 },
});
