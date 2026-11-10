import type { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

/** Black canvas with a faint brand glow at the top: identity without tinting the whole app. */
export function Screen({ children, glow = true }: PropsWithChildren<{ glow?: boolean }>) {
  return (
    <View style={styles.fill}>
      {glow && <LinearGradient pointerEvents="none" colors={['#c922ab33', '#c922ab0d', '#c922ab00']} locations={[0, 0.55, 1]} style={styles.glow} />}
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
});
